
CREATE TABLE public.geocode_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address text NOT NULL UNIQUE,
  lat numeric,
  lng numeric,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager manage geocode_cache"
  ON public.geocode_cache FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Staff view geocode_cache"
  ON public.geocode_cache FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'team_leader'::app_role) OR has_role(auth.uid(), 'limited_staff'::app_role));

CREATE TRIGGER update_geocode_cache_updated_at
  BEFORE UPDATE ON public.geocode_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
