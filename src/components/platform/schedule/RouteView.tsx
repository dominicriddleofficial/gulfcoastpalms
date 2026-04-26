import { useMemo } from "react";
import { MapPin, Clock, Navigation, User } from "lucide-react";
import { format } from "date-fns";
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import { useGeocodedAddresses, type GeocodedAddress } from "@/hooks/useGeocodedJobs";
import { darkMapStyle, buildNumberedMarkerIcon, NUMBERED_MARKER_LABEL_STYLE } from "@/lib/map-styles";

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
  business_id: string | null;
};

interface RouteViewProps {
  jobs: JobberJob[];
  googleMapsKey: string | null;
}

const mapContainerStyle = { width: "100%", height: "100%" };
const defaultMapCenter = { lat: 30.4016, lng: -86.8636 };

function extractCity(address: string | null): string {
  if (!address) return "Unknown";
  // Address format: "1234 Street, City, State, Zip" → take 2nd comma-segment.
  const parts = address.split(",").map(p => p.trim());
  return parts[1] || "Unknown";
}

/** Haversine distance in km between two lat/lng points. */
function distanceKm(a: GeocodedAddress, b: GeocodedAddress): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Nearest-neighbor route optimization. Honors the earliest-scheduled job
 * as the starting point, then greedily picks the closest unvisited stop.
 * Jobs without coordinates are appended at the end in original order.
 */
function optimizeRoute(jobs: JobberJob[], coords: Record<string, GeocodedAddress>): JobberJob[] {
  if (jobs.length <= 1) return jobs;

  const withCoords: { job: JobberJob; pos: GeocodedAddress }[] = [];
  const withoutCoords: JobberJob[] = [];
  jobs.forEach((j) => {
    const c = j.property_address ? coords[j.property_address] : undefined;
    if (c) withCoords.push({ job: j, pos: c });
    else withoutCoords.push(j);
  });

  if (withCoords.length === 0) return jobs;

  // Start from the job with the earliest scheduled_start (or first by index)
  const sortedByTime = [...withCoords].sort((a, b) =>
    (a.job.scheduled_start || "").localeCompare(b.job.scheduled_start || "")
  );
  const start = sortedByTime[0];

  const remaining = new Set(withCoords.map((_, i) => i));
  const startIdx = withCoords.findIndex((w) => w.job.id === start.job.id);
  remaining.delete(startIdx);

  const orderedIdx: number[] = [startIdx];
  let currentIdx = startIdx;

  while (remaining.size > 0) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (const i of remaining) {
      const d = distanceKm(withCoords[currentIdx].pos, withCoords[i].pos);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;
    orderedIdx.push(bestIdx);
    remaining.delete(bestIdx);
    currentIdx = bestIdx;
  }

  return [...orderedIdx.map((i) => withCoords[i].job), ...withoutCoords];
}

