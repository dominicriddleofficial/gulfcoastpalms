import { useMemo, useState, useEffect, useCallback } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { useGeocodedAddresses } from "@/hooks/useGeocodedJobs";
import { lightMapStyle, buildNumberedMarkerIcon, NUMBERED_MARKER_LABEL_STYLE } from "@/lib/map-styles";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  RefreshCw,
  CalendarDays,
  Map,
  Phone,
  Navigation,
  Truck,
  CheckCircle2,
  RotateCcw,
  ArrowLeft,
  MoreHorizontal,
  FileText,
  Mail,
  Star,
} from "lucide-react";
import {
  addDays,
  endOfDay,
  endOfWeek,
  format,
  isWithinInterval,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import { cn } from "@/lib/utils";
import { parseDateOnlyLocal } from "@/lib/localDate";
import { toast } from "sonner";
import { ContactCustomerSheet } from "@/components/platform/ContactCustomerSheet";
import { useVisitLifecycle, type VisitStatus } from "@/hooks/useVisitLifecycle";
import { OnMyWaySheet } from "@/components/platform/schedule/OnMyWaySheet";
import { ReviewMessageSheet } from "@/components/platform/schedule/ReviewMessageSheet";
import { ClockBar } from "@/components/platform/schedule/ClockBar";
import { CrewTab } from "@/components/platform/schedule/CrewTab";
import { MapTab, type MapTabJob } from "@/components/platform/schedule/MapTab";
import { TimesheetsView } from "@/components/platform/schedule/TimesheetsView";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useUserRole } from "@/hooks/useUserRole";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Pencil, Trash2 } from "lucide-react";
import YearlyTrimmingToggle from "@/components/platform/schedule/YearlyTrimmingToggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type ScheduleTab = "day" | "list" | "map" | "crew";

type JobberJob = {
  id: string;
  source: "platform" | "jobber_import" | "jobber_synced";
  jobber_id: string | null;
  visit_id: string | null;
  job_id: string | null;
  customer_email: string | null;
  address: string | null;
  title: string | null;
  customer_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  property_address: string | null;
  status: string;
  visit_status: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  total_amount: number | null;
  job_number: string | null;
  internal_notes: string | null;
  assigned_employee_names: string[] | null;
  business_id: string | null;
  property_id: string | null;
  service_items: ServiceItem[] | null;
};

type ServiceItem = {
  name?: string | null;
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total?: number | null;
};

type MappedJob = JobberJob & { position: google.maps.LatLngLiteral };

const mapContainerStyle = { width: "100%", height: "100%" };
const defaultMapCenter = { lat: 30.4016, lng: -86.8636 };

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  late: { bg: "#ef444420", text: "#ef4444", label: "Late" },
  today: { bg: "rgba(var(--biz-accent-rgb),0.13)", text: "var(--accent-color)", label: "Today" },
  scheduled: { bg: "#2563eb20", text: "#2563eb", label: "Scheduled" },
  on_my_way: { bg: "#f59e0b20", text: "#f59e0b", label: "On My Way" },
  on_site: { bg: "#0ea5e920", text: "#0ea5e9", label: "On Site" },
  in_progress: { bg: "#fb923c20", text: "#fb923c", label: "In Progress" },
  completed: { bg: "rgba(var(--biz-accent-rgb),0.13)", text: "var(--accent-color)", label: "Completed" },
  complete: { bg: "rgba(var(--biz-accent-rgb),0.13)", text: "var(--accent-color)", label: "Complete" },
  upcoming: { bg: "#8b5cf620", text: "#8b5cf6", label: "Upcoming" },
};

function getStatusKey(job: JobberJob) {
  const status = (job.visit_status || job.status || "scheduled").toLowerCase();
  return STATUS_STYLES[status] ? status : "scheduled";
}

const BIZ_COLORS: Record<string, { border: string; badge: string; badgeText: string; label: string }> = {
  "b0000000-0000-0000-0000-000000000001": { border: "var(--accent-color)", badge: "rgba(var(--biz-accent-rgb),0.15)", badgeText: "var(--accent-color)", label: "GCP" },
  "b0000000-0000-0000-0000-000000000002": { border: "#ffffff", badge: "rgba(255,255,255,0.12)", badgeText: "#ffffff", label: "PPS" },
};

function getBizStyle(businessId: string | null) {
  return BIZ_COLORS[businessId ?? ""] ?? { border: "#6b7280", badge: "rgba(107,114,128,0.15)", badgeText: "#6b7280", label: "?" };
}

