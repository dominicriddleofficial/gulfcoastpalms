
-- Create storage bucket for application uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('applications', 'applications', false);

-- Create job_applications table
CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  age INTEGER,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT,
  position TEXT NOT NULL DEFAULT 'open',
  has_transportation BOOLEAN DEFAULT false,
  has_experience TEXT,
  work_experience TEXT,
  comfortable_outdoors BOOLEAN DEFAULT false,
  why_good_fit TEXT,
  resume_url TEXT,
  voice_note_url TEXT,
  best_contact_time TEXT,
  acknowledged BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Public can submit applications
CREATE POLICY "Anyone can submit applications"
  ON public.job_applications FOR INSERT
  TO public
  WITH CHECK (true);

-- Only admins can view applications
CREATE POLICY "Admins can view applications"
  ON public.job_applications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update applications
CREATE POLICY "Admins can update applications"
  ON public.job_applications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for applications bucket
CREATE POLICY "Anyone can upload application files"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'applications');

CREATE POLICY "Admins can view application files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'applications' AND public.has_role(auth.uid(), 'admin'));
