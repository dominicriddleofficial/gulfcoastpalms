
-- review_requests table for automated review SMS
CREATE TABLE IF NOT EXISTS public.review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid,
  business_id uuid NOT NULL,
  customer_name text,
  customer_phone text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_access_review_requests" ON public.review_requests
  FOR ALL TO authenticated
  USING (has_business_access(auth.uid(), business_id))
  WITH CHECK (has_business_access(auth.uid(), business_id));

-- customer_property_notes table
CREATE TABLE IF NOT EXISTS public.customer_property_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  business_id uuid NOT NULL,
  gate_code text,
  has_dogs boolean DEFAULT false,
  dog_notes text,
  parking_instructions text,
  access_restrictions text,
  hoa_requirements text,
  equipment_notes text,
  general_notes text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.customer_property_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_access_property_notes" ON public.customer_property_notes
  FOR ALL TO authenticated
  USING (has_business_access(auth.uid(), business_id))
  WITH CHECK (has_business_access(auth.uid(), business_id));

-- recurring_contracts table
CREATE TABLE IF NOT EXISTS public.recurring_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  business_id uuid NOT NULL,
  service_type text NOT NULL,
  palm_count integer,
  price_per_visit numeric(10,2) NOT NULL,
  frequency text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  next_scheduled_date date,
  auto_renew boolean DEFAULT true,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.recurring_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_access_recurring_contracts" ON public.recurring_contracts
  FOR ALL TO authenticated
  USING (has_business_access(auth.uid(), business_id))
  WITH CHECK (has_business_access(auth.uid(), business_id));

-- Add lead_source to legacy leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_source text;

-- Add lead_source to platform_leads table
ALTER TABLE public.platform_leads ADD COLUMN IF NOT EXISTS lead_source text;
