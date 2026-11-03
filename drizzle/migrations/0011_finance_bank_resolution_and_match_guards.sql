ALTER TABLE public.finance_bank_transactions
  ADD COLUMN IF NOT EXISTS owner_resolution text CHECK (owner_resolution IN ('separate')),
  ADD COLUMN IF NOT EXISTS resolution_note text,
  ADD COLUMN IF NOT EXISTS resolved_by uuid,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

CREATE OR REPLACE FUNCTION public.finance_bank_txn_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  IF NEW.import_id IS DISTINCT FROM OLD.import_id OR NEW.business_id IS DISTINCT FROM OLD.business_id
     OR NEW.row_index IS DISTINCT FROM OLD.row_index OR NEW.row_fingerprint IS DISTINCT FROM OLD.row_fingerprint
     OR NEW.txn_date IS DISTINCT FROM OLD.txn_date OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.amount_cents IS DISTINCT FROM OLD.amount_cents OR NEW.raw IS DISTINCT FROM OLD.raw
     OR NEW.possible_duplicate_of IS DISTINCT FROM OLD.possible_duplicate_of OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Imported bank rows cannot be changed';
  END IF;
  IF NEW.classification = 'matched' THEN
    ok := CASE NEW.matched_type
      WHEN 'payment' THEN EXISTS (SELECT 1 FROM platform_payments p WHERE p.id = NEW.matched_id AND p.business_id = NEW.business_id
          AND lower(coalesce(p.status, '')) IN ('completed','succeeded','paid')
          AND coalesce(p.is_refund, false) = (NEW.amount_cents < 0)
          AND round(abs(p.amount) * 100) + round(greatest(coalesce(p.tip_amount, 0), 0) * 100) = abs(NEW.amount_cents))
      WHEN 'income' THEN NEW.amount_cents > 0 AND EXISTS (SELECT 1 FROM finance_income i WHERE i.id = NEW.matched_id AND i.business_id = NEW.business_id
          AND round(i.amount * 100) = NEW.amount_cents)
      WHEN 'payroll' THEN NEW.amount_cents < 0 AND EXISTS (SELECT 1 FROM finance_payroll_payments r WHERE r.id = NEW.matched_id AND r.business_id = NEW.business_id
          AND round(r.total_amount * 100) = -NEW.amount_cents)
      WHEN 'expense' THEN NEW.amount_cents < 0 AND EXISTS (SELECT 1 FROM finance_expenses e JOIN businesses b ON b.workspace_id = e.workspace_id
          WHERE e.id = NEW.matched_id AND b.id = NEW.business_id AND (e.is_shared OR e.business_id = NEW.business_id)
          AND round(e.amount * 100) = -NEW.amount_cents)
      ELSE false END;
    IF NOT ok THEN
      RAISE EXCEPTION 'Match must be a successful record in this business with the same amount and money direction';
    END IF;
  END IF;
  IF NEW.owner_resolution IS NOT NULL THEN
    IF NEW.classification NOT IN ('income', 'expense') THEN
      RAISE EXCEPTION 'Only income or expense rows can be confirmed as separate';
    END IF;
    IF length(btrim(coalesce(NEW.resolution_note, ''))) < 3 THEN
      RAISE EXCEPTION 'Add a short note saying why this is a separate transaction';
    END IF;
  END IF;
  IF NEW.owner_resolution IS DISTINCT FROM OLD.owner_resolution OR NEW.resolution_note IS DISTINCT FROM OLD.resolution_note THEN
    NEW.resolved_by := auth.uid();
    NEW.resolved_at := now();
  ELSE
    NEW.resolved_by := OLD.resolved_by;
    NEW.resolved_at := OLD.resolved_at;
  END IF;
  NEW.reviewed_by := auth.uid();
  NEW.reviewed_at := now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.finance_validate_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e record; total numeric;
BEGIN
  -- Lock the parent so concurrent allocations are checked one at a time.
  SELECT * INTO e FROM finance_expenses WHERE id = NEW.expense_id FOR UPDATE;
  IF e IS NULL THEN RAISE EXCEPTION 'Expense not found'; END IF;
  IF NOT e.is_shared THEN RAISE EXCEPTION 'Only shared expenses can be allocated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = NEW.business_id AND workspace_id = e.workspace_id) THEN
    RAISE EXCEPTION 'Business is not in this expense''s workspace';
  END IF;
  SELECT coalesce(sum(amount),0) INTO total FROM finance_expense_allocations
    WHERE expense_id = NEW.expense_id AND id <> NEW.id;
  IF total + NEW.amount > e.amount THEN RAISE EXCEPTION 'Allocations exceed the expense amount'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Changes to a shared expense must keep its existing allocations valid.
CREATE OR REPLACE FUNCTION public.finance_expense_allocation_parent_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total numeric;
BEGIN
  IF NEW.amount IS NOT DISTINCT FROM OLD.amount AND NEW.is_shared IS NOT DISTINCT FROM OLD.is_shared
     AND NEW.workspace_id IS NOT DISTINCT FROM OLD.workspace_id AND NEW.business_id IS NOT DISTINCT FROM OLD.business_id THEN
    RETURN NEW;
  END IF;
  SELECT coalesce(sum(amount), 0) INTO total FROM finance_expense_allocations WHERE expense_id = OLD.id;
  IF total = 0 THEN RETURN NEW; END IF;
  IF NOT NEW.is_shared THEN RAISE EXCEPTION 'Remove the business shares before making this expense not shared'; END IF;
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN RAISE EXCEPTION 'Remove the business shares before moving this expense'; END IF;
  IF NEW.amount < total THEN RAISE EXCEPTION 'Assigned shares (%) are more than the new amount; reduce them first', total; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_finance_expense_allocation_parent_guard ON public.finance_expenses;
CREATE TRIGGER trg_finance_expense_allocation_parent_guard BEFORE UPDATE ON public.finance_expenses
  FOR EACH ROW EXECUTE FUNCTION public.finance_expense_allocation_parent_guard();
REVOKE ALL ON FUNCTION public.finance_expense_allocation_parent_guard() FROM PUBLIC, anon;