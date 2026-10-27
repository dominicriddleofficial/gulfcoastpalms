-- Quote options correctness: full accepted scope/identity snapshot + freeze, converted/accepted idempotence,
-- no options on already-approved/invoiced legacy quotes, consistent public pricing read,
-- one-transaction option quote edits, and idempotent invoice-from-accepted-quote. Additive only.

CREATE OR REPLACE FUNCTION public.guard_quote_line_options()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE q public.platform_quotes; approving boolean; target_quote uuid;
BEGIN
  target_quote := CASE WHEN TG_OP = 'DELETE' THEN OLD.quote_id ELSE NEW.quote_id END;
  approving := coalesce(current_setting('app.quote_approval', true), '') = target_quote::text;
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
  -- A quote that was already approved or invoiced can't start offering choices; use a fresh draft.
  IF NEW.option_kind <> 'required' AND (TG_OP = 'INSERT' OR OLD.option_kind = 'required') AND FOUND
     AND (q.status IN ('approved', 'accepted', 'won', 'converted')
          OR EXISTS (SELECT 1 FROM public.platform_invoices i WHERE i.quote_id = q.id)) THEN
    RAISE EXCEPTION 'This quote was already approved or invoiced, so it can''t offer customer choices. Create a new quote for any changes.' USING ERRCODE = '42501';
  END IF;
  IF NOT approving AND NEW.customer_selected IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.customer_selected ELSE NULL END) THEN
    RAISE EXCEPTION 'Customer selections are recorded only when the customer approves.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_quote_options_header()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE approving boolean := coalesce(current_setting('app.quote_approval', true), '') = NEW.id::text; src public.platform_arborist_quotes;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.accepted_snapshot IS NOT NULL THEN RAISE EXCEPTION 'Accepted choices are recorded only by customer approval.' USING ERRCODE = '42501'; END IF;
  ELSE
    IF NEW.accepted_snapshot IS DISTINCT FROM OLD.accepted_snapshot AND (NOT approving OR OLD.accepted_snapshot IS NOT NULL) THEN
      RAISE EXCEPTION 'Accepted choices are recorded only by customer approval and cannot be changed.' USING ERRCODE = '42501';
    END IF;
    -- Everything the customer agreed to is frozen: prices, scope, notes, validity and who/where.
    IF OLD.accepted_snapshot IS NOT NULL AND ROW(NEW.subtotal, NEW.discount_total, NEW.tax_rate, NEW.tax_total, NEW.total,
         NEW.deposit_amount_calculated, NEW.deposit_required_flag, NEW.deposit_type, NEW.deposit_value, NEW.customer_id, NEW.business_id,
         NEW.property_id, NEW.billing_name, NEW.scope_of_work, NEW.public_notes, NEW.valid_until, NEW.version_number)
       IS DISTINCT FROM ROW(OLD.subtotal, OLD.discount_total, OLD.tax_rate, OLD.tax_total, OLD.total,
         OLD.deposit_amount_calculated, OLD.deposit_required_flag, OLD.deposit_type, OLD.deposit_value, OLD.customer_id, OLD.business_id,
         OLD.property_id, OLD.billing_name, OLD.scope_of_work, OLD.public_notes, OLD.valid_until, OLD.version_number) THEN
      RAISE EXCEPTION 'This quote was accepted with the customer''s choices and can''t be changed. Create a new quote for any changes.' USING ERRCODE = '42501';
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

