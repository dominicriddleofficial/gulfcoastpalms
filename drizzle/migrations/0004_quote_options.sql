-- Customer-selectable quote options (GCP) and arborist-report-to-quote traceability. Additive only.
ALTER TABLE public.platform_quote_line_items
  ADD COLUMN option_kind text NOT NULL DEFAULT 'required',
  ADD COLUMN option_group text,
  ADD COLUMN default_selected boolean NOT NULL DEFAULT true,
  ADD COLUMN customer_selected boolean;
ALTER TABLE public.platform_quote_line_items
  ADD CONSTRAINT platform_quote_line_items_option_kind_check CHECK (option_kind IN ('required', 'optional', 'alternative')),
  ADD CONSTRAINT platform_quote_line_items_option_group_check CHECK (
    (option_kind = 'alternative' AND option_group IS NOT NULL AND char_length(btrim(option_group)) BETWEEN 1 AND 120)
    OR (option_kind <> 'alternative' AND option_group IS NULL));

ALTER TABLE public.platform_quotes
  ADD COLUMN accepted_snapshot jsonb,
  ADD COLUMN source_arborist_quote_id uuid REFERENCES public.platform_arborist_quotes(id);
CREATE UNIQUE INDEX platform_quotes_source_arborist_quote_idx ON public.platform_quotes (source_arborist_quote_id)
  WHERE source_arborist_quote_id IS NOT NULL;

-- Line guard: GCP-only options, approval-only selection flags, frozen lines after an option acceptance.
CREATE FUNCTION public.guard_quote_line_options()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE q public.platform_quotes; approving boolean; target_quote uuid;
BEGIN
  target_quote := CASE WHEN TG_OP = 'DELETE' THEN OLD.quote_id ELSE NEW.quote_id END;
  approving := coalesce(current_setting('app.quote_approval', true), '') = target_quote::text;
  -- Serialize with approval: a line write and an approval of the same quote can never interleave.
  SELECT * INTO q FROM public.platform_quotes WHERE id = target_quote FOR UPDATE;
  IF FOUND AND q.accepted_snapshot IS NOT NULL THEN
    RAISE EXCEPTION 'This quote was accepted with the customer''s choices and can''t be changed. Create a new quote for any changes.' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE' AND NEW.quote_id <> OLD.quote_id THEN RAISE EXCEPTION 'Line items cannot move between quotes.'; END IF;
  IF NEW.option_kind <> 'required' AND NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = NEW.business_id AND upper(b.shortcode) = 'GCP') THEN
    RAISE EXCEPTION 'Customer options are only available for Gulf Coast Palms quotes.';
  END IF;
  IF NOT approving AND NEW.customer_selected IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.customer_selected ELSE NULL END) THEN
    RAISE EXCEPTION 'Customer selections are recorded only when the customer approves.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_quote_line_options BEFORE INSERT OR UPDATE OR DELETE ON public.platform_quote_line_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_quote_line_options();

