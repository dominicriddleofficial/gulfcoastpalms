
DROP POLICY IF EXISTS "System inserts notifications" ON public.platform_notifications;

-- Service role can insert any notification (used by edge functions and SECURITY DEFINER triggers)
CREATE POLICY "Service role inserts notifications"
  ON public.platform_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Authenticated users can only insert notifications addressed to themselves
CREATE POLICY "Users insert own notifications"
  ON public.platform_notifications FOR INSERT
  TO authenticated
  WITH CHECK (recipient_user_id = auth.uid());
