import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "en route": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "en_route": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "on site": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "on_site": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  rescheduled: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function StatusChip({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const style = STATUS_STYLES[normalized] || "bg-muted text-muted-foreground";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-body font-medium", style)}>
      {label}
    </span>
  );
}
