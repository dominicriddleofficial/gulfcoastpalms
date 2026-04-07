import { useState, useMemo, useEffect } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { usePlatformSchedule, usePlatformCrewMembers, type PlatformJobVisit } from "@/hooks/usePlatformJobs";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft, ChevronRight, CalendarDays, List, Map as MapIcon,
  Clock, MapPin, User, Briefcase, Phone, Navigation, RefreshCw, Zap, Settings,
} from "lucide-react";
import { format, addDays, subDays, isToday, startOfWeek, addWeeks, eachDayOfInterval, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { toast } from "sonner";

type ViewMode = "day" | "week" | "list";
type ScheduleTab = "platform" | "jobber";

const VISIT_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  scheduled: { bg: "#2563eb20", text: "#2563eb", label: "Scheduled" },
  en_route: { bg: "#8b5cf620", text: "#8b5cf6", label: "En Route" },
  in_progress: { bg: "#f59e0b20", text: "#f59e0b", label: "In Progress" },
  completed: { bg: "#22c55e20", text: "#22c55e", label: "Completed" },
  skipped: { bg: "#6b728020", text: "#6b7280", label: "Skipped" },
  cancelled: { bg: "#ef444420", text: "#ef4444", label: "Cancelled" },
};

interface JobberJob {
  id: string;
  title: string | null;
  client_name: string | null;
  property_address: string | null;
  status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  total_amount: number | null;
  job_number: string | null;
  visit_status: string | null;
}

