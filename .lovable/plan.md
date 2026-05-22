# Schedule Crew Tracking

Add live crew operations (clock-in, GPS tracking, job time logs, vehicles) into the existing `PlatformSchedule` page as a fourth `Crew` tab. No separate module.

## 1. Database (single migration)

New tables under `public` with `business_id`, RLS via `has_business_access`, indexed on `business_id + schedule_date`.

- **`platform_vehicles`** — `id, business_id, name, label, license_plate, active, created_at`
- **`platform_clock_sessions`** — `id, business_id, employee_user_id, schedule_date, vehicle_id, clock_in_at, clock_out_at, total_minutes, status` (`active|closed`). Unique on `(business_id, employee_user_id, schedule_date)` partial where `clock_out_at IS NULL` to enforce one open session.
- **`platform_gps_points`** — `id, business_id, clock_session_id, employee_user_id, lat, lng, accuracy, speed, heading, captured_at`. Indexed on `clock_session_id, captured_at`.
- **`platform_job_time_logs`** — `id, business_id, job_id (text—source jobber/platform), clock_session_id, employee_user_id, arrived_at, started_at, completed_at, departed_at, status, notes`
- **`platform_crew_assignments`** — `id, business_id, employee_user_id, vehicle_id, schedule_date, assigned_job_ids text[]`
- **`platform_job_photos`** — `id, business_id, job_id, employee_user_id, image_url, photo_type (before|after|note), uploaded_at`. Storage bucket `job-photos` already exists.
- **`platform_crew_settings`** — one row per `business_id`: `tracking_enabled, tracking_interval_seconds (default 30), geofence_radius_feet (default 250), require_clock_in_to_start, require_photo_to_complete, require_notes_to_complete`.

RLS: members of the business can read; employees can write their own session/gps/time-logs; owners/managers can write settings, vehicles, assignments.

## 2. Hooks

- `useClockSession(date)` — current open session for the user; `clockIn(vehicleId)`, `clockOut()` mutations.
- `useGpsTracker(sessionId, intervalSeconds)` — `navigator.geolocation.watchPosition`, batches inserts to `platform_gps_points` every interval, stops on unmount or when `sessionId` null. Requests permission with consent text.
- `useJobTimeLog(jobId)` — start/complete/arrive/depart mutations writing to `platform_job_time_logs`.
- `useCrewToday(date)` — admin view: joins `platform_clock_sessions` + latest `platform_gps_points` + `platform_user_profiles` + assignments + completed job count.
- `useGeofence(jobs, currentPosition, radiusFeet)` — returns nearest job within radius; surfaces prompt.

## 3. UI changes

### `src/pages/platform/PlatformSchedule.tsx`
- Add `Crew` to the `Tabs` list (Day | List | Map | Crew).
- Above the day list, render `<ClockBar />`:
  - Not clocked in → green "Clock In to Today's Schedule" with vehicle select.
  - Clocked in → "Tracking Active since 7:42 AM" + "Clock Out" (red outline).
  - First-use consent dialog.
- Pass `clockSession` into job card so action buttons show conditionally.

### Job cards (extend `VisitActionPanel` or schedule-specific card)
- Always show: Navigate, Call Customer, Add Note, Upload Photos.
- Only when clocked in: Start Job, Complete Job (with photo/notes gates per settings).
- Geofence toast: "You appear to be at [name]. Start job?" → Start Job mutation.

### Crew tab (`src/components/platform/schedule/CrewTab.tsx`)
- Top stat cards: Clocked In, Clocked Out, Jobs Completed, Jobs Remaining, Total Crew Hours.
- Active crew list cards: name, vehicle, clock-in time, status badge, current job, last GPS update (relative time), hours today, completed jobs, "View on Map" button (switches to Map tab + focuses crew).
- Status derived from latest GPS speed + active job log: Driving (>5mph), On Site (in geofence, no started log), Job In Progress (started log open), Break/Idle (stationary >10min), Clocked In (default), Not Clocked In, Clocked Out.

### Map tab
- Add crew location pins (truck icon, green = active) from latest GPS per active session.
- Optional polyline route trail for selected crew (today's GPS points).
- "Focus crew" param from Crew tab opens map zoomed to that crew.

### Admin settings
- Add `CrewSettingsCard` in `PlatformSettings` page: toggles + numeric inputs writing to `platform_crew_settings`. Vehicles CRUD list. Assignment table by date.

## 4. Privacy
- Consent dialog stored in `platform_user_profiles.crew_tracking_consent_at` (add column).
- `useGpsTracker` no-ops unless session is open. Cleared on clock-out.
- Copy: "Location is tracked only while you are clocked in for work and stops when you clock out."

## 5. Out of scope (this pass)
- Real-time websocket push (use 30s React Query polling for admin view).
- Idle detection beyond simple speed/time heuristic.
- Vehicle telematics integration.

## Acceptance checklist
- Schedule page shows Day | List | Map | Crew.
- Clock In/Out works; GPS only writes while session open.
- Job cards expose Start/Complete only after clock-in.
- Crew tab lists active employees with live status + map focus.
- Admin can review per-crew route + per-job timestamps for today.
- Settings page lets owner toggle tracking, radius, interval, gates, vehicles.

Proceed?
