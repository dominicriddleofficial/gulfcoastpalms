import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useUnpaidJobs, useDismissUnpaidJob, type UnpaidJob } from "@/hooks/useUnpaidJobs";
import { fmtMoney } from "@/components/platform/dashboard/primitives";
import { AlertCircle, Phone, MessageSquare, ArrowUpRight, Briefcase, X } from "lucide-react";

function normalizePhone(p: string | null): string | null {
  if (!p) return null;
  const digits = p.replace(/\D/g, "");
  if (!digits) return null;
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

function Row({ job, businessId }: { job: UnpaidJob; businessId: string | null }) {
  const overdue = (job.days_since_completed ?? 0) >= 14;
  const partial = job.paid > 0;
  const tel = normalizePhone(job.customer_phone);
  const dismiss = useDismissUnpaidJob(businessId);
  const [confirming, setConfirming] = useState(false);

  const onDismiss = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    dismiss.mutate(job.id);
  };

  return (
    <li
      className="rounded-2xl p-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: overdue
          ? "1px solid rgba(239,68,68,0.45)"
          : "1px solid rgba(255,255,255,0.06)",
        boxShadow: overdue
          ? "inset 0 1px 0 rgba(255,255,255,0.03), 0 8px 24px -18px rgba(239,68,68,0.45)"
          : "inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-display font-semibold tracking-tight"
              style={{ color: "#fff", fontSize: "15px" }}
            >
              {job.customer_name ?? "Unknown customer"}
            </span>
            {overdue && (
              <span
                className="rounded-full px-2 py-0.5 font-body font-semibold uppercase tracking-wide"
                style={{
                  fontSize: "10px",
                  color: "rgb(248,113,113)",
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.35)",
                }}
              >
                {job.days_since_completed}d overdue
              </span>
            )}
            {partial && (
              <span
                className="rounded-full px-2 py-0.5 font-body font-medium uppercase tracking-wide"
                style={{
                  fontSize: "10px",
                  color: "rgb(251,191,36)",
                  background: "rgba(245,158,11,0.10)",
                  border: "1px solid rgba(245,158,11,0.28)",
                }}
              >
                Partial
              </span>
            )}
          </div>
          <p
            className="font-body mt-0.5 truncate"
            style={{ fontSize: "13px", color: "hsl(220 8% 65%)" }}
          >
            {job.title ?? "Untitled job"} · #{job.job_number}
          </p>
          <p
            className="font-body mt-1"
            style={{ fontSize: "12px", color: "hsl(220 8% 55%)" }}
          >
            {job.completed_at
              ? `Completed ${format(new Date(job.completed_at), "MMM d, yyyy")}`
              : "Completion date unknown"}
            {job.days_since_completed != null && (
              <> · {job.days_since_completed} day{job.days_since_completed === 1 ? "" : "s"} ago</>
            )}
          </p>
        </div>

        <div className="text-right">
          <div
            className="font-display font-bold"
            style={{
              fontSize: "20px",
              color: overdue ? "rgb(248,113,113)" : "#fff",
              letterSpacing: "-0.02em",
            }}
          >
            {fmtMoney(job.owed)}
          </div>
          <div
            className="font-body"
            style={{ fontSize: "11px", color: "hsl(220 8% 55%)" }}
          >
            {partial ? `paid ${fmtMoney(job.paid)} of ${fmtMoney(job.total)}` : `of ${fmtMoney(job.total)}`}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          to={`/platform/jobs?job=${job.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-body font-medium transition-colors"
          style={{
            fontSize: "12px",
            color: "#fff",
            background: "rgba(var(--biz-accent-rgb),0.14)",
            border: "1px solid rgba(var(--biz-accent-rgb),0.28)",
          }}
        >
          <Briefcase className="w-3.5 h-3.5" />
          Open job
          <ArrowUpRight className="w-3 h-3 opacity-70" />
        </Link>
        {tel && (
          <>
            <a
              href={`tel:${tel}`}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-body font-medium transition-colors hover:bg-white/10"
              style={{
                fontSize: "12px",
                color: "#fff",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <Phone className="w-3.5 h-3.5" />
              Call
            </a>
            <a
              href={`sms:${tel}`}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-body font-medium transition-colors hover:bg-white/10"
              style={{
                fontSize: "12px",
                color: "#fff",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Text
            </a>
            <span
              className="font-body ml-1"
              style={{ fontSize: "11px", color: "hsl(220 8% 55%)" }}
            >
              {job.customer_phone}
            </span>
          </>
        )}
        <button
          type="button"
          onClick={onDismiss}
          disabled={dismiss.isPending}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-body font-medium transition-colors hover:bg-white/10 disabled:opacity-50"
          style={{
            fontSize: "12px",
            color: confirming ? "rgb(248,113,113)" : "hsl(220 8% 65%)",
            background: confirming ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.04)",
            border: confirming
              ? "1px solid rgba(239,68,68,0.35)"
              : "1px solid rgba(255,255,255,0.08)",
          }}
          title={confirming ? "Click again to confirm — this is permanent" : "Remove from the Unpaid tracker permanently"}
        >
          <X className="w-3.5 h-3.5" />
          {dismiss.isPending ? "Dismissing…" : confirming ? "Click again to confirm" : "Dismiss"}
        </button>
      </div>
    </li>
  );
}

export default function PlatformUnpaid() {
  const { selectedBusinessId, businesses } = usePlatformAuth();
  const biz = businesses.find(b => b.id === selectedBusinessId);
  const { data, isLoading, error } = useUnpaidJobs(selectedBusinessId);

  return (
    <PlatformLayout>
      <div className="space-y-5 max-w-5xl mx-auto">
        <header className="space-y-1">
          <h1
            className="font-display font-bold"
            style={{ fontSize: "26px", letterSpacing: "-0.02em", color: "#fff" }}
          >
            Unpaid Jobs
          </h1>
          <p className="font-body" style={{ fontSize: "13px", color: "hsl(220 8% 55%)" }}>
            {biz?.public_brand_name ?? "Workspace"} · Completed jobs still owing money
          </p>
        </header>

        {isLoading && (
          <div
            className="rounded-2xl p-6 text-center font-body"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "hsl(220 8% 55%)",
              fontSize: "13px",
            }}
          >
            Loading…
          </div>
        )}

        {error && (
          <div
            className="rounded-2xl p-4 font-body"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.35)",
              color: "rgb(248,113,113)",
              fontSize: "13px",
            }}
          >
            Couldn't load unpaid jobs. Try again in a moment.
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <SummaryTile label="Total owed" value={fmtMoney(data.totalOwed)} tone="warn" />
              <SummaryTile label="Unpaid jobs" value={String(data.unpaidCount)} />
              <SummaryTile
                label="14+ days overdue"
                value={String(data.overdueCount)}
                tone={data.overdueCount > 0 ? "bad" : "neutral"}
              />
            </div>

            {data.unpaid.length === 0 ? (
              <div
                className="rounded-2xl p-6 text-center"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p className="font-display font-semibold" style={{ color: "#fff", fontSize: "15px" }}>
                  All caught up.
                </p>
                <p className="font-body mt-1" style={{ fontSize: "13px", color: "hsl(220 8% 55%)" }}>
                  No completed jobs are waiting on payment.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {data.unpaid.map(j => (
                  <Row key={j.id} job={j} businessId={selectedBusinessId} />
                ))}
              </ul>
            )}

            {data.noPrice.length > 0 && (
              <section className="space-y-2 pt-2">
                <header className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" style={{ color: "hsl(220 8% 55%)" }} />
                  <h2
                    className="font-display font-semibold tracking-tight"
                    style={{ color: "#fff", fontSize: "14px" }}
                  >
                    Completed jobs with no price set ({data.noPrice.length})
                  </h2>
                </header>
                <p className="font-body" style={{ fontSize: "12px", color: "hsl(220 8% 55%)" }}>
                  These aren't counted as money owed — they're data-quality gaps to fix.
                </p>
                <ul className="space-y-1.5">
                  {data.noPrice.map(j => (
                    <li
                      key={j.id}
                      className="rounded-xl p-3 flex items-center justify-between gap-3"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div className="min-w-0">
                        <div
                          className="font-body font-medium truncate"
                          style={{ color: "#fff", fontSize: "13px" }}
                        >
                          {j.customer_name ?? "Unknown customer"} · {j.title ?? "Untitled"}
                        </div>
                        <div
                          className="font-body"
                          style={{ fontSize: "11px", color: "hsl(220 8% 55%)" }}
                        >
                          #{j.job_number}
                          {j.completed_at && ` · Completed ${format(new Date(j.completed_at), "MMM d, yyyy")}`}
                        </div>
                      </div>
                      <Link
                        to={`/platform/jobs?job=${j.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-body font-medium transition-colors hover:bg-white/10"
                        style={{
                          fontSize: "11px",
                          color: "#fff",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.10)",
                        }}
                      >
                        Fix
                        <ArrowUpRight className="w-3 h-3 opacity-70" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </PlatformLayout>
  );
}

function SummaryTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warn" | "bad";
}) {
  const color =
    tone === "bad" ? "rgb(248,113,113)" : tone === "warn" ? "rgb(251,191,36)" : "#fff";
  const border =
    tone === "bad"
      ? "1px solid rgba(239,68,68,0.30)"
      : tone === "warn"
        ? "1px solid rgba(245,158,11,0.28)"
        : "1px solid rgba(255,255,255,0.06)";
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        border,
      }}
    >
      <div
        className="font-body uppercase"
        style={{ fontSize: "10px", letterSpacing: "0.16em", color: "hsl(220 8% 60%)" }}
      >
        {label}
      </div>
      <div
        className="font-display font-bold mt-2"
        style={{ fontSize: "24px", color, letterSpacing: "-0.02em" }}
      >
        {value}
      </div>
    </div>
  );
}