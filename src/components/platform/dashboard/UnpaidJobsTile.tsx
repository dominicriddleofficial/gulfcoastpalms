import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useUnpaidJobs } from "@/hooks/useUnpaidJobs";
import { fmtMoney } from "./primitives";

/**
 * Owner-only banner surfacing money owed on completed jobs.
 * Renders nothing for non-owners or when there's nothing owed.
 */
export default function UnpaidJobsTile() {
  const { selectedBusinessId } = usePlatformAuth();
  const { isOwner, isLoading: roleLoading } = useUserRole();
  const enabled = isOwner && !!selectedBusinessId;
  const { data, isLoading } = useUnpaidJobs(enabled ? selectedBusinessId : null);

  if (roleLoading || !isOwner) return null;
  if (isLoading || !data) return null;
  if (data.unpaidCount === 0 && data.noPrice.length === 0) return null;

  const overdue = data.overdueCount > 0;

  return (
    <Link
      to="/platform/unpaid"
      className="group block rounded-2xl p-4 md:p-5 transition-colors"
      style={{
        background: overdue
          ? "linear-gradient(180deg, rgba(239,68,68,0.10) 0%, rgba(239,68,68,0.03) 100%)"
          : "linear-gradient(180deg, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.03) 100%)",
        border: overdue
          ? "1px solid rgba(239,68,68,0.35)"
          : "1px solid rgba(245,158,11,0.30)",
        boxShadow: overdue
          ? "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 24px -16px rgba(239,68,68,0.45)"
          : "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 24px -16px rgba(245,158,11,0.35)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="rounded-lg p-2"
          style={{
            background: overdue ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
            border: overdue ? "1px solid rgba(239,68,68,0.30)" : "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <AlertCircle
            className="w-4 h-4"
            style={{ color: overdue ? "rgb(248,113,113)" : "rgb(251,191,36)" }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-body uppercase"
            style={{
              fontSize: "10px",
              letterSpacing: "0.16em",
              color: "hsl(220 8% 60%)",
            }}
          >
            Unpaid completed jobs
          </div>
          <div className="mt-1 flex items-baseline gap-2 flex-wrap">
            <span
              className="font-display font-bold"
              style={{ fontSize: "22px", color: "#fff", letterSpacing: "-0.02em" }}
            >
              {fmtMoney(data.totalOwed)}
            </span>
            <span className="font-body" style={{ fontSize: "12px", color: "hsl(220 8% 65%)" }}>
              owed · {data.unpaidCount} {data.unpaidCount === 1 ? "job" : "jobs"}
              {overdue && (
                <>
                  {" · "}
                  <span style={{ color: "rgb(248,113,113)", fontWeight: 600 }}>
                    {data.overdueCount} overdue
                  </span>
                </>
              )}
            </span>
          </div>
        </div>
        <span
          className="font-body opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ fontSize: "11px", color: "hsl(220 8% 65%)" }}
        >
          View →
        </span>
      </div>
    </Link>
  );
}