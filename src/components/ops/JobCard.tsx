import { Phone, MapPin, Clock, ChevronRight, StickyNote, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import StatusChip from "./StatusChip";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface JobCardProps {
  id: string;
  title?: string;
  clientName?: string;
  clientPhone?: string;
  propertyAddress?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  visitStatus?: string;
  assignedEmployeeNames?: string[];
  internalNotes?: string;
  jobNumber?: string;
  serviceItems?: any[];
  compact?: boolean;
}

export default function JobCard({
  id, title, clientName, clientPhone, propertyAddress,
  scheduledStart, scheduledEnd, visitStatus, assignedEmployeeNames,
  internalNotes, jobNumber, serviceItems, compact
}: JobCardProps) {
  const timeStr = scheduledStart
    ? `${format(new Date(scheduledStart), "h:mm a")}${scheduledEnd ? ` – ${format(new Date(scheduledEnd), "h:mm a")}` : ""}`
    : "TBD";

  const mapsUrl = propertyAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(propertyAddress)}`
    : null;

  return (
    <Card className="p-4 bg-card border-border hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Time + Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm font-body font-medium text-foreground">
              <Clock className="w-3.5 h-3.5 text-primary/60" />
              {timeStr}
            </div>
            <StatusChip status={visitStatus || "scheduled"} />
            {jobNumber && (
              <span className="text-[11px] font-body text-muted-foreground font-mono">#{jobNumber}</span>
            )}
          </div>

          {/* Client */}
          <div className="space-y-0.5">
            <p className="font-body font-semibold text-foreground text-base truncate">
              {clientName || "Unknown Client"}
            </p>
            {title && title !== clientName && (
              <p className="font-body text-sm text-muted-foreground truncate">{title}</p>
            )}
          </div>

          {/* Address */}
          {propertyAddress && (
            <a
              href={mapsUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-1.5 text-sm font-body text-primary hover:text-primary/80"
              onClick={e => e.stopPropagation()}
            >
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{propertyAddress}</span>
            </a>
          )}

          {/* Phone */}
          {clientPhone && (
            <a
              href={`tel:${clientPhone}`}
              className="flex items-center gap-1.5 text-sm font-body text-primary hover:text-primary/80"
              onClick={e => e.stopPropagation()}
            >
              <Phone className="w-3.5 h-3.5" />
              {clientPhone}
            </a>
          )}

          {/* Crew */}
          {assignedEmployeeNames && assignedEmployeeNames.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-body text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              {assignedEmployeeNames.join(", ")}
            </div>
          )}

          {/* Service items */}
          {!compact && serviceItems && serviceItems.length > 0 && (
            <div className="text-xs font-body text-muted-foreground">
              {serviceItems.map((s: any, i: number) => (
                <span key={i}>{s.name || s.description}{i < serviceItems.length - 1 ? " · " : ""}</span>
              ))}
            </div>
          )}

          {/* Notes */}
          {!compact && internalNotes && (
            <div className="flex items-start gap-1.5 text-xs font-body text-muted-foreground bg-secondary/50 rounded-md p-2 border border-border">
              <StickyNote className="w-3 h-3 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{internalNotes}</span>
            </div>
          )}
        </div>

        <Link
          to={`/ops/job/${id}`}
          className="shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors text-muted-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </Card>
  );
}
