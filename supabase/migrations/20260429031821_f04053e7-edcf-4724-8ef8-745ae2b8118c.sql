-- =========================================================
-- FINANCE MODULE — payroll, income, expenses, tax docs
-- All tables workspace-scoped via business_id with owner-only RLS.
-- =========================================================

-- 1. PAYROLL TEAM MEMBERS
CREATE TABLE public.finance_payroll_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text,
  pay_type text NOT NULL DEFAULT 'hourly', -- 'hourly' | 'flat'
  hourly_rate numeric(10,2) DEFAULT 0,
  flat_rate numeric(10,2) DEFAULT 0,
  classification text NOT NULL DEFAULT 'w2', -- 'w2' | '1099'
  start_date date,
  phone text,
  email text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_finance_payroll_members_biz ON public.finance_payroll_members(business_id);

-- 2. PAYROLL HOURS LOG (per-period entries)
CREATE TABLE public.finance_payroll_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.finance_payroll_members(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  hours numeric(6,2),         -- nullable for flat-rate jobs
  flat_amount numeric(10,2),  -- for one-off flat job pay
  notes text,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_finance_payroll_hours_biz ON public.finance_payroll_hours(business_id);
CREATE INDEX idx_finance_payroll_hours_member ON public.finance_payroll_hours(member_id);
CREATE INDEX idx_finance_payroll_hours_date ON public.finance_payroll_hours(business_id, work_date DESC);

-- 3. PAYROLL PAYMENTS (each "Pay" action)
CREATE TABLE public.finance_payroll_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.finance_payroll_members(id) ON DELETE CASCADE,
  pay_date date NOT NULL DEFAULT CURRENT_DATE,
  period_start date,
  period_end date,
  total_hours numeric(8,2) DEFAULT 0,
  rate_used numeric(10,2) DEFAULT 0,
  pay_type text NOT NULL DEFAULT 'hourly',
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash', -- cash | zelle | check | direct_deposit | other
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_finance_payroll_payments_biz ON public.finance_payroll_payments(business_id);
CREATE INDEX idx_finance_payroll_payments_member ON public.finance_payroll_payments(member_id);
CREATE INDEX idx_finance_payroll_payments_date ON public.finance_payroll_payments(business_id, pay_date DESC);

-- 4. INCOME ENTRIES (manual add; Jobber pulled live)
CREATE TABLE public.finance_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  income_date date NOT NULL DEFAULT CURRENT_DATE,
  customer_name text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  service_type text,
  source text NOT NULL DEFAULT 'manual', -- 'manual'
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_finance_income_biz_date ON public.finance_income(business_id, income_date DESC);

-- 5. EXPENSES
CREATE TABLE public.finance_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE, -- nullable when shared
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE, -- always set
  is_shared boolean NOT NULL DEFAULT false, -- when true, business_id is null and split across workspace businesses
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'Misc',
  subcategory text,
  vendor text,
  payment_method text DEFAULT 'cash',
  receipt_url text,         -- storage path in finance-receipts bucket
  notes text,
  recurring boolean NOT NULL DEFAULT false,
  recurring_frequency text, -- 'weekly' | 'biweekly' | 'monthly'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_finance_expenses_biz_date ON public.finance_expenses(business_id, expense_date DESC);
CREATE INDEX idx_finance_expenses_ws_date ON public.finance_expenses(workspace_id, expense_date DESC);
CREATE INDEX idx_finance_expenses_shared ON public.finance_expenses(workspace_id, is_shared) WHERE is_shared = true;

-- 6. TAX DOCUMENTS
CREATE TABLE public.finance_tax_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tax_year integer NOT NULL,
  document_type text NOT NULL, -- 'W-9' | 'W-4' | '1099' | 'W-2' | 'Other'
  person_name text,
  file_url text NOT NULL,
  file_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_finance_tax_docs_biz_year ON public.finance_tax_documents(business_id, tax_year DESC);

-- 7. QUARTERLY TAX PAYMENTS
CREATE TABLE public.finance_quarterly_taxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tax_year integer NOT NULL,
  quarter integer NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  paid_on date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, tax_year, quarter)
);

