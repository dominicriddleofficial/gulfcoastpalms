import { useEffect, useState } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, Target, FileText, Briefcase, Receipt, CreditCard,
  Clock, AlertTriangle, Users, CalendarDays, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KPIData {
  leadCount: number;
  quoteCount: number;
  jobCount: number;
  invoiceCount: number;
  customerCount: number;
  totalInvoiced: number;
  totalCollected: number;
  outstandingBalance: number;
}

function KPICard({ label, value, icon: Icon, trend, trendDirection }: {
  label: string;
  value: string;
  icon: any;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
}) {
  return (
    <div className="platform-card platform-card-glow rounded-xl p-4 space-y-3 hover:border-primary/10 transition-colors">
      <div className="flex items-center justify-between">
        <span className="font-body text-[11px] text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary/70" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="font-display text-2xl font-bold text-foreground tracking-tight">{value}</span>
        {trend && (
          <span className={cn(
            "font-body text-[11px] font-medium mb-0.5 flex items-center gap-0.5",
            trendDirection === "up" && "text-primary",
            trendDirection === "down" && "text-destructive",
            trendDirection === "neutral" && "text-muted-foreground",
          )}>
            {trendDirection === "up" && <ArrowUpRight className="w-3 h-3" />}
            {trendDirection === "down" && <ArrowDownRight className="w-3 h-3" />}
            {trendDirection === "neutral" && <Minus className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="platform-card platform-card-glow rounded-xl p-5 space-y-3">
      <div>
        <h3 className="font-display text-sm font-semibold text-foreground tracking-tight">{title}</h3>
        <p className="font-body text-[11px] text-muted-foreground">{description}</p>
      </div>
      {children || (
        <div className="flex items-center justify-center py-8">
          <span className="inline-block px-2.5 py-1 rounded-md bg-secondary/50 text-[10px] font-display font-medium text-muted-foreground uppercase tracking-wider">
            Coming Soon
          </span>
        </div>
      )}
    </div>
  );
}

export default function PlatformDashboard() {
  const { selectedBusinessId, businesses, isOwner } = usePlatformAuth();
  const [kpis, setKpis] = useState<KPIData>({
    leadCount: 0, quoteCount: 0, jobCount: 0, invoiceCount: 0,
    customerCount: 0, totalInvoiced: 0, totalCollected: 0, outstandingBalance: 0,
  });

  useEffect(() => {
    fetchKPIs();
  }, [selectedBusinessId]);

  const fetchKPIs = async () => {
    const bizFilter = (q: any) => selectedBusinessId ? q.eq("business_id", selectedBusinessId) : q;

    const [leads, quotes, jobs, invoices, customers] = await Promise.all([
      bizFilter(supabase.from("platform_leads").select("id", { count: "exact", head: true })),
      bizFilter(supabase.from("platform_quotes").select("id", { count: "exact", head: true })),
      bizFilter(supabase.from("platform_jobs").select("id", { count: "exact", head: true })),
      bizFilter(supabase.from("platform_invoices").select("total, amount_paid, balance_due")),
      bizFilter(supabase.from("platform_customers").select("id", { count: "exact", head: true })),
    ]);

    const invoiceData = invoices.data || [];
    const totalInvoiced = invoiceData.reduce((s: number, i: any) => s + (i.total || 0), 0);
    const totalCollected = invoiceData.reduce((s: number, i: any) => s + (i.amount_paid || 0), 0);
    const outstanding = invoiceData.reduce((s: number, i: any) => s + (i.balance_due || 0), 0);

    setKpis({
      leadCount: leads.count || 0,
      quoteCount: quotes.count || 0,
      jobCount: jobs.count || 0,
      invoiceCount: invoiceData.length,
      customerCount: customers.count || 0,
      totalInvoiced,
      totalCollected,
      outstandingBalance: outstanding,
    });
  };

  const selectedBiz = businesses.find(b => b.id === selectedBusinessId);

  return (
    <PlatformLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground tracking-tight">Command Center</h1>
            <p className="font-body text-[12px] text-muted-foreground mt-0.5">
              {selectedBiz ? selectedBiz.public_brand_name : "All Businesses"} · Overview
            </p>
          </div>
          {!selectedBusinessId && isOwner && businesses.length > 1 && (
            <div className="flex gap-1.5">
              {businesses.map(b => (
                <InlineBadge key={b.id} shortcode={b.shortcode} color={b.default_business_color} />
              ))}
            </div>
          )}
        </div>

        {/* Primary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard label="Total Revenue" value={`$${kpis.totalInvoiced.toLocaleString()}`} icon={TrendingUp} />
          <KPICard label="Collected" value={`$${kpis.totalCollected.toLocaleString()}`} icon={CreditCard} />
          <KPICard label="Outstanding" value={`$${kpis.outstandingBalance.toLocaleString()}`} icon={AlertTriangle} 
            trendDirection={kpis.outstandingBalance > 0 ? "down" : "neutral"} />
          <KPICard label="Customers" value={kpis.customerCount.toString()} icon={Users} />
        </div>

        {/* Pipeline KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard label="Leads" value={kpis.leadCount.toString()} icon={Target} />
          <KPICard label="Quotes" value={kpis.quoteCount.toString()} icon={FileText} />
          <KPICard label="Jobs" value={kpis.jobCount.toString()} icon={Briefcase} />
          <KPICard label="Invoices" value={kpis.invoiceCount.toString()} icon={Receipt} />
        </div>

        {/* Business Comparison (owner only, combined view) */}
        {!selectedBusinessId && isOwner && businesses.length > 1 && (
          <div className="platform-card platform-card-glow rounded-xl p-5">
            <h2 className="font-display text-sm font-semibold text-foreground tracking-tight mb-4">Business Comparison</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {businesses.map(biz => (
                <div
                  key={biz.id}
                  className="rounded-lg border border-border/50 p-4 space-y-3 hover:border-primary/10 transition-colors"
                  style={{ borderLeftColor: (biz.default_business_color || "#22c55e"), borderLeftWidth: 3 }}
                >
                  <div className="flex items-center gap-2">
                    <InlineBadge shortcode={biz.shortcode} color={biz.default_business_color} />
                    <span className="font-display text-[12px] font-semibold text-foreground tracking-tight">{biz.public_brand_name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Revenue</p>
                      <p className="font-display text-lg font-bold text-foreground tracking-tight">$0</p>
                    </div>
                    <div>
                      <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Jobs</p>
                      <p className="font-display text-lg font-bold text-foreground tracking-tight">0</p>
                    </div>
                    <div>
                      <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Leads</p>
                      <p className="font-display text-lg font-bold text-foreground tracking-tight">0</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Module sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionCard title="Recent Activity" description="Latest events across your businesses" />
          <SectionCard title="Quote Pipeline" description="Quotes by status with conversion metrics" />
          <SectionCard title="Revenue Trend" description="Revenue chart with business breakdown" />
          <SectionCard title="Lead Sources" description="Where your leads are coming from" />
        </div>
      </div>
    </PlatformLayout>
  );
}
