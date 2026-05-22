
-- Vehicles
CREATE TABLE public.platform_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  label text,
  license_plate text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_platform_vehicles_biz ON public.platform_vehicles(business_id);
ALTER TABLE public.platform_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles_select" ON public.platform_vehicles FOR SELECT
  USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "vehicles_manage" ON public.platform_vehicles FOR ALL
  USING (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager']))
  WITH CHECK (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager']));

-- Clock sessions
CREATE TABLE public.platform_clock_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_user_id uuid NOT NULL,
  schedule_date date NOT NULL,
  vehicle_id uuid REFERENCES public.platform_vehicles(id) ON DELETE SET NULL,
  clock_in_at timestamptz NOT NULL DEFAULT now(),
  clock_out_at timestamptz,
  total_minutes integer,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clock_sessions_biz_date ON public.platform_clock_sessions(business_id, schedule_date);
CREATE INDEX idx_clock_sessions_emp ON public.platform_clock_sessions(employee_user_id, schedule_date);
CREATE UNIQUE INDEX uniq_active_clock_session
  ON public.platform_clock_sessions(business_id, employee_user_id)
  WHERE clock_out_at IS NULL;
ALTER TABLE public.platform_clock_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clock_sessions_select" ON public.platform_clock_sessions FOR SELECT
  USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "clock_sessions_self_insert" ON public.platform_clock_sessions FOR INSERT
  WITH CHECK (auth.uid() = employee_user_id AND public.has_business_access(auth.uid(), business_id));
CREATE POLICY "clock_sessions_self_update" ON public.platform_clock_sessions FOR UPDATE
  USING (auth.uid() = employee_user_id OR public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager']));

-- GPS points
CREATE TABLE public.platform_gps_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  clock_session_id uuid NOT NULL REFERENCES public.platform_clock_sessions(id) ON DELETE CASCADE,
  employee_user_id uuid NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  speed double precision,
  heading double precision,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_gps_session_time ON public.platform_gps_points(clock_session_id, captured_at DESC);
CREATE INDEX idx_gps_biz_time ON public.platform_gps_points(business_id, captured_at DESC);
ALTER TABLE public.platform_gps_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gps_select" ON public.platform_gps_points FOR SELECT
  USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "gps_self_insert" ON public.platform_gps_points FOR INSERT
  WITH CHECK (auth.uid() = employee_user_id AND public.has_business_access(auth.uid(), business_id));

-- Job time logs
CREATE TABLE public.platform_job_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  job_id text NOT NULL,
  clock_session_id uuid REFERENCES public.platform_clock_sessions(id) ON DELETE SET NULL,
  employee_user_id uuid NOT NULL,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  departed_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_time_logs_job ON public.platform_job_time_logs(job_id);
CREATE INDEX idx_job_time_logs_biz ON public.platform_job_time_logs(business_id);
ALTER TABLE public.platform_job_time_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_time_logs_select" ON public.platform_job_time_logs FOR SELECT
  USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "job_time_logs_self_insert" ON public.platform_job_time_logs FOR INSERT
  WITH CHECK (auth.uid() = employee_user_id AND public.has_business_access(auth.uid(), business_id));
CREATE POLICY "job_time_logs_self_update" ON public.platform_job_time_logs FOR UPDATE
  USING (auth.uid() = employee_user_id OR public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager']));

-- Crew assignments
CREATE TABLE public.platform_crew_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_user_id uuid NOT NULL,
  vehicle_id uuid REFERENCES public.platform_vehicles(id) ON DELETE SET NULL,
  schedule_date date NOT NULL,
  assigned_job_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, employee_user_id, schedule_date)
);
CREATE INDEX idx_crew_assignments_biz_date ON public.platform_crew_assignments(business_id, schedule_date);
ALTER TABLE public.platform_crew_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crew_assignments_select" ON public.platform_crew_assignments FOR SELECT
  USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "crew_assignments_manage" ON public.platform_crew_assignments FOR ALL
  USING (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager']))
  WITH CHECK (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager']));

-- Job photos
CREATE TABLE public.platform_job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  job_id text NOT NULL,
  employee_user_id uuid NOT NULL,
  image_url text NOT NULL,
  photo_type text NOT NULL DEFAULT 'note',
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_photos_job ON public.platform_job_photos(job_id);
CREATE INDEX idx_job_photos_biz ON public.platform_job_photos(business_id);
ALTER TABLE public.platform_job_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_photos_select" ON public.platform_job_photos FOR SELECT
  USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "job_photos_self_insert" ON public.platform_job_photos FOR INSERT
  WITH CHECK (auth.uid() = employee_user_id AND public.has_business_access(auth.uid(), business_id));
CREATE POLICY "job_photos_self_delete" ON public.platform_job_photos FOR DELETE
  USING (auth.uid() = employee_user_id OR public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager']));

-- Crew settings
CREATE TABLE public.platform_crew_settings (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  tracking_enabled boolean NOT NULL DEFAULT true,
  tracking_interval_seconds integer NOT NULL DEFAULT 30,
  geofence_radius_feet integer NOT NULL DEFAULT 250,
  require_clock_in_to_start boolean NOT NULL DEFAULT true,
  require_photo_to_complete boolean NOT NULL DEFAULT false,
  require_notes_to_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_crew_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crew_settings_select" ON public.platform_crew_settings FOR SELECT
  USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "crew_settings_manage" ON public.platform_crew_settings FOR ALL
  USING (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager']))
  WITH CHECK (public.user_has_any_role(auth.uid(), business_id, ARRAY['owner','manager']));

-- Consent column
ALTER TABLE public.platform_user_profiles
  ADD COLUMN IF NOT EXISTS crew_tracking_consent_at timestamptz;

-- updated_at triggers
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.platform_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_clock_sessions_updated BEFORE UPDATE ON public.platform_clock_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_job_time_logs_updated BEFORE UPDATE ON public.platform_job_time_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crew_assignments_updated BEFORE UPDATE ON public.platform_crew_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crew_settings_updated BEFORE UPDATE ON public.platform_crew_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