-- Header guard: accepted snapshots are written only by approval and are immutable; source report must be valid.
CREATE FUNCTION public.guard_quote_options_header()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE approving boolean := coalesce(current_setting('app.quote_approval', true), '') = NEW.id::text; src public.platform_arborist_quotes;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.accepted_snapshot IS NOT NULL THEN RAISE EXCEPTION 'Accepted choices are recorded only by customer approval.' USING ERRCODE = '42501'; END IF;
  ELSE
    IF NEW.accepted_snapshot IS DISTINCT FROM OLD.accepted_snapshot AND (NOT approving OR OLD.accepted_snapshot IS NOT NULL) THEN
      RAISE EXCEPTION 'Accepted choices are recorded only by customer approval and cannot be changed.' USING ERRCODE = '42501';
    END IF;
    IF OLD.accepted_snapshot IS NOT NULL AND ROW(NEW.subtotal, NEW.discount_total, NEW.tax_rate, NEW.tax_total, NEW.total, NEW.deposit_amount_calculated, NEW.customer_id, NEW.business_id)
       IS DISTINCT FROM ROW(OLD.subtotal, OLD.discount_total, OLD.tax_rate, OLD.tax_total, OLD.total, OLD.deposit_amount_calculated, OLD.customer_id, OLD.business_id) THEN
      RAISE EXCEPTION 'This quote was accepted with the customer''s choices; its prices can''t be changed. Create a new quote for any changes.' USING ERRCODE = '42501';
    END IF;
    IF OLD.source_arborist_quote_id IS NOT NULL AND NEW.source_arborist_quote_id IS DISTINCT FROM OLD.source_arborist_quote_id THEN
      RAISE EXCEPTION 'The source arborist report cannot be changed.';
    END IF;
  END IF;
  IF NEW.source_arborist_quote_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.source_arborist_quote_id IS DISTINCT FROM OLD.source_arborist_quote_id) THEN
    SELECT * INTO src FROM public.platform_arborist_quotes WHERE id = NEW.source_arborist_quote_id;
    IF NOT FOUND OR src.business_id <> NEW.business_id OR src.status NOT IN ('submitted', 'reviewed')
       OR (auth.uid() IS NOT NULL AND NOT public.arborist_can_review(src.business_id)) THEN
      RAISE EXCEPTION 'Only the office can create a customer quote from a submitted arborist report.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_quote_options_header BEFORE INSERT OR UPDATE ON public.platform_quotes
  FOR EACH ROW EXECUTE FUNCTION public.guard_quote_options_header();

