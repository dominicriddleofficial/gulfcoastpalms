import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { enqueueGpsPoint, flushGpsQueue, queuedCount } from "@/lib/gpsQueue";

type Params = {
  enabled: boolean;
  sessionId: string | null;
  businessId: string | null;
  userId: string | null;
  intervalSeconds?: number;
};

export type GpsPermission = "granted" | "denied" | "prompt" | "unsupported" | "unknown";

export type TrackerState = {
  lastPingAt: Date | null;
  lastError: string | null;
  isSupported: boolean;
  isWatching: boolean;
  permission: GpsPermission;
  online: boolean;
  queueSize: number;
};

// Tracks GPS while a clock session is active. Stops the moment `enabled` flips off.
export function useGpsTracker({
  enabled,
  sessionId,
  businessId,
  userId,
  intervalSeconds = 30,
}: Params): TrackerState {
  const lastPushRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);
  const [state, setState] = useState<TrackerState>(() => ({
    lastPingAt: null,
    lastError: null,
    isSupported: typeof navigator !== "undefined" && !!navigator.geolocation,
    isWatching: false,
    permission: "unknown",
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    queueSize: queuedCount(),
  }));

  // Online/offline awareness + queue flush on reconnect.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = async () => {
      setState((s) => ({ ...s, online: true }));
      const r = await flushGpsQueue();
      setState((s) => ({ ...s, queueSize: r.remaining }));
    };
    const onOffline = () => setState((s) => ({ ...s, online: false }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Query permission state where supported (Chrome, Edge, modern Safari).
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (cancelled) return;
        setState((s) => ({ ...s, permission: status.state as GpsPermission }));
        status.onchange = () => {
          setState((s) => ({ ...s, permission: status.state as GpsPermission }));
        };
      })
      .catch(() => { /* ignore — fall back to position callbacks */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!enabled || !sessionId || !businessId || !userId) {
      setState((s) => ({ ...s, isWatching: false }));
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((s) => ({
        ...s,
        isSupported: false,
        permission: "unsupported",
        lastError: "Geolocation not supported on this device",
      }));
      return;
    }

    const minGapMs = Math.max(5, intervalSeconds) * 1000;

    const onPos = async (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastPushRef.current < minGapMs) return;
      lastPushRef.current = now;

      const payload = {
        business_id: businessId,
        clock_session_id: sessionId,
        employee_user_id: userId,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
        speed: pos.coords.speed ?? null,
        heading: pos.coords.heading ?? null,
        captured_at: new Date(pos.timestamp || now).toISOString(),
      };

      // Offline → queue and bail.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        const size = enqueueGpsPoint(payload);
        setState((s) => ({ ...s, online: false, queueSize: size, lastError: null }));
        return;
      }

      try {
        const { error } = await supabase.from("platform_gps_points").insert(payload);
        if (error) {
          // Network/insert failed → queue for later flush.
          const size = enqueueGpsPoint(payload);
          setState((s) => ({ ...s, queueSize: size, lastError: error.message }));
          return;
        }
        setState((s) => ({
          ...s,
          lastPingAt: new Date(),
          lastError: null,
          permission: "granted",
        }));
        // Opportunistic queue flush whenever the live write succeeds.
        if (queuedCount() > 0) {
          const r = await flushGpsQueue();
          setState((s) => ({ ...s, queueSize: r.remaining }));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "GPS insert failed";
        const size = enqueueGpsPoint(payload);
        setState((s) => ({ ...s, queueSize: size, lastError: msg }));
      }
    };

    const onErr = (err: GeolocationPositionError) => {
      const denied = err.code === err.PERMISSION_DENIED;
      setState((s) => ({
        ...s,
        permission: denied ? "denied" : s.permission,
        lastError: denied
          ? "Location permission denied"
          : err.code === err.POSITION_UNAVAILABLE
            ? "Location unavailable"
            : err.message || "Location error",
      }));
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 10_000,
      timeout: 30_000,
    });
    setState((s) => ({ ...s, isWatching: true, lastError: null }));

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setState((s) => ({ ...s, isWatching: false }));
    };
  }, [enabled, sessionId, businessId, userId, intervalSeconds]);

  return state;
}

// Capture one immediate GPS point — runs inside the user-gesture context so
// the iOS/Safari permission prompt fires reliably right at clock-in.
export async function captureGpsPointNow(params: {
  sessionId: string;
  businessId: string;
  userId: string;
}): Promise<{ ok: boolean; error?: string; permission: GpsPermission }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { ok: false, error: "Geolocation not supported", permission: "unsupported" };
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const payload = {
          business_id: params.businessId,
          clock_session_id: params.sessionId,
          employee_user_id: params.userId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          speed: pos.coords.speed ?? null,
          heading: pos.coords.heading ?? null,
          captured_at: new Date(pos.timestamp || Date.now()).toISOString(),
        };
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          enqueueGpsPoint(payload);
          resolve({ ok: true, permission: "granted" });
          return;
        }
        const { error } = await supabase.from("platform_gps_points").insert(payload);
        if (error) {
          enqueueGpsPoint(payload);
          resolve({ ok: false, error: error.message, permission: "granted" });
        } else {
          resolve({ ok: true, permission: "granted" });
        }
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        resolve({
          ok: false,
          permission: denied ? "denied" : "unknown",
          error: denied ? "Location permission denied" : err.message || "Location error",
        });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}