export default function PlatformSchedule() {
  const { selectedBusinessId, businesses, userId } = usePlatformAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scheduleTab, setScheduleTab] = useState<ScheduleTab>("day");
  const [syncing, setSyncing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobberJob | null>(null);
  const [contactJob, setContactJob] = useState<JobberJob | null>(null);
  // When admin taps "View on Map" inside the Crew tab we jump to the Map tab
  // and focus on that crew member's pin / route trail.
  const [focusedCrewSessionId, setFocusedCrewSessionId] = useState<string | null>(null);
  const [showTimesheets, setShowTimesheets] = useState(false);
  const platformNavigate = useNavigate();

  const selectedRange = useMemo(() => {
    if (scheduleTab === "list") {
      return { start: startOfWeek(selectedDate, { weekStartsOn: 0 }), end: endOfWeek(selectedDate, { weekStartsOn: 0 }) };
    }
    return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
  }, [selectedDate, scheduleTab]);

  // Always fetch the full week containing selectedDate, so the week strip can show
  // per-day count dots without extra queries. Day/Map views then filter to the
  // selected day; List view uses the whole week.
  const weekRange = useMemo(
    () => ({
      start: startOfWeek(selectedDate, { weekStartsOn: 0 }),
      end: endOfWeek(selectedDate, { weekStartsOn: 0 }),
    }),
    [selectedDate],
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekRange.start, i)),
    [weekRange.start],
  );

  // Google Maps key for route view
  const { data: mapsKey, error: mapsKeyError } = useQuery({
    queryKey: ["google-maps-key"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("maps-config");
      if (error) throw error;
      if (!data?.apiKey) {
        throw new Error(data?.error || "Maps API key unavailable");
      }
      return data.apiKey as string;
    },
    // Prefetch immediately so switching to Map/Route is instant.
    staleTime: Infinity,
    retry: 2,
  });

  // Schedule rows come from a single server-side RPC that mirrors the dedupe
  // rules used by useDashboardScheduledJobs (platform + jobber_import + jobber_synced).
  const weekStartISO = weekRange.start.toISOString();
  const weekEndISO = weekRange.end.toISOString();
  const {
    data: jobberJobsRaw,
    isPending: loading,
    refetch: refetchJobs,
  } = useQuery({
    queryKey: ["schedule-jobs", selectedBusinessId, weekStartISO, weekEndISO],
    enabled: !!selectedBusinessId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_schedule_jobs", {
        p_business_id: selectedBusinessId as string,
        p_start: weekStartISO,
        p_end: weekEndISO,
      });
      if (error) throw error;
      return (data ?? []) as unknown as JobberJob[];
    },
  });
  const jobberJobs: JobberJob[] = jobberJobsRaw ?? [];

  // Per-day counts for the week strip indicators.
  const weekDayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const job of jobberJobs) {
      if (!job.scheduled_start) continue;
      const key = format(new Date(job.scheduled_start), "yyyy-MM-dd");
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [jobberJobs]);

  const { data: lastSyncTime, refetch: refetchSync } = useQuery({
    queryKey: ["schedule-last-sync"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sync_logs")
        .select("completed_at")
        .eq("status", "success")
        .in("sync_type", ["full", "jobs", "visits"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.completed_at ?? null;
    },
  });

  const activeJobs = jobberJobs;
  const isLoading = loading;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("jobber-sync", {
        body: { businessId: selectedBusinessId },
      });
      if (error) throw error;
      toast.success("Jobber sync complete");
      await Promise.all([refetchJobs(), refetchSync()]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync failed";
      toast.error(message);
    }
    setSyncing(false);
  };

  const scheduledJobs = useMemo(() => {
    return activeJobs.filter((job) => {
      if (!job.scheduled_start) return false;
      return isWithinInterval(new Date(job.scheduled_start), { start: selectedRange.start, end: selectedRange.end });
    });
  }, [activeJobs, selectedRange]);

  const groupedJobs = useMemo(() => {
    const groups: Record<string, JobberJob[]> = {};
    scheduledJobs.forEach((job) => {
      const key = job.scheduled_start ? format(new Date(job.scheduled_start), "yyyy-MM-dd") : "Unknown";
      if (!groups[key]) groups[key] = [];
      groups[key].push(job);
    });
    return groups;
  }, [scheduledJobs]);

  const selectedBiz = businesses.find((b) => b.id === selectedBusinessId);
  const scheduleSourceLabel = lastSyncTime
    ? "Using platform + imported schedule data"
    : "Using platform + historical schedule data";

  const renderJobCard = (job: JobberJob, isCombined: boolean) => {
    const statusKey = getStatusKey(job);
    const style = STATUS_STYLES[statusKey] ?? STATUS_STYLES.scheduled;
    const bizStyle = isCombined ? getBizStyle(job.business_id) : null;
    const isDone = statusKey === "completed" || statusKey === "complete";
    const isUrgent = statusKey === "late";
    const accentBar = isUrgent
      ? "#ef4444"
      : isDone
        ? "rgba(var(--biz-accent-rgb),0.45)"
        : "var(--accent-color)";

    return (
      <div
        key={job.id}
        className="w-full bg-card border border-border rounded-2xl hover:border-primary/30 transition-colors text-left flex items-stretch overflow-hidden shadow-sm"
        style={{
          borderLeftWidth: "6px",
          borderLeftColor: isCombined ? bizStyle!.border : accentBar,
          minHeight: 140,
        }}
      >
        <button
          onClick={() => setSelectedJob(job)}
          className="flex-1 min-w-0 p-5 text-left"
        >
          {/* Top row: job# / status / price */}
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {job.job_number && (
                <span className="font-mono text-[12px] text-muted-foreground/90 font-semibold">{job.job_number}</span>
              )}
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-body font-bold capitalize"
                style={{ backgroundColor: style.bg, color: style.text }}
              >
                {style.label}
              </span>
              {isCombined && bizStyle && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-display font-bold tracking-tight"
                  style={{ backgroundColor: bizStyle.badge, color: bizStyle.badgeText }}
                >
                  {bizStyle.label}
                </span>
              )}
            </div>
            {job.total_amount != null && job.total_amount > 0 && (
              <span className="font-display text-[20px] font-extrabold text-foreground tabular-nums">
                ${Number(job.total_amount).toLocaleString()}
              </span>
            )}
          </div>

          {/* Job title */}
          <p className="font-display text-[20px] leading-snug font-extrabold text-foreground mb-2 break-words">
            {job.title || job.client_name || "Jobber Job"}
          </p>

          {/* Detail rows */}
          <div className="space-y-1.5 font-body">
            {job.client_name && (
              <div className="flex items-center gap-2 text-[16px] font-bold text-foreground/95">
                <User className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                <span className="truncate">{job.client_name}</span>
              </div>
            )}
            {job.scheduled_start && (
              <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground/85">
                <Clock className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                <span>
                  {format(new Date(job.scheduled_start), "h:mm a")}
                  {job.scheduled_end && ` – ${format(new Date(job.scheduled_end), "h:mm a")}`}
                </span>
              </div>
            )}
            {job.property_address && (
              <div className="flex items-start gap-2 text-[15px] font-semibold text-foreground/85">
                <MapPin className="w-[18px] h-[18px] text-muted-foreground shrink-0 mt-0.5" />
                <span className="break-words">{job.property_address}</span>
              </div>
            )}
          </div>
        </button>
        <div className="flex flex-col border-l border-border">
          {(job.client_phone || job.client_name) && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setContactJob(job); }}
              aria-label={`Contact ${job.client_name ?? "customer"}`}
              className="flex items-center justify-center w-14 flex-1 min-h-[60px] text-foreground/80 hover:text-primary hover:bg-secondary/40 transition-colors"
            >
              <Phone className="w-[22px] h-[22px]" />
            </button>
          )}
          {job.property_address && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                const encoded = encodeURIComponent(job.property_address!);
                const url = isIOS
                  ? `maps://?daddr=${encoded}`
                  : `https://maps.apple.com/?daddr=${encoded}`;
                window.location.href = url;
              }}
              aria-label="Get directions"
              className="flex items-center justify-center w-14 flex-1 min-h-[60px] text-foreground/80 hover:text-primary hover:bg-secondary/40 transition-colors border-t border-border"
            >
              <Navigation className="w-[22px] h-[22px]" />
            </button>
          )}
        </div>
      </div>
    );
  };

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
              {scheduledJobs.length} jobs · {scheduleSourceLabel}
            </p>
          </div>
          <Button size="sm" variant="outline" className="font-body text-xs gap-1.5" disabled={syncing} onClick={handleSync}>
            <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
            {syncing ? "Syncing…" : "Sync Now"}
          </Button>
        </div>

        {/* Day / List / Map / Crew tab selector */}
        <div className="grid grid-cols-4 gap-1 bg-card border border-border rounded-xl p-1 w-full">
          {(["day", "list", "map", "crew"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setScheduleTab(tab)}
              className={cn(
                "px-3 py-2.5 rounded-lg text-sm font-body font-bold transition-all capitalize",
                scheduleTab === tab
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Week strip — Jobber-style tap-any-day navigation */}
        <div className="bg-card border border-border rounded-2xl p-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedDate((d) => subDays(d, 7))}
              className="p-2 rounded-lg hover:bg-secondary text-foreground/70 hover:text-primary transition-colors shrink-0"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="grid grid-cols-7 gap-1 flex-1">
              {weekDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const isSelected = format(selectedDate, "yyyy-MM-dd") === key;
                const isToday = format(new Date(), "yyyy-MM-dd") === key;
                const count = weekDayCounts[key] ?? 0;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "flex flex-col items-center justify-center py-2 rounded-xl transition-all min-h-[56px]",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground/80 hover:bg-secondary",
                    )}
                  >
                    <span className={cn("text-[10px] font-body font-bold uppercase tracking-wider", isSelected ? "opacity-90" : "text-muted-foreground")}>
                      {format(day, "EEEEE")}
                    </span>
                    <span className={cn("font-display text-base font-extrabold tabular-nums", isToday && !isSelected && "text-primary")}>
                      {format(day, "d")}
                    </span>
                    {count > 0 ? (
                      <span
                        className={cn(
                          "mt-0.5 text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-full tabular-nums",
                          isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/15 text-primary",
                        )}
                      >
                        {count}
                      </span>
                    ) : (
                      <span className="mt-0.5 h-[14px]" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setSelectedDate((d) => addDays(d, 7))}
              className="p-2 rounded-lg hover:bg-secondary text-foreground/70 hover:text-primary transition-colors shrink-0"
              aria-label="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clock-in bar — visible on day & list views */}
        {(scheduleTab === "day" || scheduleTab === "list") && (
          <ClockBar
            businessId={selectedBusinessId}
            userId={userId}
            date={selectedDate}
            jobCount={scheduledJobs.length}
          />
        )}

        {scheduleTab === "crew" ? (
          showTimesheets ? (
            <TimesheetsView
              businessId={selectedBusinessId}
              onClose={() => setShowTimesheets(false)}
            />
          ) : (
            <>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => platformNavigate("/platform/settings#crew-tracking")}
                >
                  <Truck className="w-4 h-4" /> Crew Settings
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setShowTimesheets(true)}
                >
                  <FileText className="w-4 h-4" /> Timesheets
                </Button>
              </div>
              <CrewTab
                businessId={selectedBusinessId}
                date={selectedDate}
                scheduledJobCount={scheduledJobs.length}
                onViewOnMap={(member) => {
                  setFocusedCrewSessionId(member.session_id);
                  setScheduleTab("map");
                }}
              />
            </>
          )
        ) : scheduleTab === "map" ? (
          <MapTab
            jobs={scheduledJobs as unknown as MapTabJob[]}
            mapsKey={mapsKey ?? null}
            keyError={mapsKeyError instanceof Error ? mapsKeyError.message : mapsKeyError ? String(mapsKeyError) : null}
            businessId={selectedBusinessId}
            date={selectedDate}
            focusedSessionId={focusedCrewSessionId}
            onJobOpen={(j) => setSelectedJob(j as unknown as JobberJob)}
            onContactCustomer={(j) => setContactJob(j as unknown as JobberJob)}
          />
        ) : (
          <>
            {/* Date nav — Jobber-style */}
            <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-2.5 gap-2">
              <button
                onClick={() => setSelectedDate((d) => subDays(d, scheduleTab === "list" ? 7 : 1))}
                className="p-3 rounded-xl hover:bg-secondary text-foreground/80 hover:text-primary transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex-1 font-display text-base sm:text-lg font-extrabold text-foreground hover:text-primary px-2 py-1 transition-colors text-center truncate"
                    aria-label="Jump to date"
                  >
                    {scheduleTab === "list"
                      ? `${format(selectedRange.start, "MMM d")} – ${format(selectedRange.end, "MMM d, yyyy")}`
                      : format(selectedDate, "EEE, MMM d, yyyy")}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-auto p-0 bg-card border-border">
                  <div className="p-2 flex items-center justify-between gap-2 border-b border-border">
                    <span className="font-body text-xs text-muted-foreground px-2">Jump to date</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 font-body text-xs"
                      onClick={() => setSelectedDate(new Date())}
                    >
                      Today
                    </Button>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                    defaultMonth={selectedDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <button
                onClick={() => setSelectedDate((d) => addDays(d, scheduleTab === "list" ? 7 : 1))}
                className="p-3 rounded-xl hover:bg-secondary text-foreground/80 hover:text-primary transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Jobs list */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => <div key={item} className="h-36 bg-card rounded-2xl animate-pulse border border-border" />)}
              </div>
            ) : scheduledJobs.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="font-body text-sm text-muted-foreground">No jobs scheduled for this period</p>
              </div>
            ) : (
              <div className="space-y-5">
                {Object.entries(groupedJobs).map(([dateKey, dateJobs]) => (
                  <div key={dateKey} className="space-y-3">
                    <DayHeader dateKey={dateKey} jobs={dateJobs} />
                    <div className="space-y-3">
                      {dateJobs.map((job) => renderJobCard(job, false))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Sheet open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <SheetContent className="ops-theme bg-background border-border w-full sm:max-w-lg overflow-y-auto p-0">
          {selectedJob && (
            <JobDetail
              job={selectedJob}
              businessId={selectedBusinessId}
              onContact={() => setContactJob(selectedJob)}
              onClose={() => setSelectedJob(null)}
              onJobChanged={(changes) => {
                setSelectedJob((current) => current && current.id === selectedJob.id ? { ...current, ...changes } : current);
                setContactJob((current) => current && current.id === selectedJob.id ? { ...current, ...changes } : current);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      <ContactCustomerSheet
        open={!!contactJob}
        onClose={() => setContactJob(null)}
        customer={{
          display_name: contactJob?.client_name ?? "Customer",
          phone: contactJob?.client_phone ?? null,
        }}
        job={{ address: contactJob?.property_address ?? null }}
      />
    </PlatformLayout>
  );
}

function DayHeader({ dateKey, jobs }: { dateKey: string; jobs: JobberJob[] }) {
  const total = jobs.length;
  const done = jobs.filter((j) => (j.visit_status ?? "").toLowerCase() === "complete").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-body text-xs text-muted-foreground uppercase tracking-wider">
          {format(parseDateOnlyLocal(dateKey), "EEEE, MMMM d, yyyy")}
        </h3>
        <span className="font-body text-[11px] font-semibold text-foreground tabular-nums">
          {done}/{total} done
        </span>
      </div>
      <div className="h-1 w-full bg-secondary/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PlatformScheduleMap({ jobs, mapsKey, onJobSelect }: { jobs: JobberJob[]; mapsKey: string | null; onJobSelect: (job: JobberJob) => void }) {
  const sorted = [...jobs].sort((a, b) => {
    if (!a.scheduled_start) return 1;
    if (!b.scheduled_start) return -1;
    return new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime();
  });

  const addresses = useMemo(
    () => sorted.map((j) => j.property_address).filter((a): a is string => Boolean(a)),
    [sorted]
  );
  const { coords, loading: geocoding } = useGeocodedAddresses(addresses);

  const mappedJobs = useMemo<MappedJob[]>(() => {
    return sorted
      .map((job) => {
        const position = job.property_address ? coords[job.property_address] : undefined;
        return position ? { ...job, position } : null;
      })
      .filter((job): job is MappedJob => Boolean(job));
  }, [sorted, coords]);

  const ungeocodedCount = sorted.length - mappedJobs.length;

  if (!mapsKey) {
    // Fallback: list view
    return (
      <div className="space-y-3">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <Map className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="font-body text-sm text-muted-foreground">Map unavailable — showing job list</p>
        </div>
        {sorted.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground text-center py-8">No jobs scheduled today</p>
        ) : (
          sorted.map((job, i) => (
            <div key={job.id} className="flex items-start gap-3 bg-card border border-border rounded-lg p-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-body font-bold flex items-center justify-center">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-body text-sm font-medium text-foreground truncate">{job.client_name || job.title || "Job"}</p>
                {job.property_address && <p className="font-body text-xs text-muted-foreground truncate">{job.property_address}</p>}
                {job.scheduled_start && <p className="font-body text-[11px] text-muted-foreground">{format(new Date(job.scheduled_start), "h:mm a")}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  const mapCenter = mappedJobs[0]?.position ?? defaultMapCenter;

  return (
    <div className="space-y-3">
      {(geocoding || ungeocodedCount > 0) && (
        <div className="font-body text-[11px] text-muted-foreground bg-card border border-border rounded-lg px-3 py-2">
          {geocoding ? "Geocoding addresses…" : `${mappedJobs.length} of ${sorted.length} jobs mapped${ungeocodedCount > 0 ? ` · ${ungeocodedCount} missing coordinates` : ""}`}
        </div>
      )}
      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-border" style={{ height: "45vh", minHeight: 280 }}>
        <PlatformScheduleGoogleMap mapsKey={mapsKey} mappedJobs={mappedJobs} mapCenter={mapCenter} onJobSelect={onJobSelect} />
      </div>

      {sorted.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground text-center py-4">No jobs scheduled today</p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((job, i) => {
            const statusKey = getStatusKey(job);
            const style = STATUS_STYLES[statusKey] ?? STATUS_STYLES.scheduled;
            return (
              <div key={job.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-body font-bold flex items-center justify-center">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-body text-sm font-medium text-foreground truncate">{job.client_name || job.title || "Job"}</p>
                  {job.property_address && <p className="font-body text-xs text-muted-foreground truncate">{job.property_address}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-body font-medium"
                    style={{ backgroundColor: style.bg, color: style.text }}
                  >
                    {style.label}
                  </span>
                  {job.scheduled_start && (
                    <span className="font-body text-xs text-muted-foreground">{format(new Date(job.scheduled_start), "h:mm a")}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlatformScheduleGoogleMap({ mapsKey, mappedJobs, mapCenter, onJobSelect }: { mapsKey: string; mappedJobs: MappedJob[]; mapCenter: google.maps.LatLngLiteral; onJobSelect: (job: JobberJob) => void }) {
  // Share loader id with RouteView so the Google Maps script only loads once
  // when the user switches between Map and Route tabs.
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: mapsKey, id: "platform-schedule-map" });
  const onMapLoad = useCallback((map: google.maps.Map) => {
    if (mappedJobs.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    mappedJobs.forEach((job) => bounds.extend(job.position));
    map.fitBounds(bounds, 56);
  }, [mappedJobs]);

  if (loadError) return <div className="h-full w-full bg-card flex items-center justify-center text-sm font-body text-muted-foreground">Map unavailable</div>;
  if (!isLoaded) return <div className="h-full w-full bg-card flex items-center justify-center text-sm font-body text-muted-foreground">Loading map…</div>;

  const markerIcon = buildNumberedMarkerIcon();

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={mapCenter}
      zoom={11}
      onLoad={onMapLoad}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: lightMapStyle,
        clickableIcons: false,
        backgroundColor: "#f5f5f5",
        gestureHandling: "greedy",
      }}
    >
      {mappedJobs.map((job, i) => (
        <MarkerF
          key={job.id}
          position={job.position}
          onClick={() => onJobSelect(job)}
          icon={markerIcon}
          label={{ ...NUMBERED_MARKER_LABEL_STYLE, text: String(i + 1) }}
        />
      ))}
    </GoogleMap>
  );
}

type JobDetailTab = "visit" | "details" | "notes";

function openAppleMaps(address: string) {
  const encoded = encodeURIComponent(address);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  window.location.href = isIOS
    ? `maps://?daddr=${encoded}`
    : `https://maps.apple.com/?daddr=${encoded}`;
}

function normalizeVisitStatus(status: string | null): VisitStatus {
  const s = (status ?? "scheduled").toLowerCase();
  if (s === "on_my_way" || s === "on_site" || s === "in_progress" || s === "complete") {
    return s;
  }
  return "scheduled";
}

function JobDetail({
  job,
  businessId,
  onContact,
  onClose,
  onJobChanged,
}: {
  job: JobberJob;
  businessId: string | null;
  onContact: () => void;
  onClose: () => void;
  onJobChanged: (changes: Partial<JobberJob>) => void;
}) {
  const [tab, setTab] = useState<JobDetailTab>("visit");
  const [omwOpen, setOmwOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const navigate = useNavigate();
  const { advance, reopen } = useVisitLifecycle();
  const { isStaff } = useUserRole();
  const qc = useQueryClient();
  const lifeStatus = normalizeVisitStatus(job.visit_status);
  const statusKey = getStatusKey(job);
  const statusInfo = STATUS_STYLES[statusKey];
  const bizStyle = getBizStyle(job.business_id);
  const items: ServiceItem[] = Array.isArray(job.service_items) ? job.service_items : [];
  const subtotal = items.reduce((sum, it) => {
    const t =
      typeof it.total === "number"
        ? it.total
        : (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
    return sum + (Number.isFinite(t) ? t : 0);
  }, 0);
  const total =
    typeof job.total_amount === "number" && job.total_amount > 0
      ? Number(job.total_amount)
      : subtotal;

  const customerName = job.client_name ?? "Customer";
  const serviceTitle = job.title ?? "Visit";
  const hasAddress = Boolean(job.property_address);
  const phone = job.client_phone ?? null;
  const instructions = job.internal_notes?.trim() ?? "";

  // Synthesize a fallback line item if no service_items but we have title/total/instructions
  const showSyntheticItem =
    items.length === 0 && (Boolean(job.title) || total > 0 || instructions.length > 0);

  const busy = advance.isPending || reopen.isPending || !businessId;

  const doAdvance = (next: VisitStatus, smsSent?: boolean) => {
    if (!businessId) return;
    advance.mutate({
      jobberJobId: job.job_id ?? job.id,
      visitId: job.visit_id ?? null,
      businessId,
      nextStatus: next,
      customerName: job.client_name,
      customerPhone: job.client_phone,
      smsSent,
    });
  };

  return (
    <div className="flex flex-col pb-8">
      {/* Sticky compact header bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="p-2 -ml-2 rounded-lg text-foreground/80 hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1.5">
          {phone && (
            <a
              href={`tel:${phone}`}
              aria-label="Call customer"
              className="p-2 rounded-lg text-foreground/80 hover:text-primary hover:bg-secondary/60 transition-colors"
            >
              <Phone className="w-5 h-5" />
            </a>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More options"
                className="p-2 rounded-lg text-foreground/80 hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border w-56">
              <DropdownMenuItem
                onClick={() => setRescheduleOpen(true)}
                disabled={!isStaff}
                className="gap-2"
              >
                <CalendarClock className="w-4 h-4" />
                Reschedule
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setEditOpen(true)}
                disabled={!isStaff}
                className="gap-2"
              >
                <Pencil className="w-4 h-4" />
                Edit visit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setReviewOpen(true)}
                disabled={!phone}
                className="gap-2"
              >
                <Star className="w-4 h-4" />
                Send review message
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                disabled={!isStaff}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Delete visit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-6">
      {/* Status / business / job# row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-body font-bold uppercase tracking-wide"
          style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
        >
          {statusInfo.label}
        </span>
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-body font-bold"
          style={{ backgroundColor: bizStyle.badge, color: bizStyle.badgeText }}
        >
          {bizStyle.label}
        </span>
        {job.job_number && (
          <span className="font-mono text-[12px] text-muted-foreground">
            #{job.job_number}
          </span>
        )}
      </div>

      {/* Main title */}
      <div className="space-y-1">
        <h2 className="font-display text-[28px] leading-tight font-extrabold text-foreground">
          Visit for {customerName}
        </h2>
        <p className="font-body text-[18px] font-semibold text-foreground/85">
          {serviceTitle}
        </p>
      </div>

      {/* Address */}
      {hasAddress && (
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <p className="font-body text-[17px] font-semibold text-foreground leading-snug">
            {job.property_address}
          </p>
        </div>
      )}

      {/* Schedule */}
      {job.scheduled_start && (
        <div className="flex items-start gap-3">
          <CalendarDays className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <p className="font-body text-[17px] font-semibold text-foreground">
            {format(new Date(job.scheduled_start), "EEE, MMM d · h:mm a")}
            {job.scheduled_end
              ? ` – ${format(new Date(job.scheduled_end), "h:mm a")}`
              : ""}
          </p>
        </div>
      )}

      {/* Yearly Trimming — prominent, near the top */}
      <YearlyTrimmingToggle
        customerId={(job as unknown as { customer_id?: string | null }).customer_id ?? null}
        jobberJobId={job.id}
        sourceJobId={(job as unknown as { job_id?: string | null }).job_id ?? null}
        customerName={job.client_name}
      />

      {/* Quick actions: Directions + Contact (single row, no duplicates) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={!hasAddress}
          onClick={() => job.property_address && openAppleMaps(job.property_address)}
          className="flex items-center justify-center gap-2 min-h-[56px] rounded-2xl bg-secondary/60 border border-border text-foreground font-body font-bold text-[15px] hover:bg-secondary/80 transition-colors disabled:opacity-40"
        >
          <Navigation className="w-5 h-5" />
          Directions
        </button>
        <button
          type="button"
          disabled={!phone && !job.client_name}
          onClick={onContact}
          className="flex items-center justify-center gap-2 min-h-[56px] rounded-2xl bg-secondary/60 border border-border text-foreground font-body font-bold text-[15px] hover:bg-secondary/80 transition-colors disabled:opacity-40"
        >
          <Phone className="w-5 h-5" />
          {phone ? "Contact" : "No phone"}
        </button>
      </div>

      {/* Visit lifecycle action buttons */}
      <div className="space-y-2">
        {(lifeStatus === "scheduled" || lifeStatus === "on_my_way" || lifeStatus === "on_site" || lifeStatus === "in_progress") && (
          <>
            {(lifeStatus === "scheduled") && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setOmwOpen(true)}
                className="w-full flex items-center justify-center gap-2 min-h-[60px] rounded-2xl bg-secondary text-foreground font-body font-bold text-[16px] hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                <Truck className="w-5 h-5" />
                On My Way
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => setCompleteOpen(true)}
              className="w-full flex items-center justify-center gap-2 min-h-[60px] rounded-2xl bg-primary text-primary-foreground font-body font-bold text-[16px] hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              Complete Visit
            </button>
          </>
        )}
        {lifeStatus === "complete" && (
          <>
            <div className="w-full flex items-center justify-center gap-2 min-h-[56px] rounded-2xl bg-primary/10 text-primary font-body font-bold text-[15px]">
              <CheckCircle2 className="w-5 h-5" />
              Visit completed
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => businessId && reopen.mutate({ jobberJobId: job.id, businessId })}
              className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-secondary/40 text-foreground font-body font-medium text-sm hover:bg-secondary/70 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Reopen visit
            </button>
          </>
        )}
        {/* Send Review Message — always visible; prominent when the visit is complete */}
        <button
          type="button"
          disabled={!phone}
          onClick={() => setReviewOpen(true)}
          className={
            lifeStatus === "complete"
              ? "w-full flex items-center justify-center gap-2 min-h-[56px] rounded-2xl bg-primary text-primary-foreground font-body font-bold text-[16px] hover:bg-primary/90 transition-colors disabled:opacity-50"
              : "w-full flex items-center justify-center gap-2 min-h-[52px] rounded-2xl border border-border bg-secondary/40 text-foreground font-body font-semibold text-[15px] hover:bg-secondary/70 transition-colors disabled:opacity-50"
          }
        >
          <Star className={lifeStatus === "complete" ? "w-5 h-5" : "w-4 h-4"} />
          {phone ? "Send Review Message" : "No phone for review"}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex items-center gap-1">
        {(["visit", "details", "notes"] as JobDetailTab[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "relative px-5 py-3 font-body text-[15px] capitalize transition-colors",
                active
                  ? "text-primary font-extrabold"
                  : "text-muted-foreground hover:text-foreground/80 font-semibold",
              )}
            >
              {t}
              {active && (
                <span className="absolute left-3 right-3 -bottom-px h-[3px] rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {tab === "visit" && (
        <div className="space-y-5">
          <DetailSection title="Instructions">
            <p className="font-body text-[15px] text-foreground/90 whitespace-pre-wrap">
              {instructions || "No instructions added."}
            </p>
          </DetailSection>

          <DetailSection title="Line Items">
            {items.length === 0 && !showSyntheticItem ? (
              <p className="font-body text-[14px] text-muted-foreground">
                No line items.
              </p>
            ) : items.length === 0 ? (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="font-body text-[15px] font-semibold text-foreground">
                      {job.title ?? "Service"}
                    </p>
                    {instructions && (
                      <p className="font-body text-[13px] text-muted-foreground line-clamp-2">
                        {instructions}
                      </p>
                    )}
                  </div>
                  {total > 0 && (
                    <p className="font-body text-[15px] font-bold text-foreground tabular-nums">
                      ${total.toFixed(2)}
                    </p>
                  )}
                </div>
                {total > 0 && (
                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">
                    <p className="font-body text-[16px] font-bold text-foreground">Total</p>
                    <p className="font-body text-[18px] font-extrabold text-foreground tabular-nums">
                      ${total.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((it, idx) => {
                  const qty = Number(it.quantity) || 0;
                  const unit = Number(it.unit_price) || 0;
                  const lineTotal =
                    typeof it.total === "number" ? it.total : qty * unit;
                  return (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 py-2 border-b border-border/60 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="font-body text-[15px] font-semibold text-foreground truncate">
                          {it.name ?? it.description ?? "Item"}
                        </p>
                        {qty > 0 && (
                          <p className="font-body text-[13px] text-muted-foreground">
                            {qty} × ${unit.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <p className="font-body text-[15px] font-bold text-foreground tabular-nums">
                        ${lineTotal.toFixed(2)}
                      </p>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">
                  <p className="font-body text-[16px] font-bold text-foreground">
                    Total
                  </p>
                  <p className="font-body text-[18px] font-extrabold text-foreground tabular-nums">
                    ${total.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </DetailSection>

          <DetailSection title="Team">
            {job.assigned_employee_names && job.assigned_employee_names.length > 0 ? (
              <div className="space-y-1">
                {job.assigned_employee_names.map((name) => (
                  <p key={name} className="font-body text-[15px] font-semibold text-foreground">
                    {name}
                  </p>
                ))}
              </div>
            ) : (
              <p className="font-body text-[14px] text-muted-foreground">No team assigned.</p>
            )}
          </DetailSection>

          <DetailSection title="Customer">
            <p className="font-body text-[16px] font-bold text-foreground">
              {customerName}
            </p>
            {job.client_phone && (
              <a
                href={`tel:${job.client_phone}`}
                className="font-body text-[14px] text-primary hover:underline block"
              >
                {job.client_phone}
              </a>
            )}
            {job.property_address && (
              <p className="font-body text-[13px] text-muted-foreground">
                {job.property_address}
              </p>
            )}
          </DetailSection>
        </div>
      )}

      {tab === "details" && (
        <div className="space-y-2">
          <DetailRow label="Job Number" value={job.job_number ?? "—"} mono />
          <DetailRow
            label="Status"
            value={(job.visit_status ?? job.status ?? "scheduled").replace(
              /_/g,
              " ",
            )}
          />
          <DetailRow label="Business" value={bizStyle.label} />
          <DetailRow label="Source" value="Jobber sync" />
          <DetailRow label="Jobber ID" value={job.id} mono />
          {total > 0 && (
            <DetailRow label="Total" value={`$${total.toFixed(2)}`} />
          )}
        </div>
      )}

      {tab === "notes" && (
        <div className="space-y-4">
          <DetailSection title="Internal Notes">
            <p className="font-body text-[15px] text-foreground/90 whitespace-pre-wrap">
              {instructions || "No notes added."}
            </p>
          </DetailSection>
        </div>
      )}
      </div>

      <OnMyWaySheet
        open={omwOpen}
        onClose={() => setOmwOpen(false)}
        customerName={job.client_name}
        customerPhone={job.client_phone}
        onConfirm={(smsSent) => doAdvance("on_my_way", smsSent)}
      />

      <ReviewMessageSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        customerName={job.client_name}
        customerPhone={job.client_phone}
        businessId={job.business_id ?? businessId}
      />

      <CompleteVisitSheet
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        onChoice={(choice) => {
          setCompleteOpen(false);
          if (choice === "cancel" || choice === "leave_open") return;
          doAdvance("complete");
          if (choice === "invoice_now") {
            const prefillItems = items.length > 0
              ? items.map(it => ({
                  description: it.description ?? it.name ?? "Service",
                  quantity: Number(it.quantity) || 1,
                  unit_price: Number(it.unit_price) || (Number(it.total) || 0),
                }))
              : showSyntheticItem
              ? [{
                  description: serviceTitle,
                  quantity: 1,
                  unit_price: total || 0,
                }]
              : [];
            const prefill = {
              customer: job.client_name
                ? {
                    id: job.customer_id ?? "",
                    display_name: job.client_name,
                    phone: job.client_phone ?? null,
                    email: job.customer_email ?? null,
                  }
                : null,
              items: prefillItems,
              fromJobId: job.source === "jobber_synced" ? undefined : job.job_id,
              serviceAddress: job.property_address || job.property_id
                ? (() => {
                    // Parse "123 Main St, City, ST 32501" into structured parts so
                    // the invoice form shows them prefilled instead of empty inputs.
                    const raw = job.property_address?.trim() ?? "";
                    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
                    let line1 = "", city = "", state = "", zip = "";
                    if (parts.length >= 3) {
                      line1 = parts[0];
                      city = parts[1];
                      const m = parts[2].match(/^([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)?/);
                      if (m) { state = m[1].toUpperCase(); zip = m[2] ?? ""; }
                      else { state = parts[2]; }
                    } else if (parts.length === 2) {
                      line1 = parts[0];
                      const m = parts[1].match(/^(.*?)\s+([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
                      if (m) { city = m[1]; state = m[2].toUpperCase(); zip = m[3] ?? ""; }
                      else { city = parts[1]; }
                    } else {
                      line1 = raw;
                    }
                    return {
                      line1,
                      city,
                      state,
                      zip,
                      formatted_address: raw,
                      property_id: job.property_id ?? null,
                    };
                  })()
                : null,
            };
            setTimeout(
              () => navigate("/platform/invoices/new", { state: { prefill } }),
              250,
            );
          }
        }}
      />

      <RescheduleSheet
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        job={job}
        onSaved={() => {
          setRescheduleOpen(false);
          // Fire-and-forget: do NOT await refetches — save button must release immediately.
          void qc.invalidateQueries({ queryKey: ["dashboard-scheduled-jobs"] });
          void qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
          void qc.invalidateQueries({ queryKey: ["schedule-jobs"] });
        }}
      />

      <EditJobSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        job={job}
        onSaved={(changes) => {
          onJobChanged(changes);
          setEditOpen(false);
          void qc.invalidateQueries({ queryKey: ["dashboard-scheduled-jobs"] });
          void qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
          void qc.invalidateQueries({ queryKey: ["schedule-jobs"] });
        }}
      />

      <DeleteJobDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        job={job}
        jobLabel={job.title ?? job.client_name ?? "this visit"}
        onDeleted={() => {
          setDeleteOpen(false);
          void qc.invalidateQueries({ queryKey: ["dashboard-scheduled-jobs"] });
          void qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
          void qc.invalidateQueries({ queryKey: ["schedule-jobs"] });
          onClose();
        }}
      />
    </div>
  );
}

function CompleteVisitSheet({
  open,
  onClose,
  onChoice,
}: {
  open: boolean;
  onClose: () => void;
  onChoice: (choice: "invoice_now" | "invoice_later" | "leave_open" | "cancel") => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="ops-theme bg-background border-t border-border rounded-t-2xl p-5 space-y-3"
      >
        <div className="space-y-1 text-left">
          <h3 className="font-display text-[20px] font-extrabold text-foreground">Complete visit</h3>
          <p className="font-body text-[14px] text-muted-foreground">
            What would you like to do next?
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChoice("invoice_now")}
          className="w-full flex items-center justify-between gap-3 min-h-[60px] px-4 rounded-2xl bg-primary text-primary-foreground font-body font-bold text-[15px] hover:bg-primary/90 transition-colors"
        >
          <span className="flex items-center gap-3">
            <FileText className="w-5 h-5" />
            Close job &amp; invoice now
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChoice("invoice_later")}
          className="w-full flex items-center justify-between gap-3 min-h-[60px] px-4 rounded-2xl bg-secondary text-foreground font-body font-bold text-[15px] hover:bg-secondary/80 transition-colors"
        >
          <span className="flex items-center gap-3">
            <Mail className="w-5 h-5" />
            Close job &amp; invoice later
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChoice("leave_open")}
          className="w-full flex items-center justify-between gap-3 min-h-[60px] px-4 rounded-2xl bg-secondary/60 text-foreground font-body font-semibold text-[15px] hover:bg-secondary/80 transition-colors"
        >
          <span className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5" />
            Leave job open
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChoice("cancel")}
          className="w-full flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-transparent text-muted-foreground font-body font-medium text-sm hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </SheetContent>
    </Sheet>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card/60 border border-border rounded-2xl p-5 space-y-3">
      <h4 className="font-display text-[13px] uppercase tracking-wider font-bold text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border/50 last:border-b-0">
      <p className="font-body text-[14px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-body text-[15px] font-semibold text-foreground capitalize",
          mono && "font-mono",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function RescheduleSheet({
  open,
  onClose,
  job,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  job: JobberJob;
  onSaved: () => void;
}) {
  const [start, setStart] = useState<string>(() => toLocalInputValue(job.scheduled_start));
  const [end, setEnd] = useState<string>(() => toLocalInputValue(job.scheduled_end));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStart(toLocalInputValue(job.scheduled_start));
      setEnd(toLocalInputValue(job.scheduled_end));
    }
  }, [open, job.scheduled_start, job.scheduled_end]);

  const handleSave = async () => {
    if (!start) {
      toast.error("Pick a start date and time");
      return;
    }
    setSaving(true);
    const startDate = new Date(start);
    const startIso = startDate.toISOString();
    const endDate = end ? new Date(end) : null;
    const endIso = endDate ? endDate.toISOString() : null;
    if (endIso && endDate && endDate <= startDate) {
      toast.error("End must be after start");
      setSaving(false);
      return;
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    const localDate = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
    const localStartTime = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}:00`;
    const localEndTime = endDate
      ? `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`
      : null;

    try {
      if (job.source === "jobber_synced") {
        // No platform mirror — update jobber_jobs (which schedule reads from).
        const { error, count } = await supabase
          .from("jobber_jobs")
          .update(
            { scheduled_start: startIso, scheduled_end: endIso },
            { count: "exact" },
          )
          .eq("id", job.id);
        if (error) {
          throw new Error(
            error.message?.toLowerCase().includes("policy")
              ? "RLS blocked schedule update."
              : error.message || "Unable to update schedule.",
          );
        }
        if (!count) throw new Error("Visit record missing.");
      } else {
        // platform OR jobber_import — source of truth lives in platform tables.
        if (!job.job_id) {
          throw new Error("Imported job needs local platform visit first.");
        }
        if (job.visit_id) {
          const { error: vErr, count: vCount } = await supabase
            .from("platform_job_visits")
            .update(
              {
                scheduled_date: localDate,
                scheduled_start_time: localStartTime,
                scheduled_end_time: localEndTime,
              },
              { count: "exact" },
            )
            .eq("id", job.visit_id);
          if (vErr) {
            throw new Error(
              vErr.message?.toLowerCase().includes("policy")
                ? "You do not have permission to reschedule this job."
                : vErr.message || "Unable to update schedule.",
            );
          }
          if (!vCount) throw new Error("Visit record missing.");
        }
        const { error: jErr } = await supabase
          .from("platform_jobs")
          .update({ scheduled_start: startIso, scheduled_end: endIso })
          .eq("id", job.job_id);
        if (jErr) {
          throw new Error(
            jErr.message?.toLowerCase().includes("policy")
              ? "You do not have permission to reschedule this job."
              : jErr.message || "Unable to update schedule.",
          );
        }
      }
      toast.success("Visit rescheduled");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to update schedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="ops-theme bg-background border-t border-border rounded-t-2xl p-5 space-y-4"
      >
        <div className="space-y-1">
          <h3 className="font-display text-[20px] font-extrabold text-foreground">Reschedule visit</h3>
          <p className="font-body text-[13px] text-muted-foreground">
            Updates the scheduled time on this Jobber visit.
          </p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="font-body text-[13px] text-muted-foreground">Start</Label>
            <Input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="bg-card border-border text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-[13px] text-muted-foreground">End (optional)</Label>
            <Input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="bg-card border-border text-foreground"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[52px] rounded-xl bg-secondary/60 text-foreground font-body font-semibold text-[15px] hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="min-h-[52px] rounded-xl bg-primary text-primary-foreground font-body font-bold text-[15px] hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EditJobSheet({
  open,
  onClose,
  job,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  job: JobberJob;
  onSaved: (changes: Partial<JobberJob>) => void;
}) {
  const [title, setTitle] = useState(job.title ?? "");
  const [notes, setNotes] = useState(job.internal_notes ?? "");
  const [price, setPrice] = useState(job.total_amount != null ? String(job.total_amount) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(job.title ?? "");
      setNotes(job.internal_notes ?? "");
      setPrice(job.total_amount != null ? String(job.total_amount) : "");
    }
  }, [open, job.title, job.internal_notes, job.total_amount]);

  const handleSave = async () => {
    const trimmedTitle = title.trim() || null;
    const trimmedNotes = notes.trim() || null;
    const trimmedPrice = price.trim();
    const parsedPrice = trimmedPrice === "" ? null : Number(trimmedPrice);
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      toast.error("Enter a valid job price");
      return;
    }

    setSaving(true);
    try {
      if (job.source === "jobber_synced") {
        const { error, count } = await supabase
          .from("jobber_jobs")
          .update(
            { title: trimmedTitle, internal_notes: trimmedNotes, total_amount: parsedPrice },
            { count: "exact" },
          )
          .eq("id", job.id);
        if (error) throw error;
        if (!count) throw new Error("Visit record missing.");
      } else {
        if (!job.job_id) throw new Error("Local job record missing.");

        const { error: jobError, count: jobCount } = await supabase
          .from("platform_jobs")
          .update(
            { title: trimmedTitle, internal_notes: trimmedNotes, total: parsedPrice },
            { count: "exact" },
          )
          .eq("id", job.job_id);
        if (jobError) throw jobError;
        if (!jobCount) throw new Error("Job record missing.");

        if (job.visit_id) {
          const { error: visitError, count: visitCount } = await supabase
            .from("platform_job_visits")
            .update(
              { title: trimmedTitle, internal_notes: trimmedNotes },
              { count: "exact" },
            )
            .eq("id", job.visit_id);
          if (visitError) throw visitError;
          if (!visitCount) throw new Error("Visit record missing.");
        }
      }

      toast.success("Visit updated");
      // Release the Save button BEFORE notifying the parent. The parent's
      // onSaved closes the sheet and invalidates the heavy
      // useDashboardScheduledJobs query mounted on PlatformSchedule (~6
      // chained Supabase queries), and the resulting synchronous re-render
      // can otherwise keep the button visibly stuck on "Saving…".
      setSaving(false);
      onSaved({ title: trimmedTitle, internal_notes: trimmedNotes, total_amount: parsedPrice });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="ops-theme bg-background border-t border-border rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-1">
          <h3 className="font-display text-[20px] font-extrabold text-foreground">Edit visit</h3>
          <p className="font-body text-[13px] text-muted-foreground">
            Updates the visit details used by the schedule and invoices.
          </p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="font-body text-[13px] text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-card border-border text-foreground"
              placeholder="Job title"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-[13px] text-muted-foreground">Job price</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="bg-card border-border text-foreground"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-[13px] text-muted-foreground">Instructions / notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-card border-border text-foreground min-h-[120px]"
              placeholder="Notes for the crew"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[52px] rounded-xl bg-secondary/60 text-foreground font-body font-semibold text-[15px] hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="min-h-[52px] rounded-xl bg-primary text-primary-foreground font-body font-bold text-[15px] hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DeleteJobDialog({
  open,
  onClose,
  job,
  jobLabel,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  job: JobberJob;
  jobLabel: string;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (job.source === "jobber_synced") {
        const { error, count } = await supabase
          .from("jobber_jobs")
          .update({ status: "deleted" }, { count: "exact" })
          .eq("id", job.id);
        if (error) throw error;
        if (!count) throw new Error("Visit record missing.");
      } else if (job.visit_id) {
        const { error, count } = await supabase
          .from("platform_job_visits")
          .delete({ count: "exact" })
          .eq("id", job.visit_id);
        if (error) throw error;
        if (!count) throw new Error("Visit record missing.");

        if (job.job_id) {
          const { count: remainingVisits, error: countError } = await supabase
            .from("platform_job_visits")
            .select("id", { count: "exact", head: true })
            .eq("job_id", job.job_id);
          if (countError) throw countError;
          if ((remainingVisits ?? 0) === 0) {
            const { error: jobError } = await supabase
              .from("platform_jobs")
              .update({ status: "deleted", deleted_at: new Date().toISOString() })
              .eq("id", job.job_id);
            if (jobError) throw jobError;
          }
        }
      } else if (job.job_id) {
        const { error, count } = await supabase
          .from("platform_jobs")
          .update({ status: "deleted", deleted_at: new Date().toISOString() }, { count: "exact" })
          .eq("id", job.job_id);
        if (error) throw error;
        if (!count) throw new Error("Job record missing.");
      } else {
        throw new Error("Visit record missing.");
      }

      toast.success("Visit deleted");
      onDeleted();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="ops-theme bg-background border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-foreground">Delete this visit?</AlertDialogTitle>
          <AlertDialogDescription className="font-body text-muted-foreground">
            This permanently removes "{jobLabel}" from your schedule. The next Jobber sync will re-add it
            if it still exists in Jobber.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-secondary/60 border-border text-foreground hover:bg-secondary/80">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
