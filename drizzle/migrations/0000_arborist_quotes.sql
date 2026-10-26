-- Internal GCP field reports. Additive only: customer quotes, invoices, and jobs are untouched.
CREATE TABLE public.platform_arborist_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  author_id uuid NOT NULL REFERENCES auth.users(id),
  customer_name text NOT NULL DEFAULT '',
  property_address text NOT NULL DEFAULT '',
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  arborist_name text NOT NULL DEFAULT '',
  general_notes text NOT NULL DEFAULT '',
  trees jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  CHECK (char_length(customer_name) <= 300 AND char_length(arborist_name) <= 300),
  CHECK (char_length(property_address) <= 1000 AND char_length(general_notes) <= 10000),
  CHECK (jsonb_typeof(trees) = 'array' AND jsonb_array_length(trees) BETWEEN 1 AND 100)
);
CREATE INDEX platform_arborist_quotes_business_updated_idx ON public.platform_arborist_quotes (business_id, updated_at DESC);
CREATE INDEX platform_arborist_quotes_author_idx ON public.platform_arborist_quotes (author_id, business_id);
ALTER TABLE public.platform_arborist_quotes ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.arborist_can_review(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_business_access(auth.uid(), _business_id)
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = _business_id AND upper(b.shortcode) = 'GCP')
    AND (
      EXISTS (SELECT 1 FROM public.workspaces w JOIN public.businesses b ON b.workspace_id = w.id
              WHERE b.id = _business_id AND w.owner_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.user_business_access a
                 WHERE a.business_id = _business_id AND a.user_id = auth.uid()
                   AND a.active_status = 'active' AND a.role_name IN ('owner', 'office_manager', 'manager'))
    );
$$;
CREATE FUNCTION public.arborist_can_access(_business_id uuid, _author_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_business_access(auth.uid(), _business_id)
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = _business_id AND upper(b.shortcode) = 'GCP')
    AND (auth.uid() = _author_id OR public.arborist_can_review(_business_id));
$$;
REVOKE ALL ON FUNCTION public.arborist_can_review(uuid), public.arborist_can_access(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arborist_can_review(uuid), public.arborist_can_access(uuid, uuid) TO authenticated;

CREATE POLICY arborist_read ON public.platform_arborist_quotes FOR SELECT TO authenticated
  USING (public.arborist_can_access(business_id, author_id));
CREATE POLICY arborist_create ON public.platform_arborist_quotes FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.arborist_can_access(business_id, author_id));
CREATE POLICY arborist_edit ON public.platform_arborist_quotes FOR UPDATE TO authenticated
  USING (public.arborist_can_access(business_id, author_id) AND (status <> 'reviewed' OR public.arborist_can_review(business_id)))
  WITH CHECK (public.arborist_can_access(business_id, author_id));
GRANT SELECT, INSERT, UPDATE ON public.platform_arborist_quotes TO authenticated;
REVOKE ALL ON public.platform_arborist_quotes FROM anon;

CREATE FUNCTION public.validate_arborist_quote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  tree jsonb; photo jsonb; tree_id uuid; photo_id uuid;
  seen_ids uuid[] := '{}'; seen_photos uuid[] := '{}';
  low_price text; high_price text; pricing text; photo_prefix text; text_key text;
