
ALTER TABLE public.platform_crew_settings
  ADD COLUMN IF NOT EXISTS tracking_only_during_hours boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_consent_before_tracking boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_vehicle_at_clock_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_start_mileage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_end_mileage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_employee_edit_clock boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_signature_to_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_payment_to_complete boolean NOT NULL DEFAULT false;

ALTER TABLE public.platform_vehicles
  ADD COLUMN IF NOT EXISTS truck_number text,
  ADD COLUMN IF NOT EXISTS trailer_attached boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_employee_user_id uuid,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.user_business_access
  ADD COLUMN IF NOT EXISTS can_clock_in boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_see_all_jobs boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS assigned_vehicle_id uuid REFERENCES public.platform_vehicles(id) ON DELETE SET NULL;

-- Clock sessions: starting/ending mileage capture
ALTER TABLE public.platform_clock_sessions
  ADD COLUMN IF NOT EXISTS starting_mileage integer,
  ADD COLUMN IF NOT EXISTS ending_mileage integer;
