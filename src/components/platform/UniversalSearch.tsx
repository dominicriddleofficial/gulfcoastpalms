import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, X, Users, FileText, Briefcase, Receipt, MapPin, Target, Activity,
  RefreshCw, SearchX,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useRecentActivity, type RecentActivityItem } from "@/hooks/useRecentActivity";

const JOB_STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  upcoming: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", label: "Upcoming" },
  scheduled: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", label: "Upcoming" },
  action_required: { bg: "rgba(245,158,11,0.15)", text: "#fbbf24", label: "In Progress" },
  requires_invoicing: { bg: "rgba(245,158,11,0.15)", text: "#fbbf24", label: "In Progress" },
  late: { bg: "rgba(239,68,68,0.15)", text: "#f87171", label: "Late" },
  completed: { bg: "rgba(var(--biz-accent-rgb),0.15)", text: "var(--accent-color)", label: "Complete" },
  archived: { bg: "rgba(var(--biz-accent-rgb),0.15)", text: "var(--accent-color)", label: "Complete" },
};

function getJobStatusStyle(status: string) {
  return JOB_STATUS_MAP[status.toLowerCase()] ?? JOB_STATUS_MAP.scheduled;
}

interface SearchResult {
  type: "customer" | "lead" | "quote" | "job" | "invoice" | "property" | "crew";
  id: string;
  title: string;
  subtitle: string;
  path: string;
  meta?: {
    statusLabel?: string;
    statusBg?: string;
    statusText?: string;
    amount?: number | null;
  };
}

const TYPE_META: Record<string, { label: string; icon: typeof Users }> = {
  customer: { label: "Customers", icon: Users },
  lead: { label: "Leads", icon: Target },
  quote: { label: "Quotes", icon: FileText },
  job: { label: "Jobs", icon: Briefcase },
  invoice: { label: "Invoices", icon: Receipt },
  property: { label: "Properties", icon: MapPin },
  crew: { label: "Crew", icon: Users },
};

// Distinct subtle tints per entity type — dark surface, colored halo/icon.
const TYPE_TINT: Record<string, { bg: string; fg: string; ring: string }> = {
  customer: { bg: "rgba(var(--biz-accent-rgb),0.14)", fg: "var(--accent-color)", ring: "rgba(var(--biz-accent-rgb),0.30)" },
  lead:     { bg: "rgba(var(--biz-accent-rgb),0.14)", fg: "var(--accent-color)", ring: "rgba(var(--biz-accent-rgb),0.30)" },
  job:      { bg: "rgba(59,130,246,0.14)",  fg: "#60a5fa", ring: "rgba(59,130,246,0.30)" },
  quote:    { bg: "rgba(168,85,247,0.14)",  fg: "#c084fc", ring: "rgba(168,85,247,0.30)" },
  invoice:  { bg: "rgba(245,158,11,0.14)",  fg: "#fbbf24", ring: "rgba(245,158,11,0.30)" },
  property: { bg: "rgba(6,182,212,0.14)",   fg: "#22d3ee", ring: "rgba(6,182,212,0.30)" },
  crew:     { bg: "rgba(255,255,255,0.06)", fg: "#e5e7eb", ring: "rgba(255,255,255,0.18)" },
};

