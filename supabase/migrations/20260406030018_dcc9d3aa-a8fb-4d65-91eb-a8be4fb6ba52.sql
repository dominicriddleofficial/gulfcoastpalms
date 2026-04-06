
-- Platform Invoices
CREATE TABLE public.platform_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  customer_id uuid REFERENCES public.platform_customers(id),
  property_id uuid REFERENCES public.platform_properties(id),
  job_id uuid REFERENCES public.platform_jobs(id),
  quote_id uuid REFERENCES public.platform_quotes(id),
  status text NOT NULL DEFAULT 'draft',
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  terms text DEFAULT 'Due on receipt',
  subtotal numeric DEFAULT 0,
  discount_total numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_total numeric DEFAULT 0,
  total numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  balance_due numeric DEFAULT 0,
  deposit_required boolean DEFAULT false,
  deposit_amount numeric DEFAULT 0,
  deposit_paid boolean DEFAULT false,
  sent_at timestamptz,
  viewed_at timestamptz,
  paid_at timestamptz,
  voided_at timestamptz,
  overdue_notified_at timestamptz,
  public_notes text,
  internal_notes text,
  payment_instructions text,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, invoice_number)
);

ALTER TABLE public.platform_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view business invoices" ON public.platform_invoices FOR SELECT TO authenticated
  USING (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users create business invoices" ON public.platform_invoices FOR INSERT TO authenticated
  WITH CHECK (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users update business invoices" ON public.platform_invoices FOR UPDATE TO authenticated
  USING (has_business_access(auth.uid(), business_id));
CREATE POLICY "Owner deletes invoices" ON public.platform_invoices FOR DELETE TO authenticated
  USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_platform_invoices_updated_at BEFORE UPDATE ON public.platform_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Platform Invoice Line Items
CREATE TABLE public.platform_invoice_line_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.platform_invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'each',
  unit_price numeric NOT NULL DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  taxable_flag boolean DEFAULT true,
  line_total numeric NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view invoice line items" ON public.platform_invoice_line_items FOR SELECT TO authenticated
  USING (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users create invoice line items" ON public.platform_invoice_line_items FOR INSERT TO authenticated
  WITH CHECK (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users update invoice line items" ON public.platform_invoice_line_items FOR UPDATE TO authenticated
  USING (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users delete invoice line items" ON public.platform_invoice_line_items FOR DELETE TO authenticated
  USING (has_business_access(auth.uid(), business_id));

-- Platform Payments
CREATE TABLE public.platform_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payment_number text NOT NULL,
  invoice_id uuid REFERENCES public.platform_invoices(id),
  customer_id uuid REFERENCES public.platform_customers(id),
  amount numeric NOT NULL DEFAULT 0,
  method text DEFAULT 'card',
  reference_number text,
  status text NOT NULL DEFAULT 'completed',
  payment_date date DEFAULT CURRENT_DATE,
  is_deposit boolean DEFAULT false,
  is_refund boolean DEFAULT false,
  notes text,
  recorded_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, payment_number)
);

ALTER TABLE public.platform_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view business payments" ON public.platform_payments FOR SELECT TO authenticated
  USING (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users create business payments" ON public.platform_payments FOR INSERT TO authenticated
  WITH CHECK (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users update business payments" ON public.platform_payments FOR UPDATE TO authenticated
  USING (has_business_access(auth.uid(), business_id));
CREATE POLICY "Owner deletes payments" ON public.platform_payments FOR DELETE TO authenticated
  USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_platform_payments_updated_at BEFORE UPDATE ON public.platform_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add numbering sequences for invoices and payments
INSERT INTO public.numbering_sequences (business_id, record_type, prefix, next_number, padding_length)
SELECT id, 'invoice', 'I', 1, 6 FROM public.businesses
ON CONFLICT DO NOTHING;

INSERT INTO public.numbering_sequences (business_id, record_type, prefix, next_number, padding_length)
SELECT id, 'payment', 'P', 1, 6 FROM public.businesses
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX idx_platform_invoices_business ON public.platform_invoices(business_id);
CREATE INDEX idx_platform_invoices_status ON public.platform_invoices(business_id, status);
CREATE INDEX idx_platform_invoices_customer ON public.platform_invoices(customer_id);
CREATE INDEX idx_platform_invoices_due ON public.platform_invoices(due_date) WHERE status NOT IN ('paid', 'void');
CREATE INDEX idx_platform_invoice_line_items_invoice ON public.platform_invoice_line_items(invoice_id);
CREATE INDEX idx_platform_payments_business ON public.platform_payments(business_id);
CREATE INDEX idx_platform_payments_invoice ON public.platform_payments(invoice_id);
CREATE INDEX idx_platform_payments_customer ON public.platform_payments(customer_id);
