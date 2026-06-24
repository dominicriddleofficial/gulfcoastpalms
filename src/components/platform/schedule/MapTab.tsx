import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, MarkerF, PolylineF, InfoWindowF, useJsApiLoader } from "@react-google-maps/api";
import { format, formatDistanceToNowStrict } from "date-fns";
import { MapPin, Map as MapIcon, Truck, Clock, Navigation, Phone, FileText, X, AlertTriangle, PlayCircle, RotateCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { lightMapStyle, buildNumberedMarkerIcon, NUMBERED_MARKER_LABEL_STYLE } from "@/lib/map-styles";
import { useGeocodedAddresses, type GeocodedAddress } from "@/hooks/useGeocodedJobs";
import { useCrewToday, type CrewMember } from "@/hooks/useCrewToday";
import { useCrewRoutes } from "@/hooks/useCrewRoutes";
import { useVisitLifecycle } from "@/hooks/useVisitLifecycle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const mapContainerStyle = { width: "100%", height: "100%" };
const defaultMapCenter = { lat: 30.4016, lng: -86.8636 };

export type MapTabJob = {
  id: string;
  title: string | null;
  client_name: string | null;
  client_phone: string | null;
  property_address: string | null;
  status: string;
  visit_status: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  assigned_employee_names: string[] | null;
  business_id: string | null;
  jobber_id: string | null;
  visit_id: string | null;
};

type CrewFilter = "all" | "clocked_in";
type JobFilter = "all" | "remaining" | "completed";

const CREW_COLORS = [
  "#22d3ee", "#a78bfa", "#f472b6", "#fb7185", "#34d399",
  "#fbbf24", "#60a5fa", "#f87171", "#c084fc", "#4ade80",
];

function crewColor(idx: number): string {
  return CREW_COLORS[idx % CREW_COLORS.length];
}

function isCompleted(j: MapTabJob): boolean {
  const v = (j.visit_status || j.status || "").toLowerCase();
  return v === "complete" || v === "completed";
}

function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function MapTab({
  jobs,
  mapsKey,
  keyError,
  businessId,
  date,
  focusedSessionId,
  onJobOpen,
  onContactCustomer,
}: {
  jobs: MapTabJob[];
  mapsKey: string | null;
  keyError?: string | null;
  businessId: string | null;
  date: Date;
  focusedSessionId: string | null;
  onJobOpen: (job: MapTabJob) => void;
  onContactCustomer: (job: MapTabJob) => void;
}) {
  // ---------- Geocode job addresses ----------
  const addresses = useMemo(
    () => jobs.map((j) => j.property_address).filter((a): a is string => !!a),
    [jobs],
  );
  const { coords, loading: geocoding } = useGeocodedAddresses(addresses);

  // ---------- Live crew + routes ----------
  const { data: crewData } = useCrewToday(businessId, date);
  const members: CrewMember[] = crewData?.members ?? [];
  const { data: routes = [] } = useCrewRoutes(businessId, date);

  const colorBySession = useMemo(() => {
    const m = new Map<string, string>();
    members.forEach((mem, i) => m.set(mem.session_id, crewColor(i)));
    return m;
  }, [members]);

  // ---------- Filters ----------
  const [crewFilter, setCrewFilter] = useState<CrewFilter>("all");
  const [jobFilter, setJobFilter] = useState<JobFilter>("all");
  const [showTrails, setShowTrails] = useState(true);
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null); // employee_user_id
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  // External focus from CrewTab "View on Map"
  useEffect(() => {
    if (focusedSessionId) {
      const target = members.find((m) => m.session_id === focusedSessionId);
      if (target) {
        setSelectedCrewId(target.employee_user_id);
        setOpenSessionId(focusedSessionId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedSessionId, members.length]);

  const filteredMembers = useMemo(() => {
    let list = members;
    if (crewFilter === "clocked_in") list = list.filter((m) => !m.clock_out_at);
    if (selectedCrewId) list = list.filter((m) => m.employee_user_id === selectedCrewId);
    return list;
  }, [members, crewFilter, selectedCrewId]);

  const filteredJobs = useMemo(() => {
    if (jobFilter === "completed") return jobs.filter(isCompleted);
    if (jobFilter === "remaining") return jobs.filter((j) => !isCompleted(j));
    return jobs;
  }, [jobs, jobFilter]);

  const mappedJobs = useMemo(
    () =>
      filteredJobs
        .map((j) => {
          const pos = j.property_address ? coords[j.property_address] : undefined;
          return pos ? { job: j, pos } : null;
        })
        .filter((x): x is { job: MapTabJob; pos: GeocodedAddress } => !!x),
    [filteredJobs, coords],
  );

  // ---------- Geofence prompts: clocked-in crew within 250 ft of a scheduled job they haven't started ----------
  const geofenceMatches = useMemo(() => {
    const FT_250_M = 76.2;
    const out: { member: CrewMember; job: MapTabJob; distanceM: number }[] = [];
    for (const m of members) {
      if (m.clock_out_at) continue;
      if (m.last_lat == null || m.last_lng == null) continue;
      for (const { job, pos } of mappedJobs) {
        if (isCompleted(job)) continue;
        const v = (job.visit_status || job.status || "").toLowerCase();
        if (v === "in_progress" || v === "on_site") continue;
        const d = metersBetween({ lat: m.last_lat, lng: m.last_lng }, pos);
        if (d <= FT_250_M) out.push({ member: m, job, distanceM: d });
      }
    }
    return out;
  }, [members, mappedJobs]);

  // ---------- Empty / no-key fallback ----------
  // Hooks must be unconditional — declare queryClient before any early return.
  const queryClient = useQueryClient();
  if (!mapsKey) {
    const handleRetry = () => {
      queryClient.invalidateQueries({ queryKey: ["google-maps-key"] });
    };
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center space-y-3">
        <MapIcon className="w-8 h-8 mx-auto text-muted-foreground/40" />
        {keyError ? (
          <>
            <p className="font-body text-sm text-muted-foreground">
              Map couldn't load: <span className="text-foreground/80">{keyError}</span>
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-body font-bold hover:bg-primary/25 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" /> Retry
            </button>
          </>
        ) : (
          <p className="font-body text-sm text-muted-foreground">Loading map…</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <MapFilters
        crewFilter={crewFilter}
        setCrewFilter={setCrewFilter}
        jobFilter={jobFilter}
        setJobFilter={setJobFilter}
        showTrails={showTrails}
        setShowTrails={setShowTrails}
        members={members}
        selectedCrewId={selectedCrewId}
        setSelectedCrewId={setSelectedCrewId}
      />

      {geofenceMatches.length > 0 && (
        <GeofencePrompt matches={geofenceMatches} />
      )}

      <div className="font-body text-[11px] text-muted-foreground bg-card border border-border rounded-lg px-3 py-2 flex flex-wrap gap-x-4 gap-y-1">
        <span>{mappedJobs.length} jobs mapped</span>
        <span>{filteredMembers.filter((m) => !m.clock_out_at).length} clocked in</span>
        {geocoding && <span>Geocoding addresses…</span>}
      </div>

      <div className="rounded-xl overflow-hidden border border-border" style={{ height: "55vh", minHeight: 320 }}>
        <MapCanvas
          mapsKey={mapsKey}
          mappedJobs={mappedJobs}
          members={filteredMembers}
          routes={routes}
          colorBySession={colorBySession}
          showTrails={showTrails}
          openJobId={openJobId}
          setOpenJobId={(id) => { setOpenJobId(id); setOpenSessionId(null); }}
          openSessionId={openSessionId}
          setOpenSessionId={(id) => { setOpenSessionId(id); setOpenJobId(null); }}
          focusedSessionId={focusedSessionId}
          onJobOpen={onJobOpen}
          onContactCustomer={onContactCustomer}
        />
      </div>
    </div>
  );
}

// =================== Filters ===================
function MapFilters({
  crewFilter, setCrewFilter, jobFilter, setJobFilter,
  showTrails, setShowTrails, members, selectedCrewId, setSelectedCrewId,
}: {
  crewFilter: CrewFilter; setCrewFilter: (v: CrewFilter) => void;
  jobFilter: JobFilter; setJobFilter: (v: JobFilter) => void;
  showTrails: boolean; setShowTrails: (v: boolean) => void;
  members: CrewMember[];
  selectedCrewId: string | null; setSelectedCrewId: (v: string | null) => void;
}) {
  const pill = (active: boolean) =>
    cn(
      "px-2.5 py-1 rounded-full font-body text-[11px] font-semibold transition-colors whitespace-nowrap",
      active ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-foreground/80 hover:bg-secondary/70",
    );
  return (
    <div className="bg-card border border-border rounded-xl p-2.5 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <button className={pill(crewFilter === "all")} onClick={() => setCrewFilter("all")}>All crews</button>
        <button className={pill(crewFilter === "clocked_in")} onClick={() => setCrewFilter("clocked_in")}>Clocked in</button>
        <span className="w-px bg-border mx-1" />
        <button className={pill(jobFilter === "all")} onClick={() => setJobFilter("all")}>All jobs</button>
        <button className={pill(jobFilter === "remaining")} onClick={() => setJobFilter("remaining")}>Remaining</button>
        <button className={pill(jobFilter === "completed")} onClick={() => setJobFilter("completed")}>Completed</button>
        <span className="w-px bg-border mx-1" />
        <button className={pill(showTrails)} onClick={() => setShowTrails(!showTrails)}>Trails</button>
      </div>
      {members.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            className={pill(selectedCrewId === null)}
            onClick={() => setSelectedCrewId(null)}
          >
            All employees
          </button>
          {members.map((m) => (
            <button
              key={m.session_id}
              className={pill(selectedCrewId === m.employee_user_id)}
              onClick={() => setSelectedCrewId(selectedCrewId === m.employee_user_id ? null : m.employee_user_id)}
            >
              {m.display_name ?? m.email ?? "Crew"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =================== Geofence prompt ===================
function GeofencePrompt({
  matches,
}: {
  matches: { member: CrewMember; job: MapTabJob; distanceM: number }[];
}) {
  const lifecycle = useVisitLifecycle();
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-amber-400 font-body text-xs font-bold uppercase tracking-wider">
        <AlertTriangle className="w-3.5 h-3.5" /> Near job
      </div>
      {matches.slice(0, 4).map(({ member, job, distanceM }) => {
        const ft = Math.round(distanceM * 3.28084);
        return (
          <div
            key={`${member.session_id}-${job.id}`}
            className="flex items-start gap-2 text-sm font-body text-foreground"
          >
            <div className="flex-1 min-w-0">
              <p className="truncate">
                <span className="font-semibold">{member.display_name ?? "Crew"}</span> appears to be at{" "}
                <span className="font-semibold">{job.client_name ?? job.title ?? "this job"}</span> ({ft} ft).
              </p>
              <p className="text-xs text-muted-foreground truncate">Start job?</p>
            </div>
            <button
              type="button"
              disabled={!job.jobber_id || !job.business_id || lifecycle.advance.isPending}
              onClick={() => {
                if (!job.jobber_id || !job.business_id) {
                  toast.error("Cannot start — missing job reference");
                  return;
                }
                lifecycle.advance.mutate({
                  jobberJobId: job.jobber_id,
                  visitId: job.visit_id,
                  businessId: job.business_id,
                  nextStatus: "in_progress",
                  customerName: job.client_name,
                  customerPhone: job.client_phone,
                });
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-body font-bold hover:bg-amber-500/30 transition-colors disabled:opacity-50"
            >
              <PlayCircle className="w-3.5 h-3.5" /> Start
            </button>
          </div>
        );
      })}
    </div>
  );
}

// =================== Map canvas ===================
function MapCanvas({
  mapsKey, mappedJobs, members, routes, colorBySession, showTrails,
  openJobId, setOpenJobId, openSessionId, setOpenSessionId,
  focusedSessionId, onJobOpen, onContactCustomer,
}: {
  mapsKey: string;
  mappedJobs: { job: MapTabJob; pos: GeocodedAddress }[];
  members: CrewMember[];
  routes: { session_id: string; active: boolean; points: { lat: number; lng: number; captured_at: string }[] }[];
  colorBySession: Map<string, string>;
  showTrails: boolean;
  openJobId: string | null; setOpenJobId: (id: string | null) => void;
  openSessionId: string | null; setOpenSessionId: (id: string | null) => void;
  focusedSessionId: string | null;
  onJobOpen: (job: MapTabJob) => void;
  onContactCustomer: (job: MapTabJob) => void;
}) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: mapsKey, id: "platform-schedule-map" });
  const mapRef = useRef<google.maps.Map | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    const bounds = new google.maps.LatLngBounds();
    let has = false;
    for (const m of mappedJobs) { bounds.extend(m.pos); has = true; }
    for (const m of members) {
      if (m.last_lat != null && m.last_lng != null) { bounds.extend({ lat: m.last_lat, lng: m.last_lng }); has = true; }
    }
    if (has) map.fitBounds(bounds, 64);
    else map.setCenter(defaultMapCenter);
  }, [mappedJobs, members]);

  // Pan to focused session's current location
  useEffect(() => {
    if (!focusedSessionId || !mapRef.current) return;
    const m = members.find((mem) => mem.session_id === focusedSessionId);
    if (m?.last_lat != null && m.last_lng != null) {
      mapRef.current.panTo({ lat: m.last_lat, lng: m.last_lng });
      if ((mapRef.current.getZoom() ?? 0) < 14) mapRef.current.setZoom(14);
    }
  }, [focusedSessionId, members]);

  if (loadError) return <div className="h-full w-full bg-card flex items-center justify-center text-sm font-body text-muted-foreground">Map unavailable</div>;
  if (!isLoaded) return <div className="h-full w-full bg-card flex items-center justify-center text-sm font-body text-muted-foreground">Loading map…</div>;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={defaultMapCenter}
      zoom={10}
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
      {/* Route trails */}
      {showTrails && routes.map((r) => {
        if (r.points.length < 2) return null;
        // Hide trails for clocked-out crew (unless explicitly part of selected/focused)
        if (!r.active && r.session_id !== focusedSessionId) return null;
        const color = colorBySession.get(r.session_id) ?? "#22d3ee";
        // Only show trails for currently visible members
        if (!members.some((m) => m.session_id === r.session_id)) return null;
        return (
          <PolylineF
            key={r.session_id}
            path={r.points.map((p) => ({ lat: p.lat, lng: p.lng }))}
            options={{ strokeColor: color, strokeOpacity: 0.85, strokeWeight: 4 }}
          />
        );
      })}

      {/* Job pins */}
      {mappedJobs.map(({ job, pos }, i) => {
        const completed = isCompleted(job);
        const icon = buildNumberedMarkerIcon({
          fillColor: completed ? "#64748b" : "#00C853",
          scale: 13,
        });
        return (
          <MarkerF
            key={job.id}
            position={pos}
            icon={icon}
            label={{ ...NUMBERED_MARKER_LABEL_STYLE, text: String(i + 1) }}
            onClick={() => setOpenJobId(job.id)}
            zIndex={completed ? 1 : 5}
          >
            {openJobId === job.id && (
              <InfoWindowF position={pos} onCloseClick={() => setOpenJobId(null)}>
                <JobCard job={job} onOpen={() => { setOpenJobId(null); onJobOpen(job); }} onContact={() => { setOpenJobId(null); onContactCustomer(job); }} />
              </InfoWindowF>
            )}
          </MarkerF>
        );
      })}

      {/* Crew pins */}
      {members.map((m) => {
        if (m.last_lat == null || m.last_lng == null) return null;
        const color = colorBySession.get(m.session_id) ?? "#22d3ee";
        const pos = { lat: m.last_lat, lng: m.last_lng };
        const icon: google.maps.Symbol = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#0f172a",
          strokeWeight: 3,
        };
        const initial = (m.display_name ?? m.email ?? "C").slice(0, 1).toUpperCase();
        return (
          <MarkerF
            key={m.session_id}
            position={pos}
            icon={icon}
            label={{ text: initial, color: "#ffffff", fontSize: "10px", fontWeight: "800" }}
            onClick={() => setOpenSessionId(m.session_id)}
            zIndex={20}
          >
            {openSessionId === m.session_id && (
              <InfoWindowF position={pos} onCloseClick={() => setOpenSessionId(null)}>
                <CrewCard member={m} />
              </InfoWindowF>
            )}
          </MarkerF>
        );
      })}
    </GoogleMap>
  );
}

// =================== InfoWindow cards ===================
function JobCard({
  job,
  onOpen,
  onContact,
}: {
  job: MapTabJob;
  onOpen: () => void;
  onContact: () => void;
}) {
  const navigate = () => {
    if (!job.property_address) return;
    const encoded = encodeURIComponent(job.property_address);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    window.location.href = isIOS ? `maps://?daddr=${encoded}` : `https://maps.apple.com/?daddr=${encoded}`;
  };
  const status = (job.visit_status || job.status || "scheduled").replace(/_/g, " ");
  return (
    <div className="font-body text-foreground min-w-[220px] max-w-[260px] space-y-1.5 text-[12px]" style={{ color: "#0f172a" }}>
      <p className="font-bold text-[13px]">{job.client_name ?? "Customer"}</p>
      {job.title && <p className="text-[12px] text-slate-600 truncate">{job.title}</p>}
      {job.property_address && (
        <p className="text-[11px] text-slate-500 leading-tight">{job.property_address}</p>
      )}
      <div className="flex items-center gap-2 text-[11px] text-slate-600">
        {job.scheduled_start && (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {format(new Date(job.scheduled_start), "h:mm a")}
          </span>
        )}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize font-semibold">
          {status}
        </span>
      </div>
      {job.assigned_employee_names && job.assigned_employee_names.length > 0 && (
        <p className="text-[11px] text-slate-600 truncate">Crew: {job.assigned_employee_names.join(", ")}</p>
      )}
      <div className="grid grid-cols-3 gap-1 pt-1">
        <button onClick={navigate} className="inline-flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold">
          <Navigation className="w-3 h-3" /> Nav
        </button>
        <button onClick={onContact} disabled={!job.client_phone} className="inline-flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md bg-slate-200 text-slate-800 text-[11px] font-bold disabled:opacity-40">
          <Phone className="w-3 h-3" /> Call
        </button>
        <button onClick={onOpen} className="inline-flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md bg-slate-900 text-white text-[11px] font-bold">
          <FileText className="w-3 h-3" /> Open
        </button>
      </div>
    </div>
  );
}

function CrewCard({ member }: { member: CrewMember }) {
  const minutes = member.clock_out_at
    ? member.total_minutes ?? 0
    : Math.round((Date.now() - new Date(member.clock_in_at).getTime()) / 60_000);
  const hours = (minutes / 60).toFixed(1);
  const status = member.clock_out_at
    ? "Clocked out"
    : member.active_job_id
    ? "On job"
    : (member.last_speed ?? 0) > 2.2
    ? "Driving"
    : "Idle";

  const callCrew = () => toast.info("No phone on file for this crew member");

  return (
    <div className="font-body min-w-[220px] max-w-[260px] space-y-1.5 text-[12px]" style={{ color: "#0f172a" }}>
      <p className="font-bold text-[13px]">{member.display_name ?? member.email ?? "Crew"}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
        {member.vehicle_name && (
          <span className="inline-flex items-center gap-1"><Truck className="w-3 h-3" /> {member.vehicle_name}</span>
        )}
        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> In {format(new Date(member.clock_in_at), "h:mm a")}</span>
      </div>
      <div className="grid grid-cols-3 gap-1 text-center">
        <div className="bg-slate-100 rounded-md py-1">
          <p className="font-bold text-[12px] tabular-nums">{hours}h</p>
          <p className="text-[9px] text-slate-500 uppercase">Today</p>
        </div>
        <div className="bg-slate-100 rounded-md py-1">
          <p className="font-bold text-[12px] tabular-nums">{member.completed_jobs}</p>
          <p className="text-[9px] text-slate-500 uppercase">Done</p>
        </div>
        <div className="bg-slate-100 rounded-md py-1">
          <p className="font-bold text-[12px] truncate px-1">{status}</p>
          <p className="text-[9px] text-slate-500 uppercase">Status</p>
        </div>
      </div>
      <p className="text-[11px] text-slate-600">
        Last ping {member.last_gps_at ? formatDistanceToNowStrict(new Date(member.last_gps_at), { addSuffix: true }) : "—"}
      </p>
      <div className="grid grid-cols-2 gap-1 pt-1">
        <button onClick={callCrew} className="inline-flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md bg-slate-200 text-slate-800 text-[11px] font-bold">
          <Phone className="w-3 h-3" /> Call Crew
        </button>
        <button
          onClick={() => toast.info("Crew timeline coming soon")}
          className="inline-flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md bg-slate-900 text-white text-[11px] font-bold"
        >
          <Clock className="w-3 h-3" /> Timeline
        </button>
      </div>
    </div>
  );
}

export default MapTab;
