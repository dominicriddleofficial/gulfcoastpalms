-- Supabase default privileges give authenticated full table access on new tables; keep staff to non-secret columns only.
REVOKE ALL ON public.platform_arborist_quote_links FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, report_id, business_id, created_at, expires_at, revoked_at) ON public.platform_arborist_quote_links TO authenticated;
GRANT ALL ON public.platform_arborist_quote_links TO service_role;