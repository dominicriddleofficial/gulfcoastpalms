import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search, Phone, MessageSquare, Mail, MapPin, Clock, FileText, Mic,
  Truck, Trash2, Copy, UserPlus, Sparkles, Check,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

type Application = {
  id: string;
  full_name: string;
  age: number | null;
  phone: string;
  email: string | null;
  city: string | null;
  position: string;
  has_transportation: boolean | null;
  has_experience: string | null;
  work_experience: string | null;
  comfortable_outdoors: boolean | null;
  why_good_fit: string | null;
  resume_url: string | null;
  voice_note_url: string | null;
  best_contact_time: string | null;
  acknowledged: boolean | null;
  status: string;
  notes: string | null;
  created_at: string;
};

const STATUSES = [
  { value: "new",          label: "New",          color: "hsl(142 71% 45%)" },
  { value: "reviewed",     label: "Contacted",    color: "hsl(45 93% 58%)"  },
  { value: "interview",    label: "Interviewing", color: "hsl(262 83% 65%)" },
  { value: "hired",        label: "Hired",        color: "hsl(160 84% 45%)" },
  { value: "rejected",     label: "Passed",       color: "hsl(0 72% 55%)"   },
] as const;

const CAREERS_URL = "https://gulfcoastpalmservices.com/careers/palm-tree-trimmer";

function statusMeta(v: string) {
  return STATUSES.find(s => s.value === v) ?? STATUSES[0];
}

function StatusPill({ status, pulse = false }: { status: string; pulse?: boolean }) {
  const s = statusMeta(status);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-body font-medium"
      style={{ backgroundColor: s.color + "20", color: s.color, border: `1px solid ${s.color}40` }}
    >
      {pulse && status === "new" && (
        <span className="relative inline-flex w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full animate-ping opacity-70" style={{ background: s.color }} />
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
        </span>
      )}
      {s.label}
    </span>
  );
}

function towFromWork(work: string | null): "Yes" | "Learning" | null {
  if (!work) return null;
  const m = work.match(/Can tow trailer:\s*(Yes|Willing to learn)/i);
  if (!m) return null;
  return /Yes/i.test(m[1]) ? "Yes" : "Learning";
}

/* ------------------------------ page ---------------------------------- */

