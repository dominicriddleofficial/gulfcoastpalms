import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export type CrewMember = {
  session_id: string;
  employee_user_id: string;
  display_name: string | null;
  email: string | null;
  vehicle_id: string | null;
  vehicle_name: string | null;
  clock_in_at: string;
  clock_out_at: string | null;
  total_minutes: number | null;
  last_lat: number | null;
  last_lng: number | null;
  last_speed: number | null;
  last_gps_at: string | null;
  completed_jobs: number;
  active_job_id: string | null;
};

export type CrewSummary = {
  clockedIn: number;
  clockedOut: number;
  jobsCompleted: number;
  jobsRemaining: number;
  totalHours: number;
};

export function useCrewToday(businessId: string | null, date: Date) {
  const dateKey = format(date, "yyyy-MM-dd");

  return useQuery<{ members: CrewMember[]; summary: CrewSummary }>({
    queryKey: ["crew-today", businessId, dateKey],
    enabled: !!businessId,
    refetchInterval: 30_000,
    queryFn: async () => {
      // Sessions for the day
      const { data: sessions, error: sErr } = await supabase
        .from("platform_clock_sessions")
        .select("id, employee_user_id, vehicle_id, clock_in_at, clock_out_at, total_minutes")
        .eq("business_id", businessId)
        .eq("schedule_date", dateKey)
        .order("clock_in_at", { ascending: true });
      if (sErr) throw sErr;

      const sessionIds = (sessions ?? []).map((s) => s.id);
      const userIds = [...new Set((sessions ?? []).map((s) => s.employee_user_id))];
      const vehicleIds = [
        ...new Set((sessions ?? []).map((s) => s.vehicle_id).filter((v): v is string => !!v)),
      ];

      const [profilesRes, vehiclesRes, gpsRes, logsRes] = await Promise.all([
        userIds.length
          ? supabase
              .from("platform_user_profiles")
              .select("user_id, display_name, email")
              .in("user_id", userIds)
          : Promise.resolve({ data: [], error: null }),
        vehicleIds.length
          ? supabase
              .from("platform_vehicles")
              .select("id, name")
              .in("id", vehicleIds)
          : Promise.resolve({ data: [], error: null }),
        sessionIds.length
          ? supabase
              .from("platform_gps_points")
              .select("clock_session_id, lat, lng, speed, captured_at")
              .in("clock_session_id", sessionIds)
              .order("captured_at", { ascending: false })
              .limit(2000)
          : Promise.resolve({ data: [], error: null }),
        sessionIds.length
          ? supabase
              .from("platform_job_time_logs")
              .select("clock_session_id, job_id, started_at, completed_at")
              .in("clock_session_id", sessionIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const profiles = new Map(
        ((profilesRes.data as any[]) ?? []).map((p) => [p.user_id, p]),
      );
      const vehicles = new Map(
        ((vehiclesRes.data as any[]) ?? []).map((v) => [v.id, v]),
      );

      // Latest GPS point per session
      const latestGps = new Map<string, { lat: number; lng: number; speed: number | null; captured_at: string }>();
      for (const p of ((gpsRes.data as any[]) ?? [])) {
        if (!latestGps.has(p.clock_session_id)) {
          latestGps.set(p.clock_session_id, {
            lat: p.lat, lng: p.lng, speed: p.speed, captured_at: p.captured_at,
          });
        }
      }

      const completedBySession = new Map<string, number>();
      const activeJobBySession = new Map<string, string>();
      for (const log of ((logsRes.data as any[]) ?? [])) {
        if (log.completed_at) {
          completedBySession.set(log.clock_session_id, (completedBySession.get(log.clock_session_id) ?? 0) + 1);
        } else if (log.started_at) {
          activeJobBySession.set(log.clock_session_id, log.job_id);
        }
      }

      const members: CrewMember[] = (sessions ?? []).map((s) => {
        const profile = profiles.get(s.employee_user_id);
        const vehicle = s.vehicle_id ? vehicles.get(s.vehicle_id) : null;
        const gps = latestGps.get(s.id);
        return {
          session_id: s.id,
          employee_user_id: s.employee_user_id,
          display_name: profile?.display_name ?? null,
          email: profile?.email ?? null,
          vehicle_id: s.vehicle_id,
          vehicle_name: vehicle?.name ?? null,
          clock_in_at: s.clock_in_at,
          clock_out_at: s.clock_out_at,
          total_minutes: s.total_minutes,
          last_lat: gps?.lat ?? null,
          last_lng: gps?.lng ?? null,
          last_speed: gps?.speed ?? null,
          last_gps_at: gps?.captured_at ?? null,
          completed_jobs: completedBySession.get(s.id) ?? 0,
          active_job_id: activeJobBySession.get(s.id) ?? null,
        };
      });

      const clockedIn = members.filter((m) => !m.clock_out_at).length;
      const clockedOut = members.filter((m) => !!m.clock_out_at).length;
      const jobsCompleted = members.reduce((acc, m) => acc + m.completed_jobs, 0);
      const totalMinutes = members.reduce((acc, m) => {
        if (m.clock_out_at) return acc + (m.total_minutes ?? 0);
        return acc + Math.round((Date.now() - new Date(m.clock_in_at).getTime()) / 60_000);
      }, 0);

      return {
        members,
        summary: {
          clockedIn,
          clockedOut,
          jobsCompleted,
          jobsRemaining: 0, // filled in by caller using scheduledJobs.length - jobsCompleted
          totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        },
      };
    },
  });
}