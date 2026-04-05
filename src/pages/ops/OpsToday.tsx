import OpsLayout from "@/components/ops/OpsLayout";
import JobCard from "@/components/ops/JobCard";
import { startOfToday, format } from "date-fns";
import { useOpsAuth } from "@/hooks/useOpsAuth";
import { useJobberJobs } from "@/hooks/useJobberJobs";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OpsToday() {
  const { isRookie } = useOpsAuth();
  const { loading, getJobsForDate } = useJobberJobs();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [crewFilter, setCrewFilter] = useState("all");

  const todayJobs = getJobsForDate(startOfToday());

  const filtered = todayJobs.filter(j => {
    const matchSearch = !search ||
      j.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      j.property_address?.toLowerCase().includes(search.toLowerCase()) ||
      j.job_number?.includes(search);
    const matchStatus = statusFilter === "all" || j.visit_status === statusFilter;
    const matchCrew = crewFilter === "all" || j.crew_id === crewFilter;
    return matchSearch && matchStatus && matchCrew;
  });

  // Group by crew
  const grouped: Record<string, typeof filtered> = {};
  filtered.forEach(j => {
    const crewName = j.assigned_employee_names?.join(", ") || "Unassigned";
    if (!grouped[crewName]) grouped[crewName] = [];
    grouped[crewName].push(j);
  });

  // Sort each group by time
  Object.values(grouped).forEach(arr =>
    arr.sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
  );

  // Get unique crew groups for filter
  const crewNames = [...new Set(todayJobs.map(j => j.assigned_employee_names?.join(", ") || "Unassigned"))];

  return (
    <OpsLayout>
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Today's Schedule</h1>
          <p className="font-body text-sm text-muted-foreground">
            {format(startOfToday(), "EEEE, MMMM d")} · {todayJobs.length} jobs
          {loading && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
          </p>
        </div>

        {/* Filters */}
        {!isRookie && (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search client, address, job #..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-10 font-body"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 h-10 font-body">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="en_route">En Route</SelectItem>
                <SelectItem value="on_site">On Site</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={crewFilter} onValueChange={setCrewFilter}>
              <SelectTrigger className="w-full sm:w-40 h-10 font-body">
                <SelectValue placeholder="Crew" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Crews</SelectItem>
                {crewNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Job cards grouped by crew */}
        {Object.entries(grouped).length === 0 ? (
          <div className="text-center py-12">
            <p className="font-body text-muted-foreground">No jobs found</p>
          </div>
        ) : (
          Object.entries(grouped).map(([crewName, jobs]) => (
            <div key={crewName} className="space-y-2">
              {!isRookie && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <h2 className="font-body font-semibold text-sm text-foreground">{crewName}</h2>
                  <span className="font-body text-xs text-muted-foreground">({jobs.length})</span>
                </div>
              )}
              <div className="space-y-2">
                {jobs.map(j => (
                  <JobCard
                    key={j.id}
                    id={j.id}
                    title={j.title}
                    clientName={j.client_name}
                    clientPhone={j.client_phone}
                    propertyAddress={j.property_address}
                    scheduledStart={j.scheduled_start}
                    scheduledEnd={j.scheduled_end}
                    visitStatus={j.visit_status}
                    assignedEmployeeNames={j.assigned_employee_names}
                    internalNotes={j.internal_notes}
                    jobNumber={j.job_number}
                    serviceItems={j.service_items}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </OpsLayout>
  );
}
