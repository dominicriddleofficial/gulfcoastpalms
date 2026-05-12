
CREATE TABLE public.qa_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  started_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.qa_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.qa_runs(id) ON DELETE CASCADE,
  step_number int NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  detail text,
  link_url text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX idx_qa_runs_business ON public.qa_runs(business_id, started_at DESC);
CREATE INDEX idx_qa_steps_run ON public.qa_steps(run_id, step_number);

ALTER TABLE public.qa_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins manage qa_runs"
ON public.qa_runs FOR ALL TO authenticated
USING (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins manage qa_steps"
ON public.qa_steps FOR ALL TO authenticated
USING (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));
