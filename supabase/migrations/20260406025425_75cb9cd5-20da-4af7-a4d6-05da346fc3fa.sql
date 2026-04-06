
-- Platform Jobs table
CREATE TABLE public.platform_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  job_number text NOT NULL,
  customer_id uuid REFERENCES public.platform_customers(id),
  property_id uuid REFERENCES public.platform_properties(id),
  lead_id uuid REFERENCES public.platform_leads(id),
  quote_id uuid REFERENCES public.platform_quotes(id),
  title text,
  description text,
  job_type text DEFAULT 'one_time',
  status text NOT NULL DEFAULT 'draft',
  priority text DEFAULT 'normal',
  tags jsonb DEFAULT '[]'::jsonb,
  scheduled_start date,
  scheduled_end date,
  estimated_duration_minutes integer DEFAULT 60,
  total_visits_planned integer DEFAULT 1,
  total_visits_completed integer DEFAULT 0,
  subtotal numeric DEFAULT 0,
  tax_total numeric DEFAULT 0,
  total numeric DEFAULT 0,
  deposit_collected numeric DEFAULT 0,
  internal_notes text,
  client_notes text,
  assigned_crew_member_id uuid,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(business_id, job_number)
);

ALTER TABLE public.platform_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view business jobs" ON public.platform_jobs FOR SELECT TO authenticated
  USING (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users create business jobs" ON public.platform_jobs FOR INSERT TO authenticated
  WITH CHECK (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users update business jobs" ON public.platform_jobs FOR UPDATE TO authenticated
  USING (has_business_access(auth.uid(), business_id));
CREATE POLICY "Owner deletes jobs" ON public.platform_jobs FOR DELETE TO authenticated
  USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_platform_jobs_updated_at BEFORE UPDATE ON public.platform_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Platform Job Visits table
CREATE TABLE public.platform_job_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.platform_jobs(id) ON DELETE CASCADE,
  visit_number integer NOT NULL DEFAULT 1,
  title text,
  status text NOT NULL DEFAULT 'scheduled',
  scheduled_date date,
  scheduled_start_time time,
  scheduled_end_time time,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  duration_minutes integer,
  route_order integer DEFAULT 0,
  property_id uuid REFERENCES public.platform_properties(id),
  internal_notes text,
  completion_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_job_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view business visits" ON public.platform_job_visits FOR SELECT TO authenticated
  USING (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users create business visits" ON public.platform_job_visits FOR INSERT TO authenticated
  WITH CHECK (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users update business visits" ON public.platform_job_visits FOR UPDATE TO authenticated
  USING (has_business_access(auth.uid(), business_id));
CREATE POLICY "Owner deletes visits" ON public.platform_job_visits FOR DELETE TO authenticated
  USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_platform_job_visits_updated_at BEFORE UPDATE ON public.platform_job_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Platform Crew Members table
CREATE TABLE public.platform_crew_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid,
  display_name text NOT NULL,
  email text,
  phone text,
  role text DEFAULT 'field_tech',
  color text DEFAULT '#22c55e',
  hourly_rate numeric,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_crew_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view business crew" ON public.platform_crew_members FOR SELECT TO authenticated
  USING (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users create business crew" ON public.platform_crew_members FOR INSERT TO authenticated
  WITH CHECK (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users update business crew" ON public.platform_crew_members FOR UPDATE TO authenticated
  USING (has_business_access(auth.uid(), business_id));
CREATE POLICY "Owner deletes crew" ON public.platform_crew_members FOR DELETE TO authenticated
  USING (is_workspace_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_platform_crew_members_updated_at BEFORE UPDATE ON public.platform_crew_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Visit-to-Crew assignment junction
CREATE TABLE public.platform_visit_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES public.platform_job_visits(id) ON DELETE CASCADE,
  crew_member_id uuid NOT NULL REFERENCES public.platform_crew_members(id) ON DELETE CASCADE,
  is_lead boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(visit_id, crew_member_id)
);

ALTER TABLE public.platform_visit_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view business assignments" ON public.platform_visit_assignments FOR SELECT TO authenticated
  USING (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users create business assignments" ON public.platform_visit_assignments FOR INSERT TO authenticated
  WITH CHECK (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users update business assignments" ON public.platform_visit_assignments FOR UPDATE TO authenticated
  USING (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users delete business assignments" ON public.platform_visit_assignments FOR DELETE TO authenticated
  USING (has_business_access(auth.uid(), business_id));

-- Dispatch notes
CREATE TABLE public.platform_dispatch_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES public.platform_job_visits(id) ON DELETE CASCADE,
  author_user_id uuid,
  note text NOT NULL,
  flag_type text DEFAULT 'info',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_dispatch_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view business dispatch notes" ON public.platform_dispatch_notes FOR SELECT TO authenticated
  USING (has_business_access(auth.uid(), business_id));
CREATE POLICY "Users create business dispatch notes" ON public.platform_dispatch_notes FOR INSERT TO authenticated
  WITH CHECK (has_business_access(auth.uid(), business_id));

-- Add numbering sequences for jobs
INSERT INTO public.numbering_sequences (business_id, record_type, prefix, next_number, padding_length)
SELECT id, 'job', 'J', 1, 6 FROM public.businesses
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX idx_platform_jobs_business ON public.platform_jobs(business_id);
CREATE INDEX idx_platform_jobs_status ON public.platform_jobs(business_id, status);
CREATE INDEX idx_platform_jobs_customer ON public.platform_jobs(customer_id);
CREATE INDEX idx_platform_job_visits_business ON public.platform_job_visits(business_id);
CREATE INDEX idx_platform_job_visits_date ON public.platform_job_visits(business_id, scheduled_date);
CREATE INDEX idx_platform_job_visits_job ON public.platform_job_visits(job_id);
CREATE INDEX idx_platform_crew_members_business ON public.platform_crew_members(business_id);
CREATE INDEX idx_platform_visit_assignments_visit ON public.platform_visit_assignments(visit_id);
