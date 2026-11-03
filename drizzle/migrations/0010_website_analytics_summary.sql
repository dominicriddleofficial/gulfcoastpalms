CREATE OR REPLACE FUNCTION public.website_analytics_summary(_business_id uuid, _from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _code text;
  _tz text;
  _hosts text[];
  _len interval;
  _pfrom timestamptz;
  _result jsonb;
BEGIN
  IF _uid IS NULL OR NOT public.has_business_access(_uid, _business_id)
     OR NOT (public.is_workspace_owner(_uid) OR public.has_role(_uid, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF _from IS NULL OR _to IS NULL OR _to <= _from OR _to - _from > interval '400 days' THEN
    RAISE EXCEPTION 'invalid date range' USING ERRCODE = '22023';
  END IF;

  SELECT shortcode, coalesce(timezone, 'America/Chicago') INTO _code, _tz FROM public.businesses WHERE id = _business_id;
  -- Trusted site mapping: which production hostnames belong to which business.
  _hosts := CASE _code
    WHEN 'GCP' THEN ARRAY['gulfcoastpalmservices.com', 'www.gulfcoastpalmservices.com', 'gulfcoastpalms.lovable.app']
    ELSE ARRAY[]::text[] END;
  _len := _to - _from;
  _pfrom := _from - _len;

  WITH raw AS (
    SELECT e.id, e.created_at, e.event_name, e.visitor_id,
           coalesce(nullif(e.session_id, ''), 'row:' || e.id::text) AS session_id,
           coalesce(nullif(regexp_replace(split_part(coalesce(e.page_path, '/'), '?', 1), '/+$', ''), ''), '/') AS path,
           lower(split_part(split_part(coalesce(e.page_url, ''), '://', 2), '/', 1)) AS host,
           e.referrer, e.utm_source, e.utm_medium, e.utm_campaign, e.device_type, e.user_agent, e.business_type,
           coalesce(nullif(e.properties->>'placement', ''), nullif(e.source_component, ''), nullif(e.properties->>'click_location', ''), nullif(e.properties->>'source', ''), 'unknown') AS placement,
           coalesce(e.properties->>'cta_text', '') AS cta_text
    FROM public.analytics_events e
    WHERE e.created_at >= _pfrom AND e.created_at < _to
  ),
  pub AS (
    SELECT r.*,
      CASE
        WHEN event_name = 'page_view' THEN 'view'
        WHEN event_name IN ('call_tap', 'call_now_click', 'sticky_bar_call_click', 'phone_click') THEN 'call'
        WHEN event_name IN ('text_tap', 'text_us_click', 'sticky_bar_text_click') THEN 'text'
        WHEN event_name IN ('quote_request_started', 'lead_form_start') THEN 'form_start'
        WHEN event_name IN ('lead_form_submit', 'quote_request_submitted', 'quote_request_completed') THEN 'form_submit'
        WHEN event_name IN ('cta_click', 'hero_cta_click', 'service_page_cta_click', 'location_page_cta_click') THEN 'cta'
        WHEN event_name IN ('chat_opened', 'chat_widget_open') THEN 'chat'
        ELSE NULL END AS canon,
      (created_at >= _from) AS cur
    FROM raw r
    WHERE host = ANY(_hosts)
      AND coalesce(business_type, '') <> 'platform'
      AND path !~ '^/(platform|portal|admin|ops|app|employee|pay|q|arborist-link)(/|$)'
      AND path NOT LIKE '/quote/%' AND path NOT LIKE '/.lovable/%'
      AND coalesce(user_agent, '') !~* '(bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview)'
  ),
  -- One real action can arrive as several legacy rows (generic + specific + global tel handler).
  -- Keep a row only if the same session had no same-kind row in the previous few seconds.
  marked AS (
    SELECT p.*,
      lag(created_at) OVER (PARTITION BY session_id, canon, CASE WHEN canon = 'view' THEN path ELSE '' END ORDER BY created_at, id) AS prev_at
    FROM pub p WHERE canon IS NOT NULL
  ),
  ev AS (
    SELECT * FROM marked
    WHERE prev_at IS NULL
       OR created_at - prev_at > CASE WHEN canon = 'view' THEN interval '2 seconds' WHEN canon = 'form_submit' THEN interval '15 seconds' ELSE interval '4 seconds' END
  ),
  totals AS (
    SELECT cur,
      count(DISTINCT visitor_id) FILTER (WHERE visitor_id IS NOT NULL) AS visitors,
      count(DISTINCT session_id) AS sessions,
      count(*) FILTER (WHERE canon = 'view') AS page_views,
      count(DISTINCT visitor_id) FILTER (WHERE canon IN ('cta', 'call', 'text', 'form_start', 'chat')) AS engaged_visitors,
      count(DISTINCT visitor_id) FILTER (WHERE canon IN ('call', 'text', 'form_submit')) AS contact_visitors,
      count(*) FILTER (WHERE canon IN ('cta', 'call', 'text')) AS cta_clicks,
      count(*) FILTER (WHERE canon = 'call') AS call_taps,
      count(*) FILTER (WHERE canon = 'text') AS text_taps,
      count(DISTINCT session_id) FILTER (WHERE canon = 'form_start') AS form_start_sessions,
      count(*) FILTER (WHERE canon = 'form_submit') AS form_submits,
      count(*) FILTER (WHERE canon = 'chat') AS chat_opens
    FROM ev GROUP BY cur
  ),
  sess AS (
    SELECT session_id,
      bool_or(canon IN ('cta', 'call', 'text', 'form_start', 'chat')) AS acted,
      bool_or(canon = 'call') AS called, bool_or(canon = 'text') AS texted,
      bool_or(canon = 'form_start') AS started, bool_or(canon = 'form_submit') AS submitted,
      bool_or(canon IN ('call', 'text', 'form_submit')) AS contacted
    FROM ev WHERE cur GROUP BY session_id
  ),
  funnel AS (
    SELECT jsonb_build_object(
      'sessions', count(*),
      'acted', count(*) FILTER (WHERE acted),
      'called', count(*) FILTER (WHERE called),
      'texted', count(*) FILTER (WHERE texted),
      'started', count(*) FILTER (WHERE started),
      'started_and_submitted', count(*) FILTER (WHERE started AND submitted),
      'submitted', count(*) FILTER (WHERE submitted),
      'contacted', count(*) FILTER (WHERE contacted)) AS j
    FROM sess
  ),
  daily AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object('date', d, 'views', views, 'visitors', visitors, 'contacts', contacts) ORDER BY d), '[]'::jsonb) AS j
    FROM (
      SELECT (created_at AT TIME ZONE _tz)::date AS d,
        count(*) FILTER (WHERE canon = 'view') AS views,
        count(DISTINCT visitor_id) AS visitors,
        count(*) FILTER (WHERE canon IN ('call', 'text', 'form_submit')) AS contacts
      FROM ev WHERE cur GROUP BY 1
    ) x
  ),
  pages AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object('path', path, 'views', views, 'visitors', visitors, 'contacts', contacts) ORDER BY views DESC, path), '[]'::jsonb) AS j
    FROM (
      SELECT path, count(*) FILTER (WHERE canon = 'view') AS views, count(DISTINCT visitor_id) AS visitors,
        count(*) FILTER (WHERE canon IN ('call', 'text', 'form_submit')) AS contacts
      FROM ev WHERE cur GROUP BY path ORDER BY 2 DESC, 1 LIMIT 25
    ) x
  ),
  firsts AS (
    SELECT DISTINCT ON (session_id) session_id, path, referrer, utm_source, utm_medium, utm_campaign, device_type
    FROM ev WHERE cur ORDER BY session_id, created_at, id
  ),
  landing AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object('path', path, 'sessions', n, 'contacted', c) ORDER BY n DESC, path), '[]'::jsonb) AS j
    FROM (SELECT f.path, count(*) AS n, count(*) FILTER (WHERE s.contacted) AS c FROM firsts f JOIN sess s USING (session_id) GROUP BY f.path ORDER BY 2 DESC, 1 LIMIT 15) x
  ),
  sources AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object('source', src, 'sessions', n, 'contacted', c) ORDER BY n DESC, src), '[]'::jsonb) AS j
    FROM (
      SELECT CASE
          WHEN f.utm_source IS NOT NULL THEN f.utm_source || coalesce(' / ' || f.utm_medium, '')
          WHEN f.referrer IS NULL OR f.referrer = '' THEN 'Direct or unknown'
          WHEN lower(split_part(split_part(f.referrer, '://', 2), '/', 1)) = ANY(_hosts) THEN 'Direct or unknown'
          ELSE lower(regexp_replace(split_part(split_part(f.referrer, '://', 2), '/', 1), '^www\.', '')) END AS src,
        count(*) AS n, count(*) FILTER (WHERE s.contacted) AS c
      FROM firsts f JOIN sess s USING (session_id) GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 15
    ) x
  ),
  campaigns AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object('campaign', utm_campaign, 'sessions', n, 'contacted', c) ORDER BY n DESC), '[]'::jsonb) AS j
    FROM (SELECT f.utm_campaign, count(*) AS n, count(*) FILTER (WHERE s.contacted) AS c FROM firsts f JOIN sess s USING (session_id) WHERE f.utm_campaign IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 10) x
  ),
  devices AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object('device', dv, 'sessions', n, 'contacted', c) ORDER BY n DESC), '[]'::jsonb) AS j
    FROM (SELECT coalesce(f.device_type, 'unknown') AS dv, count(*) AS n, count(*) FILTER (WHERE s.contacted) AS c FROM firsts f JOIN sess s USING (session_id) GROUP BY 1) x
  ),
  buttons AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object('kind', canon, 'placement', placement, 'path', path, 'label', cta_text, 'clicks', n) ORDER BY n DESC), '[]'::jsonb) AS j
    FROM (SELECT canon, placement, path, cta_text, count(*) AS n FROM ev WHERE cur AND canon IN ('cta', 'call', 'text') GROUP BY 1, 2, 3, 4 ORDER BY 5 DESC LIMIT 20) x
  ),
  coverage AS (
    SELECT jsonb_build_object(
      'raw_rows', (SELECT count(*) FROM raw WHERE created_at >= _from),
      'site_rows', (SELECT count(*) FROM pub WHERE cur),
      'kept_rows', (SELECT count(*) FROM ev WHERE cur),
      'duplicate_rows_removed', (SELECT count(*) FROM marked WHERE cur) - (SELECT count(*) FROM ev WHERE cur),
      'no_session_rows', (SELECT count(*) FROM pub WHERE cur AND session_id LIKE 'row:%'),
      'first_event_at', (SELECT min(created_at) FROM public.analytics_events WHERE lower(split_part(split_part(coalesce(page_url, ''), '://', 2), '/', 1)) = ANY(_hosts)),
      'hosts', to_jsonb(_hosts)) AS j
  )
  SELECT jsonb_build_object(
    'business_id', _business_id, 'site', _code, 'from', _from, 'to', _to, 'prior_from', _pfrom, 'timezone', _tz,
    'current', coalesce((SELECT to_jsonb(t) - 'cur' FROM totals t WHERE cur), '{}'::jsonb),
    'prior', coalesce((SELECT to_jsonb(t) - 'cur' FROM totals t WHERE NOT cur), '{}'::jsonb),
    'funnel', (SELECT j FROM funnel), 'daily', (SELECT j FROM daily), 'pages', (SELECT j FROM pages),
    'landing', (SELECT j FROM landing), 'sources', (SELECT j FROM sources), 'campaigns', (SELECT j FROM campaigns),
    'devices', (SELECT j FROM devices), 'buttons', (SELECT j FROM buttons), 'coverage', (SELECT j FROM coverage)
  ) INTO _result;
  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.website_analytics_summary(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.website_analytics_summary(uuid, timestamptz, timestamptz) TO authenticated;