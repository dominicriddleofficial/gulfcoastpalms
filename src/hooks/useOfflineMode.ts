import { useEffect, useState } from "react";
import {
  subscribeOfflineMode,
  isOfflineMode,
  getOfflineSavedAt,
  OFFLINE_WRITE_TOOLTIP,
} from "@/lib/offlineMode";

/** Live offline read-only state (+ mirror savedAt timestamp). */
export function useOfflineMode(): { offline: boolean; savedAt: number } {
  const [state, setState] = useState(() => ({
    active: isOfflineMode(),
    savedAt: getOfflineSavedAt(),
  }));
  useEffect(() => subscribeOfflineMode(setState), []);
  return { offline: state.active, savedAt: state.savedAt };
}

/**
 * Props to spread onto any write control (button, submit, menu item) so it is
 * VISIBLY disabled during offline mode instead of silently failing.
 */
export function useWriteGuard(): {
  offline: boolean;
  writeDisabled: boolean;
  writeGuardProps: { disabled: boolean; title?: string; "aria-disabled"?: boolean; className?: string };
} {
  const { offline } = useOfflineMode();
  return {
    offline,
    writeDisabled: offline,
    writeGuardProps: offline
      ? {
          disabled: true,
          "aria-disabled": true,
          title: OFFLINE_WRITE_TOOLTIP,
          className: "opacity-40 cursor-not-allowed pointer-events-auto",
        }
      : { disabled: false },
  };
}
