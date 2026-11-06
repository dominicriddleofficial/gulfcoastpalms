CREATE OR REPLACE FUNCTION public.guard_quote_customer_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.customer_id IS NULL AND NEW.status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION 'A quote needs a customer unless it is an unsent draft.' USING ERRCODE = '23514';
    END IF;
    IF NEW.customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.platform_customers c WHERE c.id = NEW.customer_id AND c.business_id = NEW.business_id) THEN
      RAISE EXCEPTION 'The customer belongs to a different workspace.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
    IF NEW.customer_id IS NULL THEN
      -- Only the customer foreign key (ON DELETE SET NULL) may unassign a quote.
      IF EXISTS (SELECT 1 FROM public.platform_customers c WHERE c.id = OLD.customer_id) THEN
        RAISE EXCEPTION 'A quote''s customer cannot be removed.' USING ERRCODE = '23514';
      END IF;
    ELSE
      IF OLD.customer_id IS NOT NULL OR OLD.status IS DISTINCT FROM 'draft' OR OLD.sent_at IS NOT NULL
         OR OLD.accepted_snapshot IS NOT NULL OR OLD.is_read_only OR OLD.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Only an unassigned, unsent draft can have its customer chosen.' USING ERRCODE = '23514';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.platform_customers c WHERE c.id = NEW.customer_id AND c.business_id = OLD.business_id) THEN
        RAISE EXCEPTION 'The customer belongs to a different workspace.' USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;
  IF NEW.customer_id IS NULL AND NEW.status IS DISTINCT FROM 'draft' AND OLD.status = 'draft' THEN
    RAISE EXCEPTION 'Choose a customer before sending this quote.' USING ERRCODE = '23514';
  END IF;
  IF NEW.customer_id IS NULL AND NEW.sent_at IS NOT NULL AND OLD.sent_at IS NULL THEN
    RAISE EXCEPTION 'Choose a customer before sending this quote.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_quote_customer_assignment ON public.platform_quotes;
CREATE TRIGGER guard_quote_customer_assignment BEFORE INSERT OR UPDATE ON public.platform_quotes
  FOR EACH ROW EXECUTE FUNCTION public.guard_quote_customer_assignment();

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
      'billing_name', q.billing_name, 'deposit_required_flag', q.deposit_required_flag, 'approved_at', q.approved_at,
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