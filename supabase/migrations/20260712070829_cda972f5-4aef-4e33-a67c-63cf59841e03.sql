
DROP POLICY IF EXISTS "Public read job photos" ON storage.objects;

CREATE POLICY "Staff read job photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'job-photos'
  AND name IS NOT NULL
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.has_business_access(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid
  )
);
