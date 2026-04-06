
-- Payment provider accounts
CREATE TABLE IF NOT EXISTS public.payment_provider_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider_type text NOT NULL DEFAULT 'stripe',
  provider_account_id text,
  display_name text,
  statement_descriptor text,
  active boolean NOT NULL DEFAULT true,
  config_json jsonb DEFAULT '{}'::jsonb,
  online_payments_enabled boolean NOT NULL DEFAULT true,
  tap_to_pay_enabled boolean NOT NULL DEFAULT false,
  allowed_payment_methods jsonb DEFAULT '["card"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, provider_type)
);
ALTER TABLE public.payment_provider_accounts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Owner manages payment accounts" ON public.payment_provider_accounts FOR ALL TO authenticated USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users view payment accounts" ON public.payment_provider_accounts FOR SELECT TO authenticated USING (has_business_access(auth.uid(), business_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Payment intents
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.platform_invoices(id),
  customer_id uuid REFERENCES public.platform_customers(id),
  provider_session_id text,
  provider_payment_intent_id text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',
  payment_method_type text DEFAULT 'card',
  source text NOT NULL DEFAULT 'online',
  metadata_json jsonb DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage business payment intents" ON public.payment_intents FOR ALL TO authenticated USING (has_business_access(auth.uid(), business_id)) WITH CHECK (has_business_access(auth.uid(), business_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tap to pay transactions
CREATE TABLE IF NOT EXISTS public.tap_to_pay_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payment_intent_id uuid REFERENCES public.payment_intents(id),
  invoice_id uuid REFERENCES public.platform_invoices(id),
  customer_id uuid REFERENCES public.platform_customers(id),
  device_id text,
  device_label text,
  operator_user_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',
  provider_charge_id text,
  receipt_url text,
  location_lat numeric,
  location_lng numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tap_to_pay_transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage business tap transactions" ON public.tap_to_pay_transactions FOR ALL TO authenticated USING (has_business_access(auth.uid(), business_id)) WITH CHECK (has_business_access(auth.uid(), business_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Payment webhook events
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id),
  provider text NOT NULL DEFAULT 'stripe',
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, event_id)
);
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Owner views webhook events" ON public.payment_webhook_events FOR ALL TO authenticated USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Source tracking columns
ALTER TABLE public.platform_customers ADD COLUMN IF NOT EXISTS source_system text;
ALTER TABLE public.platform_customers ADD COLUMN IF NOT EXISTS source_record_id text;
ALTER TABLE public.platform_customers ADD COLUMN IF NOT EXISTS source_last_synced_at timestamptz;

ALTER TABLE public.platform_jobs ADD COLUMN IF NOT EXISTS source_system text;
ALTER TABLE public.platform_jobs ADD COLUMN IF NOT EXISTS source_record_id text;
ALTER TABLE public.platform_jobs ADD COLUMN IF NOT EXISTS source_last_synced_at timestamptz;

ALTER TABLE public.platform_invoices ADD COLUMN IF NOT EXISTS source_system text;
ALTER TABLE public.platform_invoices ADD COLUMN IF NOT EXISTS source_record_id text;
ALTER TABLE public.platform_invoices ADD COLUMN IF NOT EXISTS source_last_synced_at timestamptz;

-- Platform tasks
CREATE TABLE IF NOT EXISTS public.platform_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'normal',
  due_date date,
  assigned_user_id uuid,
  related_entity_type text,
  related_entity_id uuid,
  created_by_user_id uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage business tasks" ON public.platform_tasks FOR ALL TO authenticated USING (has_business_access(auth.uid(), business_id)) WITH CHECK (has_business_access(auth.uid(), business_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Communication logs
CREATE TABLE IF NOT EXISTS public.platform_comm_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.platform_customers(id),
  channel text NOT NULL DEFAULT 'note',
  direction text NOT NULL DEFAULT 'outbound',
  subject text,
  body text,
  sent_by_user_id uuid,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_comm_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage business comm logs" ON public.platform_comm_logs FOR ALL TO authenticated USING (has_business_access(auth.uid(), business_id)) WITH CHECK (has_business_access(auth.uid(), business_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Triggers
DO $$ BEGIN CREATE TRIGGER update_payment_provider_accounts_updated_at BEFORE UPDATE ON public.payment_provider_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER update_payment_intents_updated_at BEFORE UPDATE ON public.payment_intents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER update_tap_to_pay_transactions_updated_at BEFORE UPDATE ON public.tap_to_pay_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER update_platform_tasks_updated_at BEFORE UPDATE ON public.platform_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Task numbering
INSERT INTO public.numbering_sequences (business_id, record_type, prefix, next_number, padding_length)
SELECT b.id, 'task', 'T', 1, 6 FROM public.businesses b
WHERE NOT EXISTS (SELECT 1 FROM public.numbering_sequences ns WHERE ns.business_id = b.id AND ns.record_type = 'task')
ON CONFLICT DO NOTHING;
