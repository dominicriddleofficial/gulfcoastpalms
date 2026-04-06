import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import {
  TrendingUp, Target, FileText, Briefcase, Receipt, CreditCard,
  Clock, AlertTriangle, Users, CalendarDays,
} from "lucide-react";

// Placeholder KPI card
function KPICard({ label, value, icon: Icon, change, businessBadge }: {
  label: string; value: string; icon: any; change?: string; businessBadge?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-body text-xs text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 text-primary/60" />
      </div>
      <div className="flex items-end gap-2">
        <span className="font-display text-2xl font-bold text-foreground">{value}</span>
        {change && (
          <span className="font-body text-xs text-primary mb-0.5">{change}</span>
        )}
      </div>
      {businessBadge}
    </div>
  );
}

function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-card border border-border/50 border-dashed rounded-xl p-6 text-center space-y-2">
      <h3 className="font-display text-lg text-muted-foreground">{title}</h3>
      <p className="font-body text-sm text-muted-foreground/60">{description}</p>
      <span className="inline-block px-2 py-1 rounded bg-secondary text-[10px] font-body text-muted-foreground uppercase tracking-wider">
        Coming Soon
      </span>
    </div>
  );
}

export default function PlatformDashboard() {
  const { selectedBusinessId, businesses, isOwner } = usePlatformAuth();
  
  const selectedBiz = businesses.find(b => b.id === selectedBusinessId);
  const viewLabel = selectedBiz ? selectedBiz.public_brand_name : "All Businesses";

  return (
    <PlatformLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Command Center</h1>
            <p className="font-body text-sm text-muted-foreground">
              {viewLabel} · Today
            </p>
          </div>
          {!selectedBusinessId && isOwner && (
            <div className="flex gap-1.5">
              {businesses.map(b => (
                <InlineBadge key={b.id} shortcode={b.shortcode} color={b.default_business_color} />
              ))}
            </div>
          )}
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard label="Revenue Today" value="$0" icon={TrendingUp} change="+0%" />
          <KPICard label="Revenue This Week" value="$0" icon={TrendingUp} />
          <KPICard label="Revenue This Month" value="$0" icon={TrendingUp} />
          <KPICard label="Outstanding Balance" value="$0" icon={AlertTriangle} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard label="New Leads" value="0" icon={Target} />
          <KPICard label="Quotes Sent" value="0" icon={FileText} />
          <KPICard label="Jobs Scheduled" value="0" icon={Briefcase} />
          <KPICard label="Jobs Completed" value="0" icon={CalendarDays} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard label="Invoices Sent" value="0" icon={Receipt} />
          <KPICard label="Deposits Collected" value="$0" icon={CreditCard} />
          <KPICard label="Overdue Follow-ups" value="0" icon={Clock} />
          <KPICard label="Active Customers" value="0" icon={Users} />
        </div>

        {/* Business Comparison (owner only, combined view) */}
        {!selectedBusinessId && isOwner && businesses.length > 1 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-display text-lg font-bold text-foreground mb-4">Business Comparison</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {businesses.map(biz => (
                <div
                  key={biz.id}
                  className="rounded-lg border border-border p-4 space-y-3"
                  style={{ borderColor: (biz.default_business_color || "#22c55e") + "40" }}
                >
                  <div className="flex items-center gap-2">
                    <InlineBadge shortcode={biz.shortcode} color={biz.default_business_color} />
                    <span className="font-body text-sm font-medium text-foreground">{biz.public_brand_name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="font-body text-[10px] text-muted-foreground">Revenue</p>
                      <p className="font-display text-lg font-bold text-foreground">$0</p>
                    </div>
                    <div>
                      <p className="font-body text-[10px] text-muted-foreground">Jobs</p>
                      <p className="font-display text-lg font-bold text-foreground">0</p>
                    </div>
                    <div>
                      <p className="font-body text-[10px] text-muted-foreground">Leads</p>
                      <p className="font-display text-lg font-bold text-foreground">0</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Module Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModulePlaceholder title="Recent Activity" description="Timeline of latest events across your businesses" />
          <ModulePlaceholder title="Quote Pipeline" description="Quotes by status with conversion metrics" />
          <ModulePlaceholder title="Revenue Trend" description="Daily/weekly revenue chart with business breakdown" />
          <ModulePlaceholder title="Lead Sources" description="Where your leads are coming from" />
        </div>
      </div>
    </PlatformLayout>
  );
}
