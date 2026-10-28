-- The customer's approval fingerprint now also covers the visible scope and who/where the quote is for,
-- so an office edit to scope, notes, expiry, recipient or address makes an open page's approval stale.
CREATE OR REPLACE FUNCTION public.quote_pricing_fingerprint(_quote_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT md5(concat_ws('|', q.version_number::text, q.tax_rate::text, q.discount_total::text,
    (SELECT string_agg(concat_ws(',', l.id::text, l.option_kind, coalesce(l.option_group, ''), l.quantity::text, l.unit_price::text,
       coalesce(l.discount_amount, 0)::text, coalesce(l.taxable_flag, true)::text, l.description), ';' ORDER BY l.sort_order, l.id)
     FROM public.platform_quote_line_items l WHERE l.quote_id = q.id),
    'scope:' || coalesce(q.scope_of_work, ''), 'notes:' || coalesce(q.public_notes, ''), 'valid:' || coalesce(q.valid_until::text, ''),
    'cust:' || coalesce(q.customer_id::text, '') || ':' || coalesce((SELECT c.display_name FROM public.platform_customers c WHERE c.id = q.customer_id), ''),
    'bill:' || coalesce(q.billing_name, ''),
    'prop:' || coalesce(q.property_id::text, '') || ':' || coalesce((SELECT concat_ws(', ', p.address_1, p.city, p.state, p.zip)
       FROM public.platform_properties p WHERE p.id = q.property_id), '')))
  FROM public.platform_quotes q WHERE q.id = _quote_id;
$$;

-- Everything the public quote page shows (header, scope, identity, totals, lines, fingerprint) in ONE statement snapshot.
CREATE OR REPLACE FUNCTION public.quote_public_pricing(_quote_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'subtotal', q.subtotal, 'discount_total', q.discount_total, 'tax_rate', q.tax_rate, 'tax_total', q.tax_total, 'total', q.total,
    'deposit_amount', q.deposit_amount_calculated, 'accepted_snapshot', q.accepted_snapshot, 'version_number', q.version_number,
    'fingerprint', public.quote_pricing_fingerprint(q.id),
    'quote', jsonb_build_object('id', q.id, 'quote_number', q.quote_number, 'status', q.status, 'business_id', q.business_id,
      'created_at', q.created_at, 'valid_until', q.valid_until, 'public_notes', q.public_notes, 'scope_of_work', q.scope_of_work,
      'billing_name', q.billing_name, 'deposit_required_flag', q.deposit_required_flag, 'approved_at', q.approved_at,
      'approved_by', q.approved_by, 'accepted_at', q.accepted_at),
    'customer', (SELECT jsonb_build_object('display_name', c.display_name, 'email', c.email, 'phone', c.phone)
      FROM public.platform_customers c WHERE c.id = q.customer_id),
    'property_address', (SELECT nullif(concat_ws(', ', p.address_1, p.city, p.state, p.zip), '')
      FROM public.platform_properties p WHERE p.id = q.property_id),
    'line_items', coalesce((SELECT jsonb_agg(jsonb_build_object('id', l.id, 'description', l.description, 'quantity', l.quantity,
        'unit_price', l.unit_price, 'discount_amount', l.discount_amount, 'taxable_flag', l.taxable_flag, 'line_total', l.line_total,
        'line_type', l.line_type, 'option_kind', l.option_kind, 'option_group', l.option_group,
        'default_selected', l.default_selected, 'customer_selected', l.customer_selected) ORDER BY l.sort_order, l.id)
      FROM public.platform_quote_line_items l WHERE l.quote_id = q.id), '[]'::jsonb))
  FROM public.platform_quotes q WHERE q.id = _quote_id AND q.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.quote_pricing_fingerprint(uuid), public.quote_public_pricing(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quote_pricing_fingerprint(uuid), public.quote_public_pricing(uuid) TO service_role;
