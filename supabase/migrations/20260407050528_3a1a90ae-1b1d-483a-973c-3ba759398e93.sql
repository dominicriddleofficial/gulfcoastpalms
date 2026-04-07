
-- Add business_id to jobber_jobs
ALTER TABLE public.jobber_jobs ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id);

-- Add business_id to jobber_clients
ALTER TABLE public.jobber_clients ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id);

-- Add business_id to jobber_properties
ALTER TABLE public.jobber_properties ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id);

-- Set all existing data to Gulf Coast Palms
UPDATE public.jobber_jobs SET business_id = 'b0000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE public.jobber_clients SET business_id = 'b0000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
UPDATE public.jobber_properties SET business_id = 'b0000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_jobber_jobs_business_id ON public.jobber_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_jobber_clients_business_id ON public.jobber_clients(business_id);
CREATE INDEX IF NOT EXISTS idx_jobber_properties_business_id ON public.jobber_properties(business_id);
