
-- Create SOP acknowledgments table
CREATE TABLE public.sop_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_type text NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  sign_date date NOT NULL,
  signature_data text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sop_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Public insert for employees signing
CREATE POLICY "Anyone can submit SOP acknowledgments"
  ON public.sop_acknowledgments FOR INSERT
  TO public WITH CHECK (true);

-- Admin select
CREATE POLICY "Admins can view SOP acknowledgments"
  ON public.sop_acknowledgments FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for SOP PDFs (public read so employees can view)
INSERT INTO storage.buckets (id, name, public) VALUES ('sop-documents', 'sop-documents', true);

-- Allow public read access to SOP documents
CREATE POLICY "Public can read SOP documents"
  ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'sop-documents');

-- Admin can upload SOP documents
CREATE POLICY "Admins can upload SOP documents"
  ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'sop-documents' AND has_role(auth.uid(), 'admin'));
