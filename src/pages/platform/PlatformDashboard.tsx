import { useEffect, useState, useMemo } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp, CreditCard, AlertTriangle, Briefcase,
  ArrowUpRight, ArrowDownRight, Minus, Calendar, MapPin, Clock, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, isToday } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface KPIData {
  totalInvoiced: number;
  totalCollected: number;
  outstandingBalance: number;
  jobsThisWeek: number;
}

interface TodayJob {
  id: string;
  job_title: string | null;
  customer_name: string | null;
  property_address: string | null;
  scheduled_start_time: string | null;
  status: string;
}

interface RevenuePoint {
  month: string;
  revenue: number;
}

function KPICard({ label, value, icon: Icon, trendDirection }: {
  label: string;
  value: string;
  icon: any;
  trendDirection?: "up" | "down" | "neutral";
}) {
  return (
    <div className="platform-card platform-card-glow rounded-xl p-4 space-y-3 hover:border-primary/10 transition-colors hover:shadow-[0_0_20px_-4px_hsl(142_71%_45%/0.15)]">
      <div className="flex items-center justify-between">
        <span className="font-body text-[11px] text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary/70" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="font-display text-2xl font-bold text-foreground tracking-tight">{value}</span>
      </div>
    </div>
  );
}

const VISIT_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  scheduled: { bg: "#2563eb20", text: "#2563eb", label: "Scheduled" },
  en_route: { bg: "#8b5cf620", text: "#8b5cf6", label: "En Route" },
  in_progress: { bg: "#f59e0b20", text: "#f59e0b", label: "In Progress" },
  completed: { bg: "#22c55e20", text: "#22c55e", label: "Completed" },
  skipped: { bg: "#6b728020", text: "#6b7280", label: "Skipped" },
  cancelled: { bg: "#ef444420", text: "#ef4444", label: "Cancelled" },
};

