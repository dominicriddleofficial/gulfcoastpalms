import { useEffect, useState } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp, CreditCard, AlertTriangle, Briefcase,
  Calendar, MapPin, Clock,
} from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
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

interface RevenuePoint { month: string; revenue: number; }

function KPICard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div
      className="rounded-[14px] p-5 space-y-3 transition-all duration-200 cursor-default group"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(34,197,94,0.18)",
        borderRadius: "14px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(34,197,94,0.35)";
        e.currentTarget.style.boxShadow = "0 0 24px rgba(34,197,94,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(34,197,94,0.18)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "hsl(220 8% 50%)" }} className="font-body">
          {label}
        </span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.08)" }}>
          <Icon className="w-4 h-4" style={{ color: "rgba(34,197,94,0.7)" }} />
        </div>
      </div>
      <span className="font-display block" style={{ fontSize: "32px", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
        {value}
      </span>
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
  const [kpis, setKpis] = useState<KPIData>({ totalInvoiced: 0, totalCollected: 0, outstandingBalance: 0, jobsThisWeek: 0 });
  const [todayJobs, setTodayJobs] = useState<TodayJob[]>([]);
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedBusinessId) return;
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

  useEffect(() => { fetchDashboardData(); }, [selectedBusinessId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    const bizFilter = (q: any) => selectedBusinessId ? q.eq("business_id", selectedBusinessId) : q;
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const todayStr = format(today, "yyyy-MM-dd");

    const [invoices, jobsWeek, todayVisits, payments] = await Promise.all([
      bizFilter(supabase.from("platform_invoices").select("total, amount_paid, balance_due")),
      bizFilter(supabase.from("platform_job_visits").select("id", { count: "exact", head: true }).gte("scheduled_date", format(weekStart, "yyyy-MM-dd")).lte("scheduled_date", format(weekEnd, "yyyy-MM-dd"))),
      bizFilter(supabase.from("platform_job_visits").select("id, title, status, scheduled_start_time, platform_jobs(title, platform_customers(display_name)), platform_properties(address_1, city)").eq("scheduled_date", todayStr).order("route_order", { ascending: true })),
      bizFilter(supabase.from("platform_payments").select("amount, payment_date").order("payment_date", { ascending: true })),
    ]);

    const invoiceData = invoices.data || [];
    const totalInvoiced = invoiceData.reduce((s: number, i: any) => s + (i.total || 0), 0);
    const totalCollected = invoiceData.reduce((s: number, i: any) => s + (i.amount_paid || 0), 0);
    const outstanding = invoiceData.reduce((s: number, i: any) => s + (i.balance_due || 0), 0);
    setKpis({ totalInvoiced, totalCollected, outstandingBalance: outstanding, jobsThisWeek: jobsWeek.count || 0 });

    setTodayJobs((todayVisits.data || []).map((v: any) => ({
      id: v.id,
      job_title: v.platform_jobs?.title || v.title || "Visit",
      customer_name: v.platform_jobs?.platform_customers?.display_name || null,
      property_address: v.platform_properties ? `${v.platform_properties.address_1}, ${v.platform_properties.city}` : null,
      scheduled_start_time: v.scheduled_start_time,
      status: v.status,
    })));

    const paymentData = payments.data || [];
    const monthMap: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      monthMap[format(d, "MMM yyyy")] = 0;
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
      <div
        className="platform-dashboard-bg -m-4 md:-m-6 p-4 md:p-6"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 0%, rgba(34, 197, 94, 0.28) 0%, rgba(34, 197, 94, 0.08) 45%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 15% 40%, rgba(34, 197, 94, 0.12) 0%, transparent 60%),
            radial-gradient(ellipse 35% 25% at 85% 20%, rgba(34, 197, 94, 0.10) 0%, transparent 55%),
            #080d08
          `,
        }}
      >
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold" style={{ fontSize: "28px", letterSpacing: "-0.02em", color: "#fff" }}>
                Command Center
              </h1>
              <p className="font-body mt-0.5" style={{ fontSize: "13px", color: "hsl(220 8% 50%)" }}>
                {selectedBiz ? selectedBiz.public_brand_name : "All Businesses"} · Overview
              </p>
            </div>
            {!selectedBusinessId && isOwner && businesses.length > 1 && (
              <div className="flex gap-1.5">
                {businesses.map(b => <InlineBadge key={b.id} shortcode={b.shortcode} color={b.default_business_color} />)}
              </div>
            )}
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Total Revenue" value={`$${kpis.totalInvoiced.toLocaleString()}`} icon={TrendingUp} />
            <KPICard label="Collected" value={`$${kpis.totalCollected.toLocaleString()}`} icon={CreditCard} />
            <KPICard label="Outstanding" value={`$${kpis.outstandingBalance.toLocaleString()}`} icon={AlertTriangle} />
            <KPICard label="Jobs This Week" value={kpis.jobsThisWeek.toString()} icon={Briefcase} />
          </div>

          {/* Revenue Chart */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: "rgba(34,197,94,0.04)",
              border: "1px solid rgba(34,197,94,0.10)",
              borderRadius: "16px",
            }}
          >
            <div>
              <h3 className="font-display text-sm font-semibold tracking-tight" style={{ color: "#fff" }}>Revenue Trend</h3>
              <p className="font-body" style={{ fontSize: "11px", color: "hsl(220 8% 50%)" }}>Monthly collected revenue</p>
            </div>
            <div className="h-[280px] md:h-[320px]">
              {hasRevenueData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="month" tick={{ fill: "hsl(220 8% 50%)", fontSize: 11, fontFamily: "Outfit" }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} tickLine={false} tickFormatter={(v) => v.split(" ")[0]} />
                    <YAxis tick={{ fill: "hsl(220 8% 50%)", fontSize: 11, fontFamily: "Outfit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(v >= 1000 ? 1 : 0)}${v >= 1000 ? "k" : ""}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111811", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "8px", fontFamily: "Outfit", fontSize: "12px", color: "#fff" }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                      labelStyle={{ color: "hsl(220 8% 50%)", marginBottom: 4 }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#revenueGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <TrendingUp className="w-10 h-10 mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
                  <p className="font-body text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Revenue will appear here as invoices are paid</p>
                </div>
              )}
            </div>
          </div>

          {/* Today's Schedule */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(34,197,94,0.10)",
              borderRadius: "16px",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-semibold tracking-tight" style={{ color: "#fff" }}>Today's Schedule</h3>
                <p className="font-body" style={{ fontSize: "11px", color: "hsl(220 8% 50%)" }}>{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
              </div>
              <span className="font-body font-medium" style={{ fontSize: "11px", color: "#22c55e" }}>{todayJobs.length} visit{todayJobs.length !== 1 ? "s" : ""}</span>
            </div>

            {todayJobs.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.15)" }} />
                  <p className="font-body text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No jobs scheduled today</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {todayJobs.map(job => {
                  const statusInfo = VISIT_STATUS_COLORS[job.status] || VISIT_STATUS_COLORS.scheduled;
                  return (
                    <div
                      key={job.id}
                      className="flex-shrink-0 w-56 rounded-lg p-3 transition-colors cursor-pointer"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(34,197,94,0.08)",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(34,197,94,0.20)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(34,197,94,0.08)"; }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        {job.scheduled_start_time && (
                          <span className="flex items-center gap-1 font-body" style={{ fontSize: "11px", color: "hsl(220 8% 50%)" }}>
                            <Clock className="w-3 h-3" />
                            {job.scheduled_start_time.slice(0, 5)}
                          </span>
                        )}
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full font-body font-medium"
                          style={{ fontSize: "9px", backgroundColor: statusInfo.bg, color: statusInfo.text }}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="font-body text-sm font-medium truncate" style={{ color: "#fff" }}>{job.customer_name || job.job_title}</p>
                      {job.property_address && (
                        <p className="font-body truncate flex items-center gap-1 mt-0.5" style={{ fontSize: "11px", color: "hsl(220 8% 50%)" }}>
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

          {/* Business Comparison */}
          {!selectedBusinessId && isOwner && businesses.length > 1 && (
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(34,197,94,0.10)", borderRadius: "16px" }}>
              <h2 className="font-display text-sm font-semibold tracking-tight mb-4" style={{ color: "#fff" }}>Business Comparison</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businesses.map(biz => (
                  <div key={biz.id} className="rounded-lg p-4 space-y-3" style={{ border: "1px solid rgba(255,255,255,0.06)", borderLeftColor: biz.default_business_color || "#22c55e", borderLeftWidth: 3 }}>
                    <div className="flex items-center gap-2">
                      <InlineBadge shortcode={biz.shortcode} color={biz.default_business_color} />
                      <span className="font-display font-semibold tracking-tight" style={{ fontSize: "12px", color: "#fff" }}>{biz.public_brand_name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {["Revenue", "Jobs", "Leads"].map(l => (
                        <div key={l}>
                          <p className="font-body uppercase tracking-wider" style={{ fontSize: "10px", color: "hsl(220 8% 50%)" }}>{l}</p>
                          <p className="font-display text-lg font-bold tracking-tight" style={{ color: "hsl(220 8% 50%)" }}>—</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PlatformLayout>
  );
}
