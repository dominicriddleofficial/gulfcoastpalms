-- Add source + read-only flags so native and Jobber-synced records can coexist in the same tables.

ALTER TABLE public.platform_jobs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'platform',
  ADD COLUMN IF NOT EXISTS is_read_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.platform_jobs DROP CONSTRAINT IF EXISTS platform_jobs_source_check;
ALTER TABLE public.platform_jobs ADD CONSTRAINT platform_jobs_source_check CHECK (source IN ('jobber','platform'));

UPDATE public.platform_jobs
SET source = 'jobber', is_read_only = true
WHERE (source_system = 'jobber' OR source_record_id IS NOT NULL) AND source <> 'jobber';

ALTER TABLE public.platform_quotes
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'platform',
  ADD COLUMN IF NOT EXISTS is_read_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.platform_quotes DROP CONSTRAINT IF EXISTS platform_quotes_source_check;
ALTER TABLE public.platform_quotes ADD CONSTRAINT platform_quotes_source_check CHECK (source IN ('jobber','platform'));

ALTER TABLE public.platform_invoices
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'platform',
  ADD COLUMN IF NOT EXISTS is_read_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.platform_invoices DROP CONSTRAINT IF EXISTS platform_invoices_source_check;
ALTER TABLE public.platform_invoices ADD CONSTRAINT platform_invoices_source_check CHECK (source IN ('jobber','platform'));

UPDATE public.platform_invoices
SET source = 'jobber', is_read_only = true
WHERE (source_system = 'jobber' OR source_record_id IS NOT NULL) AND source <> 'jobber';

CREATE INDEX IF NOT EXISTS idx_platform_jobs_source ON public.platform_jobs(business_id, source);
CREATE INDEX IF NOT EXISTS idx_platform_quotes_source ON public.platform_quotes(business_id, source);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_source ON public.platform_invoices(business_id, source);

-- Ensure the platform/jobber numbering sequence exists for the platform_jobs record type
INSERT INTO public.numbering_sequences (business_id, record_type, prefix, next_number, padding_length)
SELECT b.id, 'job', 'J', 1, 6
FROM public.businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM public.numbering_sequences ns
  WHERE ns.business_id = b.id AND ns.record_type = 'job'
);