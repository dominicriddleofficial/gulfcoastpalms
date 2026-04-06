import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  "en route": "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  "en_route": "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  "on site": "bg-purple-500/15 text-purple-400 border border-purple-500/20",
  "on_site": "bg-purple-500/15 text-purple-400 border border-purple-500/20",
  completed: "bg-primary/15 text-primary border border-primary/20",
  rescheduled: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  cancelled: "bg-destructive/15 text-destructive border border-destructive/20",
};

export default function StatusChip({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const style = STATUS_STYLES[normalized] || "bg-muted text-muted-foreground border border-border";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-body font-medium", style)}>
      {label}
    </span>
  );
}
