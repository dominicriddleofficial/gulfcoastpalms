import { useParams, Link } from "react-router-dom";
import OpsLayout from "@/components/ops/OpsLayout";
import StatusChip from "@/components/ops/StatusChip";
import { MOCK_JOBS } from "@/lib/mock-ops-data";
import { format } from "date-fns";
import { ArrowLeft, Phone, MapPin, Clock, User, StickyNote, DollarSign, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OpsJobDetail() {
  const { jobId } = useParams();
  const job = MOCK_JOBS.find(j => j.id === jobId);

  if (!job) {
    return (
      <OpsLayout>
        <div className="text-center py-12">
          <p className="font-body text-muted-foreground">Job not found</p>
          <Link to="/ops/today" className="font-body text-primary text-sm hover:underline mt-2 inline-block">
            Back to schedule
          </Link>
        </div>
      </OpsLayout>
    );
  }

  const mapsUrl = job.property_address
    ? `https://maps.google.com/?q=${encodeURIComponent(job.property_address)}`
    : null;

  const timeStr = job.scheduled_start
    ? `${format(new Date(job.scheduled_start), "EEEE, MMMM d · h:mm a")}${job.scheduled_end ? ` – ${format(new Date(job.scheduled_end), "h:mm a")}` : ""}`
    : "TBD";

  return (
    <OpsLayout>
      <div className="space-y-4 max-w-2xl mx-auto">
        <Link to="/ops/today" className="inline-flex items-center gap-1.5 font-body text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to schedule
        </Link>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-xl font-bold text-foreground">{job.client_name}</h1>
            <StatusChip status={job.visit_status || "scheduled"} />
          </div>
          {job.title && <p className="font-body text-sm text-muted-foreground">{job.title}</p>}
          {job.job_number && <p className="font-body text-xs text-muted-foreground">Job #{job.job_number}</p>}
        </div>

        {/* Time */}
        <Card className="border-border">
          <CardContent className="p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-body font-medium text-foreground">{timeStr}</p>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        {job.property_address && (
          <Card className="border-border">
            <CardContent className="p-4">
              <a
                href={mapsUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-primary hover:underline"
              >
                <MapPin className="w-5 h-5 mt-0.5 shrink-0" />
                <span className="font-body font-medium">{job.property_address}</span>
              </a>
              {mapsUrl && (
                <Button asChild variant="outline" size="sm" className="mt-3 ml-8 font-body">
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer">Open in Maps</a>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Phone */}
        {job.client_phone && (
          <Card className="border-border">
            <CardContent className="p-4">
              <a href={`tel:${job.client_phone}`} className="flex items-center gap-3 text-primary hover:underline">
                <Phone className="w-5 h-5" />
                <span className="font-body font-medium">{job.client_phone}</span>
              </a>
            </CardContent>
          </Card>
        )}

        {/* Crew */}
        {job.assigned_employee_names && job.assigned_employee_names.length > 0 && (
          <Card className="border-border">
            <CardContent className="p-4 flex items-start gap-3">
              <User className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-body text-xs text-muted-foreground mb-1">Assigned Crew</p>
                {job.assigned_employee_names.map((name, i) => (
                  <p key={i} className="font-body font-medium text-foreground">{name}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Service Items */}
        {job.service_items && job.service_items.length > 0 && (
          <Card className="border-border">
            <CardContent className="p-4 flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-body text-xs text-muted-foreground mb-1">Service Line Items</p>
                {job.service_items.map((s: any, i: number) => (
                  <p key={i} className="font-body text-sm text-foreground">{s.name || s.description}</p>
                ))}
                {job.total_amount > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="font-body font-semibold text-foreground">${job.total_amount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {job.internal_notes && (
          <Card className="border-border bg-muted/30">
            <CardContent className="p-4 flex items-start gap-3">
              <StickyNote className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-body text-xs text-muted-foreground mb-1">Internal Notes</p>
                <p className="font-body text-sm text-foreground whitespace-pre-wrap">{job.internal_notes}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </OpsLayout>
  );
}
