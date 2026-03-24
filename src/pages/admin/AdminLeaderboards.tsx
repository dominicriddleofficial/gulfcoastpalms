import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Briefcase, DollarSign, Crown } from "lucide-react";
import { startOfWeek, startOfMonth, format } from "date-fns";
import { cn } from "@/lib/utils";

const MEDAL_COLORS = ["text-yellow-500", "text-gray-400", "text-amber-700"];

export default function AdminLeaderboards() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("employees").select("*"),
      supabase.from("reviews").select("*"),
      supabase.from("leaderboard_rewards").select("*").order("created_at", { ascending: false }),
    ]).then(([e, r, rw]) => {
      setEmployees(e.data || []);
      setReviews(r.data || []);
      setRewards(rw.data || []);
      setLoading(false);
    });
  }, []);

  const now = new Date();
  const currentWeek = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-'W'ww");
  const currentMonth = format(startOfMonth(now), "yyyy-MM");

  const weeklyReviewBoard = useMemo(() => {
    const weekReviews = reviews.filter((r) => r.week_bucket === currentWeek);
    const counts: Record<string, number> = {};
    weekReviews.forEach((r) => { if (r.employee_name) counts[r.employee_name] = (counts[r.employee_name] || 0) + 1; });
    return Object.entries(counts).sort(([, a], [, b]) => b - a).map(([name, count]) => ({ name, count }));
  }, [reviews, currentWeek]);

  const monthlyReviewBoard = useMemo(() => {
    const monthReviews = reviews.filter((r) => r.month_bucket === currentMonth);
    const counts: Record<string, number> = {};
    monthReviews.forEach((r) => { if (r.employee_name) counts[r.employee_name] = (counts[r.employee_name] || 0) + 1; });
    return Object.entries(counts).sort(([, a], [, b]) => b - a).map(([name, count]) => ({ name, count }));
  }, [reviews, currentMonth]);

  const jobsBoard = useMemo(() => {
    return [...employees].sort((a, b) => (b.jobs_completed || 0) - (a.jobs_completed || 0)).filter((e) => e.jobs_completed > 0);
  }, [employees]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Leaderboards</h1>
          <p className="font-body text-sm text-muted-foreground">Track performance and reward top performers</p>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground font-body py-12">Loading...</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Weekly Review Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" /> Weekly Reviews
                </CardTitle>
                <p className="font-body text-xs text-muted-foreground">Week of {currentWeek}</p>
              </CardHeader>
              <CardContent>
                {weeklyReviewBoard.length === 0 ? (
                  <p className="font-body text-sm text-muted-foreground text-center py-4">No reviews this week yet.</p>
                ) : (
                  <div className="space-y-3">
                    {weeklyReviewBoard.map((entry, i) => (
                      <div key={entry.name} className={cn("flex items-center justify-between p-3 rounded-lg", i === 0 ? "bg-yellow-50 border border-yellow-200" : "bg-secondary")}>
                        <div className="flex items-center gap-3">
                          {i < 3 ? <Trophy className={cn("w-5 h-5", MEDAL_COLORS[i])} /> : <span className="w-5 text-center font-body text-sm text-muted-foreground">{i + 1}</span>}
                          <span className="font-body font-semibold">{entry.name}</span>
                        </div>
                        <span className="font-body font-bold text-lg">{entry.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Review Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" /> Monthly Reviews
                </CardTitle>
                <p className="font-body text-xs text-muted-foreground">{format(now, "MMMM yyyy")} · $100 reward for winner</p>
              </CardHeader>
              <CardContent>
                {monthlyReviewBoard.length === 0 ? (
                  <p className="font-body text-sm text-muted-foreground text-center py-4">No reviews this month yet.</p>
                ) : (
                  <div className="space-y-3">
                    {monthlyReviewBoard.map((entry, i) => (
                      <div key={entry.name} className={cn("flex items-center justify-between p-3 rounded-lg", i === 0 ? "bg-yellow-50 border border-yellow-200" : "bg-secondary")}>
                        <div className="flex items-center gap-3">
                          {i < 3 ? <Trophy className={cn("w-5 h-5", MEDAL_COLORS[i])} /> : <span className="w-5 text-center font-body text-sm text-muted-foreground">{i + 1}</span>}
                          <span className="font-body font-semibold">{entry.name}</span>
                          {i === 0 && <Badge className="bg-yellow-100 text-yellow-800 font-body text-[10px]">Leader</Badge>}
                        </div>
                        <span className="font-body font-bold text-lg">{entry.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Jobs Completed Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-green-500" /> Jobs Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jobsBoard.length === 0 ? (
                  <p className="font-body text-sm text-muted-foreground text-center py-4">No job data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {jobsBoard.map((emp, i) => (
                      <div key={emp.id} className={cn("flex items-center justify-between p-3 rounded-lg", i === 0 ? "bg-green-50 border border-green-200" : "bg-secondary")}>
                        <div className="flex items-center gap-3">
                          {i < 3 ? <Trophy className={cn("w-5 h-5", MEDAL_COLORS[i])} /> : <span className="w-5 text-center font-body text-sm text-muted-foreground">{i + 1}</span>}
                          <span className="font-body font-semibold">{emp.name}</span>
                        </div>
                        <span className="font-body font-bold text-lg">{emp.jobs_completed}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reward Tracker */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" /> Reward Tracker
                </CardTitle>
                <p className="font-body text-xs text-muted-foreground">$100 monthly review competition</p>
              </CardHeader>
              <CardContent>
                {rewards.length === 0 ? (
                  <p className="font-body text-sm text-muted-foreground text-center py-4">No rewards tracked yet.</p>
                ) : (
                  <div className="space-y-3">
                    {rewards.map((reward) => (
                      <div key={reward.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                        <div>
                          <p className="font-body font-semibold">{reward.employee_name}</p>
                          <p className="font-body text-xs text-muted-foreground">{reward.month} · ${reward.amount}</p>
                        </div>
                        <Badge className={cn("font-body text-xs",
                          reward.status === "paid" && "bg-green-100 text-green-800",
                          reward.status === "pending" && "bg-yellow-100 text-yellow-800",
                          reward.status === "eligible" && "bg-blue-100 text-blue-800",
                        )}>
                          {reward.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