function tintFor(type: string) {
  return TYPE_TINT[type] ?? TYPE_TINT.crew;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term || term.length < 2) return <>{text}</>;
  try {
    const parts = text.split(new RegExp(`(${escapeRegex(term)})`, "ig"));
    return (
      <>
        {parts.map((p, i) =>
          p.toLowerCase() === term.toLowerCase() ? (
            <mark
              key={i}
              className="bg-transparent px-0"
              style={{ color: "var(--accent-color)", background: "rgba(var(--biz-accent-rgb),0.14)", borderRadius: 3 }}
            >
              {p}
            </mark>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}

function TypeIconTile({ type }: { type: string }) {
  const t = tintFor(type);
  const Icon = TYPE_META[type]?.icon ?? Users;
  return (
    <span
      className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
      style={{ background: t.bg, boxShadow: `inset 0 0 0 1px ${t.ring}` }}
    >
      <Icon className="w-4 h-4" style={{ color: t.fg }} />
    </span>
  );
}

function SkeletonCard() {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="w-9 h-9 rounded-lg bg-white/[0.06] animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-2/3 rounded bg-white/[0.06] animate-pulse" />
        <div className="h-2.5 w-1/2 rounded bg-white/[0.04] animate-pulse" />
      </div>
    </div>
  );
}

function activityDateBucket(iso: string): "today" | "yesterday" | "earlier" {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYest = startToday - 86400000;
  const t = d.getTime();
  if (t >= startToday) return "today";
  if (t >= startYest) return "yesterday";
  return "earlier";
}

const RECENT_KEY = "platform_recent_searches";

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, 5);
  } catch { return []; }
}

function addRecentSearch(q: string) {
  const recent = getRecentSearches().filter(r => r !== q);
  recent.unshift(q);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 5)));
}

/**
 * If the query looks like a phone number (mostly digits, 7+), return a LIKE
 * pattern that places `%` between every digit so it matches formatted phone
 * numbers stored as e.g. "(850) 529-3801". Returns null otherwise.
 */
function phoneLikePattern(q: string): string | null {
  const digits = q.replace(/\D/g, "");
  if (digits.length < 7) return null;
  // Only treat as phone if the raw query is essentially digits + separators.
  const nonDigitCount = q.length - digits.length;
  if (nonDigitCount > q.length - digits.length + 6) return null;
  return `%${digits.split("").join("%")}%`;
}

// Text tokens hardcoded for the portaled sheet (which renders outside
// `.ops-theme`, so semantic `text-foreground` would fall back to the light
// `:root` palette and become invisible on our dark surface).
const T = {
  primary: "#f3f4f6",       // near-white, main text
  secondary: "#a1a7ae",     // secondary readable gray (WCAG AA on #0e110f)
  muted: "#7a8088",         // tertiary / timestamps
  faint: "#5b6169",         // section labels
  divider: "rgba(255,255,255,0.06)",
  surface: "rgba(255,255,255,0.03)",
  surfaceHover: "rgba(255,255,255,0.06)",
};

interface Props {
  businessId: string | null;
  autoOpen?: boolean;
  embedded?: boolean;
}

