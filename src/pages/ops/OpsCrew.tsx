import OpsLayout from "@/components/ops/OpsLayout";
import { Card, CardContent } from "@/components/ui/card";
import { MOCK_JOBS, getMockJobsForDate } from "@/lib/mock-ops-data";
import { startOfToday, format } from "date-fns";
import { Users, Briefcase, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const CREWS = [
  { id: "crew-1", name: "Alpha Crew", members: ["Marcus Johnson", "Darius Lee"] },
  { id: "crew-2", name: "Bravo Crew", members: ["Tyler Smith", "Andre Williams"] },
];

export default function OpsCrew() {
  const todayJobs = getMockJobsForDate(startOfToday());

  return (
    <OpsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Crew View</h1>
          <p className="font-body text-sm text-muted-foreground">{format(startOfToday(), "EEEE, MMMM d")}</p>
        </div>

        {CREWS.map(crew => {
          const crewJobs = todayJobs.filter(j => j.crew_id === crew.id);
          const completed = crewJobs.filter(j => j.visit_status === "completed");

          return (
            <Card key={crew.id} className="border-border">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-body font-bold text-foreground">{crew.name}</h2>
                      <p className="font-body text-xs text-muted-foreground">{crew.members.join(", ")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-bold text-foreground">{crewJobs.length}</p>
                    <p className="font-body text-[10px] text-muted-foreground">jobs today</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${crewJobs.length ? (completed.length / crewJobs.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="font-body text-xs text-muted-foreground">
                    {completed.length}/{crewJobs.length}
                  </span>
                </div>

                {/* Job list */}
                <div className="space-y-1">
                  {crewJobs.map(j => (
                    <Link
                      key={j.id}
                      to={`/ops/job/${j.id}`}
                      className="flex items-center justify-between py-2 px-2 -mx-2 hover:bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {j.visit_status === "completed" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="font-body text-sm text-foreground truncate">{j.client_name}</span>
                      </div>
                      <span className="font-body text-xs text-muted-foreground shrink-0">
                        {j.scheduled_start ? format(new Date(j.scheduled_start), "h:mm a") : "TBD"}
                      </span>
                    </Link>
                  ))}
                  {crewJobs.length === 0 && (
                    <p className="font-body text-sm text-muted-foreground py-2">No jobs assigned today</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </OpsLayout>
  );
}
