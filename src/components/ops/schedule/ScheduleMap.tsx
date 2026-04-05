import { useState, useCallback, useEffect, useRef } from "react";
import { GoogleMap, useJsApiLoader, MarkerF, DirectionsRenderer } from "@react-google-maps/api";
import { ScheduleJob } from "@/hooks/useScheduleJobs";
import { Loader2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#1a7a3a",
  en_route: "#2563eb",
  on_site: "#f59e0b",
  completed: "#6b7280",
  canceled: "#ef4444",
  unscheduled: "#9333ea",
};

const CREW_COLORS = [
  "#1a7a3a", "#2563eb", "#f59e0b", "#ef4444", "#9333ea",
  "#06b6d4", "#ec4899", "#84cc16",
];

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 30.42, lng: -87.0 }; // Pensacola area

interface ScheduleMapProps {
  jobs: ScheduleJob[];
  apiKey: string;
  selectedCrew: string | null;
  crewNames: string[];
  onJobSelect: (job: ScheduleJob) => void;
  showRoutes: boolean;
}

export default function ScheduleMap({ jobs, apiKey, selectedCrew, crewNames, onJobSelect, showRoutes }: ScheduleMapProps) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey });
  const mapRef = useRef<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<Record<string, google.maps.DirectionsResult>>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  // Fit bounds when jobs change
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    fitBounds(map);
  }, [jobs]);

  const fitBounds = (map: google.maps.Map) => {
    if (jobs.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    jobs.forEach(j => {
      if (j.lat && j.lng) bounds.extend({ lat: j.lat, lng: j.lng });
    });
    if (userLocation) bounds.extend(userLocation);
    if (!bounds.isEmpty()) map.fitBounds(bounds, 50);
  };

  useEffect(() => {
    if (mapRef.current && jobs.length > 0) fitBounds(mapRef.current);
  }, [jobs, selectedCrew]);

  // Calculate routes per crew
  useEffect(() => {
    if (!isLoaded || !showRoutes) { setDirections({}); return; }

    const crewsToRoute = selectedCrew ? [selectedCrew] : crewNames;
    const newDirections: Record<string, google.maps.DirectionsResult> = {};
    let completed = 0;

    crewsToRoute.forEach(crew => {
      const crewJobs = jobs
        .filter(j => (j.assigned_employee_names?.join(", ") || "Unassigned") === crew && j.lat && j.lng)
        .sort((a, b) => (a.routeOrder || 0) - (b.routeOrder || 0));

      if (crewJobs.length < 2) {
        completed++;
        if (completed === crewsToRoute.length) setDirections({ ...newDirections });
        return;
      }

      const directionsService = new google.maps.DirectionsService();
      const origin = { lat: crewJobs[0].lat!, lng: crewJobs[0].lng! };
      const destination = { lat: crewJobs[crewJobs.length - 1].lat!, lng: crewJobs[crewJobs.length - 1].lng! };
      const waypoints = crewJobs.slice(1, -1).map(j => ({
        location: { lat: j.lat!, lng: j.lng! },
        stopover: true,
      }));

      directionsService.route(
        {
          origin, destination, waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK" && result) {
            newDirections[crew] = result;
          }
          completed++;
          if (completed === crewsToRoute.length) setDirections({ ...newDirections });
        }
      );
    });
  }, [isLoaded, jobs, selectedCrew, crewNames, showRoutes]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const getCrewColor = (crew: string) => {
    const idx = crewNames.indexOf(crew);
    return CREW_COLORS[idx % CREW_COLORS.length];
  };

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={10}
      onLoad={onMapLoad}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        ],
      }}
    >
      {/* Job markers */}
      {jobs.filter(j => j.lat && j.lng).map((job) => {
        const crew = job.assigned_employee_names?.join(", ") || "Unassigned";
        const color = selectedCrew ? getCrewColor(selectedCrew) : getCrewColor(crew);
        const statusColor = STATUS_COLORS[job.visit_status || "scheduled"] || STATUS_COLORS.scheduled;

        return (
          <MarkerF
            key={job.id}
            position={{ lat: job.lat!, lng: job.lng! }}
            onClick={() => onJobSelect(job)}
            label={{
              text: job.scheduled_start
                ? new Date(job.scheduled_start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                : "Any",
              color: "#fff",
              fontSize: "11px",
              fontWeight: "bold",
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: statusColor,
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
              scale: 14,
            }}
          />
        );
      })}

      {/* User location */}
      {userLocation && (
        <MarkerF
          position={userLocation}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 3,
            scale: 8,
          }}
        />
      )}

      {/* Route lines */}
      {Object.entries(directions).map(([crew, result]) => (
        <DirectionsRenderer
          key={crew}
          directions={result}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: getCrewColor(crew),
              strokeWeight: 4,
              strokeOpacity: 0.7,
            },
          }}
        />
      ))}
    </GoogleMap>
  );
}
