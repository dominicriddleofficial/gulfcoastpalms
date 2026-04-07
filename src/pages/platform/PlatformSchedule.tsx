import { useEffect, useMemo, useState } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  RefreshCw,
  CalendarDays,
  FileText,
} from "lucide-react";
import {
  addDays,
  endOfDay,
  endOfWeek,
  format,
  isWithinInterval,
  isSameDay,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ViewMode = "day" | "week";

type JobberJob = {
  id: string;
  title: string | null;
  client_name: string | null;
  property_address: string | null;
  status: string;
  visit_status: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  total_amount: number | null;
  job_number: string | null;
  internal_notes: string | null;
  assigned_employee_names: string[] | null;
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  late: { bg: "#ef444420", text: "#ef4444", label: "Late" },
  today: { bg: "#22c55e20", text: "#22c55e", label: "Today" },
  scheduled: { bg: "#2563eb20", text: "#2563eb", label: "Scheduled" },
  completed: { bg: "#22c55e20", text: "#22c55e", label: "Completed" },
  upcoming: { bg: "#8b5cf620", text: "#8b5cf6", label: "Upcoming" },
};

function getStatusKey(job: JobberJob) {
  const status = (job.visit_status || job.status || "scheduled").toLowerCase();
  return STATUS_STYLES[status] ? status : "scheduled";
}

export default function PlatformSchedule() {
  const { selectedBusinessId, businesses } = usePlatformAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [jobs, setJobs] = useState<JobberJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobberJob | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("jobber_jobs")
      .select("id, title, client_name, property_address, status, visit_status, scheduled_start, scheduled_end, total_amount, job_number, internal_notes, assigned_employee_names")
      .order("scheduled_start", { ascending: true, nullsFirst: false });
    setJobs((data as JobberJob[]) || []);
    setLoading(false);
  };

  const fetchLastSync = async () => {
    const { data } = await supabase
      .from("sync_logs")
      .select("completed_at")
      .eq("status", "success")
      .in("sync_type", ["full", "jobs", "visits"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLastSyncTime(data?.completed_at || null);
  };

  useEffect(() => {
    fetchJobs();
    fetchLastSync();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("jobber-sync");
      if (error) throw error;
      toast.success("Jobber sync complete");
      await Promise.all([fetchJobs(), fetchLastSync()]);
    } catch (error: any) {
      toast.error(error.message || "Sync failed");
    }
    setSyncing(false);
  };

  const selectedRange = useMemo(() => {
    if (viewMode === "week") {
      return {
        start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
      };
    }

    return {
      start: startOfDay(selectedDate),
      end: endOfDay(selectedDate),
    };
  }, [selectedDate, viewMode]);

  const scheduledJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (!job.scheduled_start) return false;
      const start = new Date(job.scheduled_start);
      return isWithinInterval(start, { start: selectedRange.start, end: selectedRange.end });
    });
  }, [jobs, selectedRange]);

  const unscheduledJobs = useMemo(() => jobs.filter((job) => !job.scheduled_start), [jobs]);

  const groupedJobs = useMemo(() => {
    const groups: Record<string, JobberJob[]> = {};
    scheduledJobs.forEach((job) => {
      const key = job.scheduled_start ? format(new Date(job.scheduled_start), "yyyy-MM-dd") : "Unscheduled";
      if (!groups[key]) groups[key] = [];
      groups[key].push(job);
    });
    return groups;
  }, [scheduledJobs]);

  const selectedBiz = businesses.find((business) => business.id === selectedBusinessId);
  const syncLabel = lastSyncTime
    ? `${Math.max(1, Math.round((Date.now() - new Date(lastSyncTime).getTime()) / 60000))}m ago`
    : "waiting for first sync";

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-xl font-bold text-foreground">Schedule</h1>
              {selectedBiz && <InlineBadge shortcode={selectedBiz.shortcode} color={selectedBiz.default_business_color} />}
            </div>
            <p className="font-body text-xs text-muted-foreground">
              {scheduledJobs.length} synced Jobber jobs · Last synced {syncLabel}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="font-body text-xs gap-1.5"
            disabled={syncing}
            onClick={handleSync}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
            {syncing ? "Syncing…" : "Sync Now"}
          </Button>
        </div>

        <div className="flex items-center justify-between bg-card border border-border rounded-lg p-2">
          <button onClick={() => setSelectedDate((current) => subDays(current, viewMode === "week" ? 7 : 1))} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="font-body text-sm font-medium px-3 py-1 rounded-md transition-all text-foreground hover:text-primary"
          >
            {viewMode === "week"
              ? `${format(selectedRange.start, "MMM d")} – ${format(selectedRange.end, "MMM d, yyyy")}`
              : format(selectedDate, "EEEE, MMMM d, yyyy")}
          </button>
          <button onClick={() => setSelectedDate((current) => addDays(current, viewMode === "week" ? 7 : 1))} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-0.5 bg-card border border-border rounded-lg p-0.5 w-fit">
          {(["day", "week"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-body font-medium transition-all capitalize",
                viewMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-20 bg-card rounded-lg animate-pulse border border-border" />)}
          </div>
        ) : scheduledJobs.length === 0 && unscheduledJobs.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="font-body text-sm text-muted-foreground">No synced Jobber jobs available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedJobs).map(([dateKey, dateJobs]) => (
              <div key={dateKey} className="space-y-2">
                <h3 className="font-body text-xs text-muted-foreground uppercase tracking-wider">
                  {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
                </h3>
                <div className="space-y-1.5">
                  {dateJobs.map((job) => {
                    const statusKey = getStatusKey(job);
                    const style = STATUS_STYLES[statusKey] || STATUS_STYLES.scheduled;
                    return (
                      <button
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className="w-full bg-card border border-border rounded-lg p-3 hover:border-primary/20 transition-colors text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              {job.job_number && <span className="font-body text-[10px] text-muted-foreground font-mono">{job.job_number}</span>}
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-body font-medium capitalize"
                                style={{ backgroundColor: style.bg, color: style.text }}
                              >
                                {style.label}
                              </span>
                            </div>
                            <p className="font-body text-sm font-medium text-foreground truncate">{job.title || job.client_name || "Jobber Job"}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[11px] text-muted-foreground font-body">
                              {job.client_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{job.client_name}</span>}
                              {job.scheduled_start && (
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(job.scheduled_start), "h:mm a")}</span>
                              )}
                              {job.property_address && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{job.property_address}</span>}
                            </div>
                          </div>
                          {job.total_amount != null && job.total_amount > 0 && (
                            <span className="font-body text-sm font-semibold text-foreground shrink-0">${Number(job.total_amount).toLocaleString()}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {unscheduledJobs.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-body text-xs text-muted-foreground uppercase tracking-wider">Unscheduled</h3>
                <div className="space-y-1.5">
                  {unscheduledJobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className="w-full bg-card border border-border rounded-lg p-3 hover:border-primary/20 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-body text-sm font-medium text-foreground truncate">{job.title || job.client_name || "Jobber Job"}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[11px] text-muted-foreground font-body">
                            {job.client_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{job.client_name}</span>}
                            {job.property_address && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{job.property_address}</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Sheet open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <SheetContent className="ops-theme bg-background border-border w-full sm:max-w-lg overflow-y-auto">
          {selectedJob && <JobDetail job={selectedJob} />}
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}

function JobDetail({ job }: { job: JobberJob }) {
  return (
    <div className="space-y-5 pt-4">
      <SheetHeader>
        <SheetTitle className="font-display text-foreground flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm text-muted-foreground">{job.job_number || "No job #"}</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-body font-medium bg-primary/15 text-primary">
            {(job.visit_status || job.status || "scheduled").replace(/_/g, " ")}
          </span>
        </SheetTitle>
      </SheetHeader>

      <div>
        <h3 className="font-body text-lg font-semibold text-foreground">{job.title || "Untitled Job"}</h3>
        <p className="font-body text-xs text-muted-foreground mt-1">Live Jobber schedule item</p>
      </div>

      <div className="space-y-3">
        {job.client_name && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-body text-sm text-foreground">{job.client_name}</span>
          </div>
        )}
        {job.property_address && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="font-body text-sm text-foreground">{job.property_address}</span>
          </div>
        )}
        {job.scheduled_start && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-body text-sm text-foreground">
              {format(new Date(job.scheduled_start), "MMM d, yyyy · h:mm a")}
              {job.scheduled_end && ` – ${format(new Date(job.scheduled_end), "h:mm a")}`}
            </span>
          </div>
        )}
        {job.assigned_employee_names && job.assigned_employee_names.length > 0 && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-body text-sm text-foreground">{job.assigned_employee_names.join(", ")}</span>
          </div>
        )}
      </div>

      {job.internal_notes && (
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="font-body text-xs text-muted-foreground">Notes</p>
          </div>
          <p className="font-body text-sm text-foreground">{job.internal_notes}</p>
        </div>
      )}
    </div>
  );
}
