import { Link } from "react-router-dom";
import { AlertCircle, ChevronRight } from "lucide-react";
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
    <Link to="/platform/unpaid" className="command-link-card" data-tone={overdue ? "danger" : "warning"}>
      <span className="link-card-icon"><AlertCircle className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <div className="command-link-card-title">Unpaid completed jobs</div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <span className="command-link-card-value">{fmtMoney(data.totalOwed)}</span>
          <span className="command-link-card-caption">
            {data.unpaidCount} {data.unpaidCount === 1 ? "job" : "jobs"} outstanding
            {overdue && <span className="text-red-300"> · {data.overdueCount} overdue</span>}
            {data.noPrice.length > 0 && <span> · {data.noPrice.length} missing price</span>}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
