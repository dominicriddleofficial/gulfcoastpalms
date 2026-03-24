import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Users, Trophy, Star, Briefcase, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminCrews() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("employees").select("*"),
      supabase.from("jobs").select("*"),
      supabase.from("reviews").select("*"),
      supabase.from("job_issues").select("*"),
    ]).then(([e, j, r, i]) => {
      setEmployees(e.data || []);
      setJobs(j.data || []);
      setReviews(r.data || []);
      setIssues(i.data || []);
      setLoading(false);
    });
  }, []);

  const crewData = useMemo(() => {
    return employees
      .filter(e => e.status === "active")
      .map(emp => {
        const empJobs = jobs.filter(j => j.assigned_employee === emp.name);
        const empReviews = reviews.filter(r => r.employee_name === emp.name);
        const empIssues = issues.filter(i => i.crew_involved === emp.name);
        const totalRev = empJobs.reduce((s, j) => s + (Number(j.revenue) || 0), 0);
        return {
          ...emp,
          jobCount: empJobs.length,
          reviewCount: empReviews.length,
          issueCount: empIssues.length,
          avgJobValue: empJobs.length > 0 ? totalRev / empJobs.length : 0,
          totalRevenue: totalRev,
        };
      })
      .sort((a, b) => b.jobCount - a.jobCount);
  }, [employees, jobs, reviews, issues]);

  const filtered = useMemo(() => {
    if (!search) return crewData;
    const q = search.toLowerCase();
    return crewData.filter(c => c.name.toLowerCase().includes(q));
  }, [crewData, search]);

  if (loading) return <AdminLayout><p className="text-center text-muted-foreground font-body py-12">Loading...</p></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Crews</h1>
          <p className="font-body text-sm text-muted-foreground">{crewData.length} active crew members</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search crew..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 font-body" />
        </div>

        <div className="grid gap-3">
          {filtered.map((crew, i) => (
            <Card key={crew.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-body text-sm font-bold",
                      i === 0 ? "bg-yellow-100 text-yellow-800" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-amber-100 text-amber-800" : "bg-secondary text-muted-foreground"
                    )}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-body font-semibold text-foreground">{crew.name}</p>
                      <p className="font-body text-xs text-muted-foreground capitalize">{crew.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-body">
                    <div className="text-center">
                      <p className="font-bold text-foreground">{crew.jobCount}</p>
                      <p className="text-[10px] text-muted-foreground">Jobs</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-foreground">{crew.reviewCount}</p>
                      <p className="text-[10px] text-muted-foreground">Reviews</p>
                    </div>
                    <div className="text-center">
                      <p className={cn("font-bold", crew.issueCount > 0 ? "text-red-600" : "text-foreground")}>{crew.issueCount}</p>
                      <p className="text-[10px] text-muted-foreground">Issues</p>
                    </div>
                    <div className="text-center hidden md:block">
                      <p className="font-bold text-foreground">${Math.round(crew.avgJobValue)}</p>
                      <p className="text-[10px] text-muted-foreground">Avg Value</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground font-body py-12">No crew members found.</p>}
        </div>
      </div>
    </AdminLayout>
  );
}
