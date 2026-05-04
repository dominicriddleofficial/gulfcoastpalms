import { useMemo, useState, useEffect, useCallback } from "react";
import RouteView from "@/components/platform/schedule/RouteView";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  FileText,
  Map,
  Phone,
  Navigation,
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

type ViewMode = "day" | "week";
type ScheduleTab = "jobber" | "map" | "route";

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
};

type MappedJob = JobberJob & { position: google.maps.LatLngLiteral };

const mapContainerStyle = { width: "100%", height: "100%" };
const defaultMapCenter = { lat: 30.4016, lng: -86.8636 };

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  late: { bg: "#ef444420", text: "#ef4444", label: "Late" },
  today: { bg: "rgba(var(--biz-accent-rgb),0.13)", text: "var(--accent-color)", label: "Today" },
  scheduled: { bg: "#2563eb20", text: "#2563eb", label: "Scheduled" },
  completed: { bg: "rgba(var(--biz-accent-rgb),0.13)", text: "var(--accent-color)", label: "Completed" },
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
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [scheduleTab, setScheduleTab] = useState<ScheduleTab>("jobber");
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
        .select("id, title, client_name, client_phone, property_address, status, visit_status, scheduled_start, scheduled_end, total_amount, job_number, internal_notes, assigned_employee_names, business_id")
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
    if (viewMode === "week") {
      return { start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) };
    }
    return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
  }, [selectedDate, viewMode]);

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

    return (
      <button
        key={job.id}
        onClick={() => setSelectedJob(job)}
        className="w-full bg-card border border-border rounded-lg p-3 hover:border-primary/20 transition-colors text-left"
        style={isCombined ? { borderLeftWidth: "4px", borderLeftColor: bizStyle!.border } : undefined}
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
              {isCombined && bizStyle && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-display font-bold tracking-tight"
                  style={{ backgroundColor: bizStyle.badge, color: bizStyle.badgeText }}
                >
                  {bizStyle.label}
                </span>
              )}
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

        {/* Schedule tab selector */}
        <div className="flex items-center gap-0.5 bg-card border border-border rounded-lg p-0.5 w-fit flex-wrap">
          {(["jobber", "map", "route"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setScheduleTab(tab)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-body font-medium transition-all capitalize flex items-center gap-1",
                scheduleTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "jobber" ? "Jobber" : tab === "map" ? "Map" : "Route"}
            </button>
          ))}
        </div>

        {/* Route tab content */}
        {scheduleTab === "map" ? (
          <PlatformScheduleMap jobs={scheduledJobs} mapsKey={mapsKey ?? null} onJobSelect={setSelectedJob} />
        ) : scheduleTab === "route" ? (
          <RouteView jobs={scheduledJobs} googleMapsKey={mapsKey ?? null} />
        ) : (
          <>
            {/* Date nav */}
            <div className="flex items-center justify-between bg-card border border-border rounded-lg p-2">
              <button onClick={() => setSelectedDate((d) => subDays(d, viewMode === "week" ? 7 : 1))} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setSelectedDate(new Date())} className="font-body text-sm font-medium px-3 py-1 rounded-md transition-all text-foreground hover:text-primary">
                {viewMode === "week"
                  ? `${format(selectedRange.start, "MMM d")} – ${format(selectedRange.end, "MMM d, yyyy")}`
                  : format(selectedDate, "EEEE, MMMM d, yyyy")}
              </button>
              <button onClick={() => setSelectedDate((d) => addDays(d, viewMode === "week" ? 7 : 1))} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day / Week toggle */}
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

            {/* Jobs list */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => <div key={item} className="h-20 bg-card rounded-lg animate-pulse border border-border" />)}
              </div>
            ) : scheduledJobs.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="font-body text-sm text-muted-foreground">No synced Jobber jobs for this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedJobs).map(([dateKey, dateJobs]) => (
                  <div key={dateKey} className="space-y-2">
                    <h3 className="font-body text-xs text-muted-foreground uppercase tracking-wider">
                      {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
                    </h3>
                    <div className="space-y-1.5">
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
        <SheetContent className="ops-theme bg-background border-border w-full sm:max-w-lg overflow-y-auto">
          {selectedJob && <JobDetail job={selectedJob} />}
        </SheetContent>
      </Sheet>
    </PlatformLayout>
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

function JobDetail({ job }: { job: JobberJob }) {
  return (
    <div className="space-y-5 pt-4">
      <SheetHeader>
        <SheetTitle className="font-display text-foreground flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm text-muted-foreground">{job.job_number ?? "No job #"}</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-body font-medium bg-primary/15 text-primary">
            {(job.visit_status ?? job.status ?? "scheduled").replace(/_/g, " ")}
          </span>
        </SheetTitle>
      </SheetHeader>

      <div>
        <h3 className="font-body text-lg font-semibold text-foreground">{job.title ?? "Untitled Job"}</h3>
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
              {job.scheduled_end ? ` – ${format(new Date(job.scheduled_end), "h:mm a")}` : ""}
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
