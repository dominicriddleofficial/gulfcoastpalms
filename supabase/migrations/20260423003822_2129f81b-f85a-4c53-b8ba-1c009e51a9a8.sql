-- Enable required extensions for scheduled jobs and HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Track scheduled sync jobs per business so they can be enabled/disabled from the UI
CREATE TABLE IF NOT EXISTS public.sync_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL DEFAULT 'jobber',
  interval_minutes INTEGER NOT NULL DEFAULT 30,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, schedule_type)
);

ALTER TABLE public.sync_schedules ENABLE ROW LEVEL SECURITY;

-- Workspace owners can view & manage all sync schedules
CREATE POLICY "Owners can view sync schedules"
  ON public.sync_schedules FOR SELECT
  USING (public.is_workspace_owner(auth.uid()));

CREATE POLICY "Owners can insert sync schedules"
  ON public.sync_schedules FOR INSERT
  WITH CHECK (public.is_workspace_owner(auth.uid()));

CREATE POLICY "Owners can update sync schedules"
  ON public.sync_schedules FOR UPDATE
  USING (public.is_workspace_owner(auth.uid()));

CREATE POLICY "Owners can delete sync schedules"
  ON public.sync_schedules FOR DELETE
  USING (public.is_workspace_owner(auth.uid()));

-- Users with business access can also view their own business's schedule
CREATE POLICY "Business members can view their sync schedules"
  ON public.sync_schedules FOR SELECT
  USING (business_id IS NOT NULL AND public.has_business_access(auth.uid(), business_id));

-- Auto-update updated_at
CREATE TRIGGER update_sync_schedules_updated_at
  BEFORE UPDATE ON public.sync_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function the cron job calls. Loops through every business that has a Jobber token
-- AND has an enabled sync_schedules row (or no row yet — defaults to enabled).
CREATE OR REPLACE FUNCTION public.run_jobber_auto_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _biz_id UUID;
  _service_key TEXT;
  _url TEXT := 'https://qczcwyqpnxknqbmwpvna.supabase.co/functions/v1/jobber-sync';
BEGIN
  -- Read service role key from vault
  SELECT decrypted_secret INTO _service_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF _service_key IS NULL THEN
    RAISE WARNING 'SUPABASE_SERVICE_ROLE_KEY not found in vault';
    RETURN;
  END IF;

  -- Trigger sync for every business that has a Jobber token AND isn't explicitly disabled
  FOR _biz_id IN
    SELECT DISTINCT b.id
    FROM public.businesses b
    WHERE EXISTS (SELECT 1 FROM public.jobber_tokens t LIMIT 1)
      AND NOT EXISTS (
        SELECT 1 FROM public.sync_schedules s
        WHERE s.business_id = b.id
          AND s.schedule_type = 'jobber'
          AND s.enabled = false
      )
  LOOP
    PERFORM net.http_post(
      url := _url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_key
      ),
      body := jsonb_build_object('businessId', _biz_id)
    );

    -- Update last_run_at (insert if missing)
    INSERT INTO public.sync_schedules (business_id, schedule_type, interval_minutes, enabled, last_run_at, next_run_at)
    VALUES (_biz_id, 'jobber', 30, true, now(), now() + interval '30 minutes')
    ON CONFLICT (business_id, schedule_type)
    DO UPDATE SET last_run_at = now(), next_run_at = now() + interval '30 minutes';
  END LOOP;
END;
$$;