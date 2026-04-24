-- 1. Drop overly permissive error_logs policies (true predicates)
DROP POLICY IF EXISTS "Authenticated view error logs" ON public.error_logs;
DROP POLICY IF EXISTS "Authenticated users can update error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "Authenticated users can delete error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "Anyone can insert errors" ON public.error_logs;
-- Keep: "Anon insert error logs", "Service role insert error logs",
--       "Owners view errors", "Owners update errors", "Owners delete errors"

-- 2. Tighten job-photos storage update/delete policies
-- Drop existing broad policies on storage.objects for this bucket
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (
        policyname ILIKE '%job photos%' OR
        policyname ILIKE '%job-photos%' OR
        policyname ILIKE '%job_photos%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Public read remains for branded customer-facing photos
CREATE POLICY "Public read job photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'job-photos');

-- Authenticated users can upload only into a business folder they have access to
-- Path convention: <business_id>/<...>
CREATE POLICY "Authenticated insert own business job photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-photos'
  AND (
    public.is_workspace_owner(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND public.has_business_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  )
);

CREATE POLICY "Authenticated update own business job photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'job-photos'
  AND (
    public.is_workspace_owner(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND public.has_business_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  )
);

CREATE POLICY "Authenticated delete own business job photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'job-photos'
  AND (
    public.is_workspace_owner(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND public.has_business_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  )
);