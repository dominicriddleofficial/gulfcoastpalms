DROP POLICY IF EXISTS "Owner deletes visits" ON public.platform_job_visits;

CREATE POLICY "Business staff delete visits"
ON public.platform_job_visits
FOR DELETE
TO authenticated
USING (
  has_business_access(auth.uid(), business_id)
  AND (
    is_workspace_owner(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR user_has_any_role(auth.uid(), business_id, ARRAY['owner', 'manager', 'office_manager'])
  )
);