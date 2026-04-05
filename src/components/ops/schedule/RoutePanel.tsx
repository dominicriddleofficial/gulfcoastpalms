import { ScheduleJob } from "@/hooks/useScheduleJobs";
import { Button } from "@/components/ui/button";
import { Route, RotateCcw, Navigation } from "lucide-react";

interface RoutePanelProps {
  jobs: ScheduleJob[];
  selectedCrew: string | null;
  crewNames: string[];
  ungeocodedCount: number;
}

export default function RoutePanel({ jobs, selectedCrew, crewNames, ungeocodedCount }: RoutePanelProps) {
  const crewsToShow = selectedCrew ? [selectedCrew] : crewNames;

  return (
    <div className="space-y-3">
      {crewsToShow.map(crew => {
        const crewJobs = jobs.filter(j =>
          (j.assigned_employee_names?.join(", ") || "Unassigned") === crew && j.lat && j.lng
        );
        return (
          <div key={crew} className="bg-card border border-border rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Route className="w-4 h-4 text-primary" />
                <span className="font-body font-semibold text-sm text-foreground truncate max-w-[180px]">{crew}</span>
              </div>
              <span className="text-xs font-body text-muted-foreground">{crewJobs.length} stops</span>
            </div>
            {crewJobs.length >= 2 && (
              <a
                href={buildMultiStopUrl(crewJobs)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-body text-primary hover:underline"
              >
                <Navigation className="w-3.5 h-3.5" /> Navigate entire route
              </a>
            )}
          </div>
        );
      })}

      {ungeocodedCount > 0 && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
          <p className="text-xs font-body text-destructive font-semibold">
            ⚠ {ungeocodedCount} job{ungeocodedCount > 1 ? "s" : ""} missing coordinates
          </p>
          <p className="text-xs font-body text-destructive/80 mt-1">
            These jobs cannot be shown on the map or included in routes.
          </p>
        </div>
      )}
    </div>
  );
}

function buildMultiStopUrl(jobs: ScheduleJob[]): string {
  const sorted = [...jobs].sort((a, b) => (a.routeOrder || 0) - (b.routeOrder || 0));
  const dest = sorted[sorted.length - 1];
  const waypoints = sorted.slice(0, -1).map(j => encodeURIComponent(j.property_address || `${j.lat},${j.lng}`));
  const destStr = encodeURIComponent(dest.property_address || `${dest.lat},${dest.lng}`);

  return `https://www.google.com/maps/dir/?api=1&destination=${destStr}&waypoints=${waypoints.join("|")}&travelmode=driving`;
}
