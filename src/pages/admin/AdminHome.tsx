import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, Star, Trophy, ClipboardList, Upload, TrendingUp, Clock } from "lucide-react";
import { startOfWeek, startOfMonth, format } from "date-fns";

export default function AdminHome() {
  const [stats, setStats] = useState({
    totalClients: 0, totalJobs: 0, jobsThisWeek: 0, jobsThisMonth: 0,
    totalReviews: 0, totalLeads: 0, newLeads: 0,
    topReviewEmployee: "—", topJobsEmployee: "—",
  });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const monthStart = startOfMonth(now).toISOString();

    const [clients, jobs, reviews, leads, employees] = await Promise.all([
      supabase.from("clients").select("id", { count: "exact", head: true }),
      supabase.from("jobs").select("*"),
      supabase.from("reviews").select("id", { count: "exact", head: true }),
      supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("employees").select("*"),
    ]);

    const allJobs = jobs.data || [];
    const allLeads = leads.data || [];
    const allEmployees = employees.data || [];

    const jobsThisWeek = allJobs.filter((j) => j.job_date && new Date(j.job_date) >= new Date(weekStart)).length;
    const jobsThisMonth = allJobs.filter((j) => j.job_date && new Date(j.job_date) >= new Date(monthStart)).length;

    const topByJobs = allEmployees.sort((a, b) => (b.jobs_completed || 0) - (a.jobs_completed || 0))[0];
    const topByReviews = allEmployees.sort((a, b) => (b.reviews_collected || 0) - (a.reviews_collected || 0))[0];

    setStats({
      totalClients: clients.count || 0,
      totalJobs: allJobs.length,
      jobsThisWeek,
      jobsThisMonth,
      totalReviews: reviews.count || 0,
      totalLeads: allLeads.length,
      newLeads: allLeads.filter((l) => l.status === "new").length,
      topReviewEmployee: topByReviews?.name || "—",
      topJobsEmployee: topByJobs?.name || "—",
    });
    setRecentLeads(allLeads.slice(0, 5));
  };

  const statCards = [
    { label: "Total Clients", value: stats.totalClients, icon: Users, color: "text-blue-500" },
    { label: "Total Jobs", value: stats.totalJobs, icon: Briefcase, color: "text-green-500" },
    { label: "Jobs This Week", value: stats.jobsThisWeek, icon: TrendingUp, color: "text-emerald-500" },
    { label: "Jobs This Month", value: stats.jobsThisMonth, icon: TrendingUp, color: "text-teal-500" },
    { label: "Total Reviews", value: stats.totalReviews, icon: Star, color: "text-yellow-500" },
    { label: "New Leads", value: stats.newLeads, icon: ClipboardList, color: "text-red-500" },
  ];

  const quickLinks = [
    { label: "Clients", path: "/admin/clients", icon: Users },
    { label: "Jobs", path: "/admin/jobs", icon: Briefcase },
    { label: "Leaderboards", path: "/admin/leaderboards", icon: Trophy },
    { label: "Upload CSV", path: "/admin/uploads", icon: Upload },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="font-body text-sm text-muted-foreground">Gulf Coast Palms Command Center</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="font-body text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="font-body text-2xl font-bold text-foreground">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top Performers */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-body text-sm text-muted-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" /> Top Employee by Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-xl font-bold">{stats.topReviewEmployee}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-body text-sm text-muted-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-green-500" /> Top Employee by Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-xl font-bold">{stats.topJobsEmployee}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links + Recent Leads */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="font-body text-sm">Quick Links</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {quickLinks.map((l) => (
                <Link
                  key={l.path}
                  to={l.path}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border font-body text-sm hover:bg-secondary transition-colors"
                >
                  <l.icon className="w-4 h-4 text-muted-foreground" /> {l.label}
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-body text-sm">Recent Leads</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recentLeads.length === 0 && <p className="text-muted-foreground text-sm font-body">No leads yet.</p>}
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div>
                    <p className="font-body text-sm font-medium">{lead.name}</p>
                    <p className="font-body text-xs text-muted-foreground">{lead.service || "General"}</p>
                  </div>
                  <span className="font-body text-xs text-muted-foreground">
                    {format(new Date(lead.created_at), "MMM d")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
