-- =========================================================================
-- 1) STRIPE EVENTS DEDUPE TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  related_entity_type text,
  related_entity_id uuid,
  payload jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  processing_status text NOT NULL DEFAULT 'processing',
  error_message text,
  livemode boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type
  ON public.stripe_events(event_type, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_events_business
  ON public.stripe_events(business_id, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_events_entity
  ON public.stripe_events(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_status
  ON public.stripe_events(processing_status, processed_at DESC);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members view their stripe events" ON public.stripe_events;
CREATE POLICY "Business members view their stripe events"
  ON public.stripe_events FOR SELECT
  USING (
    business_id IS NOT NULL
    AND public.has_business_access(auth.uid(), business_id)
  );

-- No INSERT/UPDATE/DELETE policies — only service role writes.

-- =========================================================================
-- 2) DAILY CLEANUP: prune successful events older than 90 days
-- =========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('stripe_events_cleanup_daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'stripe_events_cleanup_daily');

    PERFORM cron.schedule(
      'stripe_events_cleanup_daily',
      '15 3 * * *',
      $cron$
        DELETE FROM public.stripe_events
        WHERE processed_at < now() - interval '90 days'
          AND processing_status = 'success';
      $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping pg_cron scheduling: %', SQLERRM;
END $$;

-- =========================================================================
-- 3) PERFORMANCE INDEXES
-- =========================================================================

-- Platform leads (note: lead_status, inquiry_phone, inquiry_email are the real columns)
CREATE INDEX IF NOT EXISTS idx_platform_leads_business_created
  ON public.platform_leads(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_leads_business_status_created
  ON public.platform_leads(business_id, lead_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_leads_phone
  ON public.platform_leads(inquiry_phone) WHERE inquiry_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_leads_email
  ON public.platform_leads(inquiry_email) WHERE inquiry_email IS NOT NULL;

-- Platform quotes
CREATE INDEX IF NOT EXISTS idx_platform_quotes_business_status_created
  ON public.platform_quotes(business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_quotes_number
  ON public.platform_quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_platform_quotes_customer
  ON public.platform_quotes(customer_id, created_at DESC) WHERE customer_id IS NOT NULL;

-- Platform invoices (note: issue_date, not issued_at)
CREATE INDEX IF NOT EXISTS idx_platform_invoices_business_status_issued
  ON public.platform_invoices(business_id, status, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_due
  ON public.platform_invoices(business_id, due_date, status)
  WHERE status NOT IN ('paid', 'void', 'voided');
CREATE INDEX IF NOT EXISTS idx_platform_invoices_quote
  ON public.platform_invoices(quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_invoices_customer
  ON public.platform_invoices(customer_id, created_at DESC) WHERE customer_id IS NOT NULL;

-- Platform customers
CREATE INDEX IF NOT EXISTS idx_platform_customers_business_name
  ON public.platform_customers(business_id, display_name);
CREATE INDEX IF NOT EXISTS idx_platform_customers_phone
  ON public.platform_customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_customers_email
  ON public.platform_customers(email) WHERE email IS NOT NULL;

-- Jobber clients
CREATE INDEX IF NOT EXISTS idx_jobber_clients_name
  ON public.jobber_clients(display_name);
CREATE INDEX IF NOT EXISTS idx_jobber_clients_phone
  ON public.jobber_clients(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobber_clients_email
  ON public.jobber_clients(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobber_clients_synced
  ON public.jobber_clients(synced_at DESC);

-- Jobber jobs (note: scheduled_start, not start_at)
CREATE INDEX IF NOT EXISTS idx_jobber_jobs_business_start
  ON public.jobber_jobs(business_id, scheduled_start DESC);
CREATE INDEX IF NOT EXISTS idx_jobber_jobs_business_status_start
  ON public.jobber_jobs(business_id, status, scheduled_start DESC);
CREATE INDEX IF NOT EXISTS idx_jobber_jobs_client
  ON public.jobber_jobs(client_id);

-- Jobber properties
CREATE INDEX IF NOT EXISTS idx_jobber_properties_client
  ON public.jobber_properties(client_id);

-- Platform notifications
CREATE INDEX IF NOT EXISTS idx_platform_notifications_user_unread
  ON public.platform_notifications(recipient_user_id, is_read, created_at DESC)
  WHERE is_archived = false;

-- Sync logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_status_started
  ON public.sync_logs(status, started_at DESC);

-- Platform payments
CREATE INDEX IF NOT EXISTS idx_platform_payments_business_created
  ON public.platform_payments(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_payments_invoice
  ON public.platform_payments(invoice_id) WHERE invoice_id IS NOT NULL;

-- SMS conversations (recently added — index to keep inbox fast)
CREATE INDEX IF NOT EXISTS idx_sms_conversations_business_recent
  ON public.sms_conversations(business_id, last_message_at DESC)
  WHERE is_archived = false;

-- =========================================================================
-- 4) ANALYZE so the planner picks up the new indexes immediately
-- =========================================================================
ANALYZE public.platform_leads;
ANALYZE public.platform_quotes;
ANALYZE public.platform_invoices;
ANALYZE public.platform_customers;
ANALYZE public.platform_payments;
ANALYZE public.platform_notifications;
ANALYZE public.jobber_clients;
ANALYZE public.jobber_jobs;
ANALYZE public.jobber_properties;
ANALYZE public.sync_logs;
ANALYZE public.sms_conversations;
ANALYZE public.stripe_events;