
CREATE TABLE public.job_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  system_type TEXT NOT NULL CHECK (system_type IN ('flake','metallic')),
  job_name TEXT,
  customer TEXT,
  job_date DATE,
  square_footage NUMERIC,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_checklists_business ON public.job_checklists(business_id, created_at DESC);

ALTER TABLE public.job_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage business job checklists"
ON public.job_checklists
FOR ALL
TO authenticated
USING (has_business_access(auth.uid(), business_id))
WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE TRIGGER update_job_checklists_updated_at
BEFORE UPDATE ON public.job_checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
