-- PPS option approvals: one full invoice from the accepted snapshot that also records the snapshot deposit,
-- so a deposit checkout is credited against that same invoice. Service role only.
CREATE OR REPLACE FUNCTION public.invoice_accepted_quote_on_approval(_quote_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE q public.platform_quotes; existing public.platform_invoices; inv_id uuid; inv_no text; snap jsonb; dep numeric; total_c bigint;
BEGIN
  SELECT * INTO q FROM public.platform_quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND OR q.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Quote not found.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = q.business_id AND upper(b.shortcode) = 'PPS') THEN
    RAISE EXCEPTION 'Only Prestige approvals create an invoice automatically.' USING ERRCODE = '42501';
  END IF;
  snap := q.accepted_snapshot;
  IF snap IS NULL OR q.customer_id IS NULL THEN RAISE EXCEPTION 'The customer hasn''t approved their choices yet.'; END IF;
  total_c := round((snap->>'total')::numeric * 100);
  -- The full selected-lines invoice for this quote (matched by its snapshot total, never a legacy deposit-only invoice).
  SELECT * INTO existing FROM public.platform_invoices i WHERE i.quote_id = q.id AND i.deleted_at IS NULL AND i.status <> 'void'
    AND round(i.total * 100) = total_c ORDER BY i.created_at LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('status', 'existing', 'invoice_id', existing.id, 'invoice_number', existing.invoice_number); END IF;
  dep := CASE WHEN q.deposit_required_flag IS TRUE AND coalesce((snap->>'deposit_amount')::numeric, 0) > 0
              THEN round((snap->>'deposit_amount')::numeric * 100) / 100.0 ELSE 0 END;
  IF round(dep * 100) > total_c THEN dep := 0; END IF;
  inv_no := public.generate_next_number(q.business_id, 'invoice');
  INSERT INTO public.platform_invoices (business_id, invoice_number, customer_id, property_id, quote_id, status, issue_date, due_date, terms,
    subtotal, tax_rate, tax_total, discount_total, total, balance_due, amount_paid, public_notes, internal_notes, billing_name,
    deposit_required, deposit_amount, deposit_paid)
  VALUES (q.business_id, inv_no, q.customer_id, q.property_id, q.id, 'draft', current_date, current_date + 30, 'Net 30',
    (snap->>'subtotal')::numeric, (snap->>'tax_rate')::numeric, (snap->>'tax_total')::numeric, (snap->>'discount_total')::numeric,
    (snap->>'total')::numeric, (snap->>'total')::numeric, 0, q.public_notes, 'Auto-created from approved quote ' || q.quote_number, q.billing_name,
    dep > 0, dep, false)
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

-- Which invoice a PPS option-quote deposit checkout pays, and the still-owed deposit in cents.
CREATE OR REPLACE FUNCTION public.quote_deposit_checkout_target(_quote_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE q public.platform_quotes; inv public.platform_invoices; r jsonb; owed bigint;
BEGIN
  SELECT * INTO q FROM public.platform_quotes WHERE id = _quote_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'quote_not_payable'; END IF;
  IF q.accepted_snapshot IS NULL OR q.customer_id IS NULL OR q.deposit_required_flag IS NOT TRUE THEN RAISE EXCEPTION 'quote_not_payable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = q.business_id AND upper(b.shortcode) = 'PPS') THEN
    RAISE EXCEPTION 'quote_not_payable';
  END IF;
  r := public.invoice_accepted_quote_on_approval(_quote_id);
  SELECT * INTO inv FROM public.platform_invoices WHERE id = (r->>'invoice_id')::uuid FOR UPDATE;
  IF inv.status IN ('paid', 'void') OR coalesce(inv.deposit_required, false) = false OR coalesce(inv.deposit_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'deposit_already_paid';
  END IF;
  owed := round(inv.deposit_amount * 100) - round(coalesce(inv.amount_paid, 0) * 100);
  IF inv.deposit_paid IS TRUE OR owed <= 0 THEN RAISE EXCEPTION 'deposit_already_paid'; END IF;
  RETURN jsonb_build_object('invoice_id', inv.id, 'charge_cents', owed);
END;
$fn$;
REVOKE ALL ON FUNCTION public.quote_deposit_checkout_target(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quote_deposit_checkout_target(uuid) TO service_role;