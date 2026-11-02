import { AlertTriangle, Loader2, X } from "lucide-react";
import type { DeepLinkStatus } from "@/hooks/useRecordDeepLink";

interface Props {
  status: DeepLinkStatus;
  label: string;
  onDismiss: () => void;
}

/** Inline banner explaining why a linked record didn't open. */
export default function DeepLinkNotice({ status, label, onDismiss }: Props) {
  if (status === "idle") return null;
  if (status === "loading") {
    return (
      <div role="status" className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Opening {label}…
      </div>
    );
  }
  const text = status === "missing"
    ? `This ${label} isn't available. It may have been removed, belong to another workspace, or you may not have access.`
    : `Couldn't load this ${label}. Check your connection and try again.`;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <span className="flex-1">{text}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