export default function PlatformDashboard() {
  const { selectedBusinessId, businesses, isOwner } = usePlatformAuth();
  const queryClient = useQueryClient();
  const [kpis, setKpis] = useState<KPIData>({
    totalInvoiced: 0, totalCollected: 0, outstandingBalance: 0, jobsThisWeek: 0,
  });
  const [todayJobs, setTodayJobs] = useState<TodayJob[]>([]);
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Prefetch common routes data on mount
  useEffect(() => {
    if (!selectedBusinessId) return;
    // Prefetch leads, jobs, invoices for faster nav
    const bizFilter = (q: any) => q.eq("business_id", selectedBusinessId);

    queryClient.prefetchQuery({
      queryKey: ["platform-leads-prefetch", selectedBusinessId],
      queryFn: () => bizFilter(supabase.from("platform_leads").select("id", { count: "exact", head: true })).then(r => r.count),
      staleTime: 60_000,
    });
    queryClient.prefetchQuery({
      queryKey: ["platform-jobs-prefetch", selectedBusinessId],
      queryFn: () => bizFilter(supabase.from("platform_jobs").select("id", { count: "exact", head: true })).then(r => r.count),
      staleTime: 60_000,
    });
  }, [selectedBusinessId, queryClient]);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedBusinessId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    const bizFilter = (q: any) => selectedBusinessId ? q.eq("business_id", selectedBusinessId) : q;

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const todayStr = format(today, "yyyy-MM-dd");

    const [invoices, jobsWeek, todayVisits, payments] = await Promise.all([
      bizFilter(supabase.from("platform_invoices").select("total, amount_paid, balance_due")),
      bizFilter(
        supabase.from("platform_job_visits")
          .select("id", { count: "exact", head: true })
          .gte("scheduled_date", format(weekStart, "yyyy-MM-dd"))
          .lte("scheduled_date", format(weekEnd, "yyyy-MM-dd"))
      ),
      bizFilter(
        supabase.from("platform_job_visits")
          .select("id, title, status, scheduled_start_time, platform_jobs(title, platform_customers(display_name)), platform_properties(address_1, city)")
          .eq("scheduled_date", todayStr)
          .order("route_order", { ascending: true })
      ),
      bizFilter(
        supabase.from("platform_payments")
          .select("amount, payment_date")
          .order("payment_date", { ascending: true })
      ),
    ]);

    const invoiceData = invoices.data || [];
    const totalInvoiced = invoiceData.reduce((s: number, i: any) => s + (i.total || 0), 0);
    const totalCollected = invoiceData.reduce((s: number, i: any) => s + (i.amount_paid || 0), 0);
    const outstanding = invoiceData.reduce((s: number, i: any) => s + (i.balance_due || 0), 0);

    setKpis({
      totalInvoiced,
      totalCollected,
      outstandingBalance: outstanding,
      jobsThisWeek: jobsWeek.count || 0,
    });

    // Today's jobs
    setTodayJobs((todayVisits.data || []).map((v: any) => ({
      id: v.id,
      job_title: v.platform_jobs?.title || v.title || "Visit",
      customer_name: v.platform_jobs?.platform_customers?.display_name || null,
      property_address: v.platform_properties ? `${v.platform_properties.address_1}, ${v.platform_properties.city}` : null,
      scheduled_start_time: v.scheduled_start_time,
      status: v.status,
    })));

    // Revenue chart - group payments by month
    const paymentData = payments.data || [];
    const monthMap: Record<string, number> = {};
    // Pre-fill last 12 months with 0
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = format(d, "MMM yyyy");
      monthMap[key] = 0;
    }
    paymentData.forEach((p: any) => {
      if (p.payment_date) {
        const key = format(new Date(p.payment_date), "MMM yyyy");
        if (key in monthMap) monthMap[key] += Number(p.amount) || 0;
      }
    });
    setRevenueData(Object.entries(monthMap).map(([month, revenue]) => ({ month, revenue })));

    setLoading(false);
  };

  const selectedBiz = businesses.find(b => b.id === selectedBusinessId);
  const hasRevenueData = revenueData.some(d => d.revenue > 0);

  return (
    <PlatformLayout>
      <div className="space-y-6 relative">
        {/* Green glow background — dashboard only */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden rounded-2xl">
          <div
            className="absolute inset-0 animate-[glow-pulse_8s_ease-in-out_infinite]"
            style={{
              background: `
                radial-gradient(ellipse at 20% 20%, rgba(26, 92, 56, 0.15) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 80%, rgba(26, 92, 56, 0.10) 0%, transparent 55%),
                radial-gradient(ellipse at 50% 0%, rgba(45, 122, 79, 0.08) 0%, transparent 50%)
              `,
            }}
          />
        </div>

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
          <KPICard
            label="Outstanding"
            value={`$${kpis.outstandingBalance.toLocaleString()}`}
            icon={AlertTriangle}
            trendDirection={kpis.outstandingBalance > 0 ? "down" : "neutral"}
          />
          <KPICard label="Jobs This Week" value={kpis.jobsThisWeek.toString()} icon={Briefcase} />
        </div>

        {/* Revenue Chart */}
        <div className="platform-card platform-card-glow rounded-xl p-5 space-y-3">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground tracking-tight">Revenue Trend</h3>
            <p className="font-body text-[11px] text-muted-foreground">Monthly collected revenue</p>
          </div>
          <div className="h-[280px] md:h-[320px]">
            {hasRevenueData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 14%)" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "hsl(220 8% 50%)", fontSize: 11, fontFamily: "Outfit" }}
                    axisLine={{ stroke: "hsl(220 12% 14%)" }}
                    tickLine={false}
                    tickFormatter={(v) => v.split(" ")[0]}
                  />
                  <YAxis
                    tick={{ fill: "hsl(220 8% 50%)", fontSize: 11, fontFamily: "Outfit" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(v >= 1000 ? 1 : 0)}${v >= 1000 ? "k" : ""}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(220 14% 9%)",
                      border: "1px solid hsl(220 12% 18%)",
                      borderRadius: "8px",
                      fontFamily: "Outfit",
                      fontSize: "12px",
                      color: "hsl(220 10% 92%)",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                    labelStyle={{ color: "hsl(220 8% 50%)", marginBottom: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(142 71% 45%)"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center">
                <TrendingUp className="w-10 h-10 text-muted-foreground/20 mb-3" />
                <p className="font-body text-sm text-muted-foreground/60">Revenue will appear here as invoices are paid</p>
              </div>
            )}
          </div>
        </div>

        {/* Today's Schedule Strip */}
        <div className="platform-card platform-card-glow rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground tracking-tight">Today's Schedule</h3>
              <p className="font-body text-[11px] text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
            </div>
            <span className="font-body text-[11px] text-primary font-medium">{todayJobs.length} visit{todayJobs.length !== 1 ? "s" : ""}</span>
          </div>

          {todayJobs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Calendar className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="font-body text-sm text-muted-foreground/60">No jobs scheduled today</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {todayJobs.map(job => {
                const statusInfo = VISIT_STATUS_COLORS[job.status] || VISIT_STATUS_COLORS.scheduled;
                return (
                  <div
                    key={job.id}
                    className="flex-shrink-0 w-56 bg-secondary/40 border border-border rounded-lg p-3 hover:border-primary/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      {job.scheduled_start_time && (
                        <span className="flex items-center gap-1 font-body text-[11px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {job.scheduled_start_time.slice(0, 5)}
                        </span>
                      )}
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-body font-medium"
                        style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="font-body text-sm font-medium text-foreground truncate">
                      {job.customer_name || job.job_title}
                    </p>
                    {job.property_address && (
                      <p className="font-body text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {job.property_address}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
      </div>
    </PlatformLayout>
  );
}
