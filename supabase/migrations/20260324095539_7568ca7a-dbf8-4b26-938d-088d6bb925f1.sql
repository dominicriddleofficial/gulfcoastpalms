
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jobber_id text,
  first_name text,
  last_name text,
  display_name text NOT NULL,
  company_name text,
  phone text,
  email text,
  service_street text,
  service_city text,
  service_state text,
  service_zip text,
  tags text,
  lead_source text,
  notes text,
  total_jobs integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  last_job_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage clients" ON public.clients FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Operations can view clients" ON public.clients FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'operations'::app_role));
CREATE POLICY "Team leaders can view clients" ON public.clients FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'team_leader'::app_role));

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'groundsman',
  status text NOT NULL DEFAULT 'active',
  phone text,
  email text,
  hire_date date,
  jobs_completed integer DEFAULT 0,
  quotes_run integer DEFAULT 0,
  reviews_collected integer DEFAULT 0,
  leaderboard_points integer DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage employees" ON public.employees FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Operations can view employees" ON public.employees FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'operations'::app_role));
CREATE POLICY "Team leaders can view employees" ON public.employees FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'team_leader'::app_role));

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jobber_id text,
  client_id uuid REFERENCES public.clients(id),
  customer_name text NOT NULL,
  job_date date,
  service_line text,
  service_type text,
  city text,
  revenue numeric DEFAULT 0,
  employee_id uuid REFERENCES public.employees(id),
  assigned_employee text,
  status text NOT NULL DEFAULT 'completed',
  review_requested boolean DEFAULT false,
  review_received boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage jobs" ON public.jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Operations can view jobs" ON public.jobs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'operations'::app_role));
CREATE POLICY "Team leaders can view jobs" ON public.jobs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'team_leader'::app_role));

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  review_date date,
  review_source text,
  employee_id uuid REFERENCES public.employees(id),
  employee_name text,
  job_id uuid REFERENCES public.jobs(id),
  week_bucket text,
  month_bucket text,
  rating integer,
  review_text text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage reviews" ON public.reviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Operations can view reviews" ON public.reviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'operations'::app_role));
CREATE POLICY "Team leaders can view reviews" ON public.reviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'team_leader'::app_role));

CREATE TABLE public.leaderboard_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id),
  employee_name text NOT NULL,
  reward_type text NOT NULL DEFAULT 'monthly_review',
  month text NOT NULL,
  amount numeric DEFAULT 100,
  status text NOT NULL DEFAULT 'eligible',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leaderboard_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage rewards" ON public.leaderboard_rewards FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Operations can view rewards" ON public.leaderboard_rewards FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'operations'::app_role));
