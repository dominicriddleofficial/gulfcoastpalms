import { useState } from "react";
import OpsLayout from "@/components/ops/OpsLayout";
import { useScheduleJobs } from "@/hooks/useScheduleJobs";
import { useGoogleMapsKey } from "@/hooks/useGoogleMapsKey";
import { useOpsAuth } from "@/hooks/useOpsAuth";
import CrewStrip from "@/components/ops/schedule/CrewStrip";
import ScheduleMap from "@/components/ops/schedule/ScheduleMap";
import ScheduleListView from "@/components/ops/schedule/ScheduleListView";
import RoutePanel from "@/components/ops/schedule/RoutePanel";
import JobDrawer from "@/components/ops/schedule/JobDrawer";
import { ScheduleJob } from "@/hooks/useScheduleJobs";
import { format, addDays, startOfToday } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, Map, List, CalendarDays, Route, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type ViewMode = "day" | "list" | "map";

export default function OpsSchedule() {
  const { isRookie, isManager, isAdmin } = useOpsAuth();
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [selectedCrew, setSelectedCrew] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<ScheduleJob | null>(null);
  const [showRoutes, setShowRoutes] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { jobs, loading, geocoding, crewNames, crewCounts, geocodedJobs, ungeocodedJobs } = useScheduleJobs(selectedDate);
  const { apiKey, loading: mapsLoading } = useGoogleMapsKey();

  // Apply filters
  const filtered = jobs.filter(j => {
    const crew = j.assigned_employee_names?.join(", ") || "Unassigned";
    if (selectedCrew && crew !== selectedCrew) return false;
    if (statusFilter !== "all" && j.visit_status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !j.client_name?.toLowerCase().includes(q) &&
        !j.property_address?.toLowerCase().includes(q) &&
        !j.job_number?.includes(q)
      ) return false;
    }
    return true;
  });

  const filteredGeocoded = filtered.filter(j => j.lat && j.lng);

  return (
    <OpsLayout>
      <div className="flex flex-col h-[calc(100vh-60px)] lg:h-[calc(100vh-24px)]">
        {/* Header */}
        <div className="px-1 pb-2 space-y-3 shrink-0">
          {/* Date controls */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Schedule</h1>
              <p className="font-body text-xs text-muted-foreground flex items-center gap-1">
                {format(selectedDate, "EEEE, MMMM d")} · {jobs.length} jobs
                {(loading || geocoding) && <Loader2 className="w-3 h-3 animate-spin" />}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="w-8 h-8"
                onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="font-body text-xs"
                onClick={() => setSelectedDate(startOfToday())}>
                Today
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            {([
              { mode: "day" as ViewMode, icon: CalendarDays, label: "Day" },
              { mode: "list" as ViewMode, icon: List, label: "List" },
              { mode: "map" as ViewMode, icon: Map, label: "Map" },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-body text-sm transition-colors",
                  viewMode === mode
                    ? "bg-card text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Crew strip */}
          {!isRookie && (
            <CrewStrip
              crewNames={crewNames}
              crewCounts={crewCounts}
              selectedCrew={selectedCrew}
              onSelectCrew={setSelectedCrew}
              totalJobs={jobs.length}
            />
          )}

          {/* Filters bar */}
          {!isRookie && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 font-body text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-9 font-body text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="en_route">En Route</SelectItem>
                  <SelectItem value="on_site">On Site</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              {viewMode === "map" && (
                <Button
                  variant={showRoutes ? "default" : "outline"}
                  size="sm"
                  className="h-9 font-body text-xs"
                  onClick={() => setShowRoutes(!showRoutes)}
                >
                  <Route className="w-3.5 h-3.5 mr-1" />
                  Routes
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 min-h-0 relative">
          {viewMode === "map" ? (
            apiKey ? (
              <div className="h-full rounded-xl overflow-hidden border border-border">
                <ScheduleMap
                  jobs={filteredGeocoded}
                  apiKey={apiKey}
                  selectedCrew={selectedCrew}
                  crewNames={crewNames}
                  onJobSelect={setSelectedJob}
                  showRoutes={showRoutes}
                />
              </div>
            ) : mapsLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="font-body text-sm text-destructive">Google Maps API key not configured</p>
              </div>
            )
          ) : viewMode === "list" ? (
            <div className="h-full overflow-y-auto pb-4">
              <ScheduleListView jobs={filtered} selectedCrew={selectedCrew} />
            </div>
          ) : (
            /* Day view - list + route panel side by side on larger screens */
            <div className="h-full overflow-y-auto pb-4 space-y-4">
              <RoutePanel
                jobs={filtered}
                selectedCrew={selectedCrew}
                crewNames={crewNames}
                ungeocodedCount={ungeocodedJobs.length}
              />
              <ScheduleListView jobs={filtered} selectedCrew={selectedCrew} />
            </div>
          )}
        </div>

        {/* Job drawer */}
        {selectedJob && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedJob(null)} />
            <JobDrawer job={selectedJob} onClose={() => setSelectedJob(null)} />
          </>
        )}
      </div>
    </OpsLayout>
  );
}