BEGIN
  IF NOT public.arborist_can_access(NEW.business_id, NEW.author_id) THEN
    RAISE EXCEPTION 'You do not have access to this arborist report.' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.author_id <> auth.uid() OR NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'Create your own draft before submitting a report.' USING ERRCODE = '42501';
    END IF;
    NEW.version := 1; NEW.created_at := now(); NEW.submitted_at := NULL; NEW.reviewed_at := NULL;
  ELSE
    IF NEW.id <> OLD.id OR NEW.business_id <> OLD.business_id OR NEW.author_id <> OLD.author_id THEN
      RAISE EXCEPTION 'Report identity and author cannot be changed.' USING ERRCODE = '42501';
    END IF;
    IF OLD.status = 'reviewed' AND NOT public.arborist_can_review(OLD.business_id) THEN
      RAISE EXCEPTION 'A reviewed report can only be changed by the office.' USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'reviewed' AND (OLD.status <> 'submitted' OR NOT public.arborist_can_review(NEW.business_id)) THEN
      RAISE EXCEPTION 'Only the office can mark a submitted report reviewed.' USING ERRCODE = '42501';
    END IF;
    -- Content edits must be saved as a draft or resubmitted; review is a status-only action.
    IF NEW.status = 'reviewed' AND ROW(NEW.customer_name, NEW.property_address, NEW.visit_date, NEW.arborist_name, NEW.general_notes, NEW.trees)
       IS DISTINCT FROM ROW(OLD.customer_name, OLD.property_address, OLD.visit_date, OLD.arborist_name, OLD.general_notes, OLD.trees) THEN
      RAISE EXCEPTION 'Save and submit changes before marking reviewed.';
    END IF;
    NEW.version := OLD.version + 1; NEW.created_at := OLD.created_at;
    NEW.submitted_at := CASE WHEN NEW.status = 'submitted' THEN now() WHEN NEW.status = 'reviewed' THEN OLD.submitted_at ELSE NULL END;
    NEW.reviewed_at := CASE WHEN NEW.status = 'reviewed' THEN now() ELSE NULL END;
  END IF;
  NEW.updated_at := now();
  IF jsonb_typeof(NEW.trees) IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.trees) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'A report needs between 1 and 100 tree entries.';
  END IF;
  IF NEW.status <> 'draft' AND (btrim(NEW.customer_name) = '' OR btrim(NEW.property_address) = '' OR btrim(NEW.arborist_name) = '') THEN
    RAISE EXCEPTION 'Customer, property address, and arborist name are required before submitting.';
  END IF;
  FOR tree IN SELECT value FROM jsonb_array_elements(NEW.trees) LOOP
    IF jsonb_typeof(tree) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid tree entry.'; END IF;
    FOREACH text_key IN ARRAY ARRAY['id','species','service','location','description','customerDiscussion','priceType','priceMin','priceMax'] LOOP
      IF jsonb_typeof(tree->text_key) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Tree fields must contain text.'; END IF;
    END LOOP;
    tree_id := (tree->>'id')::uuid;
    IF tree_id IS NULL OR tree_id = ANY(seen_ids) THEN RAISE EXCEPTION 'Each tree needs a unique ID.'; END IF;
    seen_ids := array_append(seen_ids, tree_id);
    IF char_length(coalesce(tree->>'species','')) > 300 OR char_length(coalesce(tree->>'location','')) > 1000
       OR char_length(coalesce(tree->>'description','')) > 10000 OR char_length(coalesce(tree->>'customerDiscussion','')) > 10000 THEN
      RAISE EXCEPTION 'Tree notes exceed the allowed length.';
    END IF;
    pricing := coalesce(tree->>'priceType','');
    low_price := btrim(coalesce(tree->>'priceMin','')); high_price := btrim(coalesce(tree->>'priceMax',''));
    IF pricing NOT IN ('fixed','range','unsure') THEN RAISE EXCEPTION 'Choose fixed price, price range, or not sure yet.'; END IF;
    IF pricing <> 'unsure' THEN
      IF low_price <> '' AND low_price !~ '^\d{1,7}(\.\d{1,2})?$' THEN RAISE EXCEPTION 'Invalid suggested price.'; END IF;
      IF pricing = 'range' AND high_price <> '' AND high_price !~ '^\d{1,7}(\.\d{1,2})?$' THEN RAISE EXCEPTION 'Invalid high price.'; END IF;
      IF pricing = 'range' AND low_price <> '' AND high_price <> '' AND high_price::numeric < low_price::numeric THEN RAISE EXCEPTION 'High price must be at least the low price.'; END IF;
      IF NEW.status <> 'draft' AND (low_price = '' OR (pricing = 'range' AND high_price = '')) THEN RAISE EXCEPTION 'Add a price or choose not sure yet before submitting.'; END IF;
    END IF;
    IF jsonb_typeof(tree->'photos') IS DISTINCT FROM 'array' OR jsonb_array_length(tree->'photos') > 8 THEN RAISE EXCEPTION 'Each tree can have up to 8 photos.'; END IF;
    IF NEW.status <> 'draft' AND (
      btrim(coalesce(tree->>'species','')) = '' OR btrim(coalesce(tree->>'description','')) = '' OR btrim(coalesce(tree->>'customerDiscussion','')) = ''
      OR coalesce(tree->>'service','') NOT IN ('Tree removal','Tree trimming','Limb removal','Palm trimming','Other')
      OR jsonb_array_length(tree->'photos') = 0
    ) THEN RAISE EXCEPTION 'Each tree needs its type, requested work, description, customer discussion, and at least one photo.'; END IF;
    photo_prefix := NEW.business_id::text || '/' || NEW.author_id::text || '/' || NEW.id::text || '/' || tree_id::text || '/';
    FOR photo IN SELECT value FROM jsonb_array_elements(tree->'photos') LOOP
      IF jsonb_typeof(photo) IS DISTINCT FROM 'object' OR jsonb_typeof(photo->'id') IS DISTINCT FROM 'string'
         OR jsonb_typeof(photo->'path') IS DISTINCT FROM 'string' OR jsonb_typeof(photo->'name') IS DISTINCT FROM 'string' THEN
        RAISE EXCEPTION 'Invalid photo entry.';
      END IF;
      photo_id := (photo->>'id')::uuid;
      IF photo_id IS NULL OR photo_id = ANY(seen_photos) THEN RAISE EXCEPTION 'Each photo needs a unique ID.'; END IF;
      seen_photos := array_append(seen_photos, photo_id);
      IF (photo->>'path') IS DISTINCT FROM photo_prefix || photo_id::text || '.jpg' THEN RAISE EXCEPTION 'Photo must belong to this report and tree.'; END IF;
      IF char_length(coalesce(photo->>'name','')) > 500 THEN RAISE EXCEPTION 'Photo filename is too long.'; END IF;
      IF NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'arborist-quote-photos' AND o.name = photo->>'path') THEN
        RAISE EXCEPTION 'Photo upload is missing. Upload it again before saving.';
      END IF;
    END LOOP;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_arborist_quote() FROM PUBLIC;
