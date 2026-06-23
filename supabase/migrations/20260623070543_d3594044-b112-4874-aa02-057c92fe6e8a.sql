CREATE INDEX IF NOT EXISTS idx_platform_jobs_biz_sched_active ON public.platform_jobs (business_id, scheduled_start) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_platform_jobs_property ON public.platform_jobs (property_id) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_invoices_job ON public.platform_invoices (job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_invoices_property ON public.platform_invoices (property_id) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_payments_biz_date ON public.platform_payments (business_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_platform_job_visits_biz_date_status ON public.platform_job_visits (business_id, scheduled_date, status);
CREATE INDEX IF NOT EXISTS idx_jobber_jobs_biz_sched_active ON public.jobber_jobs (business_id, scheduled_start) WHERE status NOT IN ('archived','canceled','cancelled','deleted');
CREATE INDEX IF NOT EXISTS idx_platform_quote_versions_quote ON public.platform_quote_versions (quote_id);