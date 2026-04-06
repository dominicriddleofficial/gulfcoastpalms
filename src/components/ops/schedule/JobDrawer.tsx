import { ScheduleJob } from "@/hooks/useScheduleJobs";
import { format } from "date-fns";
import { Phone, MapPin, Clock, User, StickyNote, X, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusChip from "@/components/ops/StatusChip";

interface JobDrawerProps {
  job: ScheduleJob | null;
  onClose: () => void;
}

export default function JobDrawer({ job, onClose }: JobDrawerProps) {
  if (!job) return null;

  const timeStr = job.scheduled_start
    ? `${format(new Date(job.scheduled_start), "h:mm a")}${job.scheduled_end ? ` – ${format(new Date(job.scheduled_end), "h:mm a")}` : ""}`
    : "Anytime";

  const appleMapsUrl = job.property_address
    ? `https://maps.apple.com/?daddr=${encodeURIComponent(job.property_address)}`
    : null;
  const googleMapsUrl = job.property_address
    ? `https://maps.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.property_address)}`
    : null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-card border-t border-primary/20 rounded-t-2xl shadow-2xl shadow-primary/10 max-h-[70vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-primary/30" />
        </div>

        <div className="px-4 pb-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StatusChip status={job.visit_status || "scheduled"} />
                {job.job_number && (
                  <span className="text-xs font-body text-muted-foreground font-mono">#{job.job_number}</span>
                )}
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">
                {job.client_name || "Unknown Client"}
              </h3>
              {job.title && job.title !== job.client_name && (
                <p className="font-body text-sm text-muted-foreground">{job.title}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-primary" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Time */}
          <div className="flex items-center gap-2 text-sm font-body text-foreground">
            <Clock className="w-4 h-4 text-primary/60" />
            {timeStr}
          </div>

          {/* Address */}
          {job.property_address && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm font-body text-foreground">
                <MapPin className="w-4 h-4 mt-0.5 text-primary/60 shrink-0" />
                <span>{job.property_address}</span>
              </div>
              <div className="flex gap-2">
                {appleMapsUrl && (
                  <a href={appleMapsUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-body text-foreground hover:border-primary/30 transition-colors">
                    <Navigation className="w-3.5 h-3.5 text-primary" /> Apple Maps
                  </a>
                )}
                {googleMapsUrl && (
                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-body text-foreground hover:border-primary/30 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5 text-primary" /> Google Maps
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Phone */}
          {job.client_phone && (
            <a href={`tel:${job.client_phone}`}
              className="flex items-center gap-2 text-sm font-body text-primary hover:text-primary/80">
              <Phone className="w-4 h-4" /> {job.client_phone}
            </a>
          )}

          {/* Crew */}
          {job.assigned_employee_names && job.assigned_employee_names.length > 0 && (
            <div className="flex items-center gap-2 text-sm font-body text-foreground">
              <User className="w-4 h-4 text-muted-foreground" />
              {job.assigned_employee_names.join(", ")}
            </div>
          )}

          {/* Service items */}
          {job.service_items && job.service_items.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-body font-semibold text-primary/60 uppercase tracking-wider">Services</p>
              <div className="flex flex-wrap gap-1.5">
                {job.service_items.map((s: any, i: number) => (
                  <span key={i} className="px-2 py-1 bg-secondary border border-border rounded-md text-xs font-body text-foreground">
                    {s.name || s.description || "Service"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {job.internal_notes && (
            <div className="flex items-start gap-2 p-3 bg-secondary/50 border border-border rounded-lg">
              <StickyNote className="w-4 h-4 mt-0.5 text-primary/60 shrink-0" />
              <p className="text-sm font-body text-foreground">{job.internal_notes}</p>
            </div>
          )}

          {/* Coordinates info */}
          {(!job.lat || !job.lng) && (
            <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-xs font-body text-destructive">⚠ Address could not be geocoded — not shown on map</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
