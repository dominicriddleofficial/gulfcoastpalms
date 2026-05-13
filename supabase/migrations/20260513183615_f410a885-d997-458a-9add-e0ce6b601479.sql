
-- Fix Schedule visibility for office_manager and other business-role users.
-- Issue 1: platform_jobs SELECT/UPDATE only allowed 'owner'/'manager' — office_manager was excluded.
-- Issue 2: jobber_jobs/clients/properties RLS only honored legacy global app_role grants.

-- 1) platform_jobs: include office_manager in role-scoped policies
DROP POLICY IF EXISTS "Users view jobs scoped by role" ON public.platform_jobs;
DROP POLICY IF EXISTS "Users update jobs scoped by role" ON public.platform_jobs;

CREATE POLICY "Users view jobs scoped by role"
ON public.platform_jobs
FOR SELECT
USING (
  has_business_access(auth.uid(), business_id)
  AND (
    user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager','office_manager'])
    OR (
      user_has_role(auth.uid(), business_id, 'crew')
      AND ((auth.uid() = ANY (assigned_to)) OR (auth.uid() = assigned_crew_member_id))
    )
    OR get_user_role(auth.uid(), business_id) IS NULL
  )
);

CREATE POLICY "Users update jobs scoped by role"
ON public.platform_jobs
FOR UPDATE
USING (
  has_business_access(auth.uid(), business_id)
  AND (
    user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager','office_manager'])
    OR (
      user_has_role(auth.uid(), business_id, 'crew')
      AND ((auth.uid() = ANY (assigned_to)) OR (auth.uid() = assigned_crew_member_id))
    )
    OR get_user_role(auth.uid(), business_id) IS NULL
  )
);

-- 2) jobber_jobs: add business-access SELECT for tenant users
CREATE POLICY "Business users view jobber_jobs"
ON public.jobber_jobs
FOR SELECT
USING (
  business_id IS NOT NULL
  AND has_business_access(auth.uid(), business_id)
  AND (
    user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager','office_manager'])
    OR user_has_role(auth.uid(), business_id, 'crew')
  )
);

CREATE POLICY "Business managers update jobber_jobs"
ON public.jobber_jobs
FOR UPDATE
USING (
  business_id IS NOT NULL
  AND has_business_access(auth.uid(), business_id)
  AND user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager','office_manager'])
);

-- 3) jobber_clients & jobber_properties: lookup tables referenced by jobber_jobs.
-- Allow any active business member to read so customer/address joins work on Schedule.
CREATE POLICY "Business members view jobber_clients"
ON public.jobber_clients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_business_access uba
    WHERE uba.user_id = auth.uid() AND uba.active_status = 'active'
  )
  OR is_workspace_owner(auth.uid())
);

CREATE POLICY "Business members view jobber_properties"
ON public.jobber_properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_business_access uba
    WHERE uba.user_id = auth.uid() AND uba.active_status = 'active'
  )
  OR is_workspace_owner(auth.uid())
);
