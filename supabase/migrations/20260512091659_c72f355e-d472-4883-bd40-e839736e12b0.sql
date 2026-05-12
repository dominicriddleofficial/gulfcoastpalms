
CREATE TABLE public.mutation_idempotency (
  client_mutation_id uuid PRIMARY KEY,
  user_id uuid,
  business_id uuid,
  action_type text NOT NULL,
  entity_type text,
  entity_id text,
  status text NOT NULL DEFAULT 'success',
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mutation_idempotency_user ON public.mutation_idempotency(user_id, created_at DESC);
CREATE INDEX idx_mutation_idempotency_entity ON public.mutation_idempotency(entity_type, entity_id);

ALTER TABLE public.mutation_idempotency ENABLE ROW LEVEL SECURITY;

-- Users can insert/read their own mutation receipts (used by client to dedupe and inspect)
CREATE POLICY "Users insert own mutation receipts"
ON public.mutation_idempotency
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own mutation receipts"
ON public.mutation_idempotency
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Owners/admins can see all mutation receipts to inspect failed offline mutations
CREATE POLICY "Owners and admins read all mutation receipts"
ON public.mutation_idempotency
FOR SELECT
TO authenticated
USING (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));
