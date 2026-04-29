CREATE TABLE public.pps_job_estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  system_type TEXT NOT NULL CHECK (system_type IN ('flake','metallic')),
  customer_name TEXT,
  job_date DATE,
  square_footage NUMERIC NOT NULL DEFAULT 0,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  suggested_min_price NUMERIC NOT NULL DEFAULT 0,
  suggested_standard_price NUMERIC NOT NULL DEFAULT 0,
  suggested_premium_price NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pps_job_estimates_business ON public.pps_job_estimates(business_id, created_at DESC);

ALTER TABLE public.pps_job_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view estimates"
  ON public.pps_job_estimates FOR SELECT TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Business members can insert estimates"
  ON public.pps_job_estimates FOR INSERT TO authenticated
  WITH CHECK (public.has_business_access(auth.uid(), business_id) AND created_by = auth.uid());

CREATE POLICY "Business members can update estimates"
  ON public.pps_job_estimates FOR UPDATE TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Business members can delete estimates"
  ON public.pps_job_estimates FOR DELETE TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

CREATE TRIGGER update_pps_job_estimates_updated_at
  BEFORE UPDATE ON public.pps_job_estimates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();