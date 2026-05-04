import { useState } from "react";
import { useVisitLifecycle, type VisitStatus } from "@/hooks/useVisitLifecycle";
import { OnMyWaySheet } from "./OnMyWaySheet";
import { Truck, Play, CheckCircle2, RotateCcw, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface VisitActionPanelProps {
  jobberJobId: string;
  businessId: string | null;
  visitStatus: string | null;
  customerName: string | null;
  customerPhone: string | null;
  onContact: () => void;
}

const STATUS_LABELS: Record<VisitStatus, string> = {
  scheduled: "Scheduled",
  on_my_way: "On My Way",
  on_site: "On Site",
  in_progress: "In Progress",
  complete: "Complete",
};

const STATUS_TONE: Record<VisitStatus, string> = {
  scheduled: "bg-blue-500/15 text-blue-400",
  on_my_way: "bg-amber-500/15 text-amber-400",
  on_site: "bg-sky-500/15 text-sky-400",
  in_progress: "bg-orange-500/15 text-orange-400",
  complete: "bg-primary/15 text-primary",
};

function normalize(status: string | null): VisitStatus {
  const s = (status ?? "scheduled").toLowerCase();
  if (s === "on_my_way" || s === "on_site" || s === "in_progress" || s === "complete") {
    return s;
  }
  return "scheduled";
}

export function VisitActionPanel({
  jobberJobId,
  businessId,
  visitStatus,
  customerName,
  customerPhone,
  onContact,
}: VisitActionPanelProps) {
  const [omwOpen, setOmwOpen] = useState(false);
  const { advance, reopen } = useVisitLifecycle();
  const status = normalize(visitStatus);
  const disabled = !businessId || advance.isPending || reopen.isPending;

  const handlePrimary = () => {
    if (!businessId) return;
    if (status === "scheduled") {
      setOmwOpen(true);
      return;
    }
    if (status === "on_my_way" || status === "on_site") {
      advance.mutate({
        jobberJobId,
        businessId,
        nextStatus: "in_progress",
        customerName,
        customerPhone,
      });
      return;
    }
    if (status === "in_progress") {
      advance.mutate({
        jobberJobId,
        businessId,
        nextStatus: "complete",
        customerName,
        customerPhone,
      });
    }
  };

  const primaryLabel =
    status === "scheduled"
      ? "On My Way"
      : status === "on_my_way" || status === "on_site"
      ? "Start Visit"
      : status === "in_progress"
      ? "Complete Visit"
      : "Completed";

  const PrimaryIcon =
    status === "scheduled"
      ? Truck
      : status === "on_my_way" || status === "on_site"
      ? Play
      : CheckCircle2;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-body font-semibold",
            STATUS_TONE[status],
          )}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      {status !== "complete" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={handlePrimary}
          className="w-full flex items-center justify-center gap-2 min-h-[56px] rounded-xl bg-primary text-primary-foreground font-body font-semibold text-base hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <PrimaryIcon className="w-5 h-5" />
          {primaryLabel}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="w-full flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-primary/10 text-primary font-body font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            Visit complete
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => businessId && reopen.mutate({ jobberJobId, businessId })}
            className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-secondary/40 text-foreground font-body font-medium text-sm hover:bg-secondary/70 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reopen visit
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onContact}
          className="flex items-center justify-center gap-1.5 min-h-[48px] rounded-xl bg-secondary/40 text-foreground font-body font-semibold text-sm hover:bg-secondary/70 transition-colors"
        >
          <Phone className="w-4 h-4" />
          Contact
        </button>
        <button
          type="button"
          disabled={!customerPhone && status === "scheduled"}
          onClick={onContact}
          className="flex items-center justify-center gap-1.5 min-h-[48px] rounded-xl bg-secondary/40 text-foreground font-body font-semibold text-sm hover:bg-secondary/70 transition-colors disabled:opacity-50"
        >
          <MapPin className="w-4 h-4" />
          Directions
        </button>
      </div>

      <OnMyWaySheet
        open={omwOpen}
        onClose={() => setOmwOpen(false)}
        customerName={customerName}
        customerPhone={customerPhone}
        onConfirm={(smsSent) => {
          if (!businessId) return;
          advance.mutate({
            jobberJobId,
            businessId,
            nextStatus: "on_my_way",
            customerName,
            customerPhone,
            smsSent,
          });
        }}
      />
    </div>
  );
}

export default VisitActionPanel;