export default function RouteView({ jobs, googleMapsKey }: RouteViewProps) {
  const addresses = useMemo(
    () => jobs.map((j) => j.property_address).filter((a): a is string => Boolean(a)),
    [jobs]
  );
  const { coords, loading: geocoding } = useGeocodedAddresses(addresses);

  const optimizedJobs = useMemo(() => optimizeRoute(jobs, coords), [jobs, coords]);

  const routePoints = useMemo(
    () =>
      optimizedJobs
        .map((job) => (job.property_address ? coords[job.property_address] : undefined))
        .filter((point): point is google.maps.LatLngLiteral => Boolean(point)),
    [optimizedJobs, coords]
  );

  const geocodedCount = routePoints.length;
  const ungeocodedCount = optimizedJobs.length - geocodedCount;

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
        <p className="font-body text-sm text-muted-foreground">No jobs to route today</p>
      </div>
    );
  }

  const openNavigation = (address: string) => {
    const encoded = encodeURIComponent(address);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    window.open(isIOS ? `maps://maps.apple.com/?daddr=${encoded}` : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-card border border-border rounded-lg p-3 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-muted-foreground">
        <span className="text-foreground font-medium">{optimizedJobs.length} stops</span>
        <span>First: {optimizedJobs[0]?.scheduled_start ? format(new Date(optimizedJobs[0].scheduled_start), "h:mm a") : "N/A"}</span>
        <span>{geocoding ? "Geocoding…" : `${geocodedCount} mapped${ungeocodedCount > 0 ? ` · ${ungeocodedCount} missing coords` : ""}`}</span>
      </div>

      {/* Map */}
      {googleMapsKey && (
        <div className="w-full rounded-lg overflow-hidden border border-border" style={{ height: "50vh", minHeight: 280 }}>
          <RouteGoogleMap googleMapsKey={googleMapsKey} routePoints={routePoints} optimizedJobs={optimizedJobs} coords={coords} />
        </div>
      )}

      {/* Optimized job list */}
      <div className="space-y-1.5">
        {optimizedJobs.map((job, idx) => (
          <div key={job.id} className="flex gap-2 items-start">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-2.5 font-mono">
              {idx + 1}
            </div>
            <div className="flex-1 bg-card border border-border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    {job.job_number && <span className="font-body text-[10px] text-muted-foreground font-mono">{job.job_number}</span>}
                    <span className="font-body text-[10px] text-muted-foreground">{extractCity(job.property_address)}</span>
                  </div>
                  <p className="font-body text-sm font-medium text-foreground truncate">{job.title || job.client_name || "Jobber Job"}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[11px] text-muted-foreground font-body">
                    {job.client_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{job.client_name}</span>}
                    {job.scheduled_start && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(job.scheduled_start), "h:mm a")}</span>}
                  </div>
                  {job.property_address && (
                    <p className="font-body text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />{job.property_address}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {job.total_amount != null && job.total_amount > 0 && (
                    <span className="font-body text-sm font-semibold text-foreground">${Number(job.total_amount).toLocaleString()}</span>
                  )}
                  {job.property_address && (
                    <button
                      onClick={() => openNavigation(job.property_address!)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/15 text-primary text-[10px] font-body font-medium hover:bg-primary/25 transition-colors"
                    >
                      <Navigation className="w-3 h-3" /> Navigate
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RouteGoogleMap({ googleMapsKey, routePoints, optimizedJobs, coords }: { googleMapsKey: string; routePoints: google.maps.LatLngLiteral[]; optimizedJobs: JobberJob[]; coords: Record<string, GeocodedAddress> }) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: googleMapsKey, id: "platform-schedule-map" });

  if (loadError) return <div className="h-full w-full bg-card flex items-center justify-center text-sm font-body text-muted-foreground">Map unavailable</div>;
  if (!isLoaded) return <div className="h-full w-full bg-card flex items-center justify-center text-sm font-body text-muted-foreground">Loading map…</div>;

  const onMapLoad = (map: google.maps.Map) => {
    if (routePoints.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    routePoints.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 56);
  };

  const markerIcon = buildNumberedMarkerIcon();

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={routePoints[0] ?? defaultMapCenter}
      zoom={10}
      onLoad={onMapLoad}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: darkMapStyle,
        clickableIcons: false,
        backgroundColor: "#0f172a",
      }}
    >
      {routePoints.length > 1 && <PolylineF path={routePoints} options={{ strokeColor: "#22c55e", strokeOpacity: 0.8, strokeWeight: 4 }} />}
      {optimizedJobs.map((job, idx) => {
        const position = job.property_address ? coords[job.property_address] : undefined;
        if (!position) return null;
        return (
          <MarkerF
            key={job.id}
            position={position}
            icon={markerIcon}
            label={{ ...NUMBERED_MARKER_LABEL_STYLE, text: String(idx + 1) }}
          />
        );
      })}
    </GoogleMap>
  );
}
