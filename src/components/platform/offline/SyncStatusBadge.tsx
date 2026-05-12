import { Check, Cloud, CloudOff, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MutationStatus } from "@/lib/offline/db";

interface Props {
  status: MutationStatus;
  className?: string;
}

const map: Record<MutationStatus, { label: string; icon: typeof Check; cls: string }> = {
  pending: { label: "Saved locally", icon: CloudOff, cls: "bg-muted text-muted-foreground border-border" },
  syncing: { label: "Syncing", icon: RefreshCw, cls: "bg-primary/15 text-primary border-primary/30" },
  synced: { label: "Synced", icon: Cloud, cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  failed: { label: "Failed", icon: AlertCircle, cls: "bg-red-500/15 text-red-300 border-red-500/30" },
};

export default function SyncStatusBadge({ status, className }: Props) {
  const item = map[status];
  const Icon = item.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium",
        item.cls,
        className,
      )}
    >
      <Icon className={cn("w-3 h-3", status === "syncing" && "animate-spin")} />
      {item.label}
    </span>
  );
}