-- Recurring services tracker
CREATE TABLE public.recurring_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  last_service_date date,
  next_service_date date,
  service_interval text DEFAULT '6 months',
  service_type text,
  is_repeat_customer boolean DEFAULT false,
  reminder_needed boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage recurring_services" ON public.recurring_services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operations can view recurring_services" ON public.recurring_services
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'operations'));

-- Job issues / callbacks tracker
CREATE TABLE public.job_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  job_date date,
  date_reported date DEFAULT CURRENT_DATE,
  issue_type text DEFAULT 'callback',
  crew_involved text,
  resolved boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage job_issues" ON public.job_issues
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operations can view job_issues" ON public.job_issues
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'operations'));

CREATE POLICY "Team leaders can view job_issues" ON public.job_issues
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'team_leader'));