-- updated_at triggers
CREATE TRIGGER trg_finance_payroll_members_updated
  BEFORE UPDATE ON public.finance_payroll_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_finance_expenses_updated
  BEFORE UPDATE ON public.finance_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- RLS — OWNER ONLY (workspace owner)
-- =========================================================
ALTER TABLE public.finance_payroll_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_payroll_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_payroll_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_tax_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_quarterly_taxes ENABLE ROW LEVEL SECURITY;

-- Helper predicate: caller is workspace owner of the business_id (or workspace_id for shared expenses)
-- Reuse existing public.has_business_access? That allows non-owners. We need owner-only.
-- Use is_workspace_owner combined with business->workspace lookup.

CREATE POLICY "finance_payroll_members_owner_all"
  ON public.finance_payroll_members FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.workspaces w ON w.id = b.workspace_id
    WHERE b.id = finance_payroll_members.business_id AND w.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.workspaces w ON w.id = b.workspace_id
    WHERE b.id = finance_payroll_members.business_id AND w.owner_user_id = auth.uid()
  ));

CREATE POLICY "finance_payroll_hours_owner_all"
  ON public.finance_payroll_hours FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.workspaces w ON w.id = b.workspace_id
    WHERE b.id = finance_payroll_hours.business_id AND w.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.workspaces w ON w.id = b.workspace_id
    WHERE b.id = finance_payroll_hours.business_id AND w.owner_user_id = auth.uid()
  ));

CREATE POLICY "finance_payroll_payments_owner_all"
  ON public.finance_payroll_payments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.workspaces w ON w.id = b.workspace_id
    WHERE b.id = finance_payroll_payments.business_id AND w.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.workspaces w ON w.id = b.workspace_id
    WHERE b.id = finance_payroll_payments.business_id AND w.owner_user_id = auth.uid()
  ));

CREATE POLICY "finance_income_owner_all"
  ON public.finance_income FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.workspaces w ON w.id = b.workspace_id
    WHERE b.id = finance_income.business_id AND w.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.workspaces w ON w.id = b.workspace_id
    WHERE b.id = finance_income.business_id AND w.owner_user_id = auth.uid()
  ));

-- Expenses: owner of the workspace_id (covers shared rows where business_id is null)
CREATE POLICY "finance_expenses_owner_all"
  ON public.finance_expenses FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = finance_expenses.workspace_id AND w.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = finance_expenses.workspace_id AND w.owner_user_id = auth.uid()
  ));

CREATE POLICY "finance_tax_documents_owner_all"
  ON public.finance_tax_documents FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.workspaces w ON w.id = b.workspace_id
    WHERE b.id = finance_tax_documents.business_id AND w.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.workspaces w ON w.id = b.workspace_id
    WHERE b.id = finance_tax_documents.business_id AND w.owner_user_id = auth.uid()
  ));

CREATE POLICY "finance_quarterly_taxes_owner_all"
  ON public.finance_quarterly_taxes FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.workspaces w ON w.id = b.workspace_id
    WHERE b.id = finance_quarterly_taxes.business_id AND w.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.workspaces w ON w.id = b.workspace_id
    WHERE b.id = finance_quarterly_taxes.business_id AND w.owner_user_id = auth.uid()
  ));

-- =========================================================
-- STORAGE — private buckets for receipts and tax docs
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('finance-receipts', 'finance-receipts', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('finance-tax-docs', 'finance-tax-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Receipts: owner-only, file path = workspace_id/...
CREATE POLICY "finance_receipts_owner_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'finance-receipts'
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.owner_user_id = auth.uid()
        AND w.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "finance_receipts_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'finance-receipts'
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.owner_user_id = auth.uid()
        AND w.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "finance_receipts_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'finance-receipts'
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.owner_user_id = auth.uid()
        AND w.id::text = (storage.foldername(name))[1]
    )
  );

-- Tax docs: owner-only, file path = workspace_id/...
CREATE POLICY "finance_tax_docs_owner_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'finance-tax-docs'
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.owner_user_id = auth.uid()
        AND w.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "finance_tax_docs_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'finance-tax-docs'
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.owner_user_id = auth.uid()
        AND w.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "finance_tax_docs_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'finance-tax-docs'
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.owner_user_id = auth.uid()
        AND w.id::text = (storage.foldername(name))[1]
    )
  );