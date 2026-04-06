
-- Platform quotes
CREATE TABLE public.platform_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  quote_number text NOT NULL,
  customer_id uuid REFERENCES public.platform_customers(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.platform_properties(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.platform_leads(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  quote_stage text DEFAULT 'initial',
  subtotal numeric DEFAULT 0,
  discount_total numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_total numeric DEFAULT 0,
  total numeric DEFAULT 0,
  deposit_required_flag boolean DEFAULT false,
  deposit_type text DEFAULT 'percentage',
  deposit_value numeric DEFAULT 50,
  deposit_amount_calculated numeric DEFAULT 0,
  valid_until date,
  sent_at timestamptz,
  first_viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  expired_at timestamptz,
  lost_reason text,
  internal_notes text,
  public_notes text,
  terms_snapshot text,
  version_number integer DEFAULT 1,
  created_by_user_id uuid,
  last_modified_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, quote_number)
);
ALTER TABLE public.platform_quotes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_platform_quotes_business ON public.platform_quotes(business_id);
CREATE INDEX idx_platform_quotes_status ON public.platform_quotes(status);
CREATE INDEX idx_platform_quotes_customer ON public.platform_quotes(customer_id);
CREATE INDEX idx_platform_quotes_created ON public.platform_quotes(created_at DESC);

-- Quote line items
CREATE TABLE public.platform_quote_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.platform_quotes(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_catalog_id uuid,
  line_type text DEFAULT 'service',
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
ALTER TABLE public.platform_quote_line_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_quote_line_items_quote ON public.platform_quote_line_items(quote_id);

-- Quote versions
CREATE TABLE public.platform_quote_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.platform_quotes(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot_json jsonb NOT NULL,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_quote_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- platform_quotes
CREATE POLICY "Users view own business quotes" ON public.platform_quotes
FOR SELECT TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users create business quotes" ON public.platform_quotes
FOR INSERT TO authenticated
WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users update business quotes" ON public.platform_quotes
FOR UPDATE TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Owner deletes quotes" ON public.platform_quotes
FOR DELETE TO authenticated
USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- platform_quote_line_items
CREATE POLICY "Users view quote line items" ON public.platform_quote_line_items
FOR SELECT TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users create quote line items" ON public.platform_quote_line_items
FOR INSERT TO authenticated
WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users update quote line items" ON public.platform_quote_line_items
FOR UPDATE TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users delete quote line items" ON public.platform_quote_line_items
FOR DELETE TO authenticated
USING (has_business_access(auth.uid(), business_id));

-- platform_quote_versions
CREATE POLICY "Users view quote versions" ON public.platform_quote_versions
FOR SELECT TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users create quote versions" ON public.platform_quote_versions
FOR INSERT TO authenticated
WITH CHECK (has_business_access(auth.uid(), business_id));

-- Triggers
CREATE TRIGGER update_platform_quotes_updated_at BEFORE UPDATE ON public.platform_quotes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
