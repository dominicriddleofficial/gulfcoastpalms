
-- Crews table
CREATE TABLE public.crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lead_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Manager manage crews" ON public.crews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Staff view crews" ON public.crews FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'operations') OR public.has_role(auth.uid(), 'team_leader') OR public.has_role(auth.uid(), 'limited_staff'));
CREATE TRIGGER update_crews_updated_at BEFORE UPDATE ON public.crews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Jobber tokens
CREATE TABLE public.jobber_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jobber_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins manage jobber tokens" ON public.jobber_tokens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_jobber_tokens_updated_at BEFORE UPDATE ON public.jobber_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Jobber clients cache
CREATE TABLE public.jobber_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jobber_id text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  company_name text,
  display_name text NOT NULL,
  email text,
  phone text,
  secondary_phone text,
  tags text[],
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jobber_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Manager manage jobber_clients" ON public.jobber_clients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Staff view jobber_clients" ON public.jobber_clients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'operations') OR public.has_role(auth.uid(), 'team_leader') OR public.has_role(auth.uid(), 'limited_staff'));

-- Jobber properties cache
CREATE TABLE public.jobber_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jobber_id text UNIQUE NOT NULL,
  client_id uuid REFERENCES public.jobber_clients(id) ON DELETE CASCADE,
  street1 text,
  street2 text,
  city text,
  state text,
  zip text,
  country text DEFAULT 'US',
  lat numeric,
  lng numeric,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jobber_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Manager manage jobber_properties" ON public.jobber_properties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Staff view jobber_properties" ON public.jobber_properties FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'operations') OR public.has_role(auth.uid(), 'team_leader') OR public.has_role(auth.uid(), 'limited_staff'));

-- Jobber jobs cache
CREATE TABLE public.jobber_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jobber_id text UNIQUE NOT NULL,
  title text,
  status text NOT NULL DEFAULT 'scheduled',
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  client_id uuid REFERENCES public.jobber_clients(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.jobber_properties(id) ON DELETE SET NULL,
  crew_id uuid REFERENCES public.crews(id) ON DELETE SET NULL,
  assigned_employee_ids uuid[],
  assigned_employee_names text[],
  client_name text,
  client_phone text,
  property_address text,
  service_items jsonb DEFAULT '[]'::jsonb,
  internal_notes text,
  job_number text,
  total_amount numeric DEFAULT 0,
  invoice_status text,
  visit_status text DEFAULT 'scheduled',
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jobber_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Manager manage jobber_jobs" ON public.jobber_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Ops view jobber_jobs" ON public.jobber_jobs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'operations'));
CREATE POLICY "Team leaders view jobber_jobs" ON public.jobber_jobs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'team_leader'));
CREATE POLICY "Limited staff view jobber_jobs" ON public.jobber_jobs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'limited_staff'));
CREATE TRIGGER update_jobber_jobs_updated_at BEFORE UPDATE ON public.jobber_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_jobber_jobs_scheduled ON public.jobber_jobs (scheduled_start);
CREATE INDEX idx_jobber_jobs_status ON public.jobber_jobs (status);
CREATE INDEX idx_jobber_jobs_crew ON public.jobber_jobs (crew_id);

-- Sync logs
CREATE TABLE public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL DEFAULT 'full',
  status text NOT NULL DEFAULT 'running',
  records_synced integer DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Manager manage sync_logs" ON public.sync_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
