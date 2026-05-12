import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { SectionCard, StatusDot } from "./primitives";
import { formatDistanceToNow } from "date-fns";

type HealthRow = {
  check_name: string;
  status: "ok" | "warn" | "fail" | "unknown";
  last_ok_at: string | null;
  last_failure_at: string | null;
  message: string | null;
  updated_at: string;
};

const TRACKED: { key: string; label: string }[] = [
  { key: "simpletexting", label: "SimpleTexting (SMS)" },
  { key: "stripe_webhook", label: "Stripe webhooks" },
  { key: "jobber_sync", label: "Jobber sync" },
  { key: "resend", label: "Resend (email)" },
  { key: "review_queue", label: "Review queue" },
  { key: "recurring_processor", label: "Recurring processor" },
  { key: "cron_health", label: "Cron health check" },
];

export default function ReliabilitySection() {
  const { data: checks = [], isPending } = useQuery({
    queryKey: ["dash-reliability-checks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_health_checks")
        .select(
          "check_name, status, last_ok_at, last_failure_at, message, updated_at",
        );
      return (data as HealthRow[]) ?? [];
    },
    refetchInterval: 60_000,
  });

  const tracked = TRACKED.map(({ key, label }) => {
    const row = checks.find((c) => c.check_name === key);
    return { key, label, row, status: (row?.status ?? "unknown") as HealthRow["status"] };
  });
  const problems = tracked.filter(
    (t) => t.status === "warn" || t.status === "fail",
  );

  if (isPending || problems.length === 0) return null;

  return (
    <SectionCard
      title="Reliability"
      subtitle={`${problems.length} system${problems.length === 1 ? "" : "s"} need attention`}
      action={
        <Link
          to="/platform/backend-health"
          className="font-body"
          style={{ fontSize: "11px", color: "hsl(220 8% 60%)" }}
        >
          Health page →
        </Link>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {problems.map(({ key, label, row, status }) => {
          const stamp = row?.updated_at
            ? formatDistanceToNow(new Date(row.updated_at), { addSuffix: true })
            : "no data";
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(var(--biz-accent-rgb),0.10)",
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <StatusDot status={status} />
                <div className="min-w-0">
                  <div
                    className="font-body font-medium truncate"
                    style={{ fontSize: "12.5px", color: "#fff" }}
                  >
                    {label}
                  </div>
                  <div
                    className="font-body truncate"
                    style={{ fontSize: "10.5px", color: "hsl(220 8% 50%)" }}
                  >
                    {row?.message || stamp}
                  </div>
                </div>
              </div>
              <span
                className="font-body uppercase shrink-0"
                style={{
                  fontSize: "9.5px",
                  letterSpacing: "0.12em",
                  color:
                    status === "ok"
                      ? "var(--accent-color)"
                      : status === "warn"
                        ? "#f59e0b"
                        : status === "fail"
                          ? "#ef4444"
                          : "hsl(220 8% 50%)",
                }}
              >
                {status}
              </span>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}