-- Documents storage bucket (private, workspace-aware)
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-documents', 'platform-documents', false)
ON CONFLICT (id) DO NOTHING;

-- platform_documents table
CREATE TABLE IF NOT EXISTS public.platform_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  document_category text NOT NULL CHECK (document_category IN ('insurance', 'tax', 'form')),
  document_name text NOT NULL,
  document_subtype text,
  related_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  related_employee_name text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  file_mime_type text,
  expiration_date date,
  notes text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_documents_business ON public.platform_documents(business_id);
CREATE INDEX IF NOT EXISTS idx_platform_documents_category ON public.platform_documents(business_id, document_category);
CREATE INDEX IF NOT EXISTS idx_platform_documents_employee ON public.platform_documents(related_employee_id);

ALTER TABLE public.platform_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view documents"
ON public.platform_documents FOR SELECT TO authenticated
USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Business members can insert documents"
ON public.platform_documents FOR INSERT TO authenticated
WITH CHECK (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Business members can update documents"
ON public.platform_documents FOR UPDATE TO authenticated
USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Business members can delete documents"
ON public.platform_documents FOR DELETE TO authenticated
USING (public.has_business_access(auth.uid(), business_id));

CREATE TRIGGER trg_platform_documents_updated_at
BEFORE UPDATE ON public.platform_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage RLS: files stored under {business_id}/{category}/{filename}
CREATE POLICY "Business members can read platform documents files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'platform-documents'
  AND public.has_business_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Business members can upload platform documents files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'platform-documents'
  AND public.has_business_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Business members can update platform documents files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'platform-documents'
  AND public.has_business_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Business members can delete platform documents files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'platform-documents'
  AND public.has_business_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);