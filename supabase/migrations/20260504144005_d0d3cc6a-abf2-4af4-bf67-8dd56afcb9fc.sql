CREATE TABLE public.job_visit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  jobber_job_id uuid NOT NULL REFERENCES public.jobber_jobs(id) ON DELETE CASCADE,
  on_my_way_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  on_my_way_sms_sent_at timestamptz,
  drip_enrolled_at timestamptz,
  review_queued_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jobber_job_id)
);

CREATE INDEX idx_job_visit_events_business ON public.job_visit_events(business_id);
CREATE INDEX idx_job_visit_events_job ON public.job_visit_events(jobber_job_id);

ALTER TABLE public.job_visit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_access_select_job_visit_events"
  ON public.job_visit_events FOR SELECT
  TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "business_access_insert_job_visit_events"
  ON public.job_visit_events FOR INSERT
  TO authenticated
  WITH CHECK (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "business_access_update_job_visit_events"
  ON public.job_visit_events FOR UPDATE
  TO authenticated
  USING (public.has_business_access(auth.uid(), business_id))
  WITH CHECK (public.has_business_access(auth.uid(), business_id));

CREATE TRIGGER update_job_visit_events_updated_at
  BEFORE UPDATE ON public.job_visit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();