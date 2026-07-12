
-- Broaden RLS so platform owners (workspace owners) can also manage applicants,
-- and add DELETE (owner-only via workspace owner or admin role).

DROP POLICY IF EXISTS "Admins can view applications" ON public.job_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON public.job_applications;
DROP POLICY IF EXISTS "Owners can view applications" ON public.job_applications;
DROP POLICY IF EXISTS "Owners can update applications" ON public.job_applications;
DROP POLICY IF EXISTS "Owners can delete applications" ON public.job_applications;

CREATE POLICY "Owners can view applications"
  ON public.job_applications FOR SELECT
  TO authenticated
  USING (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can update applications"
  ON public.job_applications FOR UPDATE
  TO authenticated
  USING (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can delete applications"
  ON public.job_applications FOR DELETE
  TO authenticated
  USING (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Storage: allow workspace owners to view application files too
DROP POLICY IF EXISTS "Admins can view application files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can view application files" ON storage.objects;

CREATE POLICY "Owners can view application files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'applications'
    AND (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );
