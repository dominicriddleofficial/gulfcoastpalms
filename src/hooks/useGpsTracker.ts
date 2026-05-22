import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type Params = {
  enabled: boolean;
  sessionId: string | null;
  businessId: string | null;
  userId: string | null;
  intervalSeconds?: number;
};

// Tracks GPS while a clock session is active. Stops the moment `enabled` flips off.
export function useGpsTracker({
  enabled,
  sessionId,
  businessId,
  userId,
  intervalSeconds = 30,
}: Params) {
  const lastPushRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId || !businessId || !userId) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const minGapMs = Math.max(5, intervalSeconds) * 1000;

    const onPos = async (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastPushRef.current < minGapMs) return;
      lastPushRef.current = now;
      try {
        await supabase.from("platform_gps_points").insert({
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
      } catch (e) {
        // Silent — offline points are simply skipped this cycle.
        if (import.meta.env.DEV) console.warn("[gps] insert failed", e);
      }
    };

    const onErr = (err: GeolocationPositionError) => {
      if (import.meta.env.DEV) console.warn("[gps] error", err.message);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 10_000,
      timeout: 30_000,
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, sessionId, businessId, userId, intervalSeconds]);
}