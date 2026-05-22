import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Params = {
  enabled: boolean;
  sessionId: string | null;
  businessId: string | null;
  userId: string | null;
  intervalSeconds?: number;
};

export type TrackerState = {
  lastPingAt: Date | null;
  lastError: string | null;
  isSupported: boolean;
  isWatching: boolean;
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
  const [state, setState] = useState<TrackerState>({
    lastPingAt: null,
    lastError: null,
    isSupported: typeof navigator !== "undefined" && !!navigator.geolocation,
    isWatching: false,
  });

  useEffect(() => {
    if (!enabled || !sessionId || !businessId || !userId) {
      setState((s) => ({ ...s, isWatching: false }));
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((s) => ({ ...s, isSupported: false, lastError: "Geolocation not supported on this device" }));
      return;
    }

    const minGapMs = Math.max(5, intervalSeconds) * 1000;

    const onPos = async (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastPushRef.current < minGapMs) return;
      lastPushRef.current = now;
      try {
        const { error } = await supabase.from("platform_gps_points").insert({
          business_id: businessId,
          clock_session_id: sessionId,
          employee_user_id: userId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          speed: pos.coords.speed ?? null,
          heading: pos.coords.heading ?? null,
          captured_at: new Date(pos.timestamp || now).toISOString(),
        });
        if (error) {
          setState((s) => ({ ...s, lastError: error.message }));
          return;
        }
        setState((s) => ({ ...s, lastPingAt: new Date(), lastError: null }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "GPS insert failed";
        setState((s) => ({ ...s, lastError: msg }));
      }
    };

    const onErr = (err: GeolocationPositionError) => {
      setState((s) => ({
        ...s,
        lastError:
          err.code === err.PERMISSION_DENIED
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
}): Promise<{ ok: boolean; error?: string }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { ok: false, error: "Geolocation not supported" };
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { error } = await supabase.from("platform_gps_points").insert({
          business_id: params.businessId,
          clock_session_id: params.sessionId,
          employee_user_id: params.userId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          speed: pos.coords.speed ?? null,
          heading: pos.coords.heading ?? null,
          captured_at: new Date(pos.timestamp || Date.now()).toISOString(),
        });
        resolve(error ? { ok: false, error: error.message } : { ok: true });
      },
      (err) => {
        resolve({
          ok: false,
          error:
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied"
              : err.message || "Location error",
        });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}