
CREATE TABLE public.platform_saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  default_price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_access_saved_items" ON public.platform_saved_items
  FOR ALL USING (has_business_access(auth.uid(), business_id))
  WITH CHECK (has_business_access(auth.uid(), business_id));
