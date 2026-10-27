-- Single-report guest links for the internal arborist field form. Additive only.
CREATE TABLE public.platform_arborist_quote_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.platform_arborist_quotes(id),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE UNIQUE INDEX platform_arborist_quote_links_one_active_idx ON public.platform_arborist_quote_links (report_id) WHERE revoked_at IS NULL;
GRANT ALL ON public.platform_arborist_quote_links TO service_role;
GRANT SELECT (id, report_id, business_id, created_at, expires_at, revoked_at) ON public.platform_arborist_quote_links TO authenticated;
REVOKE ALL ON public.platform_arborist_quote_links FROM anon;
ALTER TABLE public.platform_arborist_quote_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY arborist_links_staff_read ON public.platform_arborist_quote_links FOR SELECT TO authenticated
  USING (public.arborist_can_review(business_id));

CREATE FUNCTION public.arborist_user_can_review(_user_id uuid, _business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT _user_id IS NOT NULL AND public.has_business_access(_user_id, _business_id)
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = _business_id AND upper(b.shortcode) = 'GCP')
    AND (
      EXISTS (SELECT 1 FROM public.workspaces w JOIN public.businesses b ON b.workspace_id = w.id
              WHERE b.id = _business_id AND w.owner_user_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.user_business_access a
                 WHERE a.business_id = _business_id AND a.user_id = _user_id
                   AND a.active_status = 'active' AND a.role_name IN ('owner', 'office_manager', 'manager'))
    );
$$;

-- Locks the link and its report for the rest of the transaction; raises link_* on any failure.
CREATE FUNCTION public.arborist_link_lock(_token_hash text)
RETURNS public.platform_arborist_quotes LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE link public.platform_arborist_quote_links; report public.platform_arborist_quotes;
BEGIN
  SELECT * INTO link FROM public.platform_arborist_quote_links WHERE token_hash = _token_hash FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'link_invalid'; END IF;
  SELECT * INTO report FROM public.platform_arborist_quotes WHERE id = link.report_id AND business_id = link.business_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'link_invalid'; END IF;
  -- Re-read after the report lock so a concurrent revoke/replace is always observed.
  SELECT * INTO link FROM public.platform_arborist_quote_links WHERE id = link.id;
  IF link.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'link_revoked'; END IF;
  IF report.status <> 'draft' THEN RAISE EXCEPTION 'link_submitted'; END IF;
  IF link.expires_at <= now() THEN RAISE EXCEPTION 'link_expired'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = report.business_id AND upper(b.shortcode) = 'GCP') THEN RAISE EXCEPTION 'link_invalid'; END IF;
  RETURN report;
END;
$$;

CREATE FUNCTION public.arborist_link_issue(_user_id uuid, _business_id uuid, _token_hash text, _report_id uuid DEFAULT NULL,
  _customer_name text DEFAULT '', _property_address text DEFAULT '', _arborist_name text DEFAULT '')
RETURNS TABLE(report_id uuid, expires_at timestamptz) LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target uuid; report public.platform_arborist_quotes; expiry timestamptz := now() + interval '7 days';
BEGIN
  IF NOT public.arborist_user_can_review(_user_id, _business_id) THEN RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501'; END IF;
  IF _token_hash IS NULL OR _token_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'bad_token'; END IF;
  IF _report_id IS NULL THEN
    target := gen_random_uuid();
    PERFORM set_config('app.arborist_link_report', target::text, true);
    INSERT INTO public.platform_arborist_quotes (id, business_id, author_id, customer_name, property_address, arborist_name, trees, status)
    VALUES (target, _business_id, _user_id, left(btrim(coalesce(_customer_name, '')), 300), left(btrim(coalesce(_property_address, '')), 1000),
      left(btrim(coalesce(_arborist_name, '')), 300),
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid()::text, 'species', '', 'service', '', 'location', '', 'description', '',
        'customerDiscussion', '', 'priceType', 'fixed', 'priceMin', '', 'priceMax', '', 'photos', '[]'::jsonb)), 'draft');
    PERFORM set_config('app.arborist_link_report', '', true);
  ELSE
    SELECT * INTO report FROM public.platform_arborist_quotes q WHERE q.id = _report_id AND q.business_id = _business_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
    IF report.status <> 'draft' THEN RAISE EXCEPTION 'not_draft'; END IF;
    target := report.id;
    UPDATE public.platform_arborist_quote_links l SET revoked_at = now() WHERE l.report_id = target AND l.revoked_at IS NULL;
  END IF;
  INSERT INTO public.platform_arborist_quote_links (report_id, business_id, token_hash, created_by, expires_at)
  VALUES (target, _business_id, _token_hash, _user_id, expiry);
  RETURN QUERY SELECT target, expiry;
END;
$$;

