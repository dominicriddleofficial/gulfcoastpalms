import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export type GpsPoint = { lat: number; lng: number; captured_at: string };
export type SessionRoute = {
  session_id: string;
  employee_user_id: string;
  active: boolean;
  points: GpsPoint[];
};

/**
 * Fetches the full GPS trail for every clock_session on the given day for the
 * given business. Used by the Schedule → Map tab to draw route polylines per
 * crew. Updates every 20s while the tab is open.
 */
export function useCrewRoutes(businessId: string | null, date: Date) {
  const dateKey = format(date, "yyyy-MM-dd");
  return useQuery<SessionRoute[]>({
    queryKey: ["crew-routes", businessId, dateKey],
    enabled: !!businessId,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data: sessions, error } = await supabase
        .from("platform_clock_sessions")
        .select("id, employee_user_id, clock_out_at")
        .eq("business_id", businessId)
        .eq("schedule_date", dateKey);
      if (error) throw error;
      const sessionIds = (sessions ?? []).map((s) => s.id);
      if (sessionIds.length === 0) return [];
      const { data: pts, error: gErr } = await supabase
        .from("platform_gps_points")
        .select("clock_session_id, lat, lng, captured_at")
        .in("clock_session_id", sessionIds)
        .order("captured_at", { ascending: true })
        .limit(5000);
      if (gErr) throw gErr;
      const grouped = new Map<string, GpsPoint[]>();
      for (const p of (pts ?? []) as Array<{ clock_session_id: string; lat: number; lng: number; captured_at: string }>) {
        const arr = grouped.get(p.clock_session_id) ?? [];
        arr.push({ lat: p.lat, lng: p.lng, captured_at: p.captured_at });
        grouped.set(p.clock_session_id, arr);
      }
      return (sessions ?? []).map((s) => ({
        session_id: s.id,
        employee_user_id: s.employee_user_id,
        active: !s.clock_out_at,
        points: grouped.get(s.id) ?? [],
      }));
    },
  });
}
