ALTER TABLE public.platform_jobs
  ADD COLUMN IF NOT EXISTS excluded_from_unpaid boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_platform_jobs_unpaid_tracker
  ON public.platform_jobs (business_id, status, completed_at)
  WHERE deleted_at IS NULL AND excluded_from_unpaid = false AND source = 'platform';
