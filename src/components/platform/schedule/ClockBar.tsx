import { useEffect, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Clock, Power, Truck, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClockSession } from "@/hooks/useClockSession";
import { useGpsTracker, captureGpsPointNow } from "@/hooks/useGpsTracker";
import { toast } from "sonner";
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
  const tracker = useGpsTracker({
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
    doClockIn();
  };

  const confirmConsent = () => {
    localStorage.setItem(CONSENT_KEY, "yes");
    setConsentOpen(false);
    doClockIn();
  };

  // Run clock-in, then immediately capture one GPS point inside the same
  // user-gesture chain so the iOS permission prompt fires reliably and the
  // crew tab gets a first ping without waiting for watchPosition.
  const doClockIn = () => {
    clockIn.mutate(vehicleId, {
      onSuccess: async (session) => {
        if (!businessId || !userId) return;
        const r = await captureGpsPointNow({
          sessionId: session.id,
          businessId,
          userId,
        });
        if (!r.ok && r.error) toast.error(`GPS: ${r.error}`);
      },
    });
  };

  if (active) {
    const trackerOk = tracker.isWatching && !tracker.lastError;
    return (
      <div className="bg-card border border-primary/40 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={cn(
                  "absolute inline-flex h-full w-full rounded-full opacity-60",
                  trackerOk ? "bg-primary animate-ping" : "bg-amber-500",
                )} />
                <span className={cn(
                  "relative inline-flex rounded-full h-2.5 w-2.5",
                  trackerOk ? "bg-primary" : "bg-amber-500",
                )} />
              </span>
              <p className="font-body text-sm font-bold text-foreground">
                {trackerOk ? "Tracking Active" : "Clocked In"}
              </p>
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

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-[11px] font-body text-muted-foreground min-w-0">
            {tracker.lastError ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">{tracker.lastError}</span>
              </>
            ) : tracker.lastPingAt ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">
                  Last ping {formatDistanceToNowStrict(tracker.lastPingAt, { addSuffix: true })}
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Waiting for first GPS fix…</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!businessId || !userId || !active) return;
              const r = await captureGpsPointNow({
                sessionId: active.id, businessId, userId,
              });
              if (r.ok) toast.success("Ping sent");
              else toast.error(`GPS: ${r.error ?? "failed"}`);
            }}
            className="text-[11px] font-body font-bold text-primary hover:underline shrink-0"
          >
            Ping now
          </button>
        </div>
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