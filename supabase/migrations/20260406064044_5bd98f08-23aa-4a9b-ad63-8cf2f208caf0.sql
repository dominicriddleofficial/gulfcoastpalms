
-- Add resolved column to error_logs
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS resolved boolean NOT NULL DEFAULT false;

-- Allow authenticated users to update error_logs (for marking resolved)
CREATE POLICY "Authenticated users can update error_logs"
ON public.error_logs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete error_logs (for clearing resolved)
CREATE POLICY "Authenticated users can delete error_logs"
ON public.error_logs
FOR DELETE
TO authenticated
USING (true);
