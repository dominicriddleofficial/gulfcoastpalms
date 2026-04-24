
-- ============================================================
-- SMS Conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sms_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  customer_phone text NOT NULL,
  customer_id uuid,
  customer_display_name text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  last_message_direction text,
  unread_count integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, customer_phone)
);

CREATE INDEX IF NOT EXISTS idx_sms_conversations_business
  ON public.sms_conversations (business_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_unread
  ON public.sms_conversations (business_id, unread_count)
  WHERE unread_count > 0;

ALTER TABLE public.sms_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view sms conversations"
  ON public.sms_conversations FOR SELECT
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Members update sms conversations"
  ON public.sms_conversations FOR UPDATE
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Members insert sms conversations"
  ON public.sms_conversations FOR INSERT
  WITH CHECK (public.has_business_access(auth.uid(), business_id));

CREATE TRIGGER trg_sms_conversations_updated_at
  BEFORE UPDATE ON public.sms_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SMS Messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.sms_conversations(id) ON DELETE CASCADE NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  body text NOT NULL,
  media_urls text[],
  twilio_sid text UNIQUE,
  status text,
  sent_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_conversation
  ON public.sms_messages (conversation_id, created_at ASC);

ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view sms messages"
  ON public.sms_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.sms_conversations
      WHERE public.has_business_access(auth.uid(), business_id)
    )
  );

CREATE POLICY "Members insert sms messages"
  ON public.sms_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.sms_conversations
      WHERE public.has_business_access(auth.uid(), business_id)
    )
  );

CREATE POLICY "Members update sms messages"
  ON public.sms_messages FOR UPDATE
  USING (
    conversation_id IN (
      SELECT id FROM public.sms_conversations
      WHERE public.has_business_access(auth.uid(), business_id)
    )
  );

-- ============================================================
-- SMS Opt-outs (CTIA STOP/START compliance)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sms_opt_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  phone text NOT NULL,
  opted_out_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  UNIQUE (business_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_phone
  ON public.sms_opt_outs (phone);

ALTER TABLE public.sms_opt_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view opt outs"
  ON public.sms_opt_outs FOR SELECT
  USING (business_id IS NULL OR public.has_business_access(auth.uid(), business_id));

-- ============================================================
-- Business Phone Numbers (route inbound webhooks to a business)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.business_phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  phone_number text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'twilio',
  label text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view business phone numbers"
  ON public.business_phone_numbers FOR SELECT
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Owners manage business phone numbers"
  ON public.business_phone_numbers FOR ALL
  USING (public.is_workspace_owner(auth.uid()))
  WITH CHECK (public.is_workspace_owner(auth.uid()));

-- ============================================================
-- Canned SMS Replies
-- ============================================================
CREATE TABLE IF NOT EXISTS public.canned_sms_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,
  body text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.canned_sms_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view canned replies"
  ON public.canned_sms_replies FOR SELECT
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Owners manage canned replies"
  ON public.canned_sms_replies FOR ALL
  USING (public.is_workspace_owner(auth.uid()))
  WITH CHECK (public.is_workspace_owner(auth.uid()));

-- ============================================================
-- Helper: upsert conversation + bump preview / unread count
-- Called by send-sms (outbound) and twilio-inbound-webhook (inbound).
-- SECURITY DEFINER so service-role edge functions can run it; the function
-- itself enforces business_id scoping via parameters.
-- ============================================================
CREATE OR REPLACE FUNCTION public.sms_upsert_conversation(
  _business_id uuid,
  _customer_phone text,
  _direction text,
  _preview text,
  _customer_display_name text DEFAULT NULL,
  _customer_id uuid DEFAULT NULL,
  _increment_unread boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conv_id uuid;
BEGIN
  INSERT INTO public.sms_conversations AS c (
    business_id, customer_phone, customer_display_name, customer_id,
    last_message_at, last_message_preview, last_message_direction,
    unread_count
  )
  VALUES (
    _business_id, _customer_phone, _customer_display_name, _customer_id,
    now(), left(coalesce(_preview, ''), 100), _direction,
    CASE WHEN _increment_unread THEN 1 ELSE 0 END
  )
  ON CONFLICT (business_id, customer_phone) DO UPDATE
    SET last_message_at        = now(),
        last_message_preview   = left(coalesce(_preview, ''), 100),
        last_message_direction = _direction,
        unread_count           = CASE
                                   WHEN _increment_unread THEN c.unread_count + 1
                                   ELSE c.unread_count
                                 END,
        customer_display_name  = COALESCE(c.customer_display_name, _customer_display_name),
        customer_id            = COALESCE(c.customer_id, _customer_id),
        updated_at             = now()
  RETURNING c.id INTO _conv_id;

  RETURN _conv_id;
END;
$$;

-- Enable realtime on both tables so the Comms UI can stream updates
ALTER TABLE public.sms_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.sms_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_messages;
