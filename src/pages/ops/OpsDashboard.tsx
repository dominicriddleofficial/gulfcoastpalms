import OpsLayout from "@/components/ops/OpsLayout";
import { Card, CardContent } from "@/components/ui/card";
import { MOCK_JOBS, getMockJobsForDate } from "@/lib/mock-ops-data";
import { startOfToday, format } from "date-fns";
import { Briefcase, CheckCircle2, Clock, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useOpsAuth } from "@/hooks/useOpsAuth";

export default function OpsDashboard() {
  const { isRookie } = useOpsAuth();
  const todayJobs = getMockJobsForDate(startOfToday());
  const completed = todayJobs.filter(j => j.visit_status === "completed");
  const upcoming = todayJobs.filter(j => j.visit_status !== "completed");

  const crewGroups: Record<string, typeof todayJobs> = {};
  todayJobs.forEach(j => {
    const crew = j.crew_id || "unassigned";
    if (!crewGroups[crew]) crewGroups[crew] = [];
    crewGroups[crew].push(j);
  });

  const stats = [
    { label: "Total Today", value: todayJobs.length, icon: Briefcase, color: "text-primary" },
    { label: "Completed", value: completed.length, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Upcoming", value: upcoming.length, icon: Clock, color: "text-amber-600" },
    { label: "Crews Active", value: Object.keys(crewGroups).length, icon: Users, color: "text-purple-600" },
  ];

  return (
    <OpsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="font-body text-sm text-muted-foreground">{format(startOfToday(), "EEEE, MMMM d, yyyy")}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(s => (
            <Card key={s.label} className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-secondary flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-foreground leading-none">{s.value}</p>
                  <p className="font-body text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to="/ops/today">
            <Card className="border-border hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-body font-semibold text-foreground">Today's Schedule</p>
                  <p className="font-body text-xs text-muted-foreground">{todayJobs.length} jobs · {upcoming.length} remaining</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/ops/week">
            <Card className="border-border hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-body font-semibold text-foreground">Weekly View</p>
                  <p className="font-body text-xs text-muted-foreground">{MOCK_JOBS.length} total jobs this week</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Jobs by crew */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold text-foreground">Jobs by Crew</h2>
          {Object.entries(crewGroups).map(([crewId, jobs]) => (
            <Card key={crewId} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-body font-semibold text-foreground">
                    {crewId === "crew-1" ? "Alpha Crew" : crewId === "crew-2" ? "Bravo Crew" : "Unassigned"}
                  </p>
                  <span className="font-body text-xs text-muted-foreground">{jobs.length} jobs</span>
                </div>
                <div className="space-y-1">
                  {jobs.map(j => (
                    <Link key={j.id} to={`/ops/job/${j.id}`} className="flex items-center justify-between py-1.5 hover:bg-muted/50 rounded px-2 -mx-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-body text-sm text-foreground truncate">{j.client_name}</span>
                        <span className="font-body text-xs text-muted-foreground">
                          {j.scheduled_start ? format(new Date(j.scheduled_start), "h:mm a") : "TBD"}
                        </span>
                      </div>
                      <span className={`text-xs font-body px-2 py-0.5 rounded-full ${
                        j.visit_status === "completed" ? "bg-emerald-100 text-emerald-700" :
                        j.visit_status === "on_site" ? "bg-purple-100 text-purple-700" :
                        j.visit_status === "en_route" ? "bg-amber-100 text-amber-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>{j.visit_status?.replace("_", " ")}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </OpsLayout>
  );
}