CREATE OR REPLACE FUNCTION public.approve_quote_options(_quote_id uuid, _approved_by text, _selected uuid[], _fingerprint text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  q public.platform_quotes; sel uuid[] := coalesce(_selected, '{}'); bad int; grp record;
  sub_c bigint := 0; taxable_c bigint := 0; tax_c bigint; disc_c bigint; total_c bigint; dep numeric := 0;
  line record; lines jsonb := '[]'::jsonb; amount_c bigint; included boolean; snapshot jsonb; now_ts timestamptz := now();
  cust_name text; cust_address text;
BEGIN
  IF _approved_by IS NULL OR char_length(btrim(_approved_by)) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'quote_bad_name'; END IF;
  SELECT * INTO q FROM public.platform_quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND OR q.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'quote_not_found'; END IF;
  -- An accepted snapshot keeps the quote accepted whatever happens later (job created, invoiced...).
  IF q.accepted_snapshot IS NOT NULL OR q.status IN ('approved', 'accepted', 'won', 'converted') THEN
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
      'option_group', line.option_group, 'quantity', line.quantity, 'unit', line.unit, 'unit_price', line.unit_price,
      'taxable_flag', coalesce(line.taxable_flag, true), 'line_total', amount_c / 100.0, 'selected', included);
  END LOOP;
  tax_c := round(taxable_c * coalesce(q.tax_rate, 0) / 100.0);
  disc_c := least(round(coalesce(q.discount_total, 0) * 100), sub_c);
  total_c := greatest(0, sub_c + tax_c - disc_c);
  IF coalesce(q.deposit_required_flag, false) THEN
    dep := CASE WHEN q.deposit_type = 'fixed' THEN least(coalesce(q.deposit_value, 0), total_c / 100.0)
                ELSE round(total_c * coalesce(q.deposit_value, 0) / 100.0) / 100.0 END;
  END IF;
  SELECT c.display_name INTO cust_name FROM public.platform_customers c WHERE c.id = q.customer_id;
  SELECT concat_ws(', ', nullif(p.address_1, ''), nullif(p.city, ''), nullif(p.state, ''), nullif(p.zip, '')) INTO cust_address
    FROM public.platform_properties p WHERE p.id = q.property_id;
  snapshot := jsonb_build_object('version_number', q.version_number, 'fingerprint', _fingerprint,
    'approved_by', btrim(_approved_by), 'approved_at', now_ts,
    'selected_option_ids', (SELECT coalesce(jsonb_agg(x::text ORDER BY x::text), '[]'::jsonb) FROM unnest(sel) x),
    'lines', lines, 'subtotal', sub_c / 100.0, 'tax_rate', q.tax_rate, 'tax_total', tax_c / 100.0,
    'discount_total', disc_c / 100.0, 'total', total_c / 100.0, 'deposit_amount', dep,
    'quote_number', q.quote_number, 'scope_of_work', q.scope_of_work, 'public_notes', q.public_notes, 'valid_until', q.valid_until,
    'customer_id', q.customer_id, 'property_id', q.property_id, 'billing_name', q.billing_name,
    'customer_name', coalesce(nullif(btrim(q.billing_name), ''), cust_name), 'customer_address', cust_address);

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

-- One consistent read (single statement snapshot) of header pricing, lines and fingerprint for the public page.
CREATE FUNCTION public.quote_public_pricing(_quote_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'subtotal', q.subtotal, 'discount_total', q.discount_total, 'tax_rate', q.tax_rate, 'tax_total', q.tax_total, 'total', q.total,
    'deposit_amount', q.deposit_amount_calculated, 'accepted_snapshot', q.accepted_snapshot, 'version_number', q.version_number,
    'fingerprint', md5(concat_ws('|', q.version_number::text, q.tax_rate::text, q.discount_total::text,
      (SELECT string_agg(concat_ws(',', l.id::text, l.option_kind, coalesce(l.option_group, ''), l.quantity::text, l.unit_price::text,
         coalesce(l.discount_amount, 0)::text, coalesce(l.taxable_flag, true)::text, l.description), ';' ORDER BY l.sort_order, l.id)
       FROM public.platform_quote_line_items l WHERE l.quote_id = q.id))),
    'line_items', coalesce((SELECT jsonb_agg(jsonb_build_object('id', l.id, 'description', l.description, 'quantity', l.quantity,
        'unit_price', l.unit_price, 'discount_amount', l.discount_amount, 'taxable_flag', l.taxable_flag, 'line_total', l.line_total,
        'line_type', l.line_type, 'option_kind', l.option_kind, 'option_group', l.option_group,
        'default_selected', l.default_selected, 'customer_selected', l.customer_selected) ORDER BY l.sort_order, l.id)
      FROM public.platform_quote_line_items l WHERE l.quote_id = q.id), '[]'::jsonb))
  FROM public.platform_quotes q WHERE q.id = _quote_id;
$$;

