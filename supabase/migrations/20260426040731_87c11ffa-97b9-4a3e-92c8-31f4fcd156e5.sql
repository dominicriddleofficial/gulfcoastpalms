CREATE TABLE IF NOT EXISTS public.jobber_job_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  jobber_job_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (jobber_job_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_jja_user_business ON public.jobber_job_assignments(user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_jja_job ON public.jobber_job_assignments(jobber_job_id);

ALTER TABLE public.jobber_job_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business users view assignments"
  ON public.jobber_job_assignments
  FOR SELECT
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Owners and managers manage assignments"
  ON public.jobber_job_assignments
  FOR ALL
  USING (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager']))
  WITH CHECK (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager']));