
-- Create workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Create businesses table
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  public_brand_name text NOT NULL,
  shortcode text NOT NULL,
  business_type text DEFAULT 'field_service',
  description text,
  logo_url text,
  favicon_url text,
  website_url text,
  support_email text,
  support_phone text,
  billing_email text,
  primary_address_1 text,
  primary_address_2 text,
  city text,
  state text,
  zip text,
  country text DEFAULT 'US',
  timezone text DEFAULT 'America/Chicago',
  locale text DEFAULT 'en-US',
  currency text DEFAULT 'USD',
  tax_registration_info text,
  active_status text NOT NULL DEFAULT 'active',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, shortcode)
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Create business_settings table
CREATE TABLE public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  quote_prefix text DEFAULT 'Q',
  job_prefix text DEFAULT 'J',
  invoice_prefix text DEFAULT 'I',
  payment_prefix text DEFAULT 'P',
  lead_prefix text DEFAULT 'L',
  customer_prefix text,
  default_tax_rate numeric DEFAULT 0,
  default_invoice_terms text DEFAULT 'Due on receipt',
  default_quote_expiration_days integer DEFAULT 30,
  default_deposit_type text DEFAULT 'percentage',
  default_deposit_value numeric DEFAULT 50,
  default_job_reminder_offset integer DEFAULT 24,
  default_quote_follow_up_days integer DEFAULT 3,
  default_business_color text DEFAULT '#22c55e',
  default_secondary_color text,
  email_from_name text,
  email_from_address text,
  sms_sender_name text,
  review_request_enabled boolean DEFAULT false,
  automation_enabled boolean DEFAULT false,
  scheduling_enabled boolean DEFAULT true,
  payments_enabled boolean DEFAULT true,
  route_mode_defaults text DEFAULT 'optimize',
  invoice_notes_default text,
  quote_notes_default text,
  cancellation_policy text,
  late_fee_settings jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Create business_brand_assets table
CREATE TABLE public.business_brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  file_url text NOT NULL,
  file_name text,
  mime_type text,
  usage_context text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_brand_assets ENABLE ROW LEVEL SECURITY;

-- Create numbering_sequences table
CREATE TABLE public.numbering_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  record_type text NOT NULL,
  prefix text NOT NULL,
  next_number integer NOT NULL DEFAULT 1,
  padding_length integer DEFAULT 6,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, record_type)
);

ALTER TABLE public.numbering_sequences ENABLE ROW LEVEL SECURITY;

-- Create user_business_access table
CREATE TABLE public.user_business_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role_name text NOT NULL DEFAULT 'viewer',
  access_scope text DEFAULT 'business',
  can_view_all_business_data boolean DEFAULT false,
  can_manage_leads boolean DEFAULT false,
  can_manage_quotes boolean DEFAULT false,
  can_manage_jobs boolean DEFAULT false,
  can_manage_schedule boolean DEFAULT false,
  can_manage_invoices boolean DEFAULT false,
  can_manage_payments boolean DEFAULT false,
  can_manage_communications boolean DEFAULT false,
  can_manage_settings boolean DEFAULT false,
  can_export_data boolean DEFAULT false,
  can_view_financials boolean DEFAULT false,
  can_manage_users boolean DEFAULT false,
  can_delete_records boolean DEFAULT false,
  default_business boolean DEFAULT false,
  active_status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_id)
);

ALTER TABLE public.user_business_access ENABLE ROW LEVEL SECURITY;

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  user_id uuid,
  event_name text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  action_type text NOT NULL,
  old_values_json jsonb,
  new_values_json jsonb,
  context_json jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create timeline_events table
CREATE TABLE public.timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  related_entity_type text NOT NULL,
  related_entity_id uuid NOT NULL,
  event_type text NOT NULL,
  event_summary text NOT NULL,
  event_payload_json jsonb,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

-- Helper function: get business IDs a user has access to
CREATE OR REPLACE FUNCTION public.get_user_business_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM public.user_business_access
  WHERE user_id = _user_id AND active_status = 'active'
$$;

-- Helper function: check if user is workspace owner
CREATE OR REPLACE FUNCTION public.is_workspace_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspaces WHERE owner_user_id = _user_id)
$$;

-- Helper function: check user has access to a business
CREATE OR REPLACE FUNCTION public.has_business_access(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_business_access
    WHERE user_id = _user_id AND business_id = _business_id AND active_status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.workspaces w
    JOIN public.businesses b ON b.workspace_id = w.id
    WHERE w.owner_user_id = _user_id AND b.id = _business_id
  )
$$;

-- Helper function: generate next number for a business record type
CREATE OR REPLACE FUNCTION public.generate_next_number(_business_id uuid, _record_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prefix text;
  _next integer;
  _padding integer;
  _shortcode text;
  _result text;
BEGIN
  SELECT prefix, next_number, padding_length INTO _prefix, _next, _padding
  FROM public.numbering_sequences
  WHERE business_id = _business_id AND record_type = _record_type
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No numbering sequence found for business % record type %', _business_id, _record_type;
  END IF;

  SELECT shortcode INTO _shortcode FROM public.businesses WHERE id = _business_id;

  _result := _shortcode || '-' || _prefix || '-' || lpad(_next::text, _padding, '0');

  UPDATE public.numbering_sequences
  SET next_number = _next + 1, updated_at = now()
  WHERE business_id = _business_id AND record_type = _record_type;

  RETURN _result;
END;
$$;

-- RLS Policies

-- workspaces: owner only
CREATE POLICY "Owner manages workspace" ON public.workspaces
FOR ALL TO authenticated
USING (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- businesses: users with access or workspace owner
CREATE POLICY "Users view accessible businesses" ON public.businesses
FOR SELECT TO authenticated
USING (
  has_business_access(auth.uid(), id)
);

CREATE POLICY "Owner manages businesses" ON public.businesses
FOR ALL TO authenticated
USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- business_settings: users with access can view, owner/admin can manage
CREATE POLICY "Users view business settings" ON public.business_settings
FOR SELECT TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Owner manages business settings" ON public.business_settings
FOR ALL TO authenticated
USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- business_brand_assets
CREATE POLICY "Users view brand assets" ON public.business_brand_assets
FOR SELECT TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Owner manages brand assets" ON public.business_brand_assets
FOR ALL TO authenticated
USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- numbering_sequences
CREATE POLICY "Users view sequences" ON public.numbering_sequences
FOR SELECT TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Owner manages sequences" ON public.numbering_sequences
FOR ALL TO authenticated
USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- user_business_access: users see own access, owner manages all
CREATE POLICY "Users view own access" ON public.user_business_access
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Owner manages access" ON public.user_business_access
FOR ALL TO authenticated
USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- audit_logs: admin/owner only
CREATE POLICY "Admin view audit logs" ON public.audit_logs
FOR SELECT TO authenticated
USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System insert audit logs" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (true);

-- timeline_events
CREATE POLICY "Users view timeline" ON public.timeline_events
FOR SELECT TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "System insert timeline" ON public.timeline_events
FOR INSERT TO authenticated
WITH CHECK (has_business_access(auth.uid(), business_id));

-- Triggers for updated_at
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON public.business_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_business_access_updated_at BEFORE UPDATE ON public.user_business_access
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
