import {
  FileText,
  Briefcase,
  Receipt,
  MessageSquareWarning,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";
import { SectionCard, QuickAction } from "./primitives";

export default function QuickActionsBar() {
  return (
    <SectionCard title="Quick actions">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <QuickAction icon={FileText} label="Create quote" to="/platform/quotes/new" />
        <QuickAction icon={Briefcase} label="Create job" to="/platform/jobs/new" />
        <QuickAction icon={Receipt} label="Send invoice" to="/platform/invoices/new" />
        <QuickAction
          icon={MessageSquareWarning}
          label="Failed SMS"
          to="/platform/comms?tab=failed"
        />
        <QuickAction
          icon={AlertTriangle}
          label="Overdue invoices"
          to="/platform/invoices?status=overdue"
        />
        <QuickAction
          icon={RefreshCcw}
          label="Recurring due"
          to="/platform/jobs?type=recurring"
        />
      </div>
    </SectionCard>
  );
}