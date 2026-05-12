CREATE OR REPLACE FUNCTION public.refresh_business_kpi_snapshots()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      COALESCE((SELECT SUM(amount) FROM public.platform_payments WHERE business_id = _biz AND payment_date = _today), 0),
      COALESCE((SELECT SUM(amount) FROM public.platform_payments WHERE business_id = _biz AND payment_date >= _week_start), 0),
      COALESCE((SELECT SUM(amount) FROM public.platform_payments WHERE business_id = _biz AND payment_date >= _month_start), 0),
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
      COALESCE((SELECT SUM(amount) FROM public.platform_payments WHERE business_id = _biz AND payment_date >= _month_start), 0),
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
$function$;