-- Save an edited quote (header + every line change + version history) in one transaction.
-- Runs with the caller's own permissions (row security applies exactly as for direct edits).
CREATE FUNCTION public.save_quote_edit(_quote_id uuid, _expected_updated_at timestamptz, _changes jsonb, _lines jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE q public.platform_quotes; saved public.platform_quotes; n int; expected int; items jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in before saving the quote.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO q FROM public.platform_quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote could not be loaded.'; END IF;
  IF q.is_read_only OR q.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'This quote cannot be edited.'; END IF;
  IF q.accepted_snapshot IS NOT NULL THEN
    RAISE EXCEPTION 'This quote was accepted with the customer''s choices and can''t be edited. Create a new quote for any changes.' USING ERRCODE = '42501';
  END IF;
  IF q.updated_at IS DISTINCT FROM _expected_updated_at THEN
    RAISE EXCEPTION 'This quote changed while you were editing. Reopen it to load the latest version.' USING ERRCODE = '40001';
  END IF;
  IF jsonb_typeof(_lines) <> 'array' OR jsonb_array_length(_lines) = 0 OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(_lines) e WHERE
      (e->>'id') IS NULL OR btrim(coalesce(e->>'description', '')) = '' OR (e->>'quantity')::numeric <= 0
      OR (e->>'unit_price')::numeric < 0 OR (e->>'line_total')::numeric < 0) THEN
    RAISE EXCEPTION 'Add a description, a quantity greater than zero, and a valid price for each line.';
  END IF;
  expected := jsonb_array_length(_lines);

  DELETE FROM public.platform_quote_line_items l WHERE l.quote_id = q.id
    AND l.id NOT IN (SELECT (e->>'id')::uuid FROM jsonb_array_elements(_lines) e);

  INSERT INTO public.platform_quote_line_items AS t (id, quote_id, business_id, service_catalog_id, line_type, description, quantity, unit,
    unit_price, discount_amount, taxable_flag, line_total, sort_order, option_kind, option_group, default_selected)
  SELECT (e->>'id')::uuid, q.id, q.business_id, nullif(e->>'service_catalog_id', '')::uuid, coalesce(e->>'line_type', 'service'),
    btrim(e->>'description'), (e->>'quantity')::numeric, coalesce(e->>'unit', 'each'), (e->>'unit_price')::numeric,
    coalesce((e->>'discount_amount')::numeric, 0), coalesce((e->>'taxable_flag')::boolean, true), (e->>'line_total')::numeric,
    coalesce((e->>'sort_order')::int, 0), coalesce(e->>'option_kind', 'required'),
    CASE WHEN e->>'option_kind' = 'alternative' THEN btrim(e->>'option_group') END,
    CASE WHEN coalesce(e->>'option_kind', 'required') = 'required' THEN true ELSE coalesce((e->>'default_selected')::boolean, false) END
  FROM jsonb_array_elements(_lines) e
  ON CONFLICT (id) DO UPDATE SET service_catalog_id = EXCLUDED.service_catalog_id, line_type = EXCLUDED.line_type,
    description = EXCLUDED.description, quantity = EXCLUDED.quantity, unit = EXCLUDED.unit, unit_price = EXCLUDED.unit_price,
    discount_amount = EXCLUDED.discount_amount, taxable_flag = EXCLUDED.taxable_flag, line_total = EXCLUDED.line_total,
    sort_order = EXCLUDED.sort_order, option_kind = EXCLUDED.option_kind, option_group = EXCLUDED.option_group,
    default_selected = EXCLUDED.default_selected
  WHERE t.quote_id = q.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> expected THEN RAISE EXCEPTION 'The line items do not belong to this quote.'; END IF;

  UPDATE public.platform_quotes SET
    billing_name = CASE WHEN _changes ? 'billing_name' THEN nullif(btrim(_changes->>'billing_name'), '') ELSE billing_name END,
    subtotal = coalesce((_changes->>'subtotal')::numeric, subtotal),
    discount_total = coalesce((_changes->>'discount_total')::numeric, discount_total),
    tax_rate = coalesce((_changes->>'tax_rate')::numeric, tax_rate),
    tax_total = coalesce((_changes->>'tax_total')::numeric, tax_total),
    total = coalesce((_changes->>'total')::numeric, total),
    deposit_required_flag = coalesce((_changes->>'deposit_required_flag')::boolean, deposit_required_flag),
    deposit_type = coalesce(_changes->>'deposit_type', deposit_type),
    deposit_value = coalesce((_changes->>'deposit_value')::numeric, deposit_value),
    deposit_amount_calculated = coalesce((_changes->>'deposit_amount_calculated')::numeric, deposit_amount_calculated),
    valid_until = CASE WHEN _changes ? 'valid_until' THEN nullif(_changes->>'valid_until', '')::date ELSE valid_until END,
    scope_of_work = CASE WHEN _changes ? 'scope_of_work' THEN _changes->>'scope_of_work' ELSE scope_of_work END,
    internal_notes = CASE WHEN _changes ? 'internal_notes' THEN _changes->>'internal_notes' ELSE internal_notes END,
    public_notes = CASE WHEN _changes ? 'public_notes' THEN _changes->>'public_notes' ELSE public_notes END,
    version_number = coalesce(version_number, 1) + 1, last_modified_by_user_id = auth.uid()
  WHERE id = q.id RETURNING * INTO saved;
  IF NOT FOUND THEN RAISE EXCEPTION 'Could not confirm the quote saved.'; END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.sort_order, l.id), '[]'::jsonb) INTO items
    FROM public.platform_quote_line_items l WHERE l.quote_id = q.id;
  INSERT INTO public.platform_quote_versions (business_id, quote_id, version_number, created_by_user_id, snapshot_json)
  VALUES (q.business_id, q.id, saved.version_number, auth.uid(), jsonb_build_object('quote', to_jsonb(saved), 'line_items', items));
  RETURN jsonb_build_object('quote', to_jsonb(saved), 'items', items);
