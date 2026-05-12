import { useEffect, useMemo, useState } from "react";
import { format, startOfToday, addDays, isToday, isTomorrow, isWithinInterval } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  MapPin, Phone, Navigation as NavigationIcon, Clock, Users as UsersIcon,
  ChevronLeft, Play, CheckCircle2, Loader2, Camera, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { enrollCompletedJobInDrip } from "@/lib/drip-enrollment";
import { enqueueMutation } from "@/lib/offline/queue";
import { processQueueOnce, startSyncEngine } from "@/lib/offline/sync";
import { getOfflineDB, setMeta } from "@/lib/offline/db";
import { useOnlineStatus } from "@/lib/offline/hooks";
import OfflineBanner from "@/components/platform/offline/OfflineBanner";
import LastSyncedLabel from "@/components/platform/offline/LastSyncedLabel";
import { usePullToRefresh } from "@/lib/offline/usePullToRefresh";

type CrewJob = {
  id: string;
  business_id: string;
  job_number: string;
  title: string | null;
  job_type: string | null;
  status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  estimated_duration_minutes: number | null;
  internal_notes: string | null;
  client_notes: string | null;
  assigned_to: string[];
  assigned_crew_member_id: string | null;
  customer_id: string | null;
  property_id: string | null;
  completed_at: string | null;
  customer?: {
    display_name: string | null;
    phone: string | null;
  } | null;
  property?: {
    address_1: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    gate_code: string | null;
    access_notes: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
};

type Tab = "today" | "tomorrow" | "week";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-blue-500/15 text-blue-300 border-blue-500/25" },
  in_progress: { label: "In Progress", cls: "bg-amber-500/15 text-amber-300 border-amber-500/25" },
  on_my_way: { label: "On My Way", cls: "bg-purple-500/15 text-purple-300 border-purple-500/25" },
  on_site: { label: "On Site", cls: "bg-amber-500/15 text-amber-300 border-amber-500/25" },
  completed: { label: "Complete", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" },
  complete: { label: "Complete", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" },
  cancelled: { label: "Cancelled", cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/25" },
};

function formatAddress(p: CrewJob["property"]) {
  if (!p) return "";
  const parts = [p.address_1, [p.city, p.state].filter(Boolean).join(", "), p.zip].filter(Boolean);
  return parts.join(" · ");
}

function buildDirectionsUrl(p: CrewJob["property"]) {
  if (!p) return "#";
  const address = [p.address_1, p.city, p.state, p.zip].filter(Boolean).join(", ");
  const encoded = encodeURIComponent(address);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    return `maps://?daddr=${encoded}`;
  }
  return `https://maps.apple.com/?daddr=${encoded}`;
}

export default function PlatformCrew() {
  const auth = usePlatformAuth();
  const { userId, role, isLoading: roleLoading } = useUserRole();
  const [tab, setTab] = useState<Tab>("today");
  const [jobs, setJobs] = useState<CrewJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CrewJob | null>(null);
  const [hydratedFromCache, setHydratedFromCache] = useState(false);
  const online = useOnlineStatus();

  const today = useMemo(() => startOfToday(), []);
  const businessId = auth.selectedBusinessId;

  // Start the background sync loop once.
  useEffect(() => {
    startSyncEngine();
  }, []);

  useEffect(() => {
    if (!userId || !businessId) return;
    let cancelled = false;

    // Hydrate from IndexedDB first so the screen is usable instantly,
    // even on a flaky connection.
    (async () => {
      try {
        const db = await getOfflineDB();
        const cached = await db.getAll("cached_jobs");
        const mine = cached.filter((c) => c.user_id === userId && c.business_id === businessId);
        if (mine.length > 0 && !cancelled) {
          setJobs(mine.map((c) => c.data as CrewJob));
          setHydratedFromCache(true);
          setLoading(false);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn("[offline] cache hydrate failed", err);
      }
    })();

    async function loadJobs() {
      setLoading(true);
      const start = format(today, "yyyy-MM-dd");
      const end = format(addDays(today, 7), "yyyy-MM-dd");

      // 1. Native platform_jobs
      const { data: platformData } = await supabase
        .from("platform_jobs")
        .select(`
          id, business_id, job_number, title, job_type, status,
          scheduled_start, scheduled_end, estimated_duration_minutes,
          internal_notes, client_notes, assigned_to, assigned_crew_member_id,
          customer_id, property_id, completed_at
        `)
        .eq("business_id", businessId)
        .gte("scheduled_start", start)
        .lte("scheduled_start", end)
        .order("scheduled_start", { ascending: true });

      const native = (platformData || []) as CrewJob[];
      const nativeFiltered = role === "crew"
        ? native.filter(j => (j.assigned_to || []).includes(userId!) || j.assigned_crew_member_id === userId)
        : native;

      // 2. Jobber-synced jobs (via jobber_job_assignments)
      let jobberAssignedIds: string[] | null = null;
      if (role === "crew") {
        const { data: assignments } = await supabase
          .from("jobber_job_assignments")
          .select("jobber_job_id")
          .eq("business_id", businessId)
          .eq("user_id", userId!);
        jobberAssignedIds = (assignments || []).map(a => a.jobber_job_id);
        if (jobberAssignedIds.length === 0) jobberAssignedIds = null;
      }

      let jobberQuery = supabase
        .from("jobber_jobs")
        .select("id, title, status, visit_status, scheduled_start, scheduled_end, client_name, client_phone, property_address, internal_notes, job_number, business_id")
        .eq("business_id", businessId)
        .gte("scheduled_start", new Date(start).toISOString())
        .lte("scheduled_start", new Date(end).toISOString() + "T23:59:59")
        .order("scheduled_start", { ascending: true });
      if (role === "crew") {
        if (!jobberAssignedIds) {
          jobberQuery = jobberQuery.eq("id", "00000000-0000-0000-0000-000000000000"); // none
        } else {
          jobberQuery = jobberQuery.in("id", jobberAssignedIds);
        }
      }
      const { data: jobberData } = await jobberQuery;

      // Get assignment counts per jobber job (for "X crew" chip)
      const jobberIds = (jobberData || []).map(j => j.id);
      let jobberAssignmentCounts = new Map<string, number>();
      if (jobberIds.length) {
        const { data: counts } = await supabase
          .from("jobber_job_assignments")
          .select("jobber_job_id")
          .in("jobber_job_id", jobberIds);
        (counts || []).forEach((c: any) => {
          jobberAssignmentCounts.set(c.jobber_job_id, (jobberAssignmentCounts.get(c.jobber_job_id) || 0) + 1);
        });
      }

      const jobberConverted: CrewJob[] = (jobberData || []).map((j: any) => ({
        id: j.id,
        business_id: j.business_id,
        job_number: j.job_number || "",
        title: j.title,
        job_type: null,
        status: (j.visit_status || j.status || "scheduled").toLowerCase(),
        scheduled_start: j.scheduled_start,
        scheduled_end: j.scheduled_end,
        estimated_duration_minutes: null,
        internal_notes: j.internal_notes,
        client_notes: null,
        assigned_to: Array.from({ length: jobberAssignmentCounts.get(j.id) || 0 }, () => ""),
        assigned_crew_member_id: null,
        customer_id: null,
        property_id: null,
        completed_at: null,
        customer: { display_name: j.client_name, phone: j.client_phone },
        property: j.property_address ? {
          address_1: j.property_address, city: null, state: null, zip: null,
          gate_code: null, access_notes: null, latitude: null, longitude: null,
        } : null,
      }));

      const filtered = [...nativeFiltered, ...jobberConverted];
      if (cancelled) return;

      // Hydrate customer + property
      const customerIds = [...new Set(filtered.map(j => j.customer_id).filter(Boolean) as string[])];
      const propertyIds = [...new Set(filtered.map(j => j.property_id).filter(Boolean) as string[])];

      const [{ data: customers }, { data: properties }] = await Promise.all([
        customerIds.length
          ? supabase.from("platform_customers").select("id, display_name, phone").in("id", customerIds)
          : Promise.resolve({ data: [] as any[] }),
        propertyIds.length
          ? supabase.from("platform_properties")
              .select("id, address_1, city, state, zip, gate_code, access_notes, latitude, longitude")
              .in("id", propertyIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      if (cancelled) return;

      const cMap = new Map((customers || []).map((c: any) => [c.id, c]));
      const pMap = new Map((properties || []).map((p: any) => [p.id, p]));

      const enriched = filtered.map(j => ({
        ...j,
        customer: j.customer_id ? cMap.get(j.customer_id) ?? null : null,
        property: j.property_id ? pMap.get(j.property_id) ?? null : null,
      }));

      setJobs(enriched);
      setLoading(false);

      // Persist today/this-week jobs for offline use.
      try {
        const db = await getOfflineDB();
        const tx = db.transaction("cached_jobs", "readwrite");
        // Wipe stale entries for this user/business so deleted jobs don't linger.
        const all = await tx.store.getAll();
        for (const c of all) {
          if (c.user_id === userId && c.business_id === businessId) {
            await tx.store.delete(c.id);
          }
        }
        const now = Date.now();
        for (const j of enriched) {
          await tx.store.put({
            id: j.id,
            user_id: userId!,
            business_id: businessId!,
            cached_at: now,
            data: j,
          });
        }
        await tx.done;
        await setMeta("last_jobs_cache_at", now);
      } catch (err) {
        if (import.meta.env.DEV) console.warn("[offline] cache write failed", err);
      }
    }

    loadJobs().catch((err) => {
      if (import.meta.env.DEV) console.error("[crew] load jobs failed", err);
      // If we already hydrated from cache, leave that on screen.
      if (!hydratedFromCache) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId, businessId, role, today, hydratedFromCache]);

  const tabbed = useMemo(() => {
    const tomorrow = addDays(today, 1);
    const weekEnd = addDays(today, 7);
    return jobs.filter(j => {
      if (!j.scheduled_start) return false;
      const d = new Date(j.scheduled_start);
      if (tab === "today") return isToday(d);
      if (tab === "tomorrow") return isTomorrow(d);
      return isWithinInterval(d, { start: today, end: weekEnd });
    });
  }, [jobs, tab, today]);

  async function updateStatus(job: CrewJob, status: string) {
    // Translate to a queueable action.
    const action =
      status === "on_my_way"
        ? ("on_my_way" as const)
        : status === "in_progress"
        ? ("start_visit" as const)
        : ("complete_visit" as const);

    const patch: { status: string; completed_at?: string } = { status };
    if (status === "completed" || status === "complete") {
      patch.completed_at = new Date().toISOString();
    }

    await enqueueMutation({
      action,
      jobId: job.id,
      businessId: job.business_id,
      userId,
      payload: { status },
    });
    void processQueueOnce();

    if ((status === "completed" || status === "complete") && job.business_id && job.customer_id) {
      enrollCompletedJobInDrip({
        businessId: job.business_id,
        customerId: job.customer_id,
        jobId: job.id,
      }).catch((err) => {
        if (import.meta.env.DEV) console.error("[drip] enroll failed", err);
      });
    }
    toast({
      title: navigator.onLine
        ? status === "in_progress"
          ? "Job started"
          : "Job marked complete"
        : "Saved locally — will sync when online",
    });
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, ...patch } : j));
    setSelected(prev => prev && prev.id === job.id ? { ...prev, ...patch } : prev);
  }

  async function saveCrewNotes(job: CrewJob, notes: string) {
    const merged = (job.internal_notes ? job.internal_notes + "\n\n" : "") + `[Crew · ${format(new Date(), "MMM d h:mma")}] ${notes}`;
    await enqueueMutation({
      action: "add_note",
      jobId: job.id,
      businessId: job.business_id,
      userId,
      payload: { text: notes },
    });
    void processQueueOnce();
    toast({ title: navigator.onLine ? "Note saved" : "Note saved locally" });
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, internal_notes: merged } : j));
    setSelected(prev => prev && prev.id === job.id ? { ...prev, internal_notes: merged } : prev);
  }

  // Pull to refresh on the schedule list (window scroll).
  const refreshNow = async () => {
    if (!userId || !businessId) return;
    // Re-trigger the load by bumping a key; simplest: reload via auth state untouched.
    // For now, just kick the sync engine and reload.
    await processQueueOnce();
    // Force a reload of jobs by toggling loading to surface visual feedback.
    setLoading(true);
    // Trigger re-fetch by using the same effect dependencies — easiest: emulate by
    // re-running the data loader inline.
    const start = format(today, "yyyy-MM-dd");
    const end = format(addDays(today, 7), "yyyy-MM-dd");
    const { data: platformData } = await supabase
      .from("platform_jobs")
      .select(`id, business_id, job_number, title, job_type, status, scheduled_start, scheduled_end, estimated_duration_minutes, internal_notes, client_notes, assigned_to, assigned_crew_member_id, customer_id, property_id, completed_at`)
      .eq("business_id", businessId)
      .gte("scheduled_start", start)
      .lte("scheduled_start", end)
      .order("scheduled_start", { ascending: true });
    const native = (platformData || []) as CrewJob[];
    const filtered = role === "crew"
      ? native.filter(j => (j.assigned_to || []).includes(userId) || j.assigned_crew_member_id === userId)
      : native;
    setJobs((prev) => {
      // keep enrichment from previous if still relevant
      const map = new Map(prev.map((j) => [j.id, j] as const));
      return filtered.map((j) => ({ ...map.get(j.id), ...j }));
    });
    setLoading(false);
  };

  const { pullDistance, refreshing } = usePullToRefresh({ onRefresh: refreshNow });

  if (auth.loading || roleLoading) {
    return (
      <div className="ops-theme min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const firstName = (auth.userEmail || "").split("@")[0].split(".")[0];

  if (selected) {
    return (
      <>
        <OfflineBanner />
        <CrewJobDetail
          job={selected}
          onBack={() => setSelected(null)}
          onStart={() => updateStatus(selected, "in_progress")}
          onComplete={() => updateStatus(selected, "completed")}
          onSaveNotes={(text) => saveCrewNotes(selected, text)}
          userId={userId}
        />
      </>
    );
  }

  return (
    <div className="ops-theme min-h-screen bg-background text-foreground pb-24">
      <OfflineBanner />
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center text-[11px] text-muted-foreground transition-all"
          style={{ height: pullDistance, opacity: Math.min(pullDistance / 70, 1) }}
        >
          {refreshing ? "Refreshing…" : pullDistance >= 70 ? "Release to refresh" : "Pull to refresh"}
        </div>
      )}
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-border">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
              <span className="text-primary font-display text-[11px] font-bold">GCP</span>
            </div>
            <div>
              <p className="font-display text-[14px] font-semibold tracking-tight leading-tight">Gulf Coast Palms</p>
              <p className="font-body text-[11px] text-muted-foreground">Today · {format(today, "EEE, MMM d")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
              <span className="font-display text-[11px] font-bold text-primary">{firstName.charAt(0).toUpperCase()}</span>
            </div>
            <span className="font-body text-[12px] capitalize">{firstName || "Crew"}</span>
          </div>
        </div>
        <div className="px-4 pb-1.5">
          <LastSyncedLabel />
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {([
            { k: "today", label: "Today" },
            { k: "tomorrow", label: "Tomorrow" },
            { k: "week", label: "This Week" },
          ] as const).map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={cn(
                "px-4 py-1.5 rounded-full font-body text-[12px] font-medium transition-colors whitespace-nowrap",
                tab === t.k
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Job feed */}
      <main className="px-4 py-4 space-y-3 max-w-xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : tabbed.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-body text-sm text-muted-foreground">No jobs scheduled.</p>
            <p className="font-body text-xs text-muted-foreground/60 mt-1">Enjoy the break — check back later.</p>
          </div>
        ) : (
          tabbed.map(job => {
            const status = STATUS_LABEL[job.status] ?? STATUS_LABEL.scheduled;
            const crewCount = (job.assigned_to?.length || 0) || (job.assigned_crew_member_id ? 1 : 0);
            return (
              <button
                key={job.id}
                onClick={() => setSelected(job)}
                className="w-full text-left bg-card/60 hover:bg-card/80 border border-border rounded-2xl p-4 transition-colors active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-display text-[16px] font-semibold tracking-tight truncate">
                      {job.customer?.display_name || job.title || "Job"}
                    </p>
                    {job.property && (
                      <p className="font-body text-[12px] text-muted-foreground flex items-start gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                        <span className="truncate">{formatAddress(job.property)}</span>
                      </p>
                    )}
                  </div>
                  <span className={cn("shrink-0 px-2 py-0.5 rounded-full font-body text-[10px] font-medium border", status.cls)}>
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {job.scheduled_start && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/40 text-[11px] font-body text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {format(new Date(job.scheduled_start), "h:mm a")}
                      {job.scheduled_end && ` – ${format(new Date(job.scheduled_end), "h:mm a")}`}
                    </span>
                  )}
                  {job.job_type && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-body font-medium">
                      {job.job_type}
                    </span>
                  )}
                  {crewCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/40 text-[11px] font-body text-muted-foreground">
                      <UsersIcon className="w-3 h-3" />
                      {crewCount} crew
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </main>
    </div>
  );
}

function CrewJobDetail({
  job, onBack, onStart, onComplete, onSaveNotes,
}: {
  job: CrewJob;
  onBack: () => void;
  onStart: () => void;
  onComplete: () => void;
  onSaveNotes: (text: string) => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const status = STATUS_LABEL[job.status] ?? STATUS_LABEL.scheduled;
  const phone = job.customer?.phone;
  const directions = buildDirectionsUrl(job.property);
  const canStart = job.status === "scheduled" || job.status === "on_my_way";
  const canComplete = job.status === "in_progress" || job.status === "on_site";

  return (
    <div className="ops-theme min-h-screen bg-background text-foreground pb-32">
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[14px] font-semibold truncate">{job.customer?.display_name || job.title || "Job"}</p>
          <p className="font-body text-[11px] text-muted-foreground truncate">{job.job_number}</p>
        </div>
        <span className={cn("shrink-0 px-2 py-0.5 rounded-full font-body text-[10px] font-medium border", status.cls)}>
          {status.label}
        </span>
      </header>

      <div className="px-4 py-4 max-w-xl mx-auto space-y-4">
        {/* Customer / address actions */}
        <section className="bg-card/60 border border-border rounded-2xl p-4 space-y-3">
          <div>
            <p className="font-display text-[12px] uppercase tracking-wider text-muted-foreground/70 mb-1">Customer</p>
            <p className="font-display text-[16px] font-semibold">{job.customer?.display_name || "—"}</p>
            {job.property && (
              <p className="font-body text-[12px] text-muted-foreground mt-1">{formatAddress(job.property)}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {phone ? (
              <a href={`tel:${phone}`} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/15 text-primary font-body text-[13px] font-medium border border-primary/25">
                <Phone className="w-4 h-4" /> Call
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary/30 text-muted-foreground/60 font-body text-[13px]">
                <Phone className="w-4 h-4" /> No phone
              </div>
            )}
            <a href={directions} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary/60 text-foreground font-body text-[13px] font-medium border border-border">
              <NavigationIcon className="w-4 h-4" /> Directions
            </a>
          </div>
        </section>

        {/* Schedule */}
        {job.scheduled_start && (
          <section className="bg-card/60 border border-border rounded-2xl p-4">
            <p className="font-display text-[12px] uppercase tracking-wider text-muted-foreground/70 mb-1">Window</p>
            <p className="font-body text-[14px]">
              {format(new Date(job.scheduled_start), "EEE, MMM d · h:mm a")}
              {job.scheduled_end && ` – ${format(new Date(job.scheduled_end), "h:mm a")}`}
            </p>
            {job.estimated_duration_minutes && (
              <p className="font-body text-[11px] text-muted-foreground mt-0.5">Est. {job.estimated_duration_minutes} min</p>
            )}
          </section>
        )}

        {/* Service notes */}
        {(job.client_notes || job.title) && (
          <section className="bg-card/60 border border-border rounded-2xl p-4">
            <p className="font-display text-[12px] uppercase tracking-wider text-muted-foreground/70 mb-1">Service</p>
            <p className="font-body text-[14px] font-medium">{job.title}</p>
            {job.client_notes && (
              <p className="font-body text-[12px] text-muted-foreground whitespace-pre-wrap mt-2">{job.client_notes}</p>
            )}
          </section>
        )}

        {/* Site notes (gate / access / dogs / parking) */}
        {job.property && (job.property.gate_code || job.property.access_notes) && (
          <section className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4">
            <p className="font-display text-[12px] uppercase tracking-wider text-amber-300 mb-1">Site Access</p>
            {job.property.gate_code && (
              <p className="font-body text-[13px]"><span className="text-muted-foreground">Gate code:</span> <span className="font-mono font-semibold">{job.property.gate_code}</span></p>
            )}
            {job.property.access_notes && (
              <p className="font-body text-[12px] text-muted-foreground whitespace-pre-wrap mt-1">{job.property.access_notes}</p>
            )}
          </section>
        )}

        {/* Internal notes from owner */}
        {job.internal_notes && (
          <section className="bg-card/60 border border-border rounded-2xl p-4">
            <p className="font-display text-[12px] uppercase tracking-wider text-muted-foreground/70 mb-1">Notes</p>
            <p className="font-body text-[12px] text-muted-foreground whitespace-pre-wrap">{job.internal_notes}</p>
          </section>
        )}

        {/* Photo upload (placeholder hook into existing pipeline) */}
        <section className="bg-card/60 border border-border rounded-2xl p-4">
          <p className="font-display text-[12px] uppercase tracking-wider text-muted-foreground/70 mb-2">Photos</p>
          <label className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:bg-secondary/30 cursor-pointer">
            <Camera className="w-5 h-5" />
            <span className="font-body text-[13px]">Add job photo</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const path = `${job.business_id}/${job.id}/${Date.now()}-${file.name}`;
                const { error } = await supabase.storage.from("job-photos").upload(path, file);
                if (error) {
                  toast({ title: "Upload failed", description: error.message, variant: "destructive" });
                } else {
                  toast({ title: "Photo uploaded" });
                }
                e.target.value = "";
              }}
            />
          </label>
        </section>

        {/* Crew note input */}
        <section className="bg-card/60 border border-border rounded-2xl p-4">
          <p className="font-display text-[12px] uppercase tracking-wider text-muted-foreground/70 mb-2">Add a note</p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="What did you find? Anything the office should know?"
            className="bg-background/50"
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              disabled={!note.trim() || saving}
              onClick={async () => {
                setSaving(true);
                await onSaveNotes(note.trim());
                setNote("");
                setSaving(false);
              }}
            >
              {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
              Save note
            </Button>
          </div>
        </section>

        {/* Status timeline */}
        {job.completed_at && (
          <p className="font-body text-[11px] text-muted-foreground text-center">
            Completed {format(new Date(job.completed_at), "MMM d · h:mm a")}
          </p>
        )}
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-card/95 backdrop-blur border-t border-border p-4">
        <div className="max-w-xl mx-auto flex gap-2">
          {canStart && (
            <Button onClick={onStart} className="flex-1 h-12 text-[15px] font-semibold">
              <Play className="w-4 h-4 mr-2" /> Start Job
            </Button>
          )}
          {canComplete && (
            <Button onClick={onComplete} className="flex-1 h-12 text-[15px] font-semibold bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Complete Job
            </Button>
          )}
          {!canStart && !canComplete && (
            <Button onClick={onBack} variant="secondary" className="flex-1 h-12">
              <ChevronLeft className="w-4 h-4 mr-2" /> Back to today
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}