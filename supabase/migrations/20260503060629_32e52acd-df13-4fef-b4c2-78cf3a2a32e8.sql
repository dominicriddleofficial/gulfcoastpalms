CREATE TABLE public.customer_portal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  consumed_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_portal_tokens_email ON public.customer_portal_tokens(lower(email));
CREATE INDEX idx_customer_portal_tokens_expires ON public.customer_portal_tokens(expires_at);
ALTER TABLE public.customer_portal_tokens ENABLE ROW LEVEL SECURITY;
-- No policies = no anon/authenticated access; only service_role bypasses RLS.
