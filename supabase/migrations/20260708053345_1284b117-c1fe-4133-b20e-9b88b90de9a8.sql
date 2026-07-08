
-- ============================================================
-- FEATURE 1: Yearly Trimming flag on platform_customers
-- ============================================================
ALTER TABLE public.platform_customers
  ADD COLUMN IF NOT EXISTS yearly_trimming boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS yearly_trimming_added_at timestamptz,
  ADD COLUMN IF NOT EXISTS yearly_trimming_source text
    CHECK (yearly_trimming_source IN ('manual','auto'));

CREATE INDEX IF NOT EXISTS idx_platform_customers_yearly_trimming
  ON public.platform_customers (business_id)
  WHERE yearly_trimming = true;

-- Auto-flag trigger: when a platform_job flips to 'completed', if the
-- customer now has 2+ completed jobs and isn't already flagged (or is
-- flagged auto), mark them yearly_trimming='auto'. Manual flags are
-- never touched.
CREATE OR REPLACE FUNCTION public.auto_flag_yearly_trimming()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
  _cust  RECORD;
BEGIN
  -- Only act when a job transitions INTO completed
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;
  IF lower(coalesce(NEW.status,'')) <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND lower(coalesce(OLD.status,'')) = 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT yearly_trimming, yearly_trimming_source
    INTO _cust
    FROM public.platform_customers
   WHERE id = NEW.customer_id;

  IF _cust IS NULL THEN RETURN NEW; END IF;
  IF _cust.yearly_trimming = true AND _cust.yearly_trimming_source = 'manual' THEN
    RETURN NEW; -- manual wins
  END IF;
  IF _cust.yearly_trimming = true THEN RETURN NEW; END IF; -- already auto-on

  SELECT count(*) INTO _count
    FROM public.platform_jobs
   WHERE customer_id = NEW.customer_id
     AND lower(coalesce(status,'')) = 'completed'
     AND deleted_at IS NULL;

  IF _count >= 2 THEN
    UPDATE public.platform_customers
       SET yearly_trimming = true,
           yearly_trimming_added_at = COALESCE(yearly_trimming_added_at, now()),
           yearly_trimming_source = 'auto',
           updated_at = now()
     WHERE id = NEW.customer_id
       AND (yearly_trimming = false OR yearly_trimming_source IS NULL);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_flag_yearly_trimming ON public.platform_jobs;
CREATE TRIGGER trg_auto_flag_yearly_trimming
  AFTER INSERT OR UPDATE OF status ON public.platform_jobs
  FOR EACH ROW EXECUTE FUNCTION public.auto_flag_yearly_trimming();

-- Backfill: any customer with 2+ completed jobs today = auto-flag
WITH multi AS (
  SELECT customer_id, count(*) AS cnt, max(updated_at) AS last_at
    FROM public.platform_jobs
   WHERE customer_id IS NOT NULL
     AND lower(coalesce(status,'')) = 'completed'
     AND deleted_at IS NULL
   GROUP BY customer_id
   HAVING count(*) >= 2
)
UPDATE public.platform_customers pc
   SET yearly_trimming = true,
       yearly_trimming_added_at = COALESCE(pc.yearly_trimming_added_at, now()),
       yearly_trimming_source = 'auto',
       updated_at = now()
  FROM multi m
 WHERE pc.id = m.customer_id
   AND pc.yearly_trimming = false;

-- ============================================================
-- FEATURE 3: End-of-Day Reports table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.eod_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  submitted_by uuid,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, report_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eod_reports TO authenticated;
GRANT ALL ON public.eod_reports TO service_role;

ALTER TABLE public.eod_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eod_reports_select_business_members"
  ON public.eod_reports FOR SELECT TO authenticated
  USING (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','office_manager','manager']));

CREATE POLICY "eod_reports_insert_business_members"
  ON public.eod_reports FOR INSERT TO authenticated
  WITH CHECK (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','office_manager','manager']));

CREATE POLICY "eod_reports_update_business_members"
  ON public.eod_reports FOR UPDATE TO authenticated
  USING (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','office_manager','manager']))
  WITH CHECK (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','office_manager','manager']));

CREATE POLICY "eod_reports_delete_owner_only"
  ON public.eod_reports FOR DELETE TO authenticated
  USING (public.user_has_role(auth.uid(), business_id, 'owner'));

DROP TRIGGER IF EXISTS trg_eod_reports_updated_at ON public.eod_reports;
CREATE TRIGGER trg_eod_reports_updated_at
  BEFORE UPDATE ON public.eod_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
