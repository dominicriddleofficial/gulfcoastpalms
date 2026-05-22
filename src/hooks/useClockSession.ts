import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

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
};

export function useClockSession(params: {
  businessId: string | null;
  userId: string | null;
  date: Date;
}) {
  const { businessId, userId, date } = params;
  const dateKey = format(date, "yyyy-MM-dd");
  const qc = useQueryClient();

  const query = useQuery<ClockSession | null>({
    queryKey: ["clock-session", businessId, userId, dateKey],
    enabled: !!businessId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_clock_sessions")
        .select("*")
        .eq("business_id", businessId)
        .eq("employee_user_id", userId)
        .eq("schedule_date", dateKey)
        .order("clock_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as ClockSession | null) ?? null;
    },
    refetchInterval: 30_000,
  });

  const clockIn = useMutation({
    mutationFn: async (vehicleId: string | null) => {
      if (!businessId || !userId) throw new Error("Missing business or user");
      const { data, error } = await supabase
        .from("platform_clock_sessions")
        .insert({
          business_id: businessId,
          employee_user_id: userId,
          schedule_date: dateKey,
          vehicle_id: vehicleId,
          clock_in_at: new Date().toISOString(),
          status: "active",
        })
        .select()
        .single();
      if (error) throw error;
      return data as ClockSession;
    },
    onSuccess: () => {
      toast.success("Clocked in — tracking active");
      qc.invalidateQueries({ queryKey: ["clock-session"] });
      qc.invalidateQueries({ queryKey: ["crew-today"] });
    },
    onError: (e: Error) => toast.error(e.message || "Clock-in failed"),
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      const session = query.data;
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
    },
    onSuccess: () => {
      toast.success("Clocked out — tracking stopped");
      qc.invalidateQueries({ queryKey: ["clock-session"] });
      qc.invalidateQueries({ queryKey: ["crew-today"] });
    },
    onError: (e: Error) => toast.error(e.message || "Clock-out failed"),
  });

  const active =
    query.data && !query.data.clock_out_at ? query.data : null;

  return { session: query.data ?? null, active, isLoading: query.isLoading, clockIn, clockOut };
}