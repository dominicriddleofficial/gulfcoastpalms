-- ============================================================
-- sms_queue: unified outbound SMS queue (runs alongside direct send-sms)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sms_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid,
  phone text NOT NULL,
  message_body text NOT NULL,
  reason text NOT NULL,                 -- e.g. quote_approved, on_my_way, review_request, lead_alert, invoice_reminder
  related_type text,                    -- quote | job | invoice | lead | review | recurring | other
  related_id uuid,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sending','sent','failed','skipped_opt_out','skipped_no_consent','cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  provider_message_id text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_queue_due
  ON public.sms_queue (status, scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_sms_queue_business_created
  ON public.sms_queue (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_queue_related
  ON public.sms_queue (related_type, related_id);

CREATE TRIGGER trg_sms_queue_updated_at
  BEFORE UPDATE ON public.sms_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sms_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view sms_queue"
  ON public.sms_queue FOR SELECT TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

-- Writes are performed via edge functions using the service role; no client INSERT/UPDATE/DELETE policies.

-- ============================================================
-- sms_quiet_hours: optional per-business quiet window
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sms_quiet_hours (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  start_hour smallint NOT NULL DEFAULT 21 CHECK (start_hour BETWEEN 0 AND 23),
  end_hour smallint NOT NULL DEFAULT 8   CHECK (end_hour BETWEEN 0 AND 23),
  timezone text NOT NULL DEFAULT 'America/Chicago',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sms_quiet_hours_updated_at
  BEFORE UPDATE ON public.sms_quiet_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sms_quiet_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view quiet hours"
  ON public.sms_quiet_hours FOR SELECT TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Owners/managers manage quiet hours"
  ON public.sms_quiet_hours FOR ALL TO authenticated
  USING (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager','office_manager']))
  WITH CHECK (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager','office_manager']));

-- ============================================================
-- Indexes for log/event tables (pagination friendly)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_created
  ON public.audit_logs (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_events_business_created
  ON public.timeline_events (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_events_related
  ON public.timeline_events (related_entity_type, related_entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_visit_events_business_created
  ON public.job_visit_events (business_id, created_at DESC);

-- ============================================================
-- Allow service role / system context to write audit_logs without strict auth.uid() match
-- (existing user-insert policy remains)
-- ============================================================
DROP POLICY IF EXISTS "System insert audit logs" ON public.audit_logs;
CREATE POLICY "System insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NULL
    OR user_id = auth.uid()
    OR (business_id IS NOT NULL AND public.has_business_access(auth.uid(), business_id))
  );