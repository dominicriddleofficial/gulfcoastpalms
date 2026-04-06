import { useState, useEffect } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Target, FileText, Briefcase, Receipt, CreditCard, Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  revenue: { total: number; collected: number; outstanding: number };
  leads: { total: number; new: number; won: number; lost: number };
  quotes: { total: number; sent: number; accepted: number; declined: number; conversionRate: number };
  jobs: { total: number; scheduled: number; completed: number; inProgress: number };
  customers: { total: number; active: number };
  invoices: { total: number; paid: number; overdue: number };
}

function MetricCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: any; color?: string;
}) {
  return (
    <div className="platform-card rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-body text-[11px] text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className="w-4 h-4 text-primary/60" />
      </div>
      <p className="font-display text-2xl font-bold text-foreground tracking-tight">{value}</p>
      {sub && <p className="font-body text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function StatRow({ label, value, percent, color }: { label: string; value: number; percent: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="font-body text-xs text-muted-foreground">{label}</span>
        <span className="font-body text-xs font-medium text-foreground">{value}</span>
      </div>
      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function PlatformAnalytics() {
  const { selectedBusinessId } = usePlatformAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedBusinessId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const biz = (q: any) => selectedBusinessId ? q.eq("business_id", selectedBusinessId) : q;

    const [leads, quotes, jobs, invoices, customers, payments] = await Promise.all([
      biz(supabase.from("platform_leads").select("lead_status")),
      biz(supabase.from("platform_quotes").select("status, total")),
      biz(supabase.from("platform_jobs").select("status, total")),
      biz(supabase.from("platform_invoices").select("status, total, amount_paid, balance_due")),
      biz(supabase.from("platform_customers").select("customer_status")),
      biz(supabase.from("platform_payments").select("amount, is_refund")),
    ]);

    const ld = leads.data || [];
    const qd = quotes.data || [];
    const jd = jobs.data || [];
    const id = invoices.data || [];
    const cd = customers.data || [];
    const pd = payments.data || [];

    const totalInvoiced = id.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
    const totalCollected = pd.filter((p: any) => !p.is_refund).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const outstanding = id.reduce((s: number, i: any) => s + (Number(i.balance_due) || 0), 0);
    const acceptedQuotes = qd.filter((q: any) => q.status === "accepted").length;
    const sentQuotes = qd.filter((q: any) => ["sent", "viewed", "accepted", "declined"].includes(q.status)).length;

    setData({
      revenue: { total: totalInvoiced, collected: totalCollected, outstanding },
      leads: {
        total: ld.length,
        new: ld.filter((l: any) => l.lead_status === "new").length,
        won: ld.filter((l: any) => l.lead_status === "won").length,
        lost: ld.filter((l: any) => l.lead_status === "lost").length,
      },
      quotes: {
        total: qd.length,
        sent: sentQuotes,
        accepted: acceptedQuotes,
        declined: qd.filter((q: any) => q.status === "declined").length,
        conversionRate: sentQuotes > 0 ? Math.round((acceptedQuotes / sentQuotes) * 100) : 0,
      },
      jobs: {
        total: jd.length,
        scheduled: jd.filter((j: any) => j.status === "scheduled").length,
        completed: jd.filter((j: any) => j.status === "completed").length,
        inProgress: jd.filter((j: any) => j.status === "in_progress").length,
      },
      customers: {
        total: cd.length,
        active: cd.filter((c: any) => c.customer_status === "active").length,
      },
      invoices: {
        total: id.length,
        paid: id.filter((i: any) => i.status === "paid").length,
        overdue: id.filter((i: any) => i.status === "overdue").length,
      },
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <PlatformLayout>
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PlatformLayout>
    );
  }

  const d = data!;

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground tracking-tight">Analytics</h1>
          <p className="font-body text-xs text-muted-foreground">Business performance overview</p>
        </div>

        {/* Revenue */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricCard label="Total Revenue" value={`$${d.revenue.total.toLocaleString()}`} icon={TrendingUp} />
          <MetricCard label="Collected" value={`$${d.revenue.collected.toLocaleString()}`} icon={CreditCard} />
          <MetricCard label="Outstanding" value={`$${d.revenue.outstanding.toLocaleString()}`} icon={Receipt} />
        </div>

        {/* Pipeline */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Leads" value={d.leads.total.toString()} sub={`${d.leads.new} new · ${d.leads.won} won`} icon={Target} />
          <MetricCard label="Quotes" value={d.quotes.total.toString()} sub={`${d.quotes.conversionRate}% conversion`} icon={FileText} />
          <MetricCard label="Jobs" value={d.jobs.total.toString()} sub={`${d.jobs.completed} completed`} icon={Briefcase} />
          <MetricCard label="Customers" value={d.customers.total.toString()} sub={`${d.customers.active} active`} icon={Users} />
        </div>

        {/* Breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="platform-card rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">Lead Pipeline</h3>
            </div>
            {d.leads.total === 0 ? (
              <p className="font-body text-xs text-muted-foreground py-4 text-center">No leads yet</p>
            ) : (
              <div className="space-y-3">
                <StatRow label="New" value={d.leads.new} percent={(d.leads.new / d.leads.total) * 100} color="#2563eb" />
                <StatRow label="Won" value={d.leads.won} percent={(d.leads.won / d.leads.total) * 100} color="#22c55e" />
                <StatRow label="Lost" value={d.leads.lost} percent={(d.leads.lost / d.leads.total) * 100} color="#ef4444" />
              </div>
            )}
          </div>

          <div className="platform-card rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">Quote Conversion</h3>
            </div>
            {d.quotes.total === 0 ? (
              <p className="font-body text-xs text-muted-foreground py-4 text-center">No quotes yet</p>
            ) : (
              <div className="space-y-3">
                <StatRow label="Sent" value={d.quotes.sent} percent={(d.quotes.sent / d.quotes.total) * 100} color="#2563eb" />
                <StatRow label="Accepted" value={d.quotes.accepted} percent={(d.quotes.accepted / d.quotes.total) * 100} color="#22c55e" />
                <StatRow label="Declined" value={d.quotes.declined} percent={(d.quotes.declined / d.quotes.total) * 100} color="#ef4444" />
              </div>
            )}
          </div>

          <div className="platform-card rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">Jobs by Status</h3>
            </div>
            {d.jobs.total === 0 ? (
              <p className="font-body text-xs text-muted-foreground py-4 text-center">No jobs yet</p>
            ) : (
              <div className="space-y-3">
                <StatRow label="Scheduled" value={d.jobs.scheduled} percent={(d.jobs.scheduled / d.jobs.total) * 100} color="#2563eb" />
                <StatRow label="In Progress" value={d.jobs.inProgress} percent={(d.jobs.inProgress / d.jobs.total) * 100} color="#f59e0b" />
                <StatRow label="Completed" value={d.jobs.completed} percent={(d.jobs.completed / d.jobs.total) * 100} color="#22c55e" />
              </div>
            )}
          </div>

          <div className="platform-card rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">Invoice Status</h3>
            </div>
            {d.invoices.total === 0 ? (
              <p className="font-body text-xs text-muted-foreground py-4 text-center">No invoices yet</p>
            ) : (
              <div className="space-y-3">
                <StatRow label="Paid" value={d.invoices.paid} percent={(d.invoices.paid / d.invoices.total) * 100} color="#22c55e" />
                <StatRow label="Overdue" value={d.invoices.overdue} percent={(d.invoices.overdue / d.invoices.total) * 100} color="#ef4444" />
                <StatRow label="Other" value={d.invoices.total - d.invoices.paid - d.invoices.overdue} percent={((d.invoices.total - d.invoices.paid - d.invoices.overdue) / d.invoices.total) * 100} color="#6b7280" />
              </div>
            )}
          </div>
        </div>
      </div>
    </PlatformLayout>
  );
}
