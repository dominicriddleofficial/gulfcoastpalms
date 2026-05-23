
ALTER TABLE public.platform_clock_sessions
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS exported_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS overtime_flag boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_clock_sessions_approval
  ON public.platform_clock_sessions(business_id, approval_status, schedule_date DESC);

-- Restrict approval-field updates to managers/owners
DROP POLICY IF EXISTS "clock_sessions_admin_update" ON public.platform_clock_sessions;
CREATE POLICY "clock_sessions_admin_update" ON public.platform_clock_sessions
  FOR UPDATE
  USING (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager']))
  WITH CHECK (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager']));

-- Audit log for admin edits to timesheets
CREATE TABLE IF NOT EXISTS public.platform_timesheet_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  clock_session_id uuid NOT NULL REFERENCES public.platform_clock_sessions(id) ON DELETE CASCADE,
  edited_by uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_timesheet_edits_session
  ON public.platform_timesheet_edits(clock_session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timesheet_edits_biz
  ON public.platform_timesheet_edits(business_id, created_at DESC);

ALTER TABLE public.platform_timesheet_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timesheet_edits_select"
  ON public.platform_timesheet_edits FOR SELECT
  USING (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager']));

CREATE POLICY "timesheet_edits_insert"
  ON public.platform_timesheet_edits FOR INSERT
  WITH CHECK (
    auth.uid() = edited_by
    AND public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager'])
  );
