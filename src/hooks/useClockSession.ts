import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { logCrewAudit } from "@/lib/crewAudit";

export type ClockSession = {
  id: string;
  business_id: string;
  employee_user_id: string;
  schedule_date: string;
  vehicle_id: string | null;
  clock_in_at: string;
  clock_out_at: string | null;
  total_minutes: number | null;
  status: string;
  needs_review: boolean;
  closed_by: string | null;
  close_reason: string | null;
  gps_permission: string;
  auto_closed_at: string | null;
};

const SELECT =
  "id, business_id, employee_user_id, schedule_date, vehicle_id, " +
  "clock_in_at, clock_out_at, total_minutes, status, needs_review, " +
  "closed_by, close_reason, gps_permission, auto_closed_at";

export function useClockSession(params: {
  businessId: string | null;
  userId: string | null;
  date: Date;
}) {
  const { businessId, userId, date } = params;
  const dateKey = format(date, "yyyy-MM-dd");
  const qc = useQueryClient();

  // Today's most-recent session (for the "Clocked out at …" footer).
  const todaysQuery = useQuery<ClockSession | null>({
    queryKey: ["clock-session", businessId, userId, dateKey],
    enabled: !!businessId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_clock_sessions")
        .select(SELECT)
        .eq("business_id", businessId)
        .eq("employee_user_id", userId)
        .eq("schedule_date", dateKey)
        .order("clock_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return ((data as unknown) as ClockSession | null) ?? null;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // ANY currently-active session for this user (regardless of date) — this is
  // how a session survives a page refresh, a missed clock-out yesterday, or a
  // user opening the app in a new tab. The unique partial index on
  // (business_id, employee_user_id) WHERE clock_out_at IS NULL guarantees at
  // most one row.
  const activeQuery = useQuery<ClockSession | null>({
    queryKey: ["clock-session-active", businessId, userId],
    enabled: !!businessId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_clock_sessions")
        .select(SELECT)
        .eq("business_id", businessId)
        .eq("employee_user_id", userId)
        .is("clock_out_at", null)
        .order("clock_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return ((data as unknown) as ClockSession | null) ?? null;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["clock-session"] });
    qc.invalidateQueries({ queryKey: ["clock-session-active"] });
    qc.invalidateQueries({ queryKey: ["crew-today"] });
  };

  const clockIn = useMutation({
    mutationFn: async (opts: {
      vehicleId: string | null;
      gpsPermission?: "granted" | "denied" | "unknown" | "unsupported";
    }) => {
      if (!businessId || !userId) throw new Error("Missing business or user");

      // Guard: if an active session already exists, surface it instead of
      // attempting a duplicate insert.
      const { data: existing } = await supabase
        .from("platform_clock_sessions")
        .select(SELECT)
        .eq("business_id", businessId)
        .eq("employee_user_id", userId)
        .is("clock_out_at", null)
        .maybeSingle();
      if (existing) return (existing as unknown) as ClockSession;

      const { data, error } = await supabase
        .from("platform_clock_sessions")
        .insert({
          business_id: businessId,
          employee_user_id: userId,
          schedule_date: dateKey,
          vehicle_id: opts.vehicleId,
          clock_in_at: new Date().toISOString(),
          status: "active",
          gps_permission: opts.gpsPermission ?? "unknown",
        })
        .select(SELECT)
        .single();
      if (error) {
        // Race: unique partial index fired — fetch the winning row.
        if (error.code === "23505") {
          const { data: row } = await supabase
            .from("platform_clock_sessions")
            .select(SELECT)
            .eq("business_id", businessId)
            .eq("employee_user_id", userId)
            .is("clock_out_at", null)
            .maybeSingle();
          if (row) return (row as unknown) as ClockSession;
        }
        throw error;
      }
      return (data as unknown) as ClockSession;
    },
    onSuccess: (session) => {
      toast.success("Clocked in — tracking active");
      void logCrewAudit({
        businessId: session.business_id,
        event: "clock_in",
        entityId: session.id,
        newValues: { clock_in_at: session.clock_in_at, vehicle_id: session.vehicle_id },
      });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Clock-in failed"),
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      const session = activeQuery.data;
      if (!session) throw new Error("No active session");
      const out = new Date();
      const minutes = Math.max(
        0,
        Math.round((out.getTime() - new Date(session.clock_in_at).getTime()) / 60_000),
      );
      const { error } = await supabase
        .from("platform_clock_sessions")
        .update({
          clock_out_at: out.toISOString(),
          total_minutes: minutes,
          status: "closed",
        })
        .eq("id", session.id);
      if (error) throw error;
      return session;
    },
    onSuccess: (session) => {
      toast.success("Clocked out — tracking stopped");
      void logCrewAudit({
        businessId: session.business_id,
        event: "clock_out",
        entityId: session.id,
        oldValues: { clock_out_at: null },
        newValues: { clock_out_at: new Date().toISOString() },
      });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Clock-out failed"),
  });

  const adminClose = useMutation({
    mutationFn: async (opts: { sessionId: string; clockOutAt: Date; reason: string }) => {
      const { error } = await supabase.rpc("close_clock_session_with_reason", {
        _session_id: opts.sessionId,
        _clock_out_at: opts.clockOutAt.toISOString(),
        _reason: opts.reason,
      });
      if (error) throw error;
      return opts;
    },
    onSuccess: (opts) => {
      toast.success("Session closed");
      void logCrewAudit({
        businessId,
        event: "clock_session_admin_close",
        entityId: opts.sessionId,
        newValues: { clock_out_at: opts.clockOutAt.toISOString(), close_reason: opts.reason },
      });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Unable to close session"),
  });

  const active = activeQuery.data ?? null;

  return {
    session: todaysQuery.data ?? null,
    active,
    isLoading: todaysQuery.isLoading || activeQuery.isLoading,
    clockIn,
    clockOut,
    adminClose,
  };
}
