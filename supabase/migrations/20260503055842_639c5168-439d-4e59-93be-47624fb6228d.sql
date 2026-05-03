ALTER TABLE public.email_drip_enrollments
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.platform_customers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.platform_jobs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS failure_reason text;

ALTER TABLE public.email_drip_enrollments ALTER COLUMN lead_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_post_job_enrollment
  ON public.email_drip_enrollments(job_id, sequence_type)
  WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_drip_enrollments_customer
  ON public.email_drip_enrollments(customer_id) WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_drip_enrollments_business
  ON public.email_drip_enrollments(business_id) WHERE business_id IS NOT NULL;

DROP POLICY IF EXISTS "Workspace members insert post_job enrollments" ON public.email_drip_enrollments;
CREATE POLICY "Workspace members insert post_job enrollments"
  ON public.email_drip_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IS NOT NULL
    AND public.has_business_access(auth.uid(), business_id)
  );

DROP POLICY IF EXISTS "Workspace members view their drip enrollments" ON public.email_drip_enrollments;
CREATE POLICY "Workspace members view their drip enrollments"
  ON public.email_drip_enrollments
  FOR SELECT
  TO authenticated
  USING (
    business_id IS NOT NULL
    AND public.has_business_access(auth.uid(), business_id)
  );