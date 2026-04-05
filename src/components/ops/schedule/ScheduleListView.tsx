import { ScheduleJob } from "@/hooks/useScheduleJobs";
import JobCard from "@/components/ops/JobCard";

interface ScheduleListViewProps {
  jobs: ScheduleJob[];
}

export default function ScheduleListView({ jobs }: ScheduleListViewProps) {
  // Group by crew
  const grouped: Record<string, ScheduleJob[]> = {};
  jobs.forEach(j => {
    const crew = j.assigned_employee_names?.join(", ") || "Unassigned";
    if (!grouped[crew]) grouped[crew] = [];
    grouped[crew].push(j);
  });

  Object.values(grouped).forEach(arr =>
    arr.sort((a, b) => (a.routeOrder || 0) - (b.routeOrder || 0))
  );

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-body text-muted-foreground">No jobs scheduled for this day</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([crewName, crewJobs]) => (
        <div key={crewName} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <h2 className="font-body font-semibold text-sm text-foreground">{crewName}</h2>
            <span className="font-body text-xs text-muted-foreground">({crewJobs.length})</span>
          </div>
          <div className="space-y-2">
            {crewJobs.map((j, idx) => (
              <div key={j.id} className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-3">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <JobCard
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
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
