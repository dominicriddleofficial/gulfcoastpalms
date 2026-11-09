-- PPS customer quote options: allow PPS optional lines, refuse empty approvals, expose saved deposit plan, PPS snapshot auto-invoice.
CREATE OR REPLACE FUNCTION public.guard_quote_line_options()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    SELECT 1 FROM public.businesses b WHERE b.id = NEW.business_id AND upper(b.shortcode) IN ('GCP', 'PPS')) THEN
    RAISE EXCEPTION 'Customer options are only available for Gulf Coast Palms and Prestige quotes.';
  END IF;
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
$function$;

CREATE OR REPLACE FUNCTION public.approve_quote_options(_quote_id uuid, _approved_by text, _selected uuid[], _fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  q public.platform_quotes; sel uuid[] := coalesce(_selected, '{}'); bad int; grp record;
  sub_c bigint := 0; taxable_c bigint := 0; tax_c bigint; disc_c bigint; total_c bigint; dep numeric := 0;
  line record; lines jsonb := '[]'::jsonb; amount_c bigint; included boolean; snapshot jsonb; now_ts timestamptz := now();
  cust_name text; cust_address text;
BEGIN
  IF _approved_by IS NULL OR char_length(btrim(_approved_by)) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'quote_bad_name'; END IF;
  SELECT * INTO q FROM public.platform_quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND OR q.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'quote_not_found'; END IF;
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
  -- Every approval needs some work: required lines or at least one chosen option (all-optional PPS quotes).
  IF NOT EXISTS (SELECT 1 FROM public.platform_quote_line_items l WHERE l.quote_id = q.id AND (l.option_kind = 'required' OR l.id = ANY(sel))) THEN
    RAISE EXCEPTION 'quote_nothing_selected';
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.quote_pricing_fingerprint(_quote_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT md5(concat_ws('|', q.version_number::text, q.tax_rate::text, q.discount_total::text,
    (SELECT string_agg(concat_ws(',', l.id::text, l.option_kind, coalesce(l.option_group, ''), l.quantity::text, l.unit_price::text,
       coalesce(l.discount_amount, 0)::text, coalesce(l.taxable_flag, true)::text, l.description), ';' ORDER BY l.sort_order, l.id)
     FROM public.platform_quote_line_items l WHERE l.quote_id = q.id),
    'scope:' || coalesce(q.scope_of_work, ''), 'notes:' || coalesce(q.public_notes, ''), 'valid:' || coalesce(q.valid_until::text, ''),
    'cust:' || coalesce(q.customer_id::text, '') || ':' || coalesce((SELECT c.display_name FROM public.platform_customers c WHERE c.id = q.customer_id), ''),
    'bill:' || coalesce(q.billing_name, ''),
    'dep:' || coalesce(q.deposit_required_flag::text, '') || ':' || coalesce(q.deposit_type, '') || ':' || coalesce(q.deposit_value::text, ''),
    'prop:' || coalesce(q.property_id::text, '') || ':' || coalesce((SELECT concat_ws(', ', p.address_1, p.city, p.state, p.zip)
       FROM public.platform_properties p WHERE p.id = q.property_id), '')))
  FROM public.platform_quotes q WHERE q.id = _quote_id;
$function$;

CREATE OR REPLACE FUNCTION public.quote_public_pricing(_quote_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'subtotal', q.subtotal, 'discount_total', q.discount_total, 'tax_rate', q.tax_rate, 'tax_total', q.tax_total, 'total', q.total,
    'deposit_amount', q.deposit_amount_calculated, 'accepted_snapshot', q.accepted_snapshot, 'version_number', q.version_number,
    'fingerprint', public.quote_pricing_fingerprint(q.id),
    'quote', jsonb_build_object('id', q.id, 'quote_number', q.quote_number, 'status', q.status, 'business_id', q.business_id,
      'created_at', q.created_at, 'valid_until', q.valid_until, 'public_notes', q.public_notes, 'scope_of_work', q.scope_of_work,
      'billing_name', q.billing_name, 'deposit_required_flag', q.deposit_required_flag, 'deposit_type', q.deposit_type, 'deposit_value', q.deposit_value, 'approved_at', q.approved_at,
      'approved_by', q.approved_by, 'accepted_at', q.accepted_at),
    'customer', (SELECT jsonb_build_object('display_name', c.display_name, 'email', c.email, 'phone', c.phone)
      FROM public.platform_customers c WHERE c.id = q.customer_id),
    'property_address', (SELECT nullif(concat_ws(', ', p.address_1, p.city, p.state, p.zip), '')
      FROM public.platform_properties p WHERE p.id = q.property_id),
    'line_items', coalesce((SELECT jsonb_agg(jsonb_build_object('id', l.id, 'description', l.description, 'quantity', l.quantity,
        'unit', l.unit, 'unit_price', l.unit_price, 'discount_amount', l.discount_amount, 'taxable_flag', l.taxable_flag, 'line_total', l.line_total,
        'line_type', l.line_type, 'option_kind', l.option_kind, 'option_group', l.option_group,
        'default_selected', l.default_selected, 'customer_selected', l.customer_selected) ORDER BY l.sort_order, l.id)
      FROM public.platform_quote_line_items l WHERE l.quote_id = q.id), '[]'::jsonb))
  FROM public.platform_quotes q WHERE q.id = _quote_id AND q.deleted_at IS NULL;
$function$;

-- PPS auto-invoice for an approved option quote: built only from the immutable accepted snapshot
-- (chosen lines + agreed totals), exactly once. Called only by the approve-quote edge function (service role).
CREATE OR REPLACE FUNCTION public.invoice_accepted_quote_on_approval(_quote_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE q public.platform_quotes; existing public.platform_invoices; inv_id uuid; inv_no text; snap jsonb;
BEGIN
  SELECT * INTO q FROM public.platform_quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND OR q.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Quote not found.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = q.business_id AND upper(b.shortcode) = 'PPS') THEN
    RAISE EXCEPTION 'Only Prestige approvals create an invoice automatically.' USING ERRCODE = '42501';
  END IF;
  snap := q.accepted_snapshot;
  IF snap IS NULL OR q.customer_id IS NULL THEN RAISE EXCEPTION 'The customer hasn''t approved their choices yet.'; END IF;
  SELECT * INTO existing FROM public.platform_invoices i WHERE i.quote_id = q.id AND i.deleted_at IS NULL AND i.status <> 'void'
    AND coalesce(i.deposit_required, false) = false ORDER BY i.created_at LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('status', 'existing', 'invoice_id', existing.id, 'invoice_number', existing.invoice_number); END IF;
  inv_no := public.generate_next_number(q.business_id, 'invoice');
  INSERT INTO public.platform_invoices (business_id, invoice_number, customer_id, property_id, quote_id, status, issue_date, due_date, terms,
    subtotal, tax_rate, tax_total, discount_total, total, balance_due, amount_paid, public_notes, internal_notes, billing_name)
  VALUES (q.business_id, inv_no, q.customer_id, q.property_id, q.id, 'draft', current_date, current_date + 30, 'Net 30',
    (snap->>'subtotal')::numeric, (snap->>'tax_rate')::numeric, (snap->>'tax_total')::numeric, (snap->>'discount_total')::numeric,
    (snap->>'total')::numeric, (snap->>'total')::numeric, 0, q.public_notes, 'Auto-created from approved quote ' || q.quote_number, q.billing_name)
  RETURNING id INTO inv_id;
  INSERT INTO public.platform_invoice_line_items (business_id, invoice_id, description, quantity, unit, unit_price, taxable_flag, line_total, sort_order)
  SELECT q.business_id, inv_id, e.value->>'description', (e.value->>'quantity')::numeric, coalesce(e.value->>'unit', 'each'),
    (e.value->>'unit_price')::numeric, coalesce((e.value->>'taxable_flag')::boolean, true), (e.value->>'line_total')::numeric, (e.ordinality - 1)::int
  FROM jsonb_array_elements(snap->'lines') WITH ORDINALITY e WHERE (e.value->>'selected')::boolean;
  UPDATE public.platform_quotes SET status = 'won' WHERE id = q.id;
  RETURN jsonb_build_object('status', 'created', 'invoice_id', inv_id, 'invoice_number', inv_no);
END;
$fn$;
REVOKE ALL ON FUNCTION public.invoice_accepted_quote_on_approval(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoice_accepted_quote_on_approval(uuid) TO service_role;