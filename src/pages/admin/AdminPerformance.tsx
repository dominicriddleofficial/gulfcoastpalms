import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, MapPin, Wrench, Users, Trophy, DollarSign, Flame } from "lucide-react";
import { startOfWeek, startOfMonth, startOfYear, format, getDay } from "date-fns";
import { cn } from "@/lib/utils";

export default function AdminPerformance() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("jobs").select("*").then(({ data }) => {
      setJobs(data || []);
      setLoading(false);
    });
  }, []);

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);

  const metrics = useMemo(() => {
    const today = jobs.filter(j => j.job_date === todayStr);
    const week = jobs.filter(j => j.job_date && new Date(j.job_date) >= weekStart);
    const month = jobs.filter(j => j.job_date && new Date(j.job_date) >= monthStart);
    const year = jobs.filter(j => j.job_date && new Date(j.job_date) >= yearStart);

    const sum = (arr: any[]) => arr.reduce((s, j) => s + (Number(j.revenue) || 0), 0);

    // Group by day/week/month/year for "best" tracking
    const byDay: Record<string, any[]> = {};
    const byWeek: Record<string, any[]> = {};
    const byMonth: Record<string, any[]> = {};
    const byYear: Record<string, any[]> = {};

    jobs.forEach(j => {
      if (!j.job_date) return;
      const d = new Date(j.job_date);
      const dayKey = j.job_date;
      const weekKey = format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-'W'II");
      const monthKey = format(d, "yyyy-MM");
      const yearKey = format(d, "yyyy");
      byDay[dayKey] = [...(byDay[dayKey] || []), j];
      byWeek[weekKey] = [...(byWeek[weekKey] || []), j];
      byMonth[monthKey] = [...(byMonth[monthKey] || []), j];
      byYear[yearKey] = [...(byYear[yearKey] || []), j];
    });

    const best = (grouped: Record<string, any[]>, metric: "count" | "revenue") => {
      let bestKey = "";
      let bestVal = 0;
      Object.entries(grouped).forEach(([key, arr]) => {
        const val = metric === "count" ? arr.length : sum(arr);
        if (val > bestVal) { bestVal = val; bestKey = key; }
      });
      return { key: bestKey, value: bestVal, jobs: grouped[bestKey] || [] };
    };

    // By service type
    const byService: Record<string, number> = {};
    jobs.forEach(j => { if (j.service_line) byService[j.service_line] = (byService[j.service_line] || 0) + 1; });
    const topService = Object.entries(byService).sort(([,a],[,b]) => b - a)[0];

    // By city
    const byCity: Record<string, number> = {};
    jobs.forEach(j => { if (j.city) byCity[j.city] = (byCity[j.city] || 0) + 1; });
    const topCity = Object.entries(byCity).sort(([,a],[,b]) => b - a)[0];

    // By employee
    const byEmployee: Record<string, number> = {};
    jobs.forEach(j => { if (j.assigned_employee) byEmployee[j.assigned_employee] = (byEmployee[j.assigned_employee] || 0) + 1; });
    const topEmployee = Object.entries(byEmployee).sort(([,a],[,b]) => b - a)[0];

    return {
      today: { count: today.length, revenue: sum(today) },
      week: { count: week.length, revenue: sum(week) },
      month: { count: month.length, revenue: sum(month) },
      year: { count: year.length, revenue: sum(year) },
      allTime: { count: jobs.length, revenue: sum(jobs) },
      bestDayJobs: best(byDay, "count"),
      bestWeekJobs: best(byWeek, "count"),
      bestMonthJobs: best(byMonth, "count"),
      bestYearJobs: best(byYear, "count"),
      bestDayRevenue: best(byDay, "revenue"),
      bestWeekRevenue: best(byWeek, "revenue"),
      bestMonthRevenue: best(byMonth, "revenue"),
      bestYearRevenue: best(byYear, "revenue"),
      topService: topService ? { name: topService[0], count: topService[1] } : null,
      topCity: topCity ? { name: topCity[0], count: topCity[1] } : null,
      topEmployee: topEmployee ? { name: topEmployee[0], count: topEmployee[1] } : null,
      byService, byCity, byEmployee,
    };
  }, [jobs, todayStr]);

  if (loading) return <AdminLayout><p className="text-center text-muted-foreground font-body py-12">Loading...</p></AdminLayout>;

  const periodCards = [
    { label: "Today", jobs: metrics.today.count, rev: metrics.today.revenue, icon: Calendar },
    { label: "This Week", jobs: metrics.week.count, rev: metrics.week.revenue, icon: TrendingUp },
    { label: "This Month", jobs: metrics.month.count, rev: metrics.month.revenue, icon: TrendingUp },
    { label: "This Year", jobs: metrics.year.count, rev: metrics.year.revenue, icon: TrendingUp },
    { label: "All-Time", jobs: metrics.allTime.count, rev: metrics.allTime.revenue, icon: Trophy },
  ];

  const bestCards = [
    { label: "Best Day (Jobs)", value: metrics.bestDayJobs.value, when: metrics.bestDayJobs.key },
    { label: "Best Week (Jobs)", value: metrics.bestWeekJobs.value, when: metrics.bestWeekJobs.key },
    { label: "Best Month (Jobs)", value: metrics.bestMonthJobs.value, when: metrics.bestMonthJobs.key },
    { label: "Best Day (Revenue)", value: `$${metrics.bestDayRevenue.value.toLocaleString()}`, when: metrics.bestDayRevenue.key },
    { label: "Best Week (Revenue)", value: `$${metrics.bestWeekRevenue.value.toLocaleString()}`, when: metrics.bestWeekRevenue.key },
    { label: "Best Month (Revenue)", value: `$${metrics.bestMonthRevenue.value.toLocaleString()}`, when: metrics.bestMonthRevenue.key },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Performance</h1>
          <p className="font-body text-sm text-muted-foreground">Gulf Coast Palms performance analytics</p>
        </div>

        {/* Period Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {periodCards.map(({ label, jobs: count, rev, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="font-body text-xs text-muted-foreground">{label}</span>
                </div>
                <p className="font-body text-2xl font-bold text-foreground">{count}</p>
                <p className="font-body text-xs text-muted-foreground">jobs</p>
                {rev > 0 && <p className="font-body text-sm font-semibold text-green-600 mt-1">${rev.toLocaleString()}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.topService && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Wrench className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="font-body text-xs text-muted-foreground">Top Service</p>
                  <p className="font-body font-bold">{metrics.topService.name}</p>
                  <p className="font-body text-xs text-muted-foreground">{metrics.topService.count} jobs</p>
                </div>
              </CardContent>
            </Card>
          )}
          {metrics.topCity && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><MapPin className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="font-body text-xs text-muted-foreground">Top City</p>
                  <p className="font-body font-bold">{metrics.topCity.name}</p>
                  <p className="font-body text-xs text-muted-foreground">{metrics.topCity.count} jobs</p>
                </div>
              </CardContent>
            </Card>
          )}
          {metrics.topEmployee && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="font-body text-xs text-muted-foreground">Top Crew Lead</p>
                  <p className="font-body font-bold">{metrics.topEmployee.name}</p>
                  <p className="font-body text-xs text-muted-foreground">{metrics.topEmployee.count} jobs</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Best Performance Records */}
        <div>
          <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" /> Best Performance Records
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {bestCards.map(({ label, value, when }) => (
              <Card key={label} className="border-primary/20">
                <CardContent className="p-4">
                  <p className="font-body text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="font-body text-xl font-bold text-foreground">{value}</p>
                  {when && <p className="font-body text-[11px] text-muted-foreground mt-1">{when}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Breakdown Tables */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader><CardTitle className="font-body text-sm">By Service Type</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(metrics.byService).sort(([,a],[,b]) => b - a).slice(0, 10).map(([name, count]) => (
                <div key={name} className="flex justify-between items-center">
                  <span className="font-body text-sm truncate">{name}</span>
                  <Badge variant="secondary" className="font-body text-xs">{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-body text-sm">By City</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(metrics.byCity).sort(([,a],[,b]) => b - a).slice(0, 10).map(([name, count]) => (
                <div key={name} className="flex justify-between items-center">
                  <span className="font-body text-sm truncate">{name}</span>
                  <Badge variant="secondary" className="font-body text-xs">{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-body text-sm">By Employee</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(metrics.byEmployee).sort(([,a],[,b]) => b - a).slice(0, 10).map(([name, count]) => (
                <div key={name} className="flex justify-between items-center">
                  <span className="font-body text-sm truncate">{name}</span>
                  <Badge variant="secondary" className="font-body text-xs">{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
