-- Fix 1: jobber_clients and jobber_properties SELECT policies missed business scoping,
-- allowing any member of any business to read all rows across every business.
DROP POLICY IF EXISTS "Business members view jobber_clients" ON public.jobber_clients;
CREATE POLICY "Business members view jobber_clients"
ON public.jobber_clients
FOR SELECT
TO authenticated
USING (
  business_id IS NOT NULL
  AND public.has_business_access(auth.uid(), business_id)
);

DROP POLICY IF EXISTS "Business members view jobber_properties" ON public.jobber_properties;
CREATE POLICY "Business members view jobber_properties"
ON public.jobber_properties
FOR SELECT
TO authenticated
USING (
  business_id IS NOT NULL
  AND public.has_business_access(auth.uid(), business_id)
);

-- Fix 2: finance-receipts / finance-tax-docs storage policies referenced
-- (storage.foldername(w.name))[1] (the workspace name column) instead of
-- (storage.foldername(name))[1] (the storage object path). Recreate all six
-- correctly so the workspace id matches the first path segment of the object.
DROP POLICY IF EXISTS "finance_receipts_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "finance_receipts_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "finance_receipts_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "finance_tax_docs_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "finance_tax_docs_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "finance_tax_docs_owner_delete" ON storage.objects;

CREATE POLICY "finance_receipts_owner_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'finance-receipts'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_user_id = auth.uid()
      AND (w.id)::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "finance_receipts_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'finance-receipts'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_user_id = auth.uid()
      AND (w.id)::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "finance_receipts_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'finance-receipts'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_user_id = auth.uid()
      AND (w.id)::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "finance_tax_docs_owner_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'finance-tax-docs'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_user_id = auth.uid()
      AND (w.id)::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "finance_tax_docs_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'finance-tax-docs'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_user_id = auth.uid()
      AND (w.id)::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "finance_tax_docs_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'finance-tax-docs'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_user_id = auth.uid()
      AND (w.id)::text = (storage.foldername(name))[1]
  )
);