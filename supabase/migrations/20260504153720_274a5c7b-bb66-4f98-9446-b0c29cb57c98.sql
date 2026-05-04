ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS sender_domain text,
  ADD COLUMN IF NOT EXISTS from_email text;