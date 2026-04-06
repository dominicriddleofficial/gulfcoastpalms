
CREATE TABLE public.terminal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  user_id uuid,
  location_id text,
  device_type text NOT NULL DEFAULT 'tap_to_pay_iphone',
  connection_token_id text,
  status text NOT NULL DEFAULT 'inactive',
  last_active_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.terminal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage business terminal sessions"
  ON public.terminal_sessions FOR ALL
  TO authenticated
  USING (has_business_access(auth.uid(), business_id))
  WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE TRIGGER update_terminal_sessions_updated_at
  BEFORE UPDATE ON public.terminal_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
