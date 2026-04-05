import OpsLayout from "@/components/ops/OpsLayout";
import JobCard from "@/components/ops/JobCard";
import { startOfToday, addDays, format, isSameDay } from "date-fns";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useJobberJobs } from "@/hooks/useJobberJobs";

export default function OpsWeek() {
  const [weekStart, setWeekStart] = useState(startOfToday());
  const { loading, getJobsForDate } = useJobberJobs();

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const jobsByDay = days.map(d => ({
    date: d,
    jobs: getJobsForDate(d)
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()),
  }));

  const displayJobs = selectedDay
    ? jobsByDay.find(d => isSameDay(d.date, selectedDay))?.jobs || []
    : null;

  return (
    <OpsLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Weekly Schedule {loading && <Loader2 className="w-4 h-4 animate-spin inline ml-1" />}
          </h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="font-body text-xs" onClick={() => { setWeekStart(startOfToday()); setSelectedDay(null); }}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Day pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {jobsByDay.map(({ date, jobs }) => {
            const isToday = isSameDay(date, startOfToday());
            const isSelected = selectedDay && isSameDay(date, selectedDay);
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDay(isSelected ? null : date)}
                className={cn(
                  "flex flex-col items-center min-w-[52px] px-2 py-2 rounded-xl font-body text-xs transition-colors shrink-0",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-card border border-border text-foreground hover:bg-secondary"
                )}
              >
                <span className="text-[10px] uppercase">{format(date, "EEE")}</span>
                <span className="text-lg font-semibold leading-tight">{format(date, "d")}</span>
                <span className={cn("text-[10px]", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {jobs.length} jobs
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected day detail */}
        {selectedDay ? (
          <div className="space-y-2">
            <h2 className="font-body font-semibold text-foreground">
              {format(selectedDay, "EEEE, MMMM d")}
            </h2>
            {displayJobs && displayJobs.length > 0 ? (
              displayJobs.map(j => (
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
              ))
            ) : (
              <p className="text-center py-8 font-body text-muted-foreground">No jobs scheduled</p>
            )}
          </div>
        ) : (
          /* Overview - all days */
          <div className="space-y-4">
            {jobsByDay.map(({ date, jobs }) => (
              <div key={date.toISOString()}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-body font-semibold text-sm text-foreground">
                    {isSameDay(date, startOfToday()) ? "Today" : format(date, "EEEE, MMM d")}
                  </h3>
                  <span className="font-body text-xs text-muted-foreground">({jobs.length})</span>
                </div>
                {jobs.length > 0 ? (
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
                        jobNumber={j.job_number}
                        compact
                      />
                    ))}
                  </div>
                ) : (
                  <p className="font-body text-xs text-muted-foreground py-2 pl-2">No jobs</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </OpsLayout>
  );
}
