ALTER TABLE public.platform_quotes
  ADD COLUMN IF NOT EXISTS approval_sms_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_sms_sent_at timestamptz;