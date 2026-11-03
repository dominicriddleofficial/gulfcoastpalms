CREATE OR REPLACE FUNCTION public.finance_is_business_owner(_user_id uuid, _business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM businesses b JOIN workspaces w ON w.id = b.workspace_id
                 WHERE b.id = _business_id AND w.owner_user_id = _user_id)
$$;
REVOKE ALL ON FUNCTION public.finance_is_business_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finance_is_business_owner(uuid, uuid) TO authenticated, service_role;

-- Explicit share of a shared expense assigned to one business.
CREATE TABLE public.finance_expense_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.finance_expenses(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  note text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (expense_id, business_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_expense_allocations TO authenticated;
GRANT ALL ON public.finance_expense_allocations TO service_role;
ALTER TABLE public.finance_expense_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_expense_allocations_owner_all ON public.finance_expense_allocations
  FOR ALL TO authenticated
  USING (public.finance_is_business_owner(auth.uid(), business_id))
  WITH CHECK (public.finance_is_business_owner(auth.uid(), business_id));

CREATE OR REPLACE FUNCTION public.finance_validate_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e record; total numeric;
BEGIN
  SELECT * INTO e FROM finance_expenses WHERE id = NEW.expense_id;
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
CREATE TRIGGER trg_finance_validate_allocation BEFORE INSERT OR UPDATE ON public.finance_expense_allocations
  FOR EACH ROW EXECUTE FUNCTION public.finance_validate_allocation();

-- Bank statement imports (owner-reviewed staging; never auto-counted unless classified).
CREATE TABLE public.finance_bank_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  file_name text,
  file_sha256 text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, file_sha256)
);
GRANT SELECT, DELETE ON public.finance_bank_imports TO authenticated;
GRANT ALL ON public.finance_bank_imports TO service_role;
ALTER TABLE public.finance_bank_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_bank_imports_owner_select ON public.finance_bank_imports FOR SELECT TO authenticated
  USING (public.finance_is_business_owner(auth.uid(), business_id));
CREATE POLICY finance_bank_imports_owner_delete ON public.finance_bank_imports FOR DELETE TO authenticated
  USING (public.finance_is_business_owner(auth.uid(), business_id));

CREATE TABLE public.finance_bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.finance_bank_imports(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  row_index integer NOT NULL,
  row_fingerprint text NOT NULL,
  txn_date date NOT NULL,
  description text NOT NULL DEFAULT '',
  amount_cents bigint NOT NULL,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  possible_duplicate_of uuid,
  classification text NOT NULL DEFAULT 'needs_review'
    CHECK (classification IN ('needs_review','income','expense','transfer','personal','excluded','matched')),
  category text,
  matched_type text CHECK (matched_type IN ('payment','income','expense','payroll')),
  matched_id uuid,
  note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_id, row_index),
  CHECK ((classification = 'matched') = (matched_id IS NOT NULL AND matched_type IS NOT NULL))
);
CREATE INDEX finance_bank_transactions_biz_date ON public.finance_bank_transactions (business_id, txn_date);
CREATE INDEX finance_bank_transactions_fp ON public.finance_bank_transactions (business_id, row_fingerprint);
CREATE UNIQUE INDEX finance_bank_transactions_one_match ON public.finance_bank_transactions (matched_type, matched_id) WHERE matched_id IS NOT NULL;
GRANT SELECT, UPDATE ON public.finance_bank_transactions TO authenticated;
GRANT ALL ON public.finance_bank_transactions TO service_role;
ALTER TABLE public.finance_bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_bank_transactions_owner_select ON public.finance_bank_transactions FOR SELECT TO authenticated
  USING (public.finance_is_business_owner(auth.uid(), business_id));
CREATE POLICY finance_bank_transactions_owner_update ON public.finance_bank_transactions FOR UPDATE TO authenticated
  USING (public.finance_is_business_owner(auth.uid(), business_id))
  WITH CHECK (public.finance_is_business_owner(auth.uid(), business_id));