CREATE TRIGGER validate_arborist_quote BEFORE INSERT OR UPDATE ON public.platform_arborist_quotes
  FOR EACH ROW EXECUTE FUNCTION public.validate_arborist_quote();

-- Private bucket 'arborist-quote-photos' is created via the storage tool (10 MB limit).
CREATE FUNCTION public.arborist_photo_access(_name text, _write boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE parts text[]; report public.platform_arborist_quotes;
BEGIN
  parts := string_to_array(_name, '/');
  IF array_length(parts, 1) <> 5 THEN RETURN false; END IF;
  IF parts[5] !~ '^[0-9a-f-]{36}\.jpg$' THEN RETURN false; END IF;
  SELECT * INTO report FROM public.platform_arborist_quotes
    WHERE id = parts[3]::uuid AND business_id = parts[1]::uuid AND author_id = parts[2]::uuid;
  IF NOT FOUND OR NOT public.arborist_can_access(report.business_id, report.author_id) THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(report.trees) t WHERE t->>'id' = parts[4]) THEN RETURN false; END IF;
  RETURN NOT _write OR report.status <> 'reviewed' OR public.arborist_can_review(report.business_id);
EXCEPTION WHEN invalid_text_representation THEN RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.arborist_photo_access(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arborist_photo_access(text, boolean) TO authenticated;
CREATE POLICY arborist_photos_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'arborist-quote-photos' AND public.arborist_photo_access(name, false));
CREATE POLICY arborist_photos_create ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'arborist-quote-photos' AND public.arborist_photo_access(name, true));
-- No object replacement or deletion grants: submitted report images cannot be silently swapped.