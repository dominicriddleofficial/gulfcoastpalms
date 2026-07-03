import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { subscribeOutage } from "@/lib/queryCacheMirror";

/**
 * Slim amber banner shown at the top of the platform shell when React Query
 * starts reporting outage-class errors. Existing cached data stays on
 * screen; this just tells the user what happened and offers a Retry.
 */
export default function OutageBanner() {
  const qc = useQueryClient();
  const [outage, setOutage] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => subscribeOutage(setOutage), []);

  if (!outage) return null;

  const onRetry = () => {
    if (retrying) return;
    setRetrying(true);
    void qc.refetchQueries({ type: "active" }).finally(() => {
      window.setTimeout(() => setRetrying(false), 600);
    });
  };

  return (
    <div
      role="status"
      className="w-full flex items-center justify-between gap-3 px-4 py-2 text-[12px]"
      style={{
        background: "rgba(245, 158, 11, 0.14)",
        borderBottom: "1px solid rgba(245, 158, 11, 0.35)",
        color: "#fde68a",
      }}
    >
      <span className="inline-flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
        Connection lost — showing saved copy. Editing returns when servers are back.
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold hover:brightness-110 transition-[filter]"
        style={{ background: "rgba(245,158,11,0.22)", color: "#fef3c7" }}
      >
        <RefreshCw className={`w-3 h-3 ${retrying ? "animate-spin" : ""}`} aria-hidden />
        Retry
      </button>
    </div>
  );
}