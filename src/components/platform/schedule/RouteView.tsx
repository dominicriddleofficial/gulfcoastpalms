import { useMemo } from "react";
import { MapPin, Clock, Navigation, User } from "lucide-react";
import { format } from "date-fns";
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";

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

const CITY_ORDER = ["Navarre", "Gulf Breeze", "Pensacola", "Fort Walton Beach", "Niceville", "Destin", "Mary Esther", "Santa Rosa Beach"];
const mapContainerStyle = { width: "100%", height: "100%" };
const defaultMapCenter = { lat: 30.4016, lng: -86.8636 };

function getFallbackCoordinates(address: string | null): google.maps.LatLngLiteral | null {
  if (!address) return null;
  const value = address.toLowerCase();
  if (value.includes("gulf breeze")) return { lat: 30.3571, lng: -87.1639 };
  if (value.includes("pensacola")) return { lat: 30.4213, lng: -87.2169 };
  if (value.includes("fort walton")) return { lat: 30.4201, lng: -86.617 };
  if (value.includes("niceville")) return { lat: 30.5169, lng: -86.4822 };
  if (value.includes("destin")) return { lat: 30.3935, lng: -86.4958 };
  if (value.includes("mary esther")) return { lat: 30.4099, lng: -86.6652 };
  if (value.includes("santa rosa beach")) return { lat: 30.396, lng: -86.2288 };
  if (value.includes("navarre")) return { lat: 30.4016, lng: -86.8636 };
  return defaultMapCenter;
}

function extractCity(address: string | null): string {
  if (!address) return "Unknown";
  for (const city of CITY_ORDER) {
    if (address.toLowerCase().includes(city.toLowerCase())) return city;
  }
  return "Other";
}

function optimizeRoute(jobs: JobberJob[]): JobberJob[] {
  if (jobs.length <= 1) return jobs;
  const cityGroups: Record<string, JobberJob[]> = {};
  jobs.forEach(j => {
    const city = extractCity(j.property_address);
    if (!cityGroups[city]) cityGroups[city] = [];
    cityGroups[city].push(j);
  });

  const optimized: JobberJob[] = [];
  CITY_ORDER.forEach(city => {
    if (cityGroups[city]) {
      optimized.push(...cityGroups[city].sort((a, b) => (a.scheduled_start || "").localeCompare(b.scheduled_start || "")));
      delete cityGroups[city];
    }
  });
  Object.values(cityGroups).forEach(group => optimized.push(...group));
  return optimized;
}

export default function RouteView({ jobs, googleMapsKey }: RouteViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: googleMapsKey || "", id: "platform-schedule-map" });
  const optimizedJobs = useMemo(() => optimizeRoute(jobs), [jobs]);

  const routePoints = useMemo(() => optimizedJobs
    .map((job) => getFallbackCoordinates(job.property_address))
    .filter((point): point is google.maps.LatLngLiteral => Boolean(point)), [optimizedJobs]);

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
        <span>Route optimized by city grouping</span>
      </div>

      {/* Map embed */}
      {mapUrl && (
        <div className="w-full rounded-lg overflow-hidden border border-border" style={{ height: "50vh", minHeight: 280 }}>
          <iframe
            src={mapUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Route Map"
          />
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
