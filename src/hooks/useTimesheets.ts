import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export type TimesheetStatus =
  | "open"
  | "clocked_out"
  | "needs_review"
  | "approved"
  | "exported"
  | "edited";

export type TimesheetRow = {
  session_id: string;
  business_id: string;
  employee_user_id: string;
  employee_name: string | null;
  employee_email: string | null;
  schedule_date: string;
  vehicle_id: string | null;
  vehicle_name: string | null;
  clock_in_at: string;
  clock_out_at: string | null;
  total_minutes: number;
  job_site_minutes: number;
  drive_minutes: number;
  idle_minutes: number;
  jobs_completed: number;
  notes_count: number;
  photos_count: number;
  status: TimesheetStatus;
  approval_status: string;
  approved_by: string | null;
  approved_at: string | null;
  exported_at: string | null;
  admin_notes: string | null;
  overtime_flag: boolean;
  edits_count: number;
};

/** Approximate drive minutes: count GPS pings with speed > 2 m/s, scale by tracking interval. */
function estimateDriveMinutes(
  points: Array<{ captured_at: string; speed: number | null }>,
): number {
  if (points.length < 2) return 0;
  let driveMs = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const gap =
      new Date(curr.captured_at).getTime() - new Date(prev.captured_at).getTime();
    // ignore unrealistic gaps (>5 min) — likely paused
    if (gap <= 0 || gap > 5 * 60_000) continue;
    const speed = curr.speed ?? 0;
    if (speed > 2) driveMs += gap;
  }
  return Math.round(driveMs / 60_000);
}

export function useTimesheets(params: {
  businessId: string | null;
  from: Date;
  to: Date;
  employeeId?: string | null;
}) {
  const { businessId, from, to, employeeId } = params;
  const fromKey = format(from, "yyyy-MM-dd");
  const toKey = format(to, "yyyy-MM-dd");

  return useQuery<TimesheetRow[]>({
    queryKey: ["timesheets", businessId, fromKey, toKey, employeeId ?? "all"],
    enabled: !!businessId,
    queryFn: async () => {
      let q = supabase
        .from("platform_clock_sessions")
        .select("*")
        .eq("business_id", businessId)
        .gte("schedule_date", fromKey)
        .lte("schedule_date", toKey)
        .order("schedule_date", { ascending: false })
        .order("clock_in_at", { ascending: false });
      if (employeeId) q = q.eq("employee_user_id", employeeId);
      const { data: sessions, error } = await q;
      if (error) throw error;
      const list = (sessions as any[]) ?? [];
      if (list.length === 0) return [];

      const sessionIds = list.map((s) => s.id);
      const userIds = [...new Set(list.map((s) => s.employee_user_id))];
      const vehicleIds = [...new Set(list.map((s) => s.vehicle_id).filter(Boolean))];

      const [profilesRes, vehiclesRes, gpsRes, logsRes, editsRes] = await Promise.all([
        supabase
          .from("platform_user_profiles")
          .select("user_id, display_name, email")
          .in("user_id", userIds),
        vehicleIds.length
          ? supabase.from("platform_vehicles").select("id, name").in("id", vehicleIds as string[])
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from("platform_gps_points")
          .select("clock_session_id, captured_at, speed")
          .in("clock_session_id", sessionIds)
          .order("captured_at", { ascending: true }),
        supabase
          .from("platform_job_time_logs")
          .select("clock_session_id, job_id, arrived_at, completed_at, departed_at, status, notes")
          .in("clock_session_id", sessionIds),
        supabase
          .from("platform_timesheet_edits")
          .select("clock_session_id")
          .in("clock_session_id", sessionIds),
      ]);

      const profiles = new Map(
        ((profilesRes.data as any[]) ?? []).map((p) => [p.user_id, p]),
      );
      const vehicles = new Map(
        ((vehiclesRes.data as any[]) ?? []).map((v) => [v.id, v.name]),
      );

      const gpsBySession = new Map<string, Array<{ captured_at: string; speed: number | null }>>();
      for (const p of (gpsRes.data as any[]) ?? []) {
        const arr = gpsBySession.get(p.clock_session_id) ?? [];
        arr.push({ captured_at: p.captured_at, speed: p.speed });
        gpsBySession.set(p.clock_session_id, arr);
      }

      const logsBySession = new Map<string, any[]>();
      for (const l of (logsRes.data as any[]) ?? []) {
        const arr = logsBySession.get(l.clock_session_id) ?? [];
        arr.push(l);
        logsBySession.set(l.clock_session_id, arr);
      }

      const editsCount = new Map<string, number>();
      for (const e of (editsRes.data as any[]) ?? []) {
        editsCount.set(e.clock_session_id, (editsCount.get(e.clock_session_id) ?? 0) + 1);
      }

      return list.map((s): TimesheetRow => {
        const profile = profiles.get(s.employee_user_id);
        const totalMin = s.clock_out_at
          ? s.total_minutes ?? 0
          : Math.round((Date.now() - new Date(s.clock_in_at).getTime()) / 60_000);
        const logs = logsBySession.get(s.id) ?? [];
        const jobsCompleted = logs.filter(
          (l) => l.status === "completed" || l.completed_at,
        ).length;
        const notesCount = logs.filter((l) => l.notes && l.notes.trim()).length;
        const jobSiteMin = logs.reduce((acc, l) => {
          const a = l.arrived_at ? new Date(l.arrived_at).getTime() : null;
          const d = l.departed_at
            ? new Date(l.departed_at).getTime()
            : l.completed_at
              ? new Date(l.completed_at).getTime()
              : null;
          if (a && d && d > a) return acc + Math.round((d - a) / 60_000);
          return acc;
        }, 0);
        const driveMin = estimateDriveMinutes(gpsBySession.get(s.id) ?? []);
        const idleMin = Math.max(0, totalMin - jobSiteMin - driveMin);
        const overtime = totalMin > 8 * 60;
        const edits = editsCount.get(s.id) ?? 0;

        let status: TimesheetStatus;
        if (s.exported_at) status = "exported";
        else if (s.approval_status === "approved") status = "approved";
        else if (s.approval_status === "needs_review") status = "needs_review";
        else if (edits > 0) status = "edited";
        else if (!s.clock_out_at) status = "open";
        else status = "clocked_out";

        return {
          session_id: s.id,
          business_id: s.business_id,
          employee_user_id: s.employee_user_id,
          employee_name: profile?.display_name ?? null,
          employee_email: profile?.email ?? null,
          schedule_date: s.schedule_date,
          vehicle_id: s.vehicle_id,
          vehicle_name: s.vehicle_id ? vehicles.get(s.vehicle_id) ?? null : null,
          clock_in_at: s.clock_in_at,
          clock_out_at: s.clock_out_at,
          total_minutes: totalMin,
          job_site_minutes: jobSiteMin,
          drive_minutes: driveMin,
          idle_minutes: idleMin,
          jobs_completed: jobsCompleted,
          notes_count: notesCount,
          photos_count: 0,
          status,
          approval_status: s.approval_status ?? "open",
          approved_by: s.approved_by,
          approved_at: s.approved_at,
          exported_at: s.exported_at,
          admin_notes: s.admin_notes,
          overtime_flag: overtime || !!s.overtime_flag,
          edits_count: edits,
        };
      });
    },
    refetchInterval: 60_000,
  });
}

