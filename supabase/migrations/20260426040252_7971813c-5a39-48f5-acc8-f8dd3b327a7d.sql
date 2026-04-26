-- 1. Add assigned_to array (multi-crew) alongside existing assigned_crew_member_id
ALTER TABLE public.platform_jobs
  ADD COLUMN IF NOT EXISTS assigned_to uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS idx_platform_jobs_assigned_to
  ON public.platform_jobs USING GIN (assigned_to);

-- 2. Helper: user_has_role
-- Workspace owner is implicitly owner of every business in their workspace.
CREATE OR REPLACE FUNCTION public.user_has_role(_user_id uuid, _business_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- workspace owners are always 'owner'
    (
      _role = 'owner'
      AND EXISTS (
        SELECT 1
        FROM public.workspaces w
        JOIN public.businesses b ON b.workspace_id = w.id
        WHERE w.owner_user_id = _user_id
          AND b.id = _business_id
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.user_business_access uba
      WHERE uba.user_id = _user_id
        AND uba.business_id = _business_id
        AND uba.role_name = _role
        AND uba.active_status = 'active'
    );
$$;

-- 3. Helper: user_has_any_role
CREATE OR REPLACE FUNCTION public.user_has_any_role(_user_id uuid, _business_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      'owner' = ANY(_roles)
      AND EXISTS (
        SELECT 1
        FROM public.workspaces w
        JOIN public.businesses b ON b.workspace_id = w.id
        WHERE w.owner_user_id = _user_id
          AND b.id = _business_id
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.user_business_access uba
      WHERE uba.user_id = _user_id
        AND uba.business_id = _business_id
        AND uba.role_name = ANY(_roles)
        AND uba.active_status = 'active'
    );
$$;

-- 4. Helper: get_user_role (returns highest role for a user/business)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid, _business_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.workspaces w
      JOIN public.businesses b ON b.workspace_id = w.id
      WHERE w.owner_user_id = _user_id AND b.id = _business_id
    ) THEN 'owner'
    ELSE (
      SELECT uba.role_name
      FROM public.user_business_access uba
      WHERE uba.user_id = _user_id
        AND uba.business_id = _business_id
        AND uba.active_status = 'active'
      ORDER BY CASE uba.role_name
        WHEN 'owner' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'crew' THEN 3
        ELSE 4
      END
      LIMIT 1
    )
  END;
$$;

-- 5. Update RLS on platform_jobs so crew only see jobs assigned to them
DROP POLICY IF EXISTS "Users view business jobs" ON public.platform_jobs;
DROP POLICY IF EXISTS "Users view jobs scoped by role" ON public.platform_jobs;

CREATE POLICY "Users view jobs scoped by role"
  ON public.platform_jobs
  FOR SELECT
  USING (
    public.has_business_access(auth.uid(), business_id)
    AND (
      public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager'])
      OR (
        public.user_has_role(auth.uid(), business_id, 'crew')
        AND (
          auth.uid() = ANY(assigned_to)
          OR auth.uid() = assigned_crew_member_id
        )
      )
      -- Backward compatibility: any business-access user with no role row still sees jobs
      OR public.get_user_role(auth.uid(), business_id) IS NULL
    )
  );

-- Update update policy: crew can only update their own assigned jobs (status/notes)
DROP POLICY IF EXISTS "Users update business jobs" ON public.platform_jobs;
DROP POLICY IF EXISTS "Users update jobs scoped by role" ON public.platform_jobs;

CREATE POLICY "Users update jobs scoped by role"
  ON public.platform_jobs
  FOR UPDATE
  USING (
    public.has_business_access(auth.uid(), business_id)
    AND (
      public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager'])
      OR (
        public.user_has_role(auth.uid(), business_id, 'crew')
        AND (
          auth.uid() = ANY(assigned_to)
          OR auth.uid() = assigned_crew_member_id
        )
      )
      OR public.get_user_role(auth.uid(), business_id) IS NULL
    )
  );