
-- Fix broken finance storage policies:
-- Previous policies used storage.foldername(w.name) (workspaces' own name column)
-- instead of storage.foldername(storage.objects.name) (the file path),
-- so the ownership check did not actually validate the object being accessed.

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
      AND w.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "finance_receipts_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'finance-receipts'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_user_id = auth.uid()
      AND w.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "finance_receipts_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'finance-receipts'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_user_id = auth.uid()
      AND w.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "finance_tax_docs_owner_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'finance-tax-docs'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_user_id = auth.uid()
      AND w.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "finance_tax_docs_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'finance-tax-docs'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_user_id = auth.uid()
      AND w.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "finance_tax_docs_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'finance-tax-docs'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_user_id = auth.uid()
      AND w.id::text = (storage.foldername(storage.objects.name))[1]
  )
);
