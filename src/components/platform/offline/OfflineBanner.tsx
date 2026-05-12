import { WifiOff, RefreshCw } from "lucide-react";
import { useOnlineStatus, useQueueStats } from "@/lib/offline/hooks";
import { processQueueOnce } from "@/lib/offline/sync";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  const { pending, failed, syncing } = useQueueStats();
  const queued = pending + syncing;

  if (online && queued === 0 && failed === 0) return null;

  return (
    <div
      className={
        !online
          ? "bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-[12px] px-4 py-2 flex items-center justify-between gap-2"
          : failed > 0
          ? "bg-red-500/15 border-b border-red-500/30 text-red-200 text-[12px] px-4 py-2 flex items-center justify-between gap-2"
          : "bg-primary/10 border-b border-primary/30 text-primary text-[12px] px-4 py-2 flex items-center justify-between gap-2"
      }
    >
      <span className="inline-flex items-center gap-2">
        {!online ? <WifiOff className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
        {!online
          ? `Offline${queued > 0 ? ` · ${queued} action${queued === 1 ? "" : "s"} queued` : " · changes will sync when back online"}`
          : failed > 0
          ? `${failed} action${failed === 1 ? "" : "s"} failed to sync`
          : `Syncing ${queued} action${queued === 1 ? "" : "s"}…`}
      </span>
      {online && (failed > 0 || queued > 0) && (
        <button
          onClick={() => void processQueueOnce()}
          className="underline-offset-2 hover:underline text-[11px]"
        >
          Retry now
        </button>
      )}
    </div>
  );
}