CREATE FUNCTION public.arborist_link_revoke(_user_id uuid, _report_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE report public.platform_arborist_quotes; n integer;
BEGIN
  SELECT * INTO report FROM public.platform_arborist_quotes q WHERE q.id = _report_id FOR UPDATE;
  IF NOT FOUND OR NOT public.arborist_user_can_review(_user_id, report.business_id) THEN RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501'; END IF;
  UPDATE public.platform_arborist_quote_links l SET revoked_at = now() WHERE l.report_id = report.id AND l.revoked_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE FUNCTION public.arborist_link_resolve(_token_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE report public.platform_arborist_quotes; link public.platform_arborist_quote_links;
BEGIN
  report := public.arborist_link_lock(_token_hash);
  SELECT * INTO link FROM public.platform_arborist_quote_links WHERE token_hash = _token_hash;
  RETURN jsonb_build_object('state', 'ok', 'expires_at', link.expires_at, 'report', to_jsonb(report));
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE 'link_%' THEN RETURN jsonb_build_object('state', substr(SQLERRM, 6)); END IF;
  RAISE;
END;
$$;

CREATE FUNCTION public.arborist_link_save(_token_hash text, _expected_version integer, _fields jsonb, _status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE report public.platform_arborist_quotes; saved public.platform_arborist_quotes; k text;
BEGIN
  report := public.arborist_link_lock(_token_hash);
  IF report.version IS DISTINCT FROM _expected_version THEN RAISE EXCEPTION 'link_stale'; END IF;
  IF _status NOT IN ('draft', 'submitted') THEN RAISE EXCEPTION 'link_bad_status'; END IF;
  IF jsonb_typeof(_fields) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'link_bad_fields'; END IF;
  FOREACH k IN ARRAY ARRAY['customer_name','property_address','visit_date','arborist_name','general_notes'] LOOP
    IF jsonb_typeof(_fields->k) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'link_bad_fields'; END IF;
  END LOOP;
  IF jsonb_typeof(_fields->'trees') IS DISTINCT FROM 'array' OR (_fields->>'visit_date') !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'link_bad_fields'; END IF;
  PERFORM set_config('app.arborist_link_report', report.id::text, true);
  UPDATE public.platform_arborist_quotes SET
    customer_name = btrim(_fields->>'customer_name'), property_address = btrim(_fields->>'property_address'),
    visit_date = (_fields->>'visit_date')::date, arborist_name = btrim(_fields->>'arborist_name'),
    general_notes = btrim(_fields->>'general_notes'), trees = _fields->'trees', status = _status
  WHERE id = report.id RETURNING * INTO saved;
  PERFORM set_config('app.arborist_link_report', '', true);
  RETURN to_jsonb(saved);
END;
$$;

-- Returns the only storage key a guest may create for this report/tree/photo.
CREATE FUNCTION public.arborist_link_photo_target(_token_hash text, _tree_id uuid, _photo_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE report public.platform_arborist_quotes; prefix text;
BEGIN
  report := public.arborist_link_lock(_token_hash);
  IF _tree_id IS NULL OR _photo_id IS NULL OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(report.trees) t WHERE t->>'id' = _tree_id::text) THEN
    RAISE EXCEPTION 'link_bad_photo';
  END IF;
  prefix := report.business_id::text || '/' || report.author_id::text || '/' || report.id::text || '/' || _tree_id::text || '/';
  IF (SELECT count(*) FROM storage.objects o WHERE o.bucket_id = 'arborist-quote-photos' AND o.name LIKE prefix || '%') >= 24 THEN
    RAISE EXCEPTION 'link_photo_limit';
  END IF;
  RETURN prefix || _photo_id::text || '.jpg';
END;
$$;

REVOKE ALL ON FUNCTION public.arborist_user_can_review(uuid, uuid), public.arborist_link_lock(text),
  public.arborist_link_issue(uuid, uuid, text, uuid, text, text, text), public.arborist_link_revoke(uuid, uuid),
  public.arborist_link_resolve(text), public.arborist_link_save(text, integer, jsonb, text),
  public.arborist_link_photo_target(text, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.arborist_user_can_review(uuid, uuid), public.arborist_link_lock(text),
  public.arborist_link_issue(uuid, uuid, text, uuid, text, text, text), public.arborist_link_revoke(uuid, uuid),
  public.arborist_link_resolve(text), public.arborist_link_save(text, integer, jsonb, text),
  public.arborist_link_photo_target(text, uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.validate_arborist_quote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  tree jsonb; photo jsonb; tree_id uuid; photo_id uuid;
  seen_ids uuid[] := '{}'; seen_photos uuid[] := '{}';
  low_price text; high_price text; pricing text; photo_prefix text; text_key text;
  via_link boolean;
BEGIN
  -- Guest link writes: only the service-only link RPCs set this transaction-local marker,
  -- and only for the exact report row they locked. It never applies to user sessions.
  via_link := coalesce(current_setting('app.arborist_link_report', true), '') = NEW.id::text
    AND coalesce(current_setting('request.jwt.claims', true), '') <> ''
    AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role';
  IF via_link THEN
    IF NEW.status NOT IN ('draft', 'submitted') OR (TG_OP = 'INSERT' AND NEW.status <> 'draft')
       OR (TG_OP = 'UPDATE' AND OLD.status <> 'draft') THEN
      RAISE EXCEPTION 'This quote link can only save a draft or submit it once.' USING ERRCODE = '42501';
    END IF;
  ELSE
  IF NOT public.arborist_can_access(NEW.business_id, NEW.author_id) THEN
    RAISE EXCEPTION 'You do not have access to this arborist report.' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'INSERT' AND (NEW.author_id IS DISTINCT FROM auth.uid() OR NEW.status <> 'draft') THEN
    RAISE EXCEPTION 'Create your own draft before submitting a report.' USING ERRCODE = '42501';
  END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
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
REVOKE ALL ON FUNCTION public.validate_arborist_quote() FROM PUBLIC, anon, authenticated;