END;
$$;

-- Invoice an accepted option quote exactly once, from the accepted snapshot (chosen lines + agreed totals).
CREATE FUNCTION public.invoice_accepted_quote(_quote_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE q public.platform_quotes; existing public.platform_invoices; inv_id uuid; inv_no text; snap jsonb;
BEGIN
  SELECT * INTO q FROM public.platform_quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND OR q.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Quote not found.'; END IF;
  IF auth.uid() IS NULL OR NOT public.user_has_any_role(auth.uid(), q.business_id, ARRAY['owner', 'office_manager', 'manager']) THEN
    RAISE EXCEPTION 'Only the office can invoice a quote.' USING ERRCODE = '42501';
  END IF;
  snap := q.accepted_snapshot;
  IF snap IS NULL THEN RAISE EXCEPTION 'The customer hasn''t approved their choices yet. Invoice after they approve the quote.'; END IF;
  SELECT * INTO existing FROM public.platform_invoices i WHERE i.quote_id = q.id AND i.deleted_at IS NULL AND i.status <> 'void' ORDER BY i.created_at LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('status', 'existing', 'invoice_id', existing.id, 'invoice_number', existing.invoice_number); END IF;
  inv_no := public.generate_next_number(q.business_id, 'invoice');
  INSERT INTO public.platform_invoices (business_id, invoice_number, customer_id, property_id, quote_id, status, issue_date, due_date, terms,
    subtotal, tax_rate, tax_total, discount_total, total, balance_due, amount_paid, public_notes, internal_notes, billing_name)
  VALUES (q.business_id, inv_no, q.customer_id, q.property_id, q.id, 'draft', current_date, current_date + 30, 'Net 30',
    (snap->>'subtotal')::numeric, (snap->>'tax_rate')::numeric, (snap->>'tax_total')::numeric, (snap->>'discount_total')::numeric,
    (snap->>'total')::numeric, (snap->>'total')::numeric, 0, q.public_notes, 'Converted from quote ' || q.quote_number, q.billing_name)
  RETURNING id INTO inv_id;
  INSERT INTO public.platform_invoice_line_items (business_id, invoice_id, description, quantity, unit, unit_price, taxable_flag, line_total, sort_order)
  SELECT q.business_id, inv_id, e.value->>'description', (e.value->>'quantity')::numeric, coalesce(e.value->>'unit', 'each'),
    (e.value->>'unit_price')::numeric, coalesce((e.value->>'taxable_flag')::boolean, true), (e.value->>'line_total')::numeric, (e.ordinality - 1)::int
  FROM jsonb_array_elements(snap->'lines') WITH ORDINALITY e WHERE (e.value->>'selected')::boolean;
  UPDATE public.platform_quotes SET status = 'won' WHERE id = q.id;
  RETURN jsonb_build_object('status', 'created', 'invoice_id', inv_id, 'invoice_number', inv_no);
END;
$$;

REVOKE ALL ON FUNCTION public.quote_public_pricing(uuid), public.save_quote_edit(uuid, timestamptz, jsonb, jsonb),
  public.invoice_accepted_quote(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quote_public_pricing(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_quote_edit(uuid, timestamptz, jsonb, jsonb), public.invoice_accepted_quote(uuid) TO authenticated, service_role;
