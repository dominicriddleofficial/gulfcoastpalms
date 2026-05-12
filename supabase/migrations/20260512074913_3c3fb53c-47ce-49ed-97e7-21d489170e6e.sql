-- ============================================================
-- automation_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  event_name text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('send_sms','send_email','create_notification','enqueue_job','noop')),
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  trigger_count integer NOT NULL DEFAULT 0,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_business_event
  ON public.automation_rules (business_id, event_name) WHERE enabled = true;

CREATE TRIGGER trg_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view automation_rules"
  ON public.automation_rules FOR SELECT TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Owners/managers manage automation_rules"
  ON public.automation_rules FOR ALL TO authenticated
  USING (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager','office_manager']))
  WITH CHECK (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager','office_manager']));

-- ============================================================
-- automation_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  event_payload jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','skipped')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_rule_created
  ON public.automation_runs (rule_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_business_status
  ON public.automation_runs (business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_event
  ON public.automation_runs (event_name, created_at DESC);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view automation_runs"
  ON public.automation_runs FOR SELECT TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

-- ============================================================
-- business_kpi_snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS public.business_kpi_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Chicago')::date,
  revenue_today numeric NOT NULL DEFAULT 0,
  revenue_week numeric NOT NULL DEFAULT 0,
  revenue_month numeric NOT NULL DEFAULT 0,
  jobs_today integer NOT NULL DEFAULT 0,
  jobs_week integer NOT NULL DEFAULT 0,
  jobs_month integer NOT NULL DEFAULT 0,
  quotes_open integer NOT NULL DEFAULT 0,
  quotes_won_30d integer NOT NULL DEFAULT 0,
  quote_conversion_30d numeric NOT NULL DEFAULT 0,
  invoices_outstanding_count integer NOT NULL DEFAULT 0,
  invoices_outstanding_total numeric NOT NULL DEFAULT 0,
  payments_collected_30d numeric NOT NULL DEFAULT 0,
  leads_new_today integer NOT NULL DEFAULT 0,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_business_date
  ON public.business_kpi_snapshots (business_id, snapshot_date DESC);

ALTER TABLE public.business_kpi_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view kpi_snapshots"
  ON public.business_kpi_snapshots FOR SELECT TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

-- KPI refresh function (runs as service role via cron)
CREATE OR REPLACE FUNCTION public.refresh_business_kpi_snapshots()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _biz uuid;
  _today date := (now() AT TIME ZONE 'America/Chicago')::date;
  _week_start date := _today - 6;
  _month_start date := _today - 29;
  _count integer := 0;
BEGIN
  FOR _biz IN SELECT id FROM public.businesses LOOP
    INSERT INTO public.business_kpi_snapshots AS s (
      business_id, snapshot_date,
      revenue_today, revenue_week, revenue_month,
      jobs_today, jobs_week, jobs_month,
      quotes_open, quotes_won_30d, quote_conversion_30d,
      invoices_outstanding_count, invoices_outstanding_total,
      payments_collected_30d, leads_new_today, refreshed_at
    )
    SELECT
      _biz, _today,
      COALESCE((SELECT SUM(amount) FROM public.platform_payments WHERE business_id = _biz AND received_at::date = _today), 0),
      COALESCE((SELECT SUM(amount) FROM public.platform_payments WHERE business_id = _biz AND received_at::date >= _week_start), 0),
      COALESCE((SELECT SUM(amount) FROM public.platform_payments WHERE business_id = _biz AND received_at::date >= _month_start), 0),
      COALESCE((SELECT COUNT(*) FROM public.jobber_jobs WHERE business_id = _biz AND scheduled_start::date = _today), 0),
      COALESCE((SELECT COUNT(*) FROM public.jobber_jobs WHERE business_id = _biz AND scheduled_start::date >= _week_start), 0),
      COALESCE((SELECT COUNT(*) FROM public.jobber_jobs WHERE business_id = _biz AND scheduled_start::date >= _month_start), 0),
      COALESCE((SELECT COUNT(*) FROM public.platform_quotes WHERE business_id = _biz AND status IN ('sent','viewed','draft')), 0),
      COALESCE((SELECT COUNT(*) FROM public.platform_quotes WHERE business_id = _biz AND status IN ('won','approved','accepted') AND created_at::date >= _month_start), 0),
      CASE
        WHEN (SELECT COUNT(*) FROM public.platform_quotes WHERE business_id = _biz AND created_at::date >= _month_start) = 0 THEN 0
        ELSE ROUND(
          100.0 * (SELECT COUNT(*) FROM public.platform_quotes WHERE business_id = _biz AND status IN ('won','approved','accepted') AND created_at::date >= _month_start)::numeric
          / (SELECT COUNT(*) FROM public.platform_quotes WHERE business_id = _biz AND created_at::date >= _month_start)::numeric, 2)
      END,
      COALESCE((SELECT COUNT(*) FROM public.platform_invoices WHERE business_id = _biz AND balance_due > 0 AND status NOT IN ('paid','void')), 0),
      COALESCE((SELECT SUM(balance_due) FROM public.platform_invoices WHERE business_id = _biz AND balance_due > 0 AND status NOT IN ('paid','void')), 0),
      COALESCE((SELECT SUM(amount) FROM public.platform_payments WHERE business_id = _biz AND received_at::date >= _month_start), 0),
      COALESCE((SELECT COUNT(*) FROM public.platform_leads WHERE business_id = _biz AND created_at::date = _today), 0),
      now()
    ON CONFLICT (business_id, snapshot_date) DO UPDATE SET
      revenue_today = EXCLUDED.revenue_today,
      revenue_week = EXCLUDED.revenue_week,
      revenue_month = EXCLUDED.revenue_month,
      jobs_today = EXCLUDED.jobs_today,
      jobs_week = EXCLUDED.jobs_week,
      jobs_month = EXCLUDED.jobs_month,
      quotes_open = EXCLUDED.quotes_open,
      quotes_won_30d = EXCLUDED.quotes_won_30d,
      quote_conversion_30d = EXCLUDED.quote_conversion_30d,
      invoices_outstanding_count = EXCLUDED.invoices_outstanding_count,
      invoices_outstanding_total = EXCLUDED.invoices_outstanding_total,
      payments_collected_30d = EXCLUDED.payments_collected_30d,
      leads_new_today = EXCLUDED.leads_new_today,
      refreshed_at = now();
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_business_kpi_snapshots() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- system_health_checks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_health_checks (
  check_name text PRIMARY KEY,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('ok','warn','fail','unknown')),
  last_ok_at timestamptz,
  last_failure_at timestamptz,
  message text,
  details jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_system_health_checks_updated_at
  BEFORE UPDATE ON public.system_health_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view system_health_checks"
  ON public.system_health_checks FOR SELECT TO authenticated
  USING (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Seed known check names
INSERT INTO public.system_health_checks (check_name, status) VALUES
  ('pg_cron','unknown'),
  ('jobber_sync','unknown'),
  ('simpletexting','unknown'),
  ('stripe_webhook','unknown'),
  ('resend_email','unknown'),
  ('review_queue','unknown'),
  ('email_queue','unknown'),
  ('recurring_processor','unknown'),
  ('sms_queue','unknown')
ON CONFLICT (check_name) DO NOTHING;

-- ============================================================
-- Audit log filtered RPC (owner/admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_audit_logs_filtered(
  _business_id uuid DEFAULT NULL,
  _user_id uuid DEFAULT NULL,
  _event_name text DEFAULT NULL,
  _entity_type text DEFAULT NULL,
  _entity_id text DEFAULT NULL,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _limit integer DEFAULT 100,
  _offset integer DEFAULT 0
)
RETURNS SETOF public.audit_logs
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT * FROM public.audit_logs
  WHERE (_business_id IS NULL OR business_id = _business_id)
    AND (_user_id IS NULL OR user_id = _user_id)
    AND (_event_name IS NULL OR event_name = _event_name)
    AND (_entity_type IS NULL OR entity_type = _entity_type)
    AND (_entity_id IS NULL OR entity_id = _entity_id)
    AND (_from IS NULL OR created_at >= _from)
    AND (_to   IS NULL OR created_at <  _to)
  ORDER BY created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 500))
  OFFSET GREATEST(0, _offset);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_audit_logs_filtered(uuid,uuid,text,text,text,timestamptz,timestamptz,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_logs_filtered(uuid,uuid,text,text,text,timestamptz,timestamptz,integer,integer) TO authenticated;

-- ============================================================
-- Pagination indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sms_messages_created
  ON public.sms_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_comm_logs_business_created
  ON public.platform_comm_logs (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_comm_logs_business_customer_created
  ON public.platform_comm_logs (business_id, customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_jobs_business_scheduled
  ON public.platform_jobs (business_id, scheduled_start);

CREATE INDEX IF NOT EXISTS idx_platform_invoices_business_due_open
  ON public.platform_invoices (business_id, due_date)
  WHERE balance_due > 0 AND status NOT IN ('paid','void');