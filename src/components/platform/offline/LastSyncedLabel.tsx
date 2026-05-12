import { useLastSyncedAt, useQueueStats } from "@/lib/offline/hooks";
import { processQueueOnce } from "@/lib/offline/sync";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw } from "lucide-react";

export default function LastSyncedLabel() {
  const ts = useLastSyncedAt();
  const { pending, syncing, failed } = useQueueStats();
  return (
    <button
      onClick={() => void processQueueOnce()}
      className="text-[11px] text-muted-foreground inline-flex items-center gap-1 hover:text-foreground transition-colors"
      title="Tap to sync now"
    >
      <RefreshCw className={`w-3 h-3 ${syncing > 0 ? "animate-spin" : ""}`} />
      {ts ? `Synced ${formatDistanceToNow(ts, { addSuffix: true })}` : "Not synced yet"}
      {pending > 0 && ` · ${pending} pending`}
      {failed > 0 && ` · ${failed} failed`}
    </button>
  );
}