export default function UniversalSearch({ businessId, autoOpen = false, embedded = false }: Props) {
  const [open, setOpen] = useState(autoOpen);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();
  const { isOwner } = usePlatformAuth();
  const { data: recentActivity = [], isLoading: activityLoading } = useRecentActivity({
    businessId,
    isOwner,
  });

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Auto-focus on mount when autoOpen is requested
  useEffect(() => {
    if (autoOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [autoOpen]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (embedded) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, embedded]);

  useEffect(() => {
    if (open && !query) setRecentSearches(getRecentSearches());
  }, [open, query]);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setResults([]); return; }
    if (!businessId) { setResults([]); return; }
    setLoading(true);

    const like = `%${q}%`;
    const phoneLike = phoneLikePattern(q);
    const phoneOr = phoneLike ?? like;
    const allResults: SearchResult[] = [];

    try {
      // Parallel searches across jobber (synced) and platform tables
      const [
        jobberClients,
        jobberJobs,
        jobberProps,
        platformCustomers,
        invoices,
        crew,
        platformJobs,
        platformQuotes,
        platformLeads,
        platformProperties,
      ] = await Promise.all([
        // Jobber clients — display_name, phone, email
        supabase.from("jobber_clients").select("id, display_name, phone, email, business_id")
          .eq("business_id", businessId).or(`display_name.ilike.${like},phone.ilike.${phoneOr},email.ilike.${like}`).limit(6),
        // Jobber jobs — title, job_number, client_name, property_address
        supabase.from("jobber_jobs").select("id, title, job_number, status, client_name, property_address, total_amount, business_id")
          .eq("business_id", businessId).or(`title.ilike.${like},job_number.ilike.${like},client_name.ilike.${like},property_address.ilike.${like}`).limit(6),
        // Jobber properties — street1, city
        supabase.from("jobber_properties").select("id, street1, city, business_id")
          .eq("business_id", businessId).or(`street1.ilike.${like},city.ilike.${like}`).limit(4),
        // Platform customers
        supabase.from("platform_customers").select("id, display_name, email, phone")
          .eq("business_id", businessId).or(`display_name.ilike.${like},email.ilike.${like},phone.ilike.${phoneOr}`).limit(4),
        // Platform invoices
        supabase.from("platform_invoices").select("id, invoice_number, total, status")
          .eq("business_id", businessId).ilike("invoice_number", like).limit(3),
        // Crew members
        supabase.from("platform_crew_members").select("id, display_name, phone")
          .eq("business_id", businessId).or(`display_name.ilike.${like},phone.ilike.${phoneOr}`).limit(5),
        // Platform jobs (native, separate from jobber sync)
        supabase.from("platform_jobs").select("id, title, job_number, status, internal_notes, total")
          .eq("business_id", businessId)
          .or(`title.ilike.${like},job_number.ilike.${like},internal_notes.ilike.${like}`).limit(6),
        // Platform quotes
        supabase.from("platform_quotes").select("id, quote_number, total, status, internal_notes")
          .eq("business_id", businessId)
          .or(`quote_number.ilike.${like},internal_notes.ilike.${like}`).limit(4),
        // Platform leads
        supabase.from("platform_leads").select("id, inquiry_name, inquiry_phone, inquiry_email, requested_service, lead_status")
          .eq("business_id", businessId)
          .or(`inquiry_name.ilike.${like},inquiry_phone.ilike.${phoneOr},inquiry_email.ilike.${like}`).limit(4),
        // Platform properties
        supabase.from("platform_properties").select("id, address_1, city, zip")
          .eq("business_id", businessId)
          .or(`address_1.ilike.${like},city.ilike.${like},zip.ilike.${like}`).limit(4),
      ]);

      // Merge jobber + platform customers, dedup by display_name
      const seenNames = new Set<string>();
      const mergedCustomers = [
        ...(jobberClients.data ?? []).map(c => ({ id: c.id, name: c.display_name, phone: c.phone, email: c.email })),
        ...(platformCustomers.data ?? []).map(c => ({ id: c.id, name: c.display_name, phone: c.phone, email: c.email })),
      ];
      mergedCustomers.forEach(c => {
        if (seenNames.has(c.name)) return;
        seenNames.add(c.name);
        allResults.push({
          type: "customer", id: c.id, title: c.name,
          subtitle: [c.phone, c.email].filter(Boolean).join(" · "),
          path: "/platform/customers",
        });
      });

      jobberJobs.data?.forEach(j => {
        const statusStyle = getJobStatusStyle(j.status);
        allResults.push({
          type: "job", id: j.id,
          title: j.client_name ?? j.title ?? j.job_number ?? "Job",
          subtitle: [j.job_number, j.property_address].filter(Boolean).join(" · "),
          path: "/platform/jobs",
          meta: {
            statusLabel: statusStyle.label,
            statusBg: statusStyle.bg,
            statusText: statusStyle.text,
            amount: j.total_amount ? Number(j.total_amount) : null,
          },
        });
      });

      jobberProps.data?.forEach(p => allResults.push({
        type: "property", id: p.id, title: [p.street1, p.city].filter(Boolean).join(", ") || "Property",
        subtitle: p.city ?? "",
        path: "/platform/customers",
      }));

      invoices.data?.forEach(inv => allResults.push({
        type: "invoice", id: inv.id, title: inv.invoice_number,
        subtitle: [inv.total ? `$${inv.total}` : null, inv.status].filter(Boolean).join(" · "),
        path: "/platform/invoices",
      }));

      crew.data?.forEach(c => allResults.push({
        type: "crew", id: c.id, title: c.display_name,
        subtitle: c.phone ?? "",
        path: "/platform/settings",
      }));

      platformJobs.data?.forEach(j => {
        const statusStyle = getJobStatusStyle(j.status ?? "scheduled");
        allResults.push({
          type: "job",
          id: j.id,
          title: j.title ?? j.job_number ?? "Job",
          subtitle: j.job_number ?? "",
          path: "/platform/jobs",
          meta: {
            statusLabel: statusStyle.label,
            statusBg: statusStyle.bg,
            statusText: statusStyle.text,
            amount: isOwner && j.total ? Number(j.total) : null,
          },
        });
      });

      platformQuotes.data?.forEach(q2 => allResults.push({
        type: "quote",
        id: q2.id,
        title: q2.quote_number ?? "Quote",
        subtitle: q2.status ?? "",
        path: "/platform/quotes",
        meta: { amount: isOwner && q2.total ? Number(q2.total) : null },
      }));

      platformLeads.data?.forEach(l => allResults.push({
        type: "lead",
        id: l.id,
        title: l.inquiry_name ?? "Lead",
        subtitle: [l.inquiry_phone, l.requested_service, l.lead_status].filter(Boolean).join(" · "),
        path: "/platform/leads",
      }));

      platformProperties.data?.forEach(p => allResults.push({
        type: "property",
        id: p.id,
        title: [p.address_1, p.city].filter(Boolean).join(", ") || "Property",
        subtitle: [p.city, p.zip].filter(Boolean).join(" · "),
        path: "/platform/customers",
      }));

    } catch {
      // Silently fail
    }

    // Dedup by type+id — the same record can appear via multiple table sources.
    const seenKey = new Set<string>();
    const deduped = allResults.filter((r) => {
      const k = `${r.type}::${r.id}`;
      if (seenKey.has(k)) return false;
      seenKey.add(k);
      return true;
    });
    setResults(deduped);
    setLoading(false);
  }, [businessId, isOwner]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    addRecentSearch(query);
    setOpen(false);
    setQuery("");
    navigate(result.path);
  };

  const handleActivityClick = (item: RecentActivityItem) => {
    setOpen(false);
    setQuery("");
    const path =
      item.kind === "job"
        ? "/platform/jobs"
        : item.kind === "invoice"
          ? "/platform/invoices"
          : "/platform/quotes";
    navigate(path);
  };

  const activityIcon = (kind: RecentActivityItem["kind"]) =>
    kind === "job" ? Briefcase : kind === "invoice" ? Receipt : FileText;

  const activityActor = (item: RecentActivityItem) => {
    if (!item.createdByUserId && item.sourceSystem === "jobber") return "Synced from Jobber";
    if (item.createdByName) return `Added by ${item.createdByName}`;
    return "Added";
  };

  const activityMetaLine = (item: RecentActivityItem, when: string) => {
    // Build the "Added by X · about 15 hours ago" line, dropping either half
    // cleanly if it's missing so we never render a dangling " · ".
    return [activityActor(item), when].filter((s) => !!s && s.length > 0).join(" · ");
  };

  const handleRecentClick = (recent: string) => {
    setQuery(recent);
  };

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button (mobile) / inline input (desktop) */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl cursor-text transition-all",
          embedded ? "px-3.5 py-3" : "px-3 py-1.5",
          open ? "w-full md:w-80" : "w-10 md:w-64"
        )}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(var(--biz-accent-rgb),0.18)",
          boxShadow: open
            ? "inset 0 0 0 1px rgba(var(--biz-accent-rgb),0.35), 0 0 24px -8px rgba(var(--biz-accent-rgb),0.35)"
            : "none",
        }}
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
      >
        <Search
          className={cn("shrink-0", embedded ? "w-4 h-4" : "w-4 h-4")}
          style={{ color: open ? "var(--accent-color)" : "hsl(220 8% 55%)" }}
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={embedded ? "Search customers, jobs, invoices…" : "Search… ⌘K"}
          style={{ caretColor: "var(--accent-color)", color: T.primary }}
          className={cn(
            "bg-transparent border-none outline-none font-body flex-1 min-w-0 placeholder:text-[#7a8088]",
            embedded ? "text-[15px]" : "text-sm",
            !embedded && !open && "hidden md:block"
          )}
        />
        {open && query && (
          <button
            onClick={() => { setQuery(""); setResults([]); }}
            className="p-1 rounded-md hover:bg-white/5"
            style={{ color: T.muted }}
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "rounded-2xl overflow-y-auto motion-safe:animate-fade-in",
            embedded
              ? "mt-3 max-h-[75vh]"
              : "absolute top-full left-0 right-0 mt-2 z-[70] max-h-[65vh] min-w-[280px] md:min-w-[380px]"
          )}
          style={{
            background: "rgba(14,17,15,0.96)",
            border: "1px solid rgba(var(--biz-accent-rgb),0.14)",
            boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6)",
            backdropFilter: "blur(12px)",
          }}
        >
          {loading && (
            <div className="p-2 space-y-2" aria-live="polite" aria-busy="true">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {!loading && !query && recentSearches.length > 0 && (
            <div className="px-2 pt-2 pb-1">
              <SectionLabel>Recent Searches</SectionLabel>
              <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                {recentSearches.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRecentClick(r)}
                    className="px-2.5 py-1 rounded-full text-[12px] font-body transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: T.primary,
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!query && (activityLoading || recentActivity.length > 0) && (
            <div className="p-2 space-y-3">
              <div className="flex items-center gap-1.5 px-2 pt-1">
                <Activity className="w-3 h-3" style={{ color: T.faint }} />
                <SectionLabel inline>Recent Activity</SectionLabel>
              </div>
              {activityLoading && recentActivity.length === 0 && (
                <div className="space-y-2 px-1">
                  <SkeletonCard /><SkeletonCard /><SkeletonCard />
                </div>
              )}
              {(["today", "yesterday", "earlier"] as const).map((bucket) => {
                const items = recentActivity.filter((i) => activityDateBucket(i.createdAt) === bucket);
                if (items.length === 0) return null;
                return (
                  <div key={bucket} className="space-y-1">
                    <p
                      className="px-2 text-[9.5px] font-display font-semibold uppercase"
                      style={{ color: T.faint, letterSpacing: "0.14em" }}
                    >
                      {bucket === "today" ? "Today" : bucket === "yesterday" ? "Yesterday" : "Earlier"}
                    </p>
                    <div className="space-y-1 px-1">
                      {items.map((item, idx) => {
                        const numberPart = item.number
                          ? `${item.kind === "job" ? "Job" : item.kind === "invoice" ? "Invoice" : "Quote"} ${item.number}`
                          : item.title;
                        const titleLine =
                          item.number && item.title && item.title !== item.number
                            ? `${numberPart} — ${item.title}`
                            : numberPart;
                        const when = (() => {
                          try { return formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }); }
                          catch { return ""; }
                        })();
                        const showAmount =
                          isOwner &&
                          (item.kind === "invoice" || item.kind === "quote") &&
                          item.total != null && item.total > 0;
                        const isSync = !item.createdByUserId && item.sourceSystem === "jobber";
                        return (
                          <button
                            key={`${item.kind}-${item.id}`}
                            onClick={() => handleActivityClick(item)}
                            className={cn(
                              "w-full text-left flex items-center gap-3 px-2.5 py-2.5 min-h-[52px] rounded-xl transition-all",
                              "hover:bg-white/[0.05] active:scale-[0.98] motion-safe:animate-fade-in",
                              isSync && "opacity-70"
                            )}
                            style={{
                              border: "1px solid rgba(255,255,255,0.04)",
                              animationDelay: `${Math.min(idx * 30, 240)}ms`,
                            }}
                          >
                            <TypeIconTile type={item.kind} />
                            <span className="flex-1 min-w-0">
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="block text-[13px] font-body font-semibold truncate"
                                  style={{ color: T.primary }}
                                >
                                  {titleLine}
                                </span>
                                {isSync && (
                                  <RefreshCw
                                    className="w-3 h-3 shrink-0"
                                    style={{ color: T.muted }}
                                    aria-label="Synced from Jobber"
                                  />
                                )}
                              </span>
                              <span
                                className="block text-[11.5px] truncate mt-0.5"
                                style={{ color: T.secondary }}
                              >
                                {activityMetaLine(item, when)}
                              </span>
                            </span>
                            {showAmount && (
                              <span
                                className="ml-auto shrink-0 px-2 py-0.5 rounded-md text-[11px] font-display font-semibold"
                                style={{
                                  color: "var(--accent-color)",
                                  background: "rgba(var(--biz-accent-rgb),0.10)",
                                  border: "1px solid rgba(var(--biz-accent-rgb),0.20)",
                                }}
                              >
                                ${item.total!.toLocaleString()}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="px-4 py-10 text-center">
              <div
                className="mx-auto w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <SearchX className="w-5 h-5" style={{ color: T.muted }} />
              </div>
              <p className="font-display text-[13px] font-semibold" style={{ color: T.primary }}>
                No matches for "{query}"
              </p>
              <p className="text-[12px] mt-1 font-body" style={{ color: T.secondary }}>
                Check spelling, or try a name, phone, or job #
              </p>
            </div>
          )}

          {!loading && Object.keys(grouped).length > 0 && (
            <div className="p-2 space-y-3">
              {Object.entries(grouped).map(([type, items]) => {
                const meta = TYPE_META[type];
                const Icon = meta?.icon || Users;
                const tint = tintFor(type);
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center gap-1.5 px-2">
                      <Icon className="w-3 h-3" style={{ color: tint.fg }} />
                      <p
                        className="text-[9.5px] font-display font-semibold uppercase"
                        style={{ color: T.faint, letterSpacing: "0.14em" }}
                      >
                        {meta?.label || type}
                      </p>
                      <span
                        className="text-[9.5px] font-display font-semibold px-1.5 rounded-full"
                        style={{
                          color: tint.fg,
                          background: tint.bg,
                        }}
                      >
                        {items.length}
                      </span>
                    </div>
                    <div className="space-y-1 px-1">
                      {items.map((item, idx) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className="w-full text-left flex items-center gap-3 px-2.5 py-2.5 min-h-[52px] rounded-xl transition-all hover:bg-white/[0.05] active:scale-[0.98] motion-safe:animate-fade-in"
                          style={{
                            border: "1px solid rgba(255,255,255,0.04)",
                            animationDelay: `${Math.min(idx * 30, 240)}ms`,
                          }}
                        >
                          <TypeIconTile type={item.type} />
                          <span className="flex-1 min-w-0">
                            <span
                              className="block text-[13px] font-body font-semibold truncate"
                              style={{ color: T.primary }}
                            >
                              <Highlight text={item.title} term={query} />
                            </span>
                            {item.subtitle && (
                              <span
                                className="block text-[11.5px] truncate mt-0.5"
                                style={{ color: T.secondary }}
                              >
                                <Highlight text={item.subtitle} term={query} />
                              </span>
                            )}
                          </span>
                          {item.meta?.statusLabel && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-display font-semibold shrink-0"
                              style={{ backgroundColor: item.meta.statusBg, color: item.meta.statusText }}
                            >
                              {item.meta.statusLabel}
                            </span>
                          )}
                          {item.meta?.amount != null && item.meta.amount > 0 && (
                            <span
                              className="ml-auto shrink-0 px-2 py-0.5 rounded-md text-[11px] font-display font-semibold"
                              style={{
                                color: "var(--accent-color)",
                                background: "rgba(var(--biz-accent-rgb),0.10)",
                                border: "1px solid rgba(var(--biz-accent-rgb),0.20)",
                              }}
                            >
                              ${item.meta.amount.toLocaleString()}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children, inline = false }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <p
      className={cn(
        "font-display font-semibold uppercase",
        inline ? "" : "px-2 py-1"
      )}
      style={{
        fontSize: "9.5px",
        letterSpacing: "0.14em",
        color: "#5b6169",
      }}
    >
      {children}
    </p>
  );
}