export type TimesheetDetail = {
  session: any;
  timeline: Array<{ at: string; label: string; kind: string }>;
  gpsPoints: Array<{ lat: number; lng: number; captured_at: string }>;
  edits: Array<{
    id: string;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    reason: string;
    edited_by: string;
    created_at: string;
  }>;
};

export function useTimesheetDetail(sessionId: string | null) {
  return useQuery<TimesheetDetail | null>({
    queryKey: ["timesheet-detail", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      if (!sessionId) return null;
      const [sessRes, gpsRes, logsRes, editsRes] = await Promise.all([
        supabase.from("platform_clock_sessions").select("*").eq("id", sessionId).maybeSingle(),
        supabase
          .from("platform_gps_points")
          .select("lat, lng, captured_at")
          .eq("clock_session_id", sessionId)
          .order("captured_at", { ascending: true }),
        supabase
          .from("platform_job_time_logs")
          .select("*")
          .eq("clock_session_id", sessionId),
        supabase
          .from("platform_timesheet_edits")
          .select("*")
          .eq("clock_session_id", sessionId)
          .order("created_at", { ascending: false }),
      ]);
      if (sessRes.error) throw sessRes.error;
      const session = sessRes.data as any;
      if (!session) return null;

      const gps = ((gpsRes.data as any[]) ?? []).map((p) => ({
        lat: p.lat,
        lng: p.lng,
        captured_at: p.captured_at,
      }));

      const timeline: TimesheetDetail["timeline"] = [];
      timeline.push({ at: session.clock_in_at, label: "Clocked in", kind: "clock_in" });
      if (gps.length > 0)
        timeline.push({ at: gps[0].captured_at, label: "GPS tracking started", kind: "gps_start" });

      const logs = ((logsRes.data as any[]) ?? []).slice();
      logs.sort((a, b) => {
        const ta = new Date(a.arrived_at ?? a.started_at ?? a.completed_at ?? 0).getTime();
        const tb = new Date(b.arrived_at ?? b.started_at ?? b.completed_at ?? 0).getTime();
        return ta - tb;
      });
      for (const l of logs) {
        const ref = l.job_id ? `Job ${String(l.job_id).slice(0, 8)}` : "Job";
        if (l.arrived_at) timeline.push({ at: l.arrived_at, label: `Arrived at ${ref}`, kind: "arrive" });
        if (l.started_at) timeline.push({ at: l.started_at, label: `Started ${ref}`, kind: "start" });
        if (l.completed_at)
          timeline.push({ at: l.completed_at, label: `Completed ${ref}`, kind: "complete" });
        if (l.departed_at)
          timeline.push({ at: l.departed_at, label: `Departed ${ref}`, kind: "depart" });
      }
      if (session.clock_out_at)
        timeline.push({ at: session.clock_out_at, label: "Clocked out", kind: "clock_out" });

      timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

      return {
        session,
        timeline,
        gpsPoints: gps,
        edits: (editsRes.data as any[]) ?? [],
      };
    },
  });
}