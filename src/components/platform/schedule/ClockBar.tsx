import { useEffect, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  Clock, Power, Truck, AlertTriangle, Wifi, WifiOff, MapPinOff, CloudOff,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClockSession } from "@/hooks/useClockSession";
import { useGpsTracker, captureGpsPointNow } from "@/hooks/useGpsTracker";
import { logCrewAudit } from "@/lib/crewAudit";
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

type CrewSettings = {
  tracking_enabled: boolean;
  tracking_interval_seconds: number;
  require_consent_before_tracking: boolean;
  allow_clock_in_without_gps: boolean;
};

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
  const { session, active, clockIn, clockOut } =
    useClockSession({ businessId, userId, date });
  const [consentOpen, setConsentOpen] = useState(false);
  const [confirmOutOpen, setConfirmOutOpen] = useState(false);
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

  // Crew tracking settings (interval + gps-denied policy)
  const { data: settings } = useQuery<CrewSettings | null>({
    queryKey: ["crew-settings-clockbar", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_crew_settings")
        .select(
          "tracking_enabled, tracking_interval_seconds, require_consent_before_tracking, allow_clock_in_without_gps",
        )
        .eq("business_id", businessId)
        .maybeSingle();
      if (error) throw error;
      return (data as CrewSettings | null) ?? null;
    },
  });

  useEffect(() => {
    if (active?.vehicle_id) setVehicleId(active.vehicle_id);
  }, [active?.vehicle_id]);

  const intervalSeconds = settings?.tracking_interval_seconds ?? 30;
  const trackingEnabled = settings?.tracking_enabled ?? true;
  const allowWithoutGps = settings?.allow_clock_in_without_gps ?? true;
  const requireConsent = settings?.require_consent_before_tracking ?? true;

  // GPS tracker — only runs while clocked in and tracking is enabled
  const tracker = useGpsTracker({
    enabled: !!active && trackingEnabled,
    sessionId: active?.id ?? null,
    businessId,
    userId,
    intervalSeconds,
  });

  const handleClockInClick = () => {
    const consented =
      !requireConsent ||
      (typeof window !== "undefined" && localStorage.getItem(CONSENT_KEY) === "yes");
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

  // Clock in + immediately try one GPS capture. If permission is denied, we
  // either block the clock-in (per admin policy) or proceed and persist the
  // gps_permission='denied' state on the session.
  const doClockIn = async () => {
    if (!businessId || !userId) return;

    // Probe GPS first so we can apply the admin's "allow without GPS" policy.
    let gpsPermission: "granted" | "denied" | "unknown" | "unsupported" = "unknown";
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      const probe = await new Promise<"granted" | "denied" | "unknown">((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve("granted"),
          (err) => resolve(err.code === err.PERMISSION_DENIED ? "denied" : "unknown"),
          { enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 },
        );
      });
      gpsPermission = probe;
    } else {
      gpsPermission = "unsupported";
    }

    if (gpsPermission === "denied" && !allowWithoutGps) {
      toast.error("Location is required to clock in. Enable location in your browser settings.");
      void logCrewAudit({
        businessId,
        event: "gps_permission_denied",
        context: { blocked_clock_in: true },
      });
      return;
    }
    if (gpsPermission === "denied" || gpsPermission === "unsupported") {
      void logCrewAudit({
        businessId,
        event: gpsPermission === "denied" ? "gps_permission_denied" : "gps_permission_unsupported",
        context: { blocked_clock_in: false },
      });
    } else if (gpsPermission === "granted") {
      void logCrewAudit({ businessId, event: "gps_permission_granted" });
    }

    clockIn.mutate(
      { vehicleId, gpsPermission },
      {
        onSuccess: async (s) => {
          if (gpsPermission === "granted") {
            await captureGpsPointNow({ sessionId: s.id, businessId, userId });
          }
        },
      },
    );
  };

  const requestClockOut = () => setConfirmOutOpen(true);
  const confirmClockOut = () => {
    setConfirmOutOpen(false);
    clockOut.mutate();
  };

  // ────────────────────────────────────────────────────────────────────────
  // Active session UI
  // ────────────────────────────────────────────────────────────────────────
  if (active) {
    const trackerOk =
      tracker.isWatching && !tracker.lastError && tracker.permission !== "denied";
    const isStaleSession = active.schedule_date !== format(date, "yyyy-MM-dd");
    const permissionDenied = tracker.permission === "denied";
    const offline = !tracker.online;
    const queueSize = tracker.queueSize;

    return (
      <>
        <div className="bg-card border border-primary/40 rounded-2xl p-4 space-y-3">
          {(isStaleSession || active.needs_review) && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-2 text-amber-400">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="font-body text-[11px] leading-snug">
                Active session from{" "}
                {format(new Date(active.clock_in_at), "MMM d, h:mm a")}. Clock out now or
                ask an admin to close it.
              </p>
            </div>
          )}

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
                  {trackerOk
                    ? "Tracking Active"
                    : permissionDenied
                      ? "Clocked In · No GPS"
                      : offline
                        ? "Clocked In · Offline"
                        : "Clocked In"}
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
              onClick={requestClockOut}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-destructive/40 text-destructive font-body font-bold text-sm hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              <Power className="w-4 h-4" />
              Clock Out
            </button>
          </div>

          {permissionDenied && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-destructive">
              <MapPinOff className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="font-body text-[11px] leading-snug">
                Location permission is blocked. Your supervisor can't see your live
                location until you enable it in your browser/device settings.
              </p>
            </div>
          )}

          {(offline || queueSize > 0) && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-400">
              <CloudOff className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="font-body text-[11px] leading-snug">
                {offline ? "Offline — " : ""}
                {queueSize > 0
                  ? `${queueSize} GPS point${queueSize === 1 ? "" : "s"} queued, will sync when back online.`
                  : "Connection dropped. Your shift stays open."}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-[11px] font-body text-muted-foreground min-w-0">
              {tracker.lastError && tracker.permission !== "denied" ? (
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
                  <span className="truncate">
                    {permissionDenied ? "GPS disabled" : "Waiting for first GPS fix…"}
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              disabled={permissionDenied}
              onClick={async () => {
                if (!businessId || !userId || !active) return;
                const r = await captureGpsPointNow({
                  sessionId: active.id, businessId, userId,
                });
                if (r.ok) toast.success("Ping sent");
                else toast.error(`GPS: ${r.error ?? "failed"}`);
              }}
              className="text-[11px] font-body font-bold text-primary hover:underline shrink-0 disabled:opacity-40 disabled:no-underline"
            >
              Ping now
            </button>
          </div>
        </div>

        <AlertDialog open={confirmOutOpen} onOpenChange={setConfirmOutOpen}>
          <AlertDialogContent className="ops-theme bg-background border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Clock out now?</AlertDialogTitle>
              <AlertDialogDescription>
                This will stop GPS tracking and close your shift at{" "}
                {format(new Date(), "h:mm a")}. Make sure all jobs are marked
                complete first.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep working</AlertDialogCancel>
              <AlertDialogAction onClick={confirmClockOut}>
                Yes, clock out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // Clocked-out UI
  // ────────────────────────────────────────────────────────────────────────
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
