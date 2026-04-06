
-- Master people (cross-business identity)
CREATE TABLE public.master_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  company_name text,
  primary_email text,
  primary_phone text,
  secondary_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.master_people ENABLE ROW LEVEL SECURITY;

-- Platform customers (business-owned)
CREATE TABLE public.platform_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  master_person_id uuid REFERENCES public.master_people(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  first_name text,
  last_name text,
  company_name text,
  email text,
  phone text,
  secondary_phone text,
  preferred_contact_method text DEFAULT 'phone',
  customer_status text NOT NULL DEFAULT 'active',
  source text,
  tags jsonb DEFAULT '[]'::jsonb,
  vip_flag boolean DEFAULT false,
  do_not_contact_flag boolean DEFAULT false,
  referral_source text,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_customers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_platform_customers_business ON public.platform_customers(business_id);
CREATE INDEX idx_platform_customers_phone ON public.platform_customers(phone);
CREATE INDEX idx_platform_customers_email ON public.platform_customers(email);

-- Platform properties (business-owned)
CREATE TABLE public.platform_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.platform_customers(id) ON DELETE CASCADE,
  property_label text,
  address_1 text NOT NULL,
  address_2 text,
  city text NOT NULL,
  state text NOT NULL DEFAULT 'FL',
  zip text NOT NULL,
  country text DEFAULT 'US',
  latitude numeric,
  longitude numeric,
  geocode_status text DEFAULT 'pending',
  geocode_source text,
  geocode_last_attempt_at timestamptz,
  property_type text DEFAULT 'residential',
  gate_code text,
  access_notes text,
  lot_size text,
  map_place_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_properties ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_platform_properties_business ON public.platform_properties(business_id);
CREATE INDEX idx_platform_properties_customer ON public.platform_properties(customer_id);

-- Customer business metrics
CREATE TABLE public.customer_business_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.platform_customers(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  total_quotes integer DEFAULT 0,
  total_jobs integer DEFAULT 0,
  total_invoiced numeric DEFAULT 0,
  total_collected numeric DEFAULT 0,
  first_contact_at timestamptz,
  first_job_at timestamptz,
  last_activity_at timestamptz,
  lifetime_value numeric DEFAULT 0,
  last_quote_status text,
  last_invoice_status text,
  repeat_customer_flag boolean DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id, business_id)
);
ALTER TABLE public.customer_business_metrics ENABLE ROW LEVEL SECURITY;

-- Lead sources
CREATE TABLE public.platform_lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  source_type text DEFAULT 'other',
  active_status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_lead_sources ENABLE ROW LEVEL SECURITY;

-- Platform leads (business-owned)
CREATE TABLE public.platform_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.platform_lead_sources(id) ON DELETE SET NULL,
  source_name text,
  website_origin text,
  landing_page_url text,
  referrer_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  customer_id uuid REFERENCES public.platform_customers(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.platform_properties(id) ON DELETE SET NULL,
  inquiry_name text NOT NULL,
  inquiry_phone text,
  inquiry_email text,
  requested_service text,
  requested_service_category text,
  budget_range text,
  urgency_level text DEFAULT 'normal',
  message text,
  uploaded_files_count integer DEFAULT 0,
  lead_status text NOT NULL DEFAULT 'new',
  assigned_to_user_id uuid,
  next_follow_up_at timestamptz,
  converted_quote_id uuid,
  converted_job_id uuid,
  lost_reason text,
  raw_payload_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_platform_leads_business ON public.platform_leads(business_id);
CREATE INDEX idx_platform_leads_status ON public.platform_leads(lead_status);
CREATE INDEX idx_platform_leads_phone ON public.platform_leads(inquiry_phone);
CREATE INDEX idx_platform_leads_email ON public.platform_leads(inquiry_email);
CREATE INDEX idx_platform_leads_created ON public.platform_leads(created_at DESC);

-- Lead files
CREATE TABLE public.platform_lead_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.platform_leads(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text,
  mime_type text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_lead_files ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- master_people: accessible by any authenticated user with platform access
CREATE POLICY "Authenticated users view master_people" ON public.master_people
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Platform users manage master_people" ON public.master_people
FOR ALL TO authenticated
USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- platform_customers
CREATE POLICY "Users view own business customers" ON public.platform_customers
FOR SELECT TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users create business customers" ON public.platform_customers
FOR INSERT TO authenticated
WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users update business customers" ON public.platform_customers
FOR UPDATE TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Owner deletes customers" ON public.platform_customers
FOR DELETE TO authenticated
USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- platform_properties
CREATE POLICY "Users view own business properties" ON public.platform_properties
FOR SELECT TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users create business properties" ON public.platform_properties
FOR INSERT TO authenticated
WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users update business properties" ON public.platform_properties
FOR UPDATE TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Owner deletes properties" ON public.platform_properties
FOR DELETE TO authenticated
USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- customer_business_metrics
CREATE POLICY "Users view own business metrics" ON public.customer_business_metrics
FOR SELECT TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Owner manages metrics" ON public.customer_business_metrics
FOR ALL TO authenticated
USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- platform_lead_sources
CREATE POLICY "Users view lead sources" ON public.platform_lead_sources
FOR SELECT TO authenticated
USING (business_id IS NULL OR has_business_access(auth.uid(), business_id));

CREATE POLICY "Owner manages lead sources" ON public.platform_lead_sources
FOR ALL TO authenticated
USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- platform_leads
CREATE POLICY "Users view own business leads" ON public.platform_leads
FOR SELECT TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users create business leads" ON public.platform_leads
FOR INSERT TO authenticated
WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users update business leads" ON public.platform_leads
FOR UPDATE TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Owner deletes leads" ON public.platform_leads
FOR DELETE TO authenticated
USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- Public lead submission (for website forms)
CREATE POLICY "Public can submit leads" ON public.platform_leads
FOR INSERT TO anon
WITH CHECK (true);

-- platform_lead_files
CREATE POLICY "Users view lead files" ON public.platform_lead_files
FOR SELECT TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users create lead files" ON public.platform_lead_files
FOR INSERT TO authenticated
WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE POLICY "Owner deletes lead files" ON public.platform_lead_files
FOR DELETE TO authenticated
USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- Triggers
CREATE TRIGGER update_master_people_updated_at BEFORE UPDATE ON public.master_people
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_customers_updated_at BEFORE UPDATE ON public.platform_customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_properties_updated_at BEFORE UPDATE ON public.platform_properties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_leads_updated_at BEFORE UPDATE ON public.platform_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Duplicate detection function
CREATE OR REPLACE FUNCTION public.find_duplicate_leads(_business_id uuid, _phone text DEFAULT NULL, _email text DEFAULT NULL)
RETURNS SETOF public.platform_leads
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.platform_leads
  WHERE business_id = _business_id
    AND lead_status NOT IN ('lost')
    AND (
      (_phone IS NOT NULL AND inquiry_phone = _phone)
      OR (_email IS NOT NULL AND inquiry_email = _email)
    )
  ORDER BY created_at DESC
  LIMIT 5
$$;

-- Find duplicate customers
CREATE OR REPLACE FUNCTION public.find_duplicate_customers(_business_id uuid, _phone text DEFAULT NULL, _email text DEFAULT NULL)
RETURNS SETOF public.platform_customers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.platform_customers
  WHERE business_id = _business_id
    AND (
      (_phone IS NOT NULL AND phone = _phone)
      OR (_email IS NOT NULL AND email = _email)
    )
  ORDER BY created_at DESC
  LIMIT 5
$$;
