import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Clock, Power, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClockSession } from "@/hooks/useClockSession";
import { useGpsTracker } from "@/hooks/useGpsTracker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const CONSENT_KEY = "crew_tracking_consent_v1";

type Vehicle = { id: string; name: string };

export function ClockBar({
  businessId,
  userId,
  date,
  jobCount,
}: {
  businessId: string | null;
  userId: string | null;
  date: Date;
  jobCount: number;
}) {
  const { session, active, clockIn, clockOut } = useClockSession({ businessId, userId, date });
  const [consentOpen, setConsentOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | null>(null);

  // Vehicles for the business
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["platform-vehicles", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_vehicles")
        .select("id, name")
        .eq("business_id", businessId)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data as Vehicle[]) ?? [];
    },
  });

  useEffect(() => {
    if (active?.vehicle_id) setVehicleId(active.vehicle_id);
  }, [active?.vehicle_id]);

  // GPS tracker — only runs while clocked in
  useGpsTracker({
    enabled: !!active,
    sessionId: active?.id ?? null,
    businessId,
    userId,
  });

  const handleClockInClick = () => {
    const consented = typeof window !== "undefined" && localStorage.getItem(CONSENT_KEY) === "yes";
    if (!consented) {
      setConsentOpen(true);
      return;
    }
    clockIn.mutate(vehicleId);
  };

  const confirmConsent = () => {
    localStorage.setItem(CONSENT_KEY, "yes");
    setConsentOpen(false);
    clockIn.mutate(vehicleId);
  };

  if (active) {
    return (
      <div className="bg-card border border-primary/40 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
            <p className="font-body text-sm font-bold text-foreground">Tracking Active</p>
          </div>
          <p className="font-body text-xs text-muted-foreground mt-0.5">
            Since {format(new Date(active.clock_in_at), "h:mm a")}
            {active.vehicle_id && vehicles?.find((v) => v.id === active.vehicle_id)
              ? ` · ${vehicles.find((v) => v.id === active.vehicle_id)?.name}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          disabled={clockOut.isPending}
          onClick={() => clockOut.mutate()}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-destructive/40 text-destructive font-body font-bold text-sm hover:bg-destructive/10 transition-colors disabled:opacity-50"
        >
          <Power className="w-4 h-4" />
          Clock Out
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div>
          <p className="font-display text-lg font-extrabold text-foreground">Today's Schedule</p>
          <p className="font-body text-xs text-muted-foreground">
            {jobCount} {jobCount === 1 ? "job" : "jobs"} assigned
            {session?.clock_out_at
              ? ` · Clocked out at ${format(new Date(session.clock_out_at), "h:mm a")}`
              : ""}
          </p>
        </div>

        {vehicles && vehicles.length > 0 && (
          <label className="flex items-center gap-2 bg-secondary/30 rounded-xl px-3 py-2 border border-border">
            <Truck className="w-4 h-4 text-muted-foreground" />
            <select
              value={vehicleId ?? ""}
              onChange={(e) => setVehicleId(e.target.value || null)}
              className="bg-transparent flex-1 font-body text-sm text-foreground focus:outline-none"
            >
              <option value="">No vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          disabled={clockIn.isPending || !userId || !businessId}
          onClick={handleClockInClick}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 min-h-[52px] rounded-xl",
            "bg-primary text-primary-foreground font-body font-bold text-base",
            "hover:bg-primary/90 transition-colors disabled:opacity-50",
          )}
        >
          <Clock className="w-5 h-5" />
          Clock In to Today's Schedule
        </button>
      </div>

      <AlertDialog open={consentOpen} onOpenChange={setConsentOpen}>
        <AlertDialogContent className="ops-theme bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Location tracking consent</AlertDialogTitle>
            <AlertDialogDescription>
              Location is tracked only while you are clocked in for work and stops the moment
              you clock out. Your supervisor uses this to see crew status, drive time, and
              job-site time during your shift.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={confirmConsent}>
              I understand — Clock In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ClockBar;