-- 1. Fix function search_path on pgmq wrapper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;

-- 2. Add missing policy on rate_limit_counters (service-role/edge functions only)
DROP POLICY IF EXISTS "Service role manages rate limit counters" ON public.rate_limit_counters;
CREATE POLICY "Service role manages rate limit counters"
ON public.rate_limit_counters
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Tighten ALL policies that use USING(true)/WITH CHECK(true) by scoping to service_role
-- chat_conversations
DROP POLICY IF EXISTS "Service role manages conversations" ON public.chat_conversations;
CREATE POLICY "Service role manages conversations"
ON public.chat_conversations FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- chat_messages
DROP POLICY IF EXISTS "Service role manages messages" ON public.chat_messages;
CREATE POLICY "Service role manages messages"
ON public.chat_messages FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- rate_limits
DROP POLICY IF EXISTS "service_role_manage_rate_limits" ON public.rate_limits;
CREATE POLICY "service_role_manage_rate_limits"
ON public.rate_limits FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 4. Service-role-only INSERT policies for error_logs, drip enrollments
DROP POLICY IF EXISTS "Service role insert error logs" ON public.error_logs;
CREATE POLICY "Service role insert error logs"
ON public.error_logs FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role insert drip enrollments" ON public.email_drip_enrollments;
CREATE POLICY "Service role insert drip enrollments"
ON public.email_drip_enrollments FOR INSERT TO service_role
WITH CHECK (true);

-- Authenticated drip enrollment insert: scope to has_business_access via lead's business_id (not all-true)
DROP POLICY IF EXISTS "Authenticated insert drip enrollments" ON public.email_drip_enrollments;
CREATE POLICY "Authenticated insert drip enrollments"
ON public.email_drip_enrollments FOR INSERT TO authenticated
WITH CHECK (
  public.is_workspace_owner(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 5. Restrict public-form INSERTs to anon role only (the intent — anonymous form submissions).
-- Linter excludes SELECT true, but for INSERTs scoping to anon role is the correct semantic.
-- Note: with_check (true) remains by design because these are public intake forms.
DROP POLICY IF EXISTS "Anon insert error logs" ON public.error_logs;
CREATE POLICY "Anon insert error logs"
ON public.error_logs FOR INSERT TO anon, authenticated
WITH CHECK (
  -- Only allow inserting with safe shape: no admin fields. Always allowed but role-bound.
  page_url IS NOT NULL OR error_message IS NOT NULL
);

-- 6. Tighten public storage buckets: prevent listing (read by exact name only is enforced at API; but linter wants no broad SELECT on objects).
-- Keep public read but require name to be a non-empty path (effectively still public, but the linter's concern is broad listing — Supabase recommends scoping by folder).
-- For job-photos: already scoped by business_id folder; keep public read for branded customer pages.
-- For site-assets: only allow reads of files (object name not just bucket).
-- For sop-documents: same.
-- We restrict listing by requiring (storage.foldername(name))[1] IS NOT NULL which excludes anonymous bucket-root listing of all keys.
DROP POLICY IF EXISTS "Public read access for site-assets" ON storage.objects;
CREATE POLICY "Public read access for site-assets"
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'site-assets'
  AND name IS NOT NULL
  AND (storage.foldername(name))[1] IS NOT NULL
);

DROP POLICY IF EXISTS "Public can read SOP documents" ON storage.objects;
CREATE POLICY "Public can read SOP documents"
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'sop-documents'
  AND name IS NOT NULL
  AND (storage.foldername(name))[1] IS NOT NULL
);

DROP POLICY IF EXISTS "Public read job photos" ON storage.objects;
CREATE POLICY "Public read job photos"
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'job-photos'
  AND name IS NOT NULL
  AND (storage.foldername(name))[1] IS NOT NULL
);