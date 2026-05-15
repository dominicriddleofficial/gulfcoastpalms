ALTER TABLE public.jobber_properties
  ADD COLUMN IF NOT EXISTS formatted_address text,
  ADD COLUMN IF NOT EXISTS place_id text,
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS original_address text,
  ADD COLUMN IF NOT EXISTS address_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS address_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS geocode_source text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS update_jobber_properties_updated_at ON public.jobber_properties;
CREATE TRIGGER update_jobber_properties_updated_at
  BEFORE UPDATE ON public.jobber_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();