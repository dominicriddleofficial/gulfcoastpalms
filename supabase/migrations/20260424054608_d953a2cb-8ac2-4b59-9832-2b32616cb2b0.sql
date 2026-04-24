
-- 1. Notifications table
CREATE TABLE IF NOT EXISTS public.platform_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  related_entity_type text,
  related_entity_id uuid,
  link_url text,
  icon text,
  is_read boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.platform_notifications(recipient_user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_business
  ON public.platform_notifications(business_id, created_at DESC);

ALTER TABLE public.platform_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.platform_notifications FOR SELECT
  USING (recipient_user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.platform_notifications FOR UPDATE
  USING (recipient_user_id = auth.uid());

CREATE POLICY "System inserts notifications"
  ON public.platform_notifications FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_notifications;
ALTER TABLE public.platform_notifications REPLICA IDENTITY FULL;

-- 2. Per-user notification preferences
CREATE TABLE IF NOT EXISTS public.platform_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

ALTER TABLE public.platform_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON public.platform_notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Helper: get list of user_ids with access to a business
CREATE OR REPLACE FUNCTION public.get_business_recipient_user_ids(_business_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT user_id FROM public.user_business_access
  WHERE business_id = _business_id AND active_status = 'active'
  UNION
  SELECT DISTINCT w.owner_user_id FROM public.workspaces w
  JOIN public.businesses b ON b.workspace_id = w.id
  WHERE b.id = _business_id AND w.owner_user_id IS NOT NULL
$$;

-- 4. Helper: create notification for all eligible recipients of a business
CREATE OR REPLACE FUNCTION public.create_business_notification(
  _business_id uuid,
  _type text,
  _title text,
  _body text,
  _link_url text,
  _icon text,
  _priority text,
  _related_entity_type text,
  _related_entity_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _enabled boolean;
BEGIN
  FOR _uid IN SELECT public.get_business_recipient_user_ids(_business_id)
  LOOP
    -- Check if user has disabled this notification type
    SELECT enabled INTO _enabled
    FROM public.platform_notification_preferences
    WHERE user_id = _uid AND notification_type = _type;

    IF _enabled IS NULL OR _enabled = true THEN
      INSERT INTO public.platform_notifications (
        business_id, recipient_user_id, type, title, body,
        link_url, icon, priority, related_entity_type, related_entity_id
      ) VALUES (
        _business_id, _uid, _type, _title, _body,
        _link_url, _icon, _priority, _related_entity_type, _related_entity_id
      );
    END IF;
  END LOOP;
END;
$$;

-- 5. Trigger: new lead
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _src text;
  _service text;
BEGIN
  _src := COALESCE(NEW.source_name, NEW.lead_source, NEW.utm_source, 'website');
  _service := COALESCE(NEW.requested_service, NEW.requested_service_category, 'General inquiry');

  PERFORM public.create_business_notification(
    NEW.business_id,
    'new_lead',
    'New lead from ' || _src,
    NEW.inquiry_name || ' — ' || _service,
    '/platform/leads',
    'Target',
    'high',
    'lead',
    NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_lead ON public.platform_leads;
CREATE TRIGGER trg_notify_new_lead
  AFTER INSERT ON public.platform_leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

-- 6. Trigger: quote approved
CREATE OR REPLACE FUNCTION public.notify_quote_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer_name text;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT display_name INTO _customer_name
    FROM public.platform_customers WHERE id = NEW.customer_id;

    PERFORM public.create_business_notification(
      NEW.business_id,
      'quote_approved',
      'Quote approved',
      COALESCE(_customer_name, 'Customer') || ' approved ' || NEW.quote_number || ' — $' || to_char(NEW.total, 'FM999,999,990.00'),
      '/platform/quotes/' || NEW.id::text,
      'FileText',
      'high',
      'quote',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_quote_approved ON public.platform_quotes;
CREATE TRIGGER trg_notify_quote_approved
  AFTER UPDATE ON public.platform_quotes
  FOR EACH ROW EXECUTE FUNCTION public.notify_quote_approved();

-- 7. Trigger: invoice paid
CREATE OR REPLACE FUNCTION public.notify_invoice_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer_name text;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    SELECT display_name INTO _customer_name
    FROM public.platform_customers WHERE id = NEW.customer_id;

    PERFORM public.create_business_notification(
      NEW.business_id,
      'payment_received',
      'Payment received',
      '$' || to_char(NEW.total, 'FM999,999,990.00') || ' from ' || COALESCE(_customer_name, 'customer'),
      '/platform/payments',
      'DollarSign',
      'normal',
      'invoice',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_invoice_paid ON public.platform_invoices;
CREATE TRIGGER trg_notify_invoice_paid
  AFTER UPDATE ON public.platform_invoices
  FOR EACH ROW EXECUTE FUNCTION public.notify_invoice_paid();

-- 8. Daily auto-archive job
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'archive-old-notifications',
  '0 3 * * *',
  $$ UPDATE public.platform_notifications
     SET is_archived = true
     WHERE created_at < now() - interval '30 days'
       AND is_archived = false $$
);