export default function PlatformSchedule() {
  const { selectedBusinessId, businesses } = usePlatformAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedCrew, setSelectedCrew] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<PlatformJobVisit | null>(null);
  const [scheduleTab, setScheduleTab] = useState<ScheduleTab>("platform");

  const { visits, loading, crewNames } = usePlatformSchedule(selectedBusinessId, selectedDate);
  const { crew } = usePlatformCrewMembers(selectedBusinessId);

  const filteredVisits = useMemo(() => {
    if (!selectedCrew) return visits;
    return visits.filter(v => v.crew_names?.includes(selectedCrew));
  }, [visits, selectedCrew]);

  const grouped = useMemo(() => {
    const g: Record<string, PlatformJobVisit[]> = {};
    filteredVisits.forEach(v => {
      const crewKey = v.crew_names && v.crew_names.length > 0 ? v.crew_names.join(", ") : "Unassigned";
      if (!g[crewKey]) g[crewKey] = [];
      g[crewKey].push(v);
    });
    Object.values(g).forEach(arr => arr.sort((a, b) => (a.route_order || 0) - (b.route_order || 0)));
    return g;
  }, [filteredVisits]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [selectedDate]);

  const getBiz = (bizId: string) => businesses.find(b => b.id === bizId);
  const crewColor = (name: string) => {
    const member = crew.find(c => c.display_name === name);
    return member?.color || "#22c55e";
  };

  return (
    <PlatformLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Schedule</h1>
            <p className="font-body text-xs text-muted-foreground">
              {scheduleTab === "platform" ? `${filteredVisits.length} visits · ${crewNames.length} crew` : "Jobber synced schedule"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Schedule source tabs */}
            <div className="flex items-center gap-0.5 bg-card border border-border rounded-lg p-0.5">
              <button
                onClick={() => setScheduleTab("platform")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-body font-medium transition-all",
                  scheduleTab === "platform" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Platform
              </button>
              <button
                onClick={() => setScheduleTab("jobber")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-body font-medium transition-all",
                  scheduleTab === "jobber" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Jobber
              </button>
            </div>
            {scheduleTab === "platform" && (
              <div className="flex items-center gap-0.5 bg-card border border-border rounded-lg p-0.5">
                {(["day", "week", "list"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-body font-medium transition-all capitalize",
                      viewMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {scheduleTab === "platform" ? (
          <>
            {/* Date nav */}
            <div className="flex items-center justify-between bg-card border border-border rounded-lg p-2">
              <button onClick={() => setSelectedDate(prev => subDays(prev, viewMode === "week" ? 7 : 1))} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className={cn(
                  "font-body text-sm font-medium px-3 py-1 rounded-md transition-all",
                  isToday(selectedDate) ? "text-primary" : "text-foreground hover:text-primary"
                )}
              >
                {viewMode === "week"
                  ? `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d, yyyy")}`
                  : format(selectedDate, "EEEE, MMMM d, yyyy")
                }
              </button>
              <button onClick={() => setSelectedDate(prev => addDays(prev, viewMode === "week" ? 7 : 1))} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Crew filter strip */}
            {crewNames.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setSelectedCrew(null)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-body font-medium whitespace-nowrap border transition-all",
                    !selectedCrew ? "bg-primary/15 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border"
                  )}
                >
                  All Crew
                </button>
                {crewNames.map(name => (
                  <button
                    key={name}
                    onClick={() => setSelectedCrew(selectedCrew === name ? null : name)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-body font-medium whitespace-nowrap border transition-all flex items-center gap-1.5",
                      selectedCrew === name ? "border-primary/30" : "bg-secondary text-muted-foreground border-border"
                    )}
                    style={selectedCrew === name ? { backgroundColor: crewColor(name) + "20", color: crewColor(name), borderColor: crewColor(name) + "40" } : {}}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: crewColor(name) }} />
                    {name}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-card rounded-lg animate-pulse border border-border" />)}
              </div>
            ) : viewMode === "week" ? (
              <WeekView
                weekDays={weekDays}
                selectedDate={selectedDate}
                onSelectDay={(d) => { setSelectedDate(d); setViewMode("day"); }}
                visits={filteredVisits}
              />
            ) : (
              <DayListView
                grouped={grouped}
                crewColor={crewColor}
                onSelectVisit={setSelectedVisit}
                selectedBusinessId={selectedBusinessId}
                getBiz={getBiz}
              />
            )}
          </>
        ) : (
          <JobberScheduleTab />
        )}
      </div>

      {/* Visit detail drawer */}
      <Sheet open={!!selectedVisit} onOpenChange={() => setSelectedVisit(null)}>
        <SheetContent className="ops-theme bg-background border-border w-full sm:max-w-lg overflow-y-auto">
          {selectedVisit && <VisitDetailPanel visit={selectedVisit} />}
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}

function JobberScheduleTab() {
  const [jobs, setJobs] = useState<JobberJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    fetchJobberJobs();
    fetchLastSync();
  }, []);

  const fetchJobberJobs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("jobber_jobs")
      .select("id, title, client_name, property_address, status, scheduled_start, scheduled_end, total_amount, job_number, visit_status")
      .order("scheduled_start", { ascending: true, nullsFirst: false })
      .limit(100);
    setJobs((data as JobberJob[]) || []);
    setLoading(false);
  };

  const fetchLastSync = async () => {
    const { data } = await supabase.from("sync_logs")
      .select("completed_at")
      .eq("status", "success")
      .order("started_at", { ascending: false })
      .limit(1);
    if (data?.[0]?.completed_at) setLastSyncTime(data[0].completed_at);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("jobber-sync");
      if (error) throw error;
      toast.success("Sync complete — refreshing schedule");
      await Promise.all([fetchJobberJobs(), fetchLastSync()]);
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    }
    setSyncing(false);
  };

  const timeSinceSync = lastSyncTime ? (() => {
    const mins = Math.round((Date.now() - new Date(lastSyncTime).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.round(mins / 60)}h ago`;
  })() : null;

  const statusColors: Record<string, string> = {
    active: "#22c55e", requires_invoicing: "#f59e0b", late: "#ef4444",
    completed: "#22c55e", scheduled: "#2563eb",
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-card rounded-lg animate-pulse border border-border" />)}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <Zap className="w-10 h-10 mx-auto text-muted-foreground/40" />
        <p className="font-body text-sm text-muted-foreground">Connect Jobber and sync to see your schedule here</p>
        <Link to="/platform/settings">
          <Button size="sm" variant="outline" className="font-body text-xs gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Go to Settings → Integrations
          </Button>
        </Link>
      </div>
    );
  }

  // Group by date
  const grouped: Record<string, JobberJob[]> = {};
  jobs.forEach(j => {
    const dateKey = j.scheduled_start ? format(new Date(j.scheduled_start), "yyyy-MM-dd") : "Unscheduled";
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(j);
  });

  return (
    <div className="space-y-4">
      <Button
        size="sm"
        variant="outline"
        className="font-body text-xs gap-1.5"
        disabled={syncing}
        onClick={handleSync}
      >
        <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
        {syncing ? "Syncing…" : "Sync to get latest schedule"}
      </Button>

      {Object.entries(grouped).map(([dateKey, dateJobs]) => (
        <div key={dateKey} className="space-y-2">
          <h3 className="font-body text-xs text-muted-foreground uppercase tracking-wider">
            {dateKey === "Unscheduled" ? "Unscheduled" : format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
          </h3>
          <div className="space-y-1.5">
            {dateJobs.map(job => {
              const sc = statusColors[job.status] || "#6b7280";
              return (
                <div key={job.id} className="bg-card border border-border rounded-lg p-3 hover:border-primary/20 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        {job.job_number && <span className="font-body text-[10px] text-muted-foreground font-mono">{job.job_number}</span>}
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-body font-medium capitalize"
                          style={{ backgroundColor: sc + "20", color: sc }}
                        >
                          {(job.visit_status || job.status).replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="font-body text-sm font-medium text-foreground truncate">{job.title || "Jobber Job"}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground font-body">
                        {job.client_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{job.client_name}</span>}
                        {job.scheduled_start && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(job.scheduled_start), "h:mm a")}
                          </span>
                        )}
                        {job.property_address && (
                          <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{job.property_address}</span>
                        )}
                      </div>
                    </div>
                    {job.total_amount != null && job.total_amount > 0 && (
                      <span className="font-body text-sm font-semibold text-foreground shrink-0">${Number(job.total_amount).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function WeekView({ weekDays, selectedDate, onSelectDay, visits }: {
  weekDays: Date[];
  selectedDate: Date;
  onSelectDay: (d: Date) => void;
  visits: PlatformJobVisit[];
}) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {weekDays.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayVisits = visits.filter(v => v.scheduled_date === dayStr);
        const today = isToday(day);
        const selected = isSameDay(day, selectedDate);

        return (
          <button
            key={dayStr}
            onClick={() => onSelectDay(day)}
            className={cn(
              "flex flex-col items-center p-2 rounded-lg border transition-all min-h-[80px]",
              selected ? "border-primary bg-primary/10" : today ? "border-primary/30 bg-card" : "border-border bg-card hover:border-primary/20"
            )}
          >
            <span className="font-body text-[10px] text-muted-foreground uppercase">{format(day, "EEE")}</span>
            <span className={cn("font-body text-lg font-semibold", today ? "text-primary" : "text-foreground")}>{format(day, "d")}</span>
            {dayVisits.length > 0 && (
              <span className="mt-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-body font-medium">
                {dayVisits.length}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DayListView({ grouped, crewColor, onSelectVisit, selectedBusinessId, getBiz }: {
  grouped: Record<string, PlatformJobVisit[]>;
  crewColor: (n: string) => string;
  onSelectVisit: (v: PlatformJobVisit) => void;
  selectedBusinessId: string | null;
  getBiz: (id: string) => any;
}) {
  if (Object.keys(grouped).length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
        <p className="font-body text-sm text-muted-foreground">No visits scheduled for this day</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([crewName, crewVisits]) => (
        <div key={crewName} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: crewColor(crewName) }} />
            <h3 className="font-body font-semibold text-sm text-foreground">{crewName}</h3>
            <span className="font-body text-xs text-muted-foreground font-mono">({crewVisits.length})</span>
          </div>
          <div className="space-y-1.5">
            {crewVisits.map((visit, idx) => {
              const statusInfo = VISIT_STATUS_COLORS[visit.status] || VISIT_STATUS_COLORS.scheduled;
              const biz = getBiz(visit.business_id);
              return (
                <button
                  key={visit.id}
                  onClick={() => onSelectVisit(visit)}
                  className="w-full text-left bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold font-mono mt-0.5"
                      style={{ backgroundColor: crewColor(crewName) + "20", color: crewColor(crewName) }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {visit.job_number && (
                          <span className="font-body text-[10px] text-muted-foreground font-mono">{visit.job_number}</span>
                        )}
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-body font-medium"
                          style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
                        >
                          {statusInfo.label}
                        </span>
                        {!selectedBusinessId && biz && (
                          <InlineBadge shortcode={biz.shortcode} color={biz.default_business_color} />
                        )}
                      </div>
                      <p className="font-body text-sm font-medium text-foreground truncate">
                        {visit.job_title || visit.customer_name || "Visit"}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground font-body">
                        {visit.scheduled_start_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {visit.scheduled_start_time.slice(0, 5)}
                            {visit.scheduled_end_time && ` – ${visit.scheduled_end_time.slice(0, 5)}`}
                          </span>
                        )}
                        {visit.property_address && (
                          <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{visit.property_address}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function VisitDetailPanel({ visit }: { visit: PlatformJobVisit }) {
  const statusInfo = VISIT_STATUS_COLORS[visit.status] || VISIT_STATUS_COLORS.scheduled;

  return (
    <div className="space-y-5 pt-4">
      <SheetHeader>
        <SheetTitle className="font-display text-foreground flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{visit.job_number}</span>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-body font-medium"
            style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
          >
            {statusInfo.label}
          </span>
        </SheetTitle>
      </SheetHeader>

      <div>
        <h3 className="font-body text-lg font-semibold text-foreground">{visit.job_title || "Visit"}</h3>
        <p className="font-body text-xs text-muted-foreground">Visit #{visit.visit_number}</p>
      </div>

      <div className="space-y-3">
        {visit.customer_name && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-body text-sm text-foreground">{visit.customer_name}</span>
          </div>
        )}
        {visit.property_address && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="font-body text-sm text-foreground">{visit.property_address}</span>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(visit.property_address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto"
            >
              <Navigation className="w-4 h-4 text-primary" />
            </a>
          </div>
        )}
        {visit.scheduled_start_time && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-body text-sm text-foreground">
              {visit.scheduled_start_time.slice(0, 5)}
              {visit.scheduled_end_time && ` – ${visit.scheduled_end_time.slice(0, 5)}`}
            </span>
          </div>
        )}
        {visit.crew_names && visit.crew_names.length > 0 && (
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <span className="font-body text-sm text-foreground">{visit.crew_names.join(", ")}</span>
          </div>
        )}
      </div>

      {visit.internal_notes && (
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="font-body text-xs text-muted-foreground mb-1">Notes</p>
          <p className="font-body text-sm text-foreground">{visit.internal_notes}</p>
        </div>
      )}

      {visit.completion_notes && (
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="font-body text-xs text-muted-foreground mb-1">Completion Notes</p>
          <p className="font-body text-sm text-foreground">{visit.completion_notes}</p>
        </div>
      )}
    </div>
  );
}
