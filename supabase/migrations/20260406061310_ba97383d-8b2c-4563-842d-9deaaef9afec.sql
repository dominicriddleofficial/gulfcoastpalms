-- Section 8: error_logs table for error tracking
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_message TEXT,
  error_stack TEXT,
  component_stack TEXT,
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Only service_role can insert (from ErrorBoundary via edge function or direct insert)
CREATE POLICY "Service role insert error logs"
  ON public.error_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Authenticated users (admins) can view error logs
CREATE POLICY "Authenticated view error logs"
  ON public.error_logs FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon insert for client-side error logging (ErrorBoundary runs without auth)
CREATE POLICY "Anon insert error logs"
  ON public.error_logs FOR INSERT
  TO anon
  WITH CHECK (true);

-- Section 6: Restrict chat_conversations RLS
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Anyone can insert conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Anyone can update conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Anyone can view conversations" ON public.chat_conversations;

-- New restrictive policies — service_role only for reads
-- Allow anon insert (chat widget creates conversations without auth)
CREATE POLICY "Anon insert conversations"
  ON public.chat_conversations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Service role manages conversations"
  ON public.chat_conversations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Drop existing permissive policies on chat_messages
DROP POLICY IF EXISTS "Anyone can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can view messages" ON public.chat_messages;

-- Allow anon insert (chat widget stores messages)
CREATE POLICY "Anon insert messages"
  ON public.chat_messages FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Service role manages messages"
  ON public.chat_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);