-- 1. Create rate_limits table for generalized rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  limit_key text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limits_lookup ON public.rate_limits(identifier, limit_key, created_at);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Only service_role should manage rate_limits
CREATE POLICY "service_role_manage_rate_limits" ON public.rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Fix audit_logs INSERT policy - restrict to own user_id
DROP POLICY IF EXISTS "System insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated insert own audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3. Fix email_drip_enrollments INSERT policy - restrict from public to authenticated
DROP POLICY IF EXISTS "System can insert drip enrollments" ON public.email_drip_enrollments;
CREATE POLICY "Authenticated insert drip enrollments" ON public.email_drip_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (true);
-- Allow service_role to insert (for edge functions)
CREATE POLICY "Service role insert drip enrollments" ON public.email_drip_enrollments
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 4. Fix error_logs policies - restrict to owners/admins only
DROP POLICY IF EXISTS "Authenticated users can insert errors" ON public.error_logs;
DROP POLICY IF EXISTS "Authenticated users can view errors" ON public.error_logs;
DROP POLICY IF EXISTS "Authenticated users can update errors" ON public.error_logs;
DROP POLICY IF EXISTS "Authenticated users can delete errors" ON public.error_logs;
-- Allow anyone to insert errors (error reporting from public site)
CREATE POLICY "Anyone can insert errors" ON public.error_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
-- Only owners/admins can view/update/delete
CREATE POLICY "Owners view errors" ON public.error_logs
  FOR SELECT TO authenticated
  USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners update errors" ON public.error_logs
  FOR UPDATE TO authenticated
  USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners delete errors" ON public.error_logs
  FOR DELETE TO authenticated
  USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- 5. Ensure chat_conversations and chat_messages block anon INSERT directly
-- (they currently allow anon insert with true - restrict to service_role only)
DROP POLICY IF EXISTS "Anon insert conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Anon insert messages" ON public.chat_messages;
