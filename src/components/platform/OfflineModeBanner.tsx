import { useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { useOfflineMode } from "@/hooks/useOfflineMode";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";

function formatRelative(ts: number): string {
  if (!ts) return "recently";
  const mins = Math.floor(Math.max(0, Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Persistent amber banner shown while the platform runs in offline read-only
 * mode (Supabase auth unreachable / rejecting tokens). Amber #F4A825 family
 * only — never coral.
 */
export default function OfflineModeBanner() {
  const { offline, savedAt } = useOfflineMode();
  const { retryConnection } = usePlatformAuth();
  const [retrying, setRetrying] = useState(false);

  if (!offline) return null;

  const onRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await retryConnection();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      role="status"
      data-testid="offline-mode-banner"
      className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-[12px]"
      style={{
        background: "rgba(244, 168, 37, 0.14)",
        borderBottom: "1px solid rgba(244, 168, 37, 0.35)",
        color: "#F7D9A0",
      }}
    >
      <span className="inline-flex items-start gap-2 min-w-0">
        <WifiOff className="w-3.5 h-3.5 mt-[2px] shrink-0" aria-hidden />
        <span className="font-body leading-snug">
          Offline mode — showing your saved schedule. Some data may be out of date.
          Editing is disabled until the connection is back.
          <span className="opacity-80"> Saved {formatRelative(savedAt)}.</span>
        </span>
      </span>
      <button
        type="button"
        onClick={() => void onRetry()}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1 min-h-[32px] text-[11px] font-semibold hover:brightness-110 transition-[filter]"
        style={{ background: "rgba(244,168,37,0.22)", color: "#FCEBC8" }}
      >
        <RefreshCw className={`w-3 h-3 ${retrying ? "animate-spin" : ""}`} aria-hidden />
        Retry connection
      </button>
    </div>
  );
}
