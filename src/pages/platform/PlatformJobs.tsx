import { useState } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import {
  usePlatformJobs, usePlatformCrewMembers, JOB_STATUSES,
  type PlatformJob,
} from "@/hooks/usePlatformJobs";
import { usePlatformCustomers } from "@/hooks/usePlatformCustomers";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Plus, Briefcase, Calendar, Hash, Clock, User, MapPin,
  ChevronRight, CheckCircle, AlertCircle, Truck,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function JobStatusBadge({ status }: { status: string }) {
  const s = JOB_STATUSES.find(js => js.value === status);
  if (!s) return <span className="text-xs text-muted-foreground">{status}</span>;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-body font-medium"
      style={{ backgroundColor: s.color + "20", color: s.color, border: `1px solid ${s.color}30` }}
    >
      {s.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string | null }) {
  const colors: Record<string, string> = {
    urgent: "#ef4444", high: "#f59e0b", normal: "#22c55e", low: "#6b7280",
  };
  const c = colors[priority || "normal"] || colors.normal;
  return <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c }} />;
}

export default function PlatformJobs() {
  const { selectedBusinessId, businesses } = usePlatformAuth();
  const {
    jobs, loading, statusFilter, setStatusFilter,
    searchQuery, setSearchQuery, statusCounts, refetch,
  } = usePlatformJobs(selectedBusinessId);
  const { crew } = usePlatformCrewMembers(selectedBusinessId);
  const [selectedJob, setSelectedJob] = useState<PlatformJob | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();

  const getBiz = (bizId: string) => businesses.find(b => b.id === bizId);

  return (
    <PlatformLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Jobs</h1>
            <p className="font-body text-xs text-muted-foreground">
              {statusCounts.all} total · {statusCounts.in_progress || 0} in progress
            </p>
          </div>
          <Button size="sm" className="font-body text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Job
          </Button>
        </div>

        {/* Status pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-body font-medium whitespace-nowrap transition-all border",
              statusFilter === "all"
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            )}
          >
            All ({statusCounts.all})
          </button>
          {JOB_STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-body font-medium whitespace-nowrap transition-all border",
                statusFilter === s.value
                  ? "border-primary/30"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              )}
              style={statusFilter === s.value ? { backgroundColor: s.color + "20", color: s.color, borderColor: s.color + "40" } : {}}
            >
              {s.label} ({statusCounts[s.value] || 0})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 font-body text-sm bg-card border-border"
          />
        </div>

        {/* Jobs list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-card rounded-lg animate-pulse border border-border" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="font-body text-sm text-muted-foreground">No jobs found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map(job => {
              const biz = getBiz(job.business_id);
              return (
                <button
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className="w-full text-left bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <PriorityDot priority={job.priority} />
                        <span className="font-body text-[11px] text-muted-foreground font-mono">{job.job_number}</span>
                        <JobStatusBadge status={job.status} />
                        {!selectedBusinessId && biz && (
                          <InlineBadge shortcode={biz.shortcode} color={biz.default_business_color} />
                        )}
                      </div>
                      <p className="font-body text-sm font-medium text-foreground truncate">
                        {job.title || job.customer_name || "Untitled Job"}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground font-body">
                        {job.customer_name && (
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{job.customer_name}</span>
                        )}
                        {job.scheduled_start && (
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(job.scheduled_start), "MMM d")}</span>
                        )}
                        {job.crew_member_name && (
                          <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{job.crew_member_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {job.total != null && job.total > 0 && (
                        <p className="font-body text-sm font-semibold text-foreground">${Number(job.total).toLocaleString()}</p>
                      )}
                      <p className="font-body text-[10px] text-muted-foreground">
                        {job.total_visits_completed || 0}/{job.total_visits_planned || 1} visits
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Job Detail Drawer */}
      <Sheet open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <SheetContent className="ops-theme bg-background border-border w-full sm:max-w-lg overflow-y-auto">
          {selectedJob && (
            <JobDetailPanel
              job={selectedJob}
              crew={crew}
              onStatusChange={async (newStatus) => {
                await supabase.from("platform_jobs").update({ status: newStatus }).eq("id", selectedJob.id);
                toast({ title: "Status updated" });
                refetch();
                setSelectedJob(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Create Job Drawer */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="ops-theme bg-background border-border w-full sm:max-w-lg overflow-y-auto">
          <CreateJobForm
            businessId={selectedBusinessId}
            businesses={businesses}
            crew={crew}
            onCreated={() => { setShowCreate(false); refetch(); }}
          />
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}

function JobDetailPanel({ job, crew, onStatusChange }: {
  job: PlatformJob;
  crew: any[];
  onStatusChange: (status: string) => void;
}) {
  const currentIdx = JOB_STATUSES.findIndex(s => s.value === job.status);

  return (
    <div className="space-y-5 pt-4">
      <SheetHeader>
        <SheetTitle className="font-display text-foreground flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{job.job_number}</span>
          <JobStatusBadge status={job.status} />
        </SheetTitle>
      </SheetHeader>

      <div>
        <h3 className="font-body text-lg font-semibold text-foreground">{job.title || "Untitled Job"}</h3>
        {job.description && <p className="font-body text-sm text-muted-foreground mt-1">{job.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoBlock icon={User} label="Customer" value={job.customer_name || "—"} />
        <InfoBlock icon={MapPin} label="Property" value={job.property_address || "—"} />
        <InfoBlock icon={Calendar} label="Scheduled" value={job.scheduled_start ? format(new Date(job.scheduled_start), "MMM d, yyyy") : "—"} />
        <InfoBlock icon={Clock} label="Est. Duration" value={job.estimated_duration_minutes ? `${job.estimated_duration_minutes} min` : "—"} />
        <InfoBlock icon={Hash} label="Visits" value={`${job.total_visits_completed || 0}/${job.total_visits_planned || 1}`} />
        <InfoBlock icon={Truck} label="Crew" value={job.crew_member_name || "Unassigned"} />
      </div>

      {job.total != null && job.total > 0 && (
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="font-body text-xs text-muted-foreground mb-1">Job Total</p>
          <p className="font-display text-2xl font-bold text-foreground">${Number(job.total).toLocaleString()}</p>
        </div>
      )}

      {job.internal_notes && (
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="font-body text-xs text-muted-foreground mb-1">Internal Notes</p>
          <p className="font-body text-sm text-foreground">{job.internal_notes}</p>
        </div>
      )}

      {/* Status progression */}
      <div>
        <p className="font-body text-xs text-muted-foreground mb-2">Update Status</p>
        <div className="flex flex-wrap gap-1.5">
          {JOB_STATUSES.map(s => (
            <Button
              key={s.value}
              size="sm"
              variant={job.status === s.value ? "default" : "outline"}
              className="font-body text-xs"
              onClick={() => onStatusChange(s.value)}
              disabled={job.status === s.value}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      <p className="font-body text-[10px] text-muted-foreground">
        Created {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
      </p>
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="w-3 h-3 text-muted-foreground" />
        <p className="font-body text-[10px] text-muted-foreground">{label}</p>
      </div>
      <p className="font-body text-sm text-foreground truncate">{value}</p>
    </div>
  );
}

function CreateJobForm({ businessId, businesses, crew, onCreated }: {
  businessId: string | null;
  businesses: any[];
  crew: any[];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [bizId, setBizId] = useState(businessId || businesses[0]?.id || "");
  const [priority, setPriority] = useState("normal");
  const [crewId, setCrewId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!bizId) return;
    setSaving(true);

    // Generate job number
    const { data: numData, error: numErr } = await supabase.rpc("generate_next_number", {
      _business_id: bizId,
      _record_type: "job",
    });

    if (numErr) {
      toast({ title: "Error generating job number", description: numErr.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("platform_jobs").insert({
      business_id: bizId,
      job_number: numData,
      title: title || "New Job",
      priority,
      assigned_crew_member_id: crewId || null,
      internal_notes: notes || null,
      status: "draft",
    });

    if (error) {
      toast({ title: "Error creating job", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job created" });
      onCreated();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 pt-4">
      <SheetHeader>
        <SheetTitle className="font-display text-foreground">Create Job</SheetTitle>
      </SheetHeader>

      {!businessId && businesses.length > 1 && (
        <div>
          <label className="font-body text-xs text-muted-foreground mb-1 block">Business</label>
          <Select value={bizId} onValueChange={setBizId}>
            <SelectTrigger className="bg-card border-border font-body text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.public_brand_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <label className="font-body text-xs text-muted-foreground mb-1 block">Job Title</label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Palm Trimming - 5 trees" className="bg-card border-border font-body" />
      </div>

      <div>
        <label className="font-body text-xs text-muted-foreground mb-1 block">Priority</label>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="bg-card border-border font-body text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {crew.length > 0 && (
        <div>
          <label className="font-body text-xs text-muted-foreground mb-1 block">Assign Crew</label>
          <Select value={crewId} onValueChange={setCrewId}>
            <SelectTrigger className="bg-card border-border font-body text-sm"><SelectValue placeholder="Select crew member" /></SelectTrigger>
            <SelectContent>
              {crew.map(c => <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <label className="font-body text-xs text-muted-foreground mb-1 block">Internal Notes</label>
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." className="bg-card border-border font-body" />
      </div>

      <Button className="w-full font-body" onClick={handleSubmit} disabled={saving}>
        {saving ? "Creating..." : "Create Job"}
      </Button>
    </div>
  );
}
