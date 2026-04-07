
-- Fix 1: Restrict master_people SELECT to users with business access via platform_customers link
DROP POLICY IF EXISTS "Authenticated users view master_people" ON public.master_people;

CREATE POLICY "Users view linked master_people" 
ON public.master_people 
FOR SELECT 
TO authenticated
USING (
  is_workspace_owner(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.platform_customers pc
    WHERE pc.master_person_id = master_people.id
    AND has_business_access(auth.uid(), pc.business_id)
  )
);

-- Fix 2: Add explicit INSERT/UPDATE/DELETE policies on user_roles restricted to workspace owners only
CREATE POLICY "Only workspace owners can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (is_workspace_owner(auth.uid()));

CREATE POLICY "Only workspace owners can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (is_workspace_owner(auth.uid()));

CREATE POLICY "Only workspace owners can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (is_workspace_owner(auth.uid()));
