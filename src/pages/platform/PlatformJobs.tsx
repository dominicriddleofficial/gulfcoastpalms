import { useEffect, useMemo, useState } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Search,
  Briefcase,
  Calendar,
  Hash,
  Clock,
  User,
  MapPin,
  FileText,
  Star,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import JobStatusProgress from "@/components/platform/jobs/JobStatusProgress";

type JobberJob = {
  id: string;
  jobber_id: string;
  title: string | null;
  status: string;
  visit_status: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  client_name: string | null;
  client_phone: string | null;
  property_address: string | null;
  assigned_employee_names: string[] | null;
  internal_notes: string | null;
  job_number: string | null;
  total_amount: number | null;
  business_id: string | null;
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  late: { bg: "#ef444420", text: "#ef4444", label: "Late" },
  today: { bg: "#22c55e20", text: "#22c55e", label: "Today" },
  scheduled: { bg: "#2563eb20", text: "#2563eb", label: "Scheduled" },
  completed: { bg: "#22c55e20", text: "#22c55e", label: "Completed" },
  upcoming: { bg: "#8b5cf620", text: "#8b5cf6", label: "Upcoming" },
};

function getStatusKey(job: JobberJob) {
  const status = (job.visit_status || job.status || "scheduled").toLowerCase();
  return STATUS_STYLES[status] ? status : "scheduled";
}

function JobStatusBadge({ job }: { job: JobberJob }) {
  const style = STATUS_STYLES[getStatusKey(job)] || STATUS_STYLES.scheduled;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-body font-medium"
      style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.text}30` }}
    >
      {style.label}
    </span>
  );
}

export default function PlatformJobs() {
  const { selectedBusinessId, businesses } = usePlatformAuth();
  const [jobs, setJobs] = useState<JobberJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<JobberJob | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("jobber_jobs")
        .select("id, jobber_id, title, status, visit_status, scheduled_start, scheduled_end, client_name, client_phone, property_address, assigned_employee_names, internal_notes, job_number, total_amount, business_id")
        .order("scheduled_start", { ascending: false, nullsFirst: false });
      setJobs((data as JobberJob[]) || []);
      setLoading(false);
    };

    fetchJobs();
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: jobs.length };
    jobs.forEach((job) => {
      const key = getStatusKey(job);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [jobs]);

  const statusOptions = useMemo(() => {
    return Object.keys(statusCounts)
      .filter((key) => key !== "all")
      .sort((a, b) => (statusCounts[b] || 0) - (statusCounts[a] || 0));
  }, [statusCounts]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesStatus = statusFilter === "all" || getStatusKey(job) === statusFilter;
      const search = searchQuery.trim().toLowerCase();
      const matchesSearch = !search || [job.job_number, job.title, job.client_name, job.property_address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
      return matchesStatus && matchesSearch;
    });
  }, [jobs, searchQuery, statusFilter]);

  const selectedBiz = businesses.find((business) => business.id === selectedBusinessId);

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-xl font-bold text-foreground">Jobs</h1>
              {selectedBiz && <InlineBadge shortcode={selectedBiz.shortcode} color={selectedBiz.default_business_color} />}
            </div>
            <p className="font-body text-xs text-muted-foreground">
              {jobs.length} synced Jobber jobs · read only
            </p>
          </div>
        </div>

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
            All ({statusCounts.all || 0})
          </button>
          {statusOptions.map((status) => {
            const style = STATUS_STYLES[status] || STATUS_STYLES.scheduled;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-body font-medium whitespace-nowrap transition-all border",
                  statusFilter === status ? "border-primary/30" : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                )}
                style={statusFilter === status ? { backgroundColor: style.bg, color: style.text, borderColor: `${style.text}40` } : {}}
              >
                {style.label} ({statusCounts[status] || 0})
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search synced jobs..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9 font-body text-sm bg-card border-border"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-20 bg-card rounded-lg animate-pulse border border-border" />)}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="font-body text-sm text-muted-foreground">No synced Jobber jobs found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredJobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="w-full text-left bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Hash className="w-3 h-3 text-primary" />
                      <span className="font-body text-[11px] text-muted-foreground font-mono">{job.job_number || "No #"}</span>
                      <JobStatusBadge job={job} />
                    </div>
                    <p className="font-body text-sm font-medium text-foreground truncate">
                      {job.title || job.client_name || "Untitled Job"}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground font-body">
                      {job.client_name && (
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{job.client_name}</span>
                      )}
                      {job.scheduled_start && (
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(job.scheduled_start), "MMM d, h:mm a")}</span>
                      )}
                      {job.property_address && (
                        <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{job.property_address}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {job.total_amount != null && (
                      <p className="font-body text-sm font-semibold text-foreground">${Number(job.total_amount).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <SheetContent className="ops-theme bg-background border-border w-full sm:max-w-lg overflow-y-auto">
          {selectedJob && <JobDetailPanel job={selectedJob} />}
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}

function JobDetailPanel({ job }: { job: JobberJob }) {
  const { selectedBusinessId } = usePlatformAuth();
  const [requestingReview, setRequestingReview] = useState(false);
  const [jobStatus, setJobStatus] = useState(job.visit_status || job.status || "scheduled");

  const requestReview = async () => {
    if (!job.client_phone) {
      toast.error("No phone number on file for this customer");
      return;
    }
    setRequestingReview(true);
    try {
      const firstName = job.client_name?.split(" ")[0] || "there";
      const message = `Hi ${firstName}! The team at Gulf Coast Palms just finished up at your property. If we did a great job today we'd really appreciate a quick Google review — it takes less than 60 seconds and means the world to us 🌴 https://g.page/r/CWzVK9t91qF_EAE/review Reply STOP to opt out.`;
      const { error } = await supabase.functions.invoke("send-sms", {
        body: { to: job.client_phone, message },
      });
      if (error) {
        toast.error("Failed to send review request");
      } else {
        toast.success(`Review request sent to ${job.client_name}`);
      }
    } catch {
      toast.error("SMS failed");
    }
    setRequestingReview(false);
  };

  const scheduleReview = async () => {
    if (!job.client_phone || !job.business_id) {
      toast.error("Missing phone or business info");
      return;
    }
    const scheduledFor = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("review_requests").insert({
      job_id: job.id,
      business_id: job.business_id,
      customer_name: job.client_name,
      customer_phone: job.client_phone,
      scheduled_for: scheduledFor,
      status: "pending",
    });
    if (error) {
      toast.error("Failed to schedule review request");
    } else {
      toast.success("Review request scheduled for 2 hours from now");
    }
  };

  const isCompleted = (job.visit_status || job.status || "").toLowerCase() === "completed";

  return (
    <div className="space-y-5 pt-4">
      <SheetHeader>
        <SheetTitle className="font-display text-foreground flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm text-muted-foreground">{job.job_number || "No job #"}</span>
          <JobStatusBadge job={job} />
        </SheetTitle>
      </SheetHeader>

      <div>
        <h3 className="font-body text-lg font-semibold text-foreground">{job.title || "Untitled Job"}</h3>
        <p className="font-body text-xs text-muted-foreground mt-1">Managed in Jobber</p>
      </div>

      {isCompleted && job.client_phone && (
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 font-body text-xs" onClick={requestReview} disabled={requestingReview}>
            <Star className="w-3.5 h-3.5 mr-1" /> {requestingReview ? "Sending…" : "Request Review Now"}
          </Button>
          <Button size="sm" variant="outline" className="font-body text-xs" onClick={scheduleReview}>
            <Clock className="w-3.5 h-3.5 mr-1" /> Schedule (2hr)
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <InfoBlock icon={User} label="Customer" value={job.client_name || "—"} />
        <InfoBlock icon={MapPin} label="Property" value={job.property_address || "—"} />
        <InfoBlock icon={Calendar} label="Scheduled" value={job.scheduled_start ? format(new Date(job.scheduled_start), "MMM d, yyyy") : "Unscheduled"} />
        <InfoBlock icon={Clock} label="Time" value={job.scheduled_start ? format(new Date(job.scheduled_start), "h:mm a") : "—"} />
      </div>

      {job.total_amount != null && (
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="font-body text-xs text-muted-foreground mb-1">Job Total</p>
          <p className="font-display text-2xl font-bold text-foreground">${Number(job.total_amount).toLocaleString()}</p>
        </div>
      )}

      {job.assigned_employee_names && job.assigned_employee_names.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="font-body text-xs text-muted-foreground mb-1">Assigned Crew</p>
          <p className="font-body text-sm text-foreground">{job.assigned_employee_names.join(", ")}</p>
        </div>
      )}

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