-- Source columns are immutable; only review fields may change.
CREATE OR REPLACE FUNCTION public.finance_bank_txn_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.import_id IS DISTINCT FROM OLD.import_id OR NEW.business_id IS DISTINCT FROM OLD.business_id
     OR NEW.row_index IS DISTINCT FROM OLD.row_index OR NEW.row_fingerprint IS DISTINCT FROM OLD.row_fingerprint
     OR NEW.txn_date IS DISTINCT FROM OLD.txn_date OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.amount_cents IS DISTINCT FROM OLD.amount_cents OR NEW.raw IS DISTINCT FROM OLD.raw
     OR NEW.possible_duplicate_of IS DISTINCT FROM OLD.possible_duplicate_of OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Imported bank rows cannot be changed';
  END IF;
  IF NEW.classification = 'matched' THEN
    IF NEW.matched_type = 'payment' AND NOT EXISTS (SELECT 1 FROM platform_payments WHERE id = NEW.matched_id AND business_id = NEW.business_id) THEN
      RAISE EXCEPTION 'Matched payment not found in this business'; END IF;
    IF NEW.matched_type = 'income' AND NOT EXISTS (SELECT 1 FROM finance_income WHERE id = NEW.matched_id AND business_id = NEW.business_id) THEN
      RAISE EXCEPTION 'Matched income not found in this business'; END IF;
    IF NEW.matched_type = 'payroll' AND NOT EXISTS (SELECT 1 FROM finance_payroll_payments WHERE id = NEW.matched_id AND business_id = NEW.business_id) THEN
      RAISE EXCEPTION 'Matched payroll not found in this business'; END IF;
    IF NEW.matched_type = 'expense' AND NOT EXISTS (
      SELECT 1 FROM finance_expenses e JOIN businesses b ON b.workspace_id = e.workspace_id
      WHERE e.id = NEW.matched_id AND b.id = NEW.business_id) THEN
      RAISE EXCEPTION 'Matched expense not found in this workspace'; END IF;
  END IF;
  NEW.reviewed_by := auth.uid();
  NEW.reviewed_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_finance_bank_txn_guard BEFORE UPDATE ON public.finance_bank_transactions
  FOR EACH ROW EXECUTE FUNCTION public.finance_bank_txn_guard();

-- Atomic, idempotent import. Same file twice returns the first import.
CREATE OR REPLACE FUNCTION public.finance_import_bank_csv(_business_id uuid, _file_name text, _file_sha256 text, _rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing uuid; new_id uuid; r jsonb; n integer := 0; dup uuid;
BEGIN
  IF NOT public.finance_is_business_owner(auth.uid(), _business_id) THEN RAISE EXCEPTION 'Owner only'; END IF;
  IF _file_sha256 !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid file hash'; END IF;
  IF jsonb_typeof(_rows) <> 'array' OR jsonb_array_length(_rows) = 0 OR jsonb_array_length(_rows) > 5000 THEN
    RAISE EXCEPTION 'Rows must be a non-empty list of at most 5000'; END IF;
  SELECT id INTO existing FROM finance_bank_imports WHERE business_id = _business_id AND file_sha256 = _file_sha256;
  IF existing IS NOT NULL THEN RETURN jsonb_build_object('import_id', existing, 'already_imported', true); END IF;
  INSERT INTO finance_bank_imports (business_id, file_name, file_sha256, row_count)
    VALUES (_business_id, left(_file_name, 255), _file_sha256, jsonb_array_length(_rows)) RETURNING id INTO new_id;
  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    IF (r->>'txn_date') !~ '^\d{4}-\d{2}-\d{2}$' OR (r->>'amount_cents') !~ '^-?\d{1,13}$' OR (r->>'amount_cents')::bigint = 0 THEN
      RAISE EXCEPTION 'Invalid row %', n; END IF;
    SELECT id INTO dup FROM finance_bank_transactions
      WHERE business_id = _business_id AND row_fingerprint = r->>'row_fingerprint' AND import_id <> new_id LIMIT 1;
    INSERT INTO finance_bank_transactions (import_id, business_id, row_index, row_fingerprint, txn_date, description, amount_cents, raw, possible_duplicate_of)
      VALUES (new_id, _business_id, (r->>'row_index')::int, left(r->>'row_fingerprint', 500), (r->>'txn_date')::date,
              left(coalesce(r->>'description',''), 500), (r->>'amount_cents')::bigint, coalesce(r->'raw','{}'::jsonb), dup);
    n := n + 1;
  END LOOP;
  RETURN jsonb_build_object('import_id', new_id, 'already_imported', false, 'rows', n);
END $$;
REVOKE ALL ON FUNCTION public.finance_import_bank_csv(uuid, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finance_import_bank_csv(uuid, text, text, jsonb) TO authenticated, service_role;