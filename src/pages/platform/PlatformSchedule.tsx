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
  Play,
  CheckCircle2,
  RotateCcw,
  ArrowLeft,
  MoreHorizontal,
  FileText,
  Mail,
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
import { toast } from "sonner";
import { ContactCustomerSheet } from "@/components/platform/ContactCustomerSheet";
import { useVisitLifecycle, type VisitStatus } from "@/hooks/useVisitLifecycle";
import { OnMyWaySheet } from "@/components/platform/schedule/OnMyWaySheet";
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

type ScheduleTab = "day" | "list" | "map";

type JobberJob = {
  id: string;
  title: string | null;
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
  const { selectedBusinessId, businesses } = usePlatformAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scheduleTab, setScheduleTab] = useState<ScheduleTab>("day");
  const [syncing, setSyncing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobberJob | null>(null);
  const [contactJob, setContactJob] = useState<JobberJob | null>(null);

  // Google Maps key for route view
  const { data: mapsKey } = useQuery({
    queryKey: ["google-maps-key"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("maps-config");
      return data?.apiKey || null;
    },
    // Prefetch immediately so switching to Map/Route is instant.
    staleTime: Infinity,
  });

  // Jobber tab — scoped to active business, only scheduled jobs
  const { data: jobberJobs = [], isLoading: loading, refetch: refetchJobs } = useQuery({
    queryKey: ["schedule-jobber", selectedBusinessId],
    queryFn: async () => {
      let q = supabase
        .from("jobber_jobs")
        .select("id, title, client_name, client_phone, property_address, status, visit_status, scheduled_start, scheduled_end, total_amount, job_number, internal_notes, assigned_employee_names, business_id, service_items")
        .not("scheduled_start", "is", null)
        .order("scheduled_start", { ascending: true, nullsFirst: false });
      if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
      const { data } = await q;
      return (data as JobberJob[]) ?? [];
    },
  });

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

  const selectedRange = useMemo(() => {
    if (scheduleTab === "list") {
      return { start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) };
    }
    return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
  }, [selectedDate, scheduleTab]);

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
  const syncLabel = lastSyncTime
    ? `${Math.max(1, Math.round((Date.now() - new Date(lastSyncTime).getTime()) / 60000))}m ago`
    : "waiting for first sync";

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
              {scheduledJobs.length} synced Jobber jobs · Last synced {syncLabel}
            </p>
          </div>
          <Button size="sm" variant="outline" className="font-body text-xs gap-1.5" disabled={syncing} onClick={handleSync}>
            <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
            {syncing ? "Syncing…" : "Sync Now"}
          </Button>
        </div>

        {/* Day / List / Map tab selector */}
        <div className="grid grid-cols-3 gap-1 bg-card border border-border rounded-xl p-1 w-full">
          {(["day", "list", "map"] as const).map((tab) => (
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

        {scheduleTab === "map" ? (
          <PlatformScheduleMap jobs={scheduledJobs} mapsKey={mapsKey ?? null} onJobSelect={setSelectedJob} />
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
              <button
                onClick={() => setSelectedDate(new Date())}
                className="flex-1 font-display text-base sm:text-lg font-extrabold text-foreground hover:text-primary px-2 py-1 transition-colors text-center truncate"
              >
                {scheduleTab === "list"
                  ? `${format(selectedRange.start, "MMM d")} – ${format(selectedRange.end, "MMM d, yyyy")}`
                  : format(selectedDate, "EEE, MMM d, yyyy")}
              </button>
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
                <p className="font-body text-sm text-muted-foreground">No synced Jobber jobs for this period</p>
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
          {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
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
}: {
  job: JobberJob;
  businessId: string | null;
  onContact: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<JobDetailTab>("visit");
  const [omwOpen, setOmwOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const navigate = useNavigate();
  const { advance, reopen } = useVisitLifecycle();
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
      jobberJobId: job.id,
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
          <button
            type="button"
            onClick={onContact}
            aria-label="More options"
            className="p-2 rounded-lg text-foreground/80 hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
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
            {(lifeStatus === "scheduled" || lifeStatus === "on_my_way" || lifeStatus === "on_site") && (
              <button
                type="button"
                disabled={busy}
                onClick={() => doAdvance("in_progress")}
                className="w-full flex items-center justify-center gap-2 min-h-[60px] rounded-2xl bg-primary text-primary-foreground font-body font-bold text-[16px] hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Play className="w-5 h-5" />
                Start Visit
              </button>
            )}
            {lifeStatus === "in_progress" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setCompleteOpen(true)}
                className="w-full flex items-center justify-center gap-2 min-h-[60px] rounded-2xl bg-primary text-primary-foreground font-body font-bold text-[16px] hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                Complete Visit
              </button>
            )}
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

      <CompleteVisitSheet
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        onChoice={(choice) => {
          setCompleteOpen(false);
          if (choice === "cancel" || choice === "leave_open") return;
          doAdvance("complete");
          if (choice === "invoice_now") {
            setTimeout(() => navigate("/platform/invoices/new"), 250);
          }
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
