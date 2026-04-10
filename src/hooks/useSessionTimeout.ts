import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

export function useSessionTimeout() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const resetTimeout = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = "/platform/login";
      }, TIMEOUT_MS);
    };

    const events = ["click", "keypress", "mousemove", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, resetTimeout, { passive: true }));
    resetTimeout();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimeout));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
}
