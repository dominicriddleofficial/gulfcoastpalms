import { useEffect, useMemo, useRef, useState } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Plus,
  CheckCircle2,
  XCircle,
  Trash2,
  Receipt,
  Pencil,
  Save,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import JobStatusProgress from "@/components/platform/jobs/JobStatusProgress";
import AssignedCrewPicker from "@/components/platform/jobs/AssignedCrewPicker";
import { useCreateSheets } from "@/components/platform/CreateSheetsProvider";
import { useUserRole } from "@/hooks/useUserRole";
import { enrollCompletedJobInDrip } from "@/lib/drip-enrollment";
import AddressAutocomplete, { type VerifiedAddress } from "@/components/platform/AddressAutocomplete";
import EditAddressDialog from "@/components/platform/EditAddressDialog";
import VisitTimer from "@/components/platform/jobs/VisitTimer";

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
  source?: "jobber" | "platform";
};

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
  const { open: openSheet, createdTick } = useCreateSheets();
  const { isOwner } = useUserRole();
  const [jobs, setJobs] = useState<JobberJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "platform" | "jobber">("all");
  const [selectedJob, setSelectedJob] = useState<JobberJob | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      let q = supabase
        .from("jobber_jobs")
        .select("id, jobber_id, title, status, visit_status, scheduled_start, scheduled_end, client_name, client_phone, property_address, assigned_employee_names, internal_notes, job_number, total_amount, business_id")
        .order("scheduled_start", { ascending: false, nullsFirst: false });
      // CRITICAL: filter by active workspace to prevent GCP/PPS data bleed.
      if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
      const { data: jobberData } = await q;
      const jobberRows: JobberJob[] = (jobberData || []).map((j: any) => ({ ...j, source: "jobber" as const }));

      // Native platform jobs
      let pq = supabase
        .from("platform_jobs")
        .select("id, job_number, title, status, scheduled_start, scheduled_end, internal_notes, total, business_id, customer_id, platform_customers(display_name, phone), platform_properties(address_1, city)")
        .is("deleted_at", null)
        .order("scheduled_start", { ascending: false, nullsFirst: false });
      if (selectedBusinessId) pq = pq.eq("business_id", selectedBusinessId);
      const { data: platformData } = await pq;
      const platformRows: JobberJob[] = (platformData || []).map((j: any) => ({
        id: j.id,
        jobber_id: "",
        title: j.title,
        status: j.status,
        visit_status: null,
        scheduled_start: j.scheduled_start,
        scheduled_end: j.scheduled_end,
        client_name: j.platform_customers?.display_name ?? null,
        client_phone: j.platform_customers?.phone ?? null,
        property_address: j.platform_properties ? `${j.platform_properties.address_1}, ${j.platform_properties.city}` : null,
        assigned_employee_names: null,
        internal_notes: j.internal_notes,
        job_number: j.job_number,
        total_amount: j.total,
        business_id: j.business_id,
        source: "platform" as const,
      }));

      const merged = [...platformRows, ...jobberRows].sort((a, b) => {
        const ta = a.scheduled_start ? new Date(a.scheduled_start).getTime() : 0;
        const tb = b.scheduled_start ? new Date(b.scheduled_start).getTime() : 0;
        return tb - ta;
      });
      setJobs(merged);
      setLoading(false);
    };

    fetchJobs();
  }, [selectedBusinessId, createdTick]);

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
      const matchesSource = sourceFilter === "all" || job.source === sourceFilter;
      const search = searchQuery.trim().toLowerCase();
      const matchesSearch = !search || [job.job_number, job.title, job.client_name, job.property_address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
      return matchesStatus && matchesSource && matchesSearch;
    });
  }, [jobs, searchQuery, statusFilter, sourceFilter]);

  const jobberCount = useMemo(() => jobs.filter(j => j.source === "jobber").length, [jobs]);
  const platformCount = useMemo(() => jobs.filter(j => j.source === "platform").length, [jobs]);

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
              {jobs.length} jobs · {jobberCount} synced from Jobber · {platformCount} created here
            </p>
          </div>
          <Button size="sm" onClick={() => openSheet("job")} className="shrink-0">
            <Plus className="w-4 h-4 mr-1" /> New Job
          </Button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {(["all","platform","jobber"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-body font-medium whitespace-nowrap transition-all border",
                sourceFilter === s ? "bg-primary/15 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              )}
            >
              {s === "all" ? `All (${jobs.length})` : s === "platform" ? `Native (${platformCount})` : `Synced (${jobberCount})`}
            </button>
          ))}
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
                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-body font-medium",
                        job.source === "platform"
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : "bg-muted text-muted-foreground border border-border"
                      )}>
                        {job.source === "platform" ? "Native" : "Jobber"}
                      </span>
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
          {selectedJob && (
            <JobDetailPanel
              job={selectedJob}
              onClose={() => setSelectedJob(null)}
              onChanged={() => {
                setSelectedJob(null);
                // bump createdTick equivalent — refetch by toggling a state via createdTick from provider
                // We refetch by re-running the effect: easiest is to re-trigger via a local refresh key.
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}

function JobDetailPanel({ job, onClose, onChanged }: { job: JobberJob; onClose: () => void; onChanged: () => void }) {
  const { selectedBusinessId } = usePlatformAuth();
  const { notifyCreated, open: openSheet } = useCreateSheets();
  const { isStaff } = useUserRole();
  const [requestingReview, setRequestingReview] = useState(false);
  const [jobStatus, setJobStatus] = useState(job.visit_status || job.status || "scheduled");
  const [acting, setActing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingAddress, setEditingAddress] = useState<{
    target: "platform_property" | "jobber_property";
    propertyId: string;
    customerId: string | null;
    initial: { address_1: string; city?: string | null; state?: string | null; zip?: string | null; verified?: boolean };
  } | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const isNative = job.source === "platform";

  const openEditAddress = async () => {
    setLoadingAddress(true);
    try {
      if (isNative) {
        const { data: row } = await supabase
          .from("platform_jobs")
          .select("property_id, customer_id, platform_properties(id, address_1, city, state, zip, address_verified)")
          .eq("id", job.id)
          .maybeSingle();
        const prop = (row as any)?.platform_properties;
        if (!prop?.id) {
          toast.error("This job has no linked property to edit.");
          return;
        }
        setEditingAddress({
          target: "platform_property",
          propertyId: prop.id,
          customerId: (row as any)?.customer_id ?? null,
          initial: { address_1: prop.address_1, city: prop.city, state: prop.state, zip: prop.zip, verified: !!prop.address_verified },
        });
      } else {
        const { data: row } = await supabase
          .from("jobber_jobs")
          .select("property_id, jobber_properties(id, street1, city, state, zip, address_verified)")
          .eq("id", job.id)
          .maybeSingle();
        const prop = (row as any)?.jobber_properties;
        if (!prop?.id) {
          toast.error("Imported job needs local address mirror first.");
          return;
        }
        setEditingAddress({
          target: "jobber_property",
          propertyId: prop.id,
          customerId: null,
          initial: { address_1: prop.street1 || "", city: prop.city, state: prop.state, zip: prop.zip, verified: !!prop.address_verified },
        });
      }
    } finally {
      setLoadingAddress(false);
    }
  };

  const finishUpdate = (error: { message: string } | null, successMsg: string) => {
    if (error) toast.error(error.message);
    else { toast.success(successMsg); notifyCreated(); onChanged(); }
    setActing(false);
  };

  const markComplete = async () => {
    setActing(true);
    const { data: row, error } = await supabase.from("platform_jobs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", job.id)
      .select("business_id, customer_id")
      .maybeSingle();
    if (!error && row?.business_id && row?.customer_id) {
      enrollCompletedJobInDrip({
        businessId: row.business_id,
        customerId: row.customer_id,
        jobId: job.id,
      }).catch((err) => {
        if (import.meta.env.DEV) console.error("[drip] enroll failed", err);
      });
    }
    finishUpdate(error, "Job marked complete");
  };

  const markCompleteJobber = async () => {
    if (!job.business_id) {
      toast.error("Missing business context for this job.");
      return;
    }
    setActing(true);
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("jobber_jobs")
      .update({ visit_status: "completed" })
      .eq("id", job.id);
    if (error) {
      finishUpdate(error, "");
      return;
    }
    // Stamp completed_at (and started_at if missing) so duration shows
    const { data: existing } = await supabase
      .from("job_visit_events")
      .select("id, started_at")
      .eq("jobber_job_id", job.id)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("job_visit_events")
        .update({
          completed_at: nowIso,
          ...(existing.started_at ? {} : { started_at: nowIso }),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("job_visit_events").insert({
        jobber_job_id: job.id,
        business_id: job.business_id,
        started_at: nowIso,
        completed_at: nowIso,
      });
    }
    setJobStatus("completed");
    finishUpdate(null, "Job marked complete");
  };

  const cancelJob = async () => {
    const reason = window.prompt("Cancellation reason (optional):") ?? "";
    setActing(true);
    const { error } = await supabase.from("platform_jobs")
      .update({ status: "cancelled", internal_notes: reason ? `[Cancelled] ${reason}` : null })
      .eq("id", job.id);
    finishUpdate(error, "Job cancelled");
  };

  const deleteJob = async () => {
    if (!window.confirm("Delete this job? This can be undone by a workspace owner.")) return;
    setActing(true);
    const { error } = await supabase.from("platform_jobs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", job.id);
    finishUpdate(error, "Job deleted");
  };

  const createInvoiceFromJob = async () => {
    if (!selectedBusinessId) return;
    const total = Number(job.total_amount ?? 0);
    if (!total) {
      toast.warning("No job amount set. Add amount before sending invoice.");
    }

    let customerPayload: { id: string; display_name: string; phone: string | null; email: string | null } | null = null;
    let fromJobId: string | undefined;
    let serviceAddress:
      | {
          line1?: string | null;
          line2?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          formatted_address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          place_id?: string | null;
          property_id?: string | null;
        }
      | null = null;

    if (isNative) {
      const { data: jobRow } = await supabase
        .from("platform_jobs")
        .select("customer_id, property_id, platform_customers(display_name, phone, email), platform_properties(id, address_1, address_2, city, state, zip, formatted_address, latitude, longitude, map_place_id)")
        .eq("id", job.id)
        .maybeSingle();
      const c = jobRow?.platform_customers as { display_name: string; phone: string | null; email: string | null } | null;
      const p = (jobRow as any)?.platform_properties as
        | { id: string; address_1: string; address_2: string | null; city: string; state: string; zip: string; formatted_address: string | null; latitude: number | null; longitude: number | null; map_place_id: string | null }
        | null;
      if (jobRow?.customer_id) {
        customerPayload = {
          id: jobRow.customer_id,
          display_name: c?.display_name || job.client_name || "Customer",
          phone: c?.phone ?? null,
          email: c?.email ?? null,
        };
      }
      if (p) {
        serviceAddress = {
          line1: p.address_1,
          line2: p.address_2,
          city: p.city,
          state: p.state,
          zip: p.zip,
          formatted_address: p.formatted_address,
          latitude: p.latitude != null ? Number(p.latitude) : null,
          longitude: p.longitude != null ? Number(p.longitude) : null,
          place_id: p.map_place_id,
          property_id: p.id,
        };
      }
      fromJobId = job.id;
    } else {
      // Jobber-imported: try matching customer by name within this business
      if (job.client_name && selectedBusinessId) {
        const { data: cust } = await supabase
          .from("platform_customers")
          .select("id, display_name, phone, email")
          .eq("business_id", selectedBusinessId)
          .ilike("display_name", job.client_name)
          .maybeSingle();
        if (cust) {
          customerPayload = {
            id: cust.id,
            display_name: cust.display_name,
            phone: cust.phone,
            email: cust.email,
          };
        }
      }
      // Try to load the imported jobber property for this job, fall back to free-text property_address.
      const { data: jjRow } = await supabase
        .from("jobber_jobs")
        .select("property_id, jobber_properties(street1, street2, city, state, zip, formatted_address, lat, lng, place_id)")
        .eq("id", job.id)
        .maybeSingle();
      const jp = (jjRow as any)?.jobber_properties as
        | { street1: string | null; street2: string | null; city: string | null; state: string | null; zip: string | null; formatted_address: string | null; lat: number | null; lng: number | null; place_id: string | null }
        | null;
      if (jp && (jp.street1 || jp.city)) {
        serviceAddress = {
          line1: jp.street1,
          line2: jp.street2,
          city: jp.city,
          state: jp.state,
          zip: jp.zip,
          formatted_address: jp.formatted_address,
          latitude: jp.lat != null ? Number(jp.lat) : null,
          longitude: jp.lng != null ? Number(jp.lng) : null,
          place_id: jp.place_id,
          property_id: null,
        };
      } else if (job.property_address) {
        serviceAddress = {
          line1: job.property_address,
          line2: null,
          city: null,
          state: null,
          zip: null,
          formatted_address: job.property_address,
          latitude: null,
          longitude: null,
          place_id: null,
          property_id: null,
        };
      }
    }

    if (!customerPayload && !job.client_name) {
      toast.error("Unable to create invoice because job has no customer.");
      return;
    }

    onClose();
    openSheet("invoice", {
      customer: customerPayload,
      items: [{ description: job.title || "Job", quantity: 1, unit_price: total }],
      fromJobId,
      serviceAddress,
    });
  };

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

  const isCompleted = jobStatus.toLowerCase() === "completed" || jobStatus.toLowerCase() === "complete";

  return (
    <>
    <div className="space-y-5 pt-4">
      <SheetHeader>
        <SheetTitle className="font-display text-foreground flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm text-muted-foreground">{job.job_number || "No job #"}</span>
          <JobStatusBadge job={job} />
        </SheetTitle>
      </SheetHeader>

      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-body text-lg font-semibold text-foreground flex-1">{job.title || "Untitled Job"}</h3>
          {isStaff && !editing && (
            <Button size="sm" variant="outline" className="font-body text-xs shrink-0" onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
          )}
        </div>
        <p className="font-body text-xs text-muted-foreground mt-1">
          {job.source === "platform" ? "Native job — created in platform" : "Synced from Jobber — edits saved locally"}
        </p>
      </div>

      {editing && isStaff && (
        <JobEditForm
          job={job}
          onCancel={() => setEditing(false)}
          onSaved={() => { setEditing(false); notifyCreated(); onChanged(); }}
        />
      )}

      {isNative && (
        <div className="grid grid-cols-2 gap-2">
          {jobStatus !== "completed" && (
            <Button size="sm" variant="outline" className="font-body text-xs" onClick={markComplete} disabled={acting}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Complete
            </Button>
          )}
          <Button size="sm" variant="outline" className="font-body text-xs" onClick={createInvoiceFromJob} disabled={acting}>
            <Receipt className="w-3.5 h-3.5 mr-1" /> Create Invoice
          </Button>
          {jobStatus !== "cancelled" && (
            <Button size="sm" variant="outline" className="font-body text-xs" onClick={cancelJob} disabled={acting}>
              <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
          )}
          <Button size="sm" variant="outline" className="font-body text-xs text-destructive" onClick={deleteJob} disabled={acting}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
        </div>
      )}

      {/* Job Status Progress (Jobber-synced flow uses jobber_jobs table) */}
      {job.source !== "platform" && (
      <JobStatusProgress
        jobId={job.id}
        businessId={job.business_id}
        clientName={job.client_name}
        clientPhone={job.client_phone}
        currentStatus={jobStatus}
        onStatusChange={(s) => setJobStatus(s)}
      />
      )}

      {/* Live timer / completed duration (works for both native + Jobber jobs) */}
      <VisitTimer jobberJobId={job.id} status={jobStatus} />

      {/* Quick "Mark Complete" for Jobber-imported jobs (skip timer flow) */}
      {!isNative && !isCompleted && (
        <Button
          size="sm"
          variant="outline"
          className="w-full font-body text-xs"
          onClick={markCompleteJobber}
          disabled={acting}
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Complete
        </Button>
      )}

      {/* Invoice action for Jobber-imported jobs */}
      {!isNative && (
        <Button
          size="sm"
          variant="outline"
          className="w-full font-body text-xs"
          onClick={createInvoiceFromJob}
          disabled={acting}
        >
          <Receipt className="w-3.5 h-3.5 mr-1" /> Create Invoice
        </Button>
      )}

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
        <button
          type="button"
          onClick={() => isStaff && openEditAddress()}
          disabled={!isStaff || loadingAddress}
          className="text-left bg-card border border-border rounded-lg p-2.5 hover:border-primary/30 transition-colors disabled:opacity-100 disabled:cursor-default"
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <p className="font-body text-[10px] text-muted-foreground">
              Property {isStaff && <span className="text-primary">· Edit</span>}
            </p>
          </div>
          <p className="font-body text-sm text-foreground truncate">{job.property_address || "—"}</p>
        </button>
        <InfoBlock icon={Calendar} label="Scheduled" value={job.scheduled_start ? format(new Date(job.scheduled_start), "MMM d, yyyy") : "Unscheduled"} />
        <InfoBlock icon={Clock} label="Time" value={job.scheduled_start ? format(new Date(job.scheduled_start), "h:mm a") : "—"} />
      </div>

      {job.total_amount != null && (
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="font-body text-xs text-muted-foreground mb-1">Job Total</p>
          <p className="font-display text-2xl font-bold text-foreground">${Number(job.total_amount).toLocaleString()}</p>
        </div>
      )}

      {/* Platform-managed crew assignment (drives /platform/crew visibility) */}
      {job.business_id && job.source !== "platform" && (
        <AssignedCrewPicker jobberJobId={job.id} businessId={job.business_id} />
      )}

      {job.assigned_employee_names && job.assigned_employee_names.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="font-body text-xs text-muted-foreground mb-1">Jobber Crew (synced)</p>
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
    {editingAddress && selectedBusinessId && (
      <EditAddressDialog
        open={!!editingAddress}
        onOpenChange={(o) => !o && setEditingAddress(null)}
        target={editingAddress.target}
        propertyId={editingAddress.propertyId}
        businessId={selectedBusinessId}
        customerId={editingAddress.customerId}
        initial={editingAddress.initial}
        onSaved={() => { notifyCreated(); onChanged(); }}
      />
    )}
    </>
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

function JobEditForm({
  job,
  onCancel,
  onSaved,
}: {
  job: JobberJob;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const isNative = job.source === "platform";
  const initialDate = job.scheduled_start ? format(new Date(job.scheduled_start), "yyyy-MM-dd") : "";
  const initialStart = job.scheduled_start ? format(new Date(job.scheduled_start), "HH:mm") : "";
  const initialEnd = job.scheduled_end ? format(new Date(job.scheduled_end), "HH:mm") : "";

  const [title, setTitle] = useState(job.title ?? "");
  const [notes, setNotes] = useState(job.internal_notes ?? "");
  const [total, setTotal] = useState(job.total_amount != null ? String(job.total_amount) : "");
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState(job.property_address ?? "");
  const [verifiedAddr, setVerifiedAddr] = useState<VerifiedAddress | null>(null);
  const initialAddressRef = useRef(job.property_address ?? "");

  const save = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    const totalNum = total === "" ? null : Number(total);
    if (totalNum != null && Number.isNaN(totalNum)) {
      toast.error("Total must be a number");
      setSaving(false);
      return;
    }

    try {
      if (isNative) {
        const { error: jobErr } = await supabase
          .from("platform_jobs")
          .update({
            title: title.trim(),
            internal_notes: notes || null,
            total: totalNum,
            ...(date ? { scheduled_start: date, scheduled_end: date } : {}),
          })
          .eq("id", job.id);
        if (jobErr) throw jobErr;

        // Address update for native jobs — patch the linked property_id
        const addressChanged = address.trim() !== initialAddressRef.current.trim();
        if (addressChanged || verifiedAddr) {
          const { data: jobRow } = await supabase
            .from("platform_jobs")
            .select("property_id")
            .eq("id", job.id)
            .maybeSingle();
          if (jobRow?.property_id) {
            type PropUpdate = Database["public"]["Tables"]["platform_properties"]["Update"];
            const patch: PropUpdate = verifiedAddr
              ? {
                  address_1: verifiedAddr.street_address || verifiedAddr.formatted_address,
                  ...(verifiedAddr.city ? { city: verifiedAddr.city } : {}),
                  ...(verifiedAddr.state ? { state: verifiedAddr.state } : {}),
                  ...(verifiedAddr.postal_code ? { zip: verifiedAddr.postal_code } : {}),
                  formatted_address: verifiedAddr.formatted_address,
                  street_number: verifiedAddr.street_number,
                  route: verifiedAddr.route,
                  county: verifiedAddr.county,
                  latitude: verifiedAddr.latitude,
                  longitude: verifiedAddr.longitude,
                  map_place_id: verifiedAddr.place_id,
                  address_verified: true,
                  address_verified_at: new Date().toISOString(),
                  geocode_source: "google_places",
                  geocode_status: "success",
                }
              : {
                  // text changed without verification — clear stale coords
                  address_1: address.trim(),
                  latitude: null,
                  longitude: null,
                  map_place_id: null,
                  formatted_address: null,
                  address_verified: false,
                  address_verified_at: null,
                  geocode_source: null,
                  geocode_status: "pending",
                };
            const { error: pErr } = await supabase
              .from("platform_properties")
              .update(patch)
              .eq("id", jobRow.property_id);
            if (pErr) throw pErr;
          }
        }

        // Sync first visit row to match
        if (date || startTime || endTime) {
          const { data: visits } = await supabase
            .from("platform_job_visits")
            .select("id, visit_number")
            .eq("job_id", job.id)
            .order("visit_number", { ascending: true })
            .limit(1);
          const visitPatch = {
            ...(date ? { scheduled_date: date } : {}),
            ...(startTime ? { scheduled_start_time: startTime } : {}),
            ...(endTime ? { scheduled_end_time: endTime } : {}),
          };
          if (visits && visits[0]) {
            const { error: vErr } = await supabase
              .from("platform_job_visits")
              .update(visitPatch)
              .eq("id", visits[0].id);
            if (vErr) throw vErr;
          } else if (job.business_id && date) {
            const { error: vInsErr } = await supabase.from("platform_job_visits").insert({
              business_id: job.business_id,
              job_id: job.id,
              visit_number: 1,
              title: title.trim(),
              status: "scheduled",
              scheduled_date: date,
              scheduled_start_time: startTime || null,
              scheduled_end_time: endTime || null,
            });
            if (vInsErr) throw vInsErr;
          }
        }
      } else {
        // Jobber-imported: update local mirror in jobber_jobs (timestamptz)
        const schedulePatch = date
          ? startTime
            ? {
                scheduled_start: new Date(`${date}T${startTime}:00`).toISOString(),
                scheduled_end: new Date(
                  `${date}T${endTime || startTime}:00`,
                ).toISOString(),
              }
            : { scheduled_start: new Date(`${date}T08:00:00`).toISOString() }
          : {};
        const { error: jErr } = await supabase
          .from("jobber_jobs")
          .update({
            title: title.trim(),
            internal_notes: notes || null,
            total_amount: totalNum,
            ...(address.trim() !== initialAddressRef.current.trim()
              ? { property_address: address.trim() }
              : {}),
            ...schedulePatch,
          })
          .eq("id", job.id);
        if (jErr) throw jErr;
      }

      toast.success("Job updated");
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save job";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-3">
      <div>
        <Label className="font-body text-xs text-muted-foreground">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3">
          <Label className="font-body text-xs text-muted-foreground">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="font-body text-xs text-muted-foreground">Start</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="font-body text-xs text-muted-foreground">End</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="font-body text-xs text-muted-foreground">Total ($)</Label>
          <Input type="number" inputMode="decimal" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} className="mt-1" />
        </div>
      </div>
      <div>
        <Label className="font-body text-xs text-muted-foreground">Instructions / notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1" />
      </div>
      <AddressAutocomplete
        label="Address"
        value={address}
        onTextChange={setAddress}
        onSelect={(v) => {
          setVerifiedAddr(v);
          setAddress(v.formatted_address);
        }}
        onUnverify={() => setVerifiedAddr(null)}
        verified={!!verifiedAddr}
      />
      <div className="flex gap-2 justify-end pt-1">
        <Button size="sm" variant="outline" className="font-body text-xs" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" className="font-body text-xs" onClick={save} disabled={saving}>
          <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
