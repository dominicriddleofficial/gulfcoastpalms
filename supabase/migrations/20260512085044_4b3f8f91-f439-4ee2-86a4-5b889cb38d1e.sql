
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  page_path text,
  page_url text,
  referrer text,
  business_type text,
  source_component text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  device_type text,
  user_agent text,
  visitor_id text,
  session_id text,
  user_id uuid,
  customer_id uuid,
  lead_id uuid,
  quote_id uuid,
  invoice_id uuid,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_biz_event_created ON public.analytics_events (business_type, event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page ON public.analytics_events (page_path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON public.analytics_events (session_id, created_at);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view analytics events"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));
