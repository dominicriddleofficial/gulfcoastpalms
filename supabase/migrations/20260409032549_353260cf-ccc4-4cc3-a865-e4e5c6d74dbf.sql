
-- Create storage bucket for job photos
INSERT INTO storage.buckets (id, name, public) VALUES ('job-photos', 'job-photos', true);

-- Allow authenticated users to upload job photos
CREATE POLICY "Authenticated users upload job photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'job-photos');

-- Allow public viewing of job photos
CREATE POLICY "Public view job photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-photos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users update job photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'job-photos');
