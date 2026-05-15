
ALTER TABLE public.platform_invoices
  ADD COLUMN IF NOT EXISTS service_address_line1 text,
  ADD COLUMN IF NOT EXISTS service_address_line2 text,
  ADD COLUMN IF NOT EXISTS service_city text,
  ADD COLUMN IF NOT EXISTS service_state text,
  ADD COLUMN IF NOT EXISTS service_zip text,
  ADD COLUMN IF NOT EXISTS service_formatted_address text,
  ADD COLUMN IF NOT EXISTS service_latitude numeric,
  ADD COLUMN IF NOT EXISTS service_longitude numeric,
  ADD COLUMN IF NOT EXISTS service_place_id text;