-- Stable fingerprint of everything that affects a customer's price; the public page must approve the same one.
CREATE FUNCTION public.quote_pricing_fingerprint(_quote_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT md5(concat_ws('|', q.version_number::text, q.tax_rate::text, q.discount_total::text,
    (SELECT string_agg(concat_ws(',', l.id::text, l.option_kind, coalesce(l.option_group, ''), l.quantity::text, l.unit_price::text,
       coalesce(l.discount_amount, 0)::text, coalesce(l.taxable_flag, true)::text, l.description), ';' ORDER BY l.sort_order, l.id)
     FROM public.platform_quote_line_items l WHERE l.quote_id = q.id)))
  FROM public.platform_quotes q WHERE q.id = _quote_id;
$$;

-- Authoritative, transactional approval of a quote with customer options.
CREATE FUNCTION public.approve_quote_options(_quote_id uuid, _approved_by text, _selected uuid[], _fingerprint text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  q public.platform_quotes; sel uuid[] := coalesce(_selected, '{}'); bad int; grp record;
  sub_c bigint := 0; taxable_c bigint := 0; tax_c bigint; disc_c bigint; total_c bigint; dep numeric := 0;
  line record; lines jsonb := '[]'::jsonb; amount_c bigint; included boolean; snapshot jsonb; now_ts timestamptz := now();
BEGIN
  IF _approved_by IS NULL OR char_length(btrim(_approved_by)) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'quote_bad_name'; END IF;
  SELECT * INTO q FROM public.platform_quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND OR q.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'quote_not_found'; END IF;
  IF q.status IN ('approved', 'accepted', 'won') THEN
    -- Idempotent retry: same choices return the recorded result; different choices are refused.
    IF q.accepted_snapshot IS NOT NULL AND (SELECT coalesce(array_agg(x ORDER BY x), '{}') FROM jsonb_array_elements_text(q.accepted_snapshot->'selected_option_ids') x)
       = (SELECT coalesce(array_agg(DISTINCT x::text ORDER BY x::text), '{}') FROM unnest(sel) x) THEN
      RETURN jsonb_build_object('status', 'already_approved', 'snapshot', q.accepted_snapshot);
    END IF;
    RAISE EXCEPTION 'quote_already_approved';
  END IF;
  IF q.status IN ('declined', 'expired') THEN RAISE EXCEPTION 'quote_closed'; END IF;
  IF _fingerprint IS DISTINCT FROM public.quote_pricing_fingerprint(q.id) THEN RAISE EXCEPTION 'quote_stale'; END IF;
  SELECT count(*) INTO bad FROM unnest(sel) s WHERE NOT EXISTS (
    SELECT 1 FROM public.platform_quote_line_items l WHERE l.id = s AND l.quote_id = q.id AND l.option_kind <> 'required');
  IF bad > 0 OR cardinality(sel) <> (SELECT count(DISTINCT x) FROM unnest(sel) x) THEN RAISE EXCEPTION 'quote_invalid_option'; END IF;
  FOR grp IN SELECT l.option_group g, count(*) FILTER (WHERE l.id = ANY(sel)) n FROM public.platform_quote_line_items l
             WHERE l.quote_id = q.id AND l.option_kind = 'alternative' GROUP BY l.option_group LOOP
    IF grp.n <> 1 THEN RAISE EXCEPTION 'quote_choose_one'; END IF;
  END LOOP;

  FOR line IN SELECT * FROM public.platform_quote_line_items l WHERE l.quote_id = q.id ORDER BY l.sort_order, l.id LOOP
    included := line.option_kind = 'required' OR line.id = ANY(sel);
    amount_c := round((line.quantity * line.unit_price - coalesce(line.discount_amount, 0)) * 100);
    IF included THEN
      sub_c := sub_c + amount_c;
      IF coalesce(line.taxable_flag, true) THEN taxable_c := taxable_c + amount_c; END IF;
    END IF;
    lines := lines || jsonb_build_object('id', line.id, 'description', line.description, 'option_kind', line.option_kind,
      'option_group', line.option_group, 'quantity', line.quantity, 'unit_price', line.unit_price,
      'line_total', amount_c / 100.0, 'selected', included);
  END LOOP;
  tax_c := round(taxable_c * coalesce(q.tax_rate, 0) / 100.0);
  disc_c := least(round(coalesce(q.discount_total, 0) * 100), sub_c);
  total_c := greatest(0, sub_c + tax_c - disc_c);
  IF coalesce(q.deposit_required_flag, false) THEN
    dep := CASE WHEN q.deposit_type = 'fixed' THEN least(coalesce(q.deposit_value, 0), total_c / 100.0)
                ELSE round(total_c * coalesce(q.deposit_value, 0) / 100.0) / 100.0 END;
  END IF;
  snapshot := jsonb_build_object('version_number', q.version_number, 'fingerprint', _fingerprint,
    'approved_by', btrim(_approved_by), 'approved_at', now_ts,
    'selected_option_ids', (SELECT coalesce(jsonb_agg(x::text ORDER BY x::text), '[]'::jsonb) FROM unnest(sel) x),
    'lines', lines, 'subtotal', sub_c / 100.0, 'tax_rate', q.tax_rate, 'tax_total', tax_c / 100.0,
    'discount_total', disc_c / 100.0, 'total', total_c / 100.0);

  PERFORM set_config('app.quote_approval', q.id::text, true);
  UPDATE public.platform_quote_line_items l SET customer_selected = (l.option_kind = 'required' OR l.id = ANY(sel)) WHERE l.quote_id = q.id;
  UPDATE public.platform_quotes SET status = 'approved', approved_by = btrim(_approved_by), approved_at = now_ts, accepted_at = now_ts,
    subtotal = sub_c / 100.0, tax_total = tax_c / 100.0, discount_total = disc_c / 100.0, total = total_c / 100.0,
    deposit_amount_calculated = dep, accepted_snapshot = snapshot
  WHERE id = q.id;
  PERFORM set_config('app.quote_approval', '', true);
  RETURN jsonb_build_object('status', 'approved', 'snapshot', snapshot);
END;
$$;

REVOKE ALL ON FUNCTION public.guard_quote_line_options(), public.guard_quote_options_header(),
  public.quote_pricing_fingerprint(uuid), public.approve_quote_options(uuid, text, uuid[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quote_pricing_fingerprint(uuid), public.approve_quote_options(uuid, text, uuid[], text) TO service_role;
