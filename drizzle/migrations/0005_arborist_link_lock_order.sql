-- Unified lock order for arborist guest links: report first, then link (same as issue/replace and revoke),
-- so a guest save and a staff revoke/replace can never deadlock. All checks are re-run under both locks.
CREATE OR REPLACE FUNCTION public.arborist_link_lock(_token_hash text)
RETURNS public.platform_arborist_quotes LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE link public.platform_arborist_quote_links; report public.platform_arborist_quotes; target_report uuid; target_business uuid;
BEGIN
  -- Unlocked lookup only to find which report to lock first.
  SELECT l.report_id, l.business_id INTO target_report, target_business FROM public.platform_arborist_quote_links l WHERE l.token_hash = _token_hash;
  IF NOT FOUND THEN RAISE EXCEPTION 'link_invalid'; END IF;
  SELECT * INTO report FROM public.platform_arborist_quotes WHERE id = target_report AND business_id = target_business FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'link_invalid'; END IF;
  SELECT * INTO link FROM public.platform_arborist_quote_links WHERE token_hash = _token_hash FOR UPDATE;
  IF NOT FOUND OR link.report_id <> report.id OR link.business_id <> report.business_id THEN RAISE EXCEPTION 'link_invalid'; END IF;
  IF link.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'link_revoked'; END IF;
  IF report.status <> 'draft' THEN RAISE EXCEPTION 'link_submitted'; END IF;
  IF link.expires_at <= now() THEN RAISE EXCEPTION 'link_expired'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = report.business_id AND upper(b.shortcode) = 'GCP') THEN RAISE EXCEPTION 'link_invalid'; END IF;
  RETURN report;
END;
$$;
REVOKE ALL ON FUNCTION public.arborist_link_lock(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.arborist_link_lock(text) TO service_role;
