import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Briefcase, Star, Trophy, ClipboardList, Upload, TrendingUp, Clock,
  MapPin, Wrench, Calendar, Flame, DollarSign,
} from "lucide-react";
import { startOfWeek, startOfMonth, startOfYear, format } from "date-fns";

export default function AdminHome() {
  const [stats, setStats] = useState<any>({});
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    const [clientsRes, jobsRes, reviewsRes, leadsRes, employeesRes] = await Promise.all([
      supabase.from("clients").select("id", { count: "exact", head: true }),
      supabase.from("jobs").select("*"),
      supabase.from("reviews").select("id, employee_name", { count: "exact" }),
      supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("employees").select("*"),
    ]);

    const allJobs = jobsRes.data || [];
    const allLeads = leadsRes.data || [];
    const allEmployees = employeesRes.data || [];
    const allReviews = reviewsRes.data || [];

    const jobsToday = allJobs.filter(j => j.job_date === todayStr).length;
    const jobsThisWeek = allJobs.filter(j => j.job_date && new Date(j.job_date) >= weekStart).length;
    const jobsThisMonth = allJobs.filter(j => j.job_date && new Date(j.job_date) >= monthStart).length;
    const jobsThisYear = allJobs.filter(j => j.job_date && new Date(j.job_date) >= yearStart).length;

    // Top city
    const cityCount: Record<string, number> = {};
    allJobs.forEach(j => { if (j.city) cityCount[j.city] = (cityCount[j.city] || 0) + 1; });
    const topCity = Object.entries(cityCount).sort(([,a],[,b]) => b - a)[0];

    // Top service
    const serviceCount: Record<string, number> = {};
    allJobs.forEach(j => { if (j.service_line) serviceCount[j.service_line] = (serviceCount[j.service_line] || 0) + 1; });
    const topService = Object.entries(serviceCount).sort(([,a],[,b]) => b - a)[0];

    // Top employee by reviews
    const revCount: Record<string, number> = {};
    allReviews.forEach(r => { if (r.employee_name) revCount[r.employee_name] = (revCount[r.employee_name] || 0) + 1; });
    const topReviewEmp = Object.entries(revCount).sort(([,a],[,b]) => b - a)[0];

    // Top employee by jobs
    const empJobCount: Record<string, number> = {};
    allJobs.forEach(j => { if (j.assigned_employee) empJobCount[j.assigned_employee] = (empJobCount[j.assigned_employee] || 0) + 1; });
    const topJobsEmp = Object.entries(empJobCount).sort(([,a],[,b]) => b - a)[0];

    // Best records
    const byDay: Record<string, number> = {};
    const byWeek: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    allJobs.forEach(j => {
      if (!j.job_date) return;
      const d = new Date(j.job_date);
      byDay[j.job_date] = (byDay[j.job_date] || 0) + 1;
      const wk = format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-'W'II");
      byWeek[wk] = (byWeek[wk] || 0) + 1;
      const mo = format(d, "yyyy-MM");
      byMonth[mo] = (byMonth[mo] || 0) + 1;
    });
    const bestOf = (obj: Record<string, number>) => {
      let best = { key: "—", val: 0 };
      Object.entries(obj).forEach(([k, v]) => { if (v > best.val) best = { key: k, val: v }; });
      return best;
    };

    setStats({
      totalClients: clientsRes.count || 0,
      totalJobs: allJobs.length,
      jobsToday, jobsThisWeek, jobsThisMonth, jobsThisYear,
      totalReviews: allReviews.length,
      newLeads: allLeads.filter(l => l.status === "new").length,
      topCity: topCity ? topCity[0] : "—",
      topService: topService ? topService[0] : "—",
      topReviewEmployee: topReviewEmp ? topReviewEmp[0] : "—",
      topJobsEmployee: topJobsEmp ? topJobsEmp[0] : "—",
      bestDay: bestOf(byDay),
      bestWeek: bestOf(byWeek),
      bestMonth: bestOf(byMonth),
    });
    setRecentLeads(allLeads.slice(0, 5));
    setLoading(false);
  };

  if (loading) return <AdminLayout><p className="text-center text-muted-foreground font-body py-12">Loading...</p></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="font-body text-sm text-muted-foreground">Gulf Coast Palms Command Center</p>
        </div>

        {/* Jobs Performance */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Today", value: stats.jobsToday, icon: Calendar, color: "text-blue-500" },
            { label: "This Week", value: stats.jobsThisWeek, icon: TrendingUp, color: "text-emerald-500" },
            { label: "This Month", value: stats.jobsThisMonth, icon: TrendingUp, color: "text-teal-500" },
            { label: "This Year", value: stats.jobsThisYear, icon: TrendingUp, color: "text-green-500" },
            { label: "All-Time", value: stats.totalJobs, icon: Briefcase, color: "text-foreground" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="font-body text-[11px] text-muted-foreground">{s.label}</span>
                </div>
                <p className="font-body text-2xl font-bold text-foreground">{s.value}</p>
                <p className="font-body text-[10px] text-muted-foreground">jobs</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top Insights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Top City", value: stats.topCity, icon: MapPin },
            { label: "Top Service", value: stats.topService, icon: Wrench },
            { label: "Top by Reviews", value: stats.topReviewEmployee, icon: Star },
            { label: "Top by Jobs", value: stats.topJobsEmployee, icon: Trophy },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="w-4 h-4 text-primary" />
                  <span className="font-body text-[11px] text-muted-foreground">{s.label}</span>
                </div>
                <p className="font-body text-sm font-bold text-foreground truncate">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Best Records */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Best Day", value: stats.bestDay?.val, when: stats.bestDay?.key },
            { label: "Best Week", value: stats.bestWeek?.val, when: stats.bestWeek?.key },
            { label: "Best Month", value: stats.bestMonth?.val, when: stats.bestMonth?.key },
          ].map(s => (
            <Card key={s.label} className="border-primary/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span className="font-body text-[11px] text-muted-foreground">{s.label}</span>
                </div>
                <p className="font-body text-xl font-bold text-foreground">{s.value} jobs</p>
                <p className="font-body text-[10px] text-muted-foreground">{s.when}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Links + Recent Leads */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="font-body text-sm">Quick Links</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { label: "Performance", path: "/admin/performance", icon: TrendingUp },
                { label: "Leaderboards", path: "/admin/leaderboards", icon: Trophy },
                { label: "Crews", path: "/admin/crews", icon: Users },
                { label: "Upload CSV", path: "/admin/uploads", icon: Upload },
              ].map(l => (
                <Link key={l.path} to={l.path} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border font-body text-sm hover:bg-secondary transition-colors">
                  <l.icon className="w-4 h-4 text-muted-foreground" /> {l.label}
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-body text-sm flex items-center justify-between">
                Recent Leads
                {stats.newLeads > 0 && <Badge className="bg-red-100 text-red-800 font-body text-[10px]">{stats.newLeads} new</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentLeads.length === 0 && <p className="text-muted-foreground text-sm font-body">No leads yet.</p>}
              {recentLeads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div>
                    <p className="font-body text-sm font-medium">{lead.name}</p>
                    <p className="font-body text-xs text-muted-foreground">{lead.service || "General"}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={`font-body text-[10px] ${lead.status === "new" ? "bg-blue-100 text-blue-800" : lead.status === "won" ? "bg-green-100 text-green-800" : "bg-secondary text-muted-foreground"}`}>{lead.status}</Badge>
                    <p className="font-body text-[10px] text-muted-foreground mt-0.5">{format(new Date(lead.created_at), "MMM d")}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-3 text-center">
            <p className="font-body text-2xl font-bold">{stats.totalClients}</p>
            <p className="font-body text-xs text-muted-foreground">Clients</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="font-body text-2xl font-bold">{stats.totalReviews}</p>
            <p className="font-body text-xs text-muted-foreground">Reviews</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="font-body text-2xl font-bold">{stats.newLeads}</p>
            <p className="font-body text-xs text-muted-foreground">New Leads</p>
          </CardContent></Card>
        </div>
      </div>
    </AdminLayout>
  );
}
