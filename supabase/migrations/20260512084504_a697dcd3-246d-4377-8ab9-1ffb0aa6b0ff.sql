
CREATE TABLE IF NOT EXISTS public.reconciliation_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  finding_key text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL,
  note text,
  dismissed_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reconciliation_dismissals_key
  ON public.reconciliation_dismissals (finding_key);
CREATE INDEX IF NOT EXISTS idx_reconciliation_dismissals_business
  ON public.reconciliation_dismissals (business_id, created_at DESC);

ALTER TABLE public.reconciliation_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view dismissals"
  ON public.reconciliation_dismissals FOR SELECT TO authenticated
  USING (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners insert dismissals"
  ON public.reconciliation_dismissals FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners delete dismissals"
  ON public.reconciliation_dismissals FOR DELETE TO authenticated
  USING (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));