export default function PlatformApplicants() {
  const { isOwner } = useUserRole();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter]     = useState<string>("all");
  const [search, setSearch]             = useState("");
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Application | null>(null);

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["platform-applicants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Application[];
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const roles = useMemo(() => {
    const set = new Set<string>();
    apps.forEach(a => a.position && set.add(a.position));
    return Array.from(set).sort();
  }, [apps]);

  const filtered = useMemo(() => {
    return apps.filter(a => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (roleFilter !== "all" && a.position !== roleFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !a.full_name.toLowerCase().includes(q) &&
          !a.phone.toLowerCase().includes(q) &&
          !(a.email ?? "").toLowerCase().includes(q) &&
          !(a.city ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [apps, statusFilter, roleFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: apps.length };
    STATUSES.forEach(s => { c[s.value] = 0; });
    apps.forEach(a => { c[a.status] = (c[a.status] ?? 0) + 1; });
    return c;
  }, [apps]);

  const selected = filtered.find(a => a.id === selectedId) ?? apps.find(a => a.id === selectedId) ?? null;

  const updateApp = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Application> }) => {
      const { error } = await supabase.from("job_applications").update(updates).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: ["platform-applicants"] });
      const prev = qc.getQueryData<Application[]>(["platform-applicants"]);
      qc.setQueryData<Application[]>(["platform-applicants"], (cur) =>
        (cur ?? []).map(a => (a.id === id ? { ...a, ...updates } : a)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["platform-applicants"], ctx.prev);
      toast({ title: "Update failed", variant: "destructive" });
    },
  });

  const deleteApp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-applicants"] });
      toast({ title: "Applicant deleted" });
      setSelectedId(null);
      setConfirmDelete(null);
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const copyCareersLink = async () => {
    try {
      await navigator.clipboard.writeText(CAREERS_URL);
      toast({ title: "Link copied", description: CAREERS_URL });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <PlatformLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Applicants</h1>
            <p className="font-body text-sm text-muted-foreground">
              {apps.length} application{apps.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10" onClick={copyCareersLink}>
            <Copy className="w-4 h-4" /> Copy careers link
          </Button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-body font-medium whitespace-nowrap border transition-all",
              statusFilter === "all"
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground",
            )}
          >
            All ({counts.all})
          </button>
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-body font-medium whitespace-nowrap border transition-all",
                statusFilter === s.value ? "" : "bg-secondary text-muted-foreground border-border hover:text-foreground",
              )}
              style={
                statusFilter === s.value
                  ? { backgroundColor: s.color + "20", color: s.color, borderColor: s.color + "40" }
                  : {}
              }
            >
              {s.label} ({counts[s.value] ?? 0})
            </button>
          ))}
        </div>

        {/* Role + search */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, email, city…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-card border-border h-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setRoleFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-body font-medium whitespace-nowrap border transition-all",
                roleFilter === "all"
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground",
              )}
            >
              All roles
            </button>
            {roles.map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-body font-medium whitespace-nowrap border transition-all",
                  roleFilter === r
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onCopy={copyCareersLink} />
        ) : (
          <div className="space-y-2">
            {filtered.map(app => {
              const s = statusMeta(app.status);
              const tow = towFromWork(app.work_experience);
              return (
                <div
                  key={app.id}
                  className="group relative w-full bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all"
                >
                  <span
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ background: s.color, boxShadow: `0 0 12px ${s.color}55` }}
                  />
                  <button
                    onClick={() => setSelectedId(app.id)}
                    className="w-full text-left pl-4 pr-3 py-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {app.status === "new" && (
                            <span className="relative inline-flex w-2.5 h-2.5" title="New applicant">
                              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" />
                              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                            </span>
                          )}
                          <span className="font-display text-base font-semibold text-foreground truncate">
                            {app.full_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-body font-medium bg-secondary text-foreground/80 border border-border">
                            <UserPlus className="w-2.5 h-2.5" /> {app.position}
                          </span>
                          {app.has_transportation !== null && (
                            <Chip label={`🚚 Truck: ${app.has_transportation ? "Yes" : "No"}`} />
                          )}
                          {tow && <Chip label={`🛻 Tow: ${tow}`} />}
                          {app.has_experience && <Chip label={app.has_experience} />}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80 font-body">
                          <span className="font-medium text-foreground/70">
                            {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                          </span>
                          {app.city && (
                            <span className="flex items-center gap-0.5 truncate">
                              <MapPin className="w-2.5 h-2.5" />{app.city}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <StatusPill status={app.status} pulse />
                      </div>
                    </div>
                  </button>
                  <a
                    href={`tel:${app.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Call ${app.full_name}`}
                    className="absolute right-3 bottom-3 inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={() => setSelectedId(null)}>
        <SheetContent className="ops-theme bg-card border-border w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <ApplicantDetail
              app={selected}
              canDelete={isOwner}
              onStatusChange={(next) => updateApp.mutate({ id: selected.id, updates: { status: next } })}
              onNotesSave={(notes) => updateApp.mutate({ id: selected.id, updates: { notes } })}
              onDelete={() => setConfirmDelete(selected)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this applicant?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {confirmDelete?.full_name}'s application and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && deleteApp.mutate(confirmDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PlatformLayout>
  );
}

/* ------------------------------ pieces -------------------------------- */

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-body bg-secondary text-foreground/80 border border-border">
      {label}
    </span>
  );
}

function EmptyState({ onCopy }: { onCopy: () => void }) {
  return (
    <div className="bg-card border border-border rounded-xl p-10 text-center space-y-4">
      <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="font-display text-lg font-semibold text-foreground">No applications yet</p>
        <p className="font-body text-sm text-muted-foreground">
          Share the careers page to start collecting applicants.
        </p>
      </div>
      <Button size="sm" variant="outline" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10" onClick={onCopy}>
        <Copy className="w-4 h-4" /> Copy careers link
      </Button>
    </div>
  );
}

function ApplicantDetail({
  app, canDelete, onStatusChange, onNotesSave, onDelete,
}: {
  app: Application;
  canDelete: boolean;
  onStatusChange: (next: string) => void;
  onNotesSave: (notes: string) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState<string>(app.notes ?? "");
  const [savingResume, setSavingResume] = useState(false);
  const [savingVoice, setSavingVoice]   = useState(false);

  const openStorage = async (path: string, which: "resume" | "voice") => {
    if (which === "resume") setSavingResume(true); else setSavingVoice(true);
    const { data } = await supabase.storage.from("applications").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    if (which === "resume") setSavingResume(false); else setSavingVoice(false);
  };

  const dirty = (notes ?? "") !== (app.notes ?? "");
  const tow = towFromWork(app.work_experience);

  return (
    <div className="space-y-5 pt-2">
      <SheetHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-muted-foreground font-body">
                {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
              </span>
            </div>
            <SheetTitle className="font-display text-2xl font-bold text-foreground">
              {app.full_name}
            </SheetTitle>
            <p className="font-body text-sm text-muted-foreground mt-1">{app.position}</p>
          </div>
          <div className="shrink-0"><StatusPill status={app.status} /></div>
        </div>
      </SheetHeader>

      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`tel:${app.phone}`}
          className="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-primary-foreground font-body font-bold text-sm shadow-[0_0_18px_hsl(var(--primary)/0.35)] hover:brightness-110 transition"
        >
          <Phone className="w-4 h-4" /> Call
        </a>
        <a
          href={`sms:${app.phone}`}
          className="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-secondary border border-primary/30 text-primary font-body font-bold text-sm hover:bg-primary/10 transition"
        >
          <MessageSquare className="w-4 h-4" /> Text
        </a>
      </div>

      {/* Contact rows */}
      <div className="space-y-2">
        <a href={`tel:${app.phone}`} className="flex items-center gap-2 text-sm text-foreground font-body hover:text-primary">
          <Phone className="w-4 h-4 text-primary" /> {app.phone}
        </a>
        {app.email && (
          <a href={`mailto:${app.email}`} className="flex items-center gap-2 text-sm text-foreground font-body hover:text-primary break-all">
            <Mail className="w-4 h-4 text-primary" /> {app.email}
          </a>
        )}
        {app.city && (
          <div className="flex items-center gap-2 text-sm text-foreground font-body">
            <MapPin className="w-4 h-4 text-primary" /> {app.city}
          </div>
        )}
        {app.best_contact_time && (
          <div className="flex items-center gap-2 text-sm text-foreground font-body">
            <Clock className="w-4 h-4 text-primary" /> Best time: {app.best_contact_time}
          </div>
        )}
      </div>

      {/* Status selector */}
      <div className="space-y-1.5">
        <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Status</p>
        <Select value={app.status} onValueChange={onStatusChange}>
          <SelectTrigger className="bg-secondary border-border h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {STATUSES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Qualifiers */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
        <DetailItem label="Age" value={app.age ? String(app.age) : null} />
        <DetailItem label="Own truck" value={app.has_transportation === null ? null : (app.has_transportation ? "Yes" : "No")} />
        <DetailItem label="Can tow" value={tow} />
        <DetailItem label="Experience" value={app.has_experience} />
        <DetailItem label="OK outdoors" value={app.comfortable_outdoors === null ? null : (app.comfortable_outdoors ? "Yes" : "No")} />
        <DetailItem label="Acknowledged" value={app.acknowledged ? "Yes" : "No"} />
      </div>

      {/* Long-form */}
      {app.work_experience && (
        <Section title="Work experience" body={app.work_experience} />
      )}
      {app.why_good_fit && (
        <Section title="Why they'd make the crew better" body={app.why_good_fit} accent />
      )}

      {/* Files */}
      {(app.resume_url || app.voice_note_url) && (
        <div className="flex flex-wrap gap-2">
          {app.resume_url && (
            <Button
              variant="outline" size="sm"
              className="font-body text-xs border-primary/30 text-primary hover:bg-primary/10"
              disabled={savingResume}
              onClick={() => openStorage(app.resume_url as string, "resume")}
            >
              <FileText className="w-3.5 h-3.5 mr-1" /> Open resume
            </Button>
          )}
          {app.voice_note_url && (
            <Button
              variant="outline" size="sm"
              className="font-body text-xs border-primary/30 text-primary hover:bg-primary/10"
              disabled={savingVoice}
              onClick={() => openStorage(app.voice_note_url as string, "voice")}
            >
              <Mic className="w-3.5 h-3.5 mr-1" /> Play voice note
            </Button>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Private notes</p>
        <Textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Interview notes, references, deal-breakers…"
          className="font-body text-sm bg-secondary border-border"
        />
        {dirty && (
          <Button size="sm" className="gap-1.5" onClick={() => onNotesSave(notes)}>
            <Check className="w-4 h-4" /> Save notes
          </Button>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 text-xs font-body text-muted-foreground pt-2 border-t border-border">
        <Clock className="w-3 h-3" /> Received {format(new Date(app.created_at), "MMM d, yyyy h:mm a")}
      </div>

      {/* Danger zone */}
      {canDelete && (
        <div className="pt-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 gap-1.5"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" /> Delete applicant
          </Button>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="font-body text-[10px] text-muted-foreground">{label}</p>
      <p className="font-body text-sm text-foreground">{value}</p>
    </div>
  );
}

function Section({ title, body, accent = false }: { title: string; body: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        "relative rounded-xl border p-4 overflow-hidden",
        accent ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/40",
      )}
    >
      {accent && <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />}
      <p className={cn(
        "font-body text-[10px] uppercase tracking-wider mb-1.5 font-bold",
        accent ? "text-primary" : "text-muted-foreground",
      )}>{title}</p>
      <p className="font-body text-[14px] leading-relaxed text-foreground whitespace-pre-wrap">{body}</p>
    </div>
  );
}