
-- Release checklist tracking
CREATE TABLE public.release_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  released_at timestamptz,
  released_by uuid,
  notes text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.release_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.release_checklists(id) ON DELETE CASCADE,
  section text NOT NULL,
  item_key text NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  is_critical boolean NOT NULL DEFAULT true,
  auto_check_result jsonb,
  link_url text,
  notes text,
  checked_by uuid,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(checklist_id, item_key)
);

CREATE INDEX idx_release_checklists_workspace ON public.release_checklists(workspace_id, created_at DESC);
CREATE INDEX idx_release_checklist_items_checklist ON public.release_checklist_items(checklist_id);

ALTER TABLE public.release_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins manage release checklists"
ON public.release_checklists
FOR ALL
TO authenticated
USING (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins manage release checklist items"
ON public.release_checklist_items
FOR ALL
TO authenticated
USING (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_release_checklists_updated_at
BEFORE UPDATE ON public.release_checklists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_release_checklist_items_updated_at
BEFORE UPDATE ON public.release_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
