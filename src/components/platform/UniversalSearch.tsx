import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, X, Users, FileText, Briefcase, Receipt, MapPin, Target, Activity,
  RefreshCw, SearchX, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useRecentActivity, type RecentActivityItem } from "@/hooks/useRecentActivity";
import { runUniversalSearch, recordPath, type SearchResult } from "@/lib/search/universalSearch";
import MobileSearchSheet from "./MobileSearchSheet";

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
  /** Rendered inside the shared mobile sheet (results inline, no dropdown). */
  embedded?: boolean;
  /** Called after a record is chosen (lets a parent sheet close itself). */
  onNavigate?: () => void;
}

const DEBOUNCE_MS = 250;

export default function UniversalSearch({ businessId, autoOpen = false, embedded = false, onNavigate }: Props) {
  const [open, setOpen] = useState(autoOpen);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<"none" | "partial" | "total">("none");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestSeq = useRef(0);
  const navigate = useNavigate();
  const { isOwner } = usePlatformAuth();
  const { data: recentActivity = [], isLoading: activityLoading } = useRecentActivity({ businessId, isOwner });

  const isDesktop = () => typeof window === "undefined" || !window.matchMedia || window.matchMedia("(min-width: 768px)").matches;

  // Single Cmd/Ctrl+K handler: only the header (non-embedded) instance listens.
  useEffect(() => {
    if (embedded) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isDesktop()) { setOpen(true); setTimeout(() => inputRef.current?.focus(), 30); }
        else setMobileSheetOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [embedded]);

  useEffect(() => { if (autoOpen) setTimeout(() => inputRef.current?.focus(), 50); }, [autoOpen]);

  useEffect(() => {
    if (embedded || !open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, embedded]);

  useEffect(() => { if (open && !query) setRecentSearches(getRecentSearches()); }, [open, query]);

  // Workspace switch: drop any results from the previous business immediately.
  useEffect(() => {
    requestSeq.current += 1;
    setResults([]); setError("none"); setLoading(false);
  }, [businessId]);

  useEffect(() => {
    const q = query.trim();
    const seq = ++requestSeq.current;
    setActiveIndex(-1);
    if (q.length < 2 || !businessId) { setResults([]); setLoading(false); setError("none"); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const out = await runUniversalSearch(supabase, businessId, q, { isOwner });
        if (seq !== requestSeq.current) return; // stale response
        setResults(out.results);
        setError(out.failedSources.length === 0 ? "none" : out.failedSources.length >= 10 ? "total" : "partial");
      } catch {
        if (seq !== requestSeq.current) return;
        setResults([]); setError("total");
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, businessId, isOwner]);

  const go = useCallback((path: string) => {
    setOpen(false);
    setQuery("");
    setMobileSheetOpen(false);
    inputRef.current?.blur();
    onNavigate?.();
    navigate(path);
  }, [navigate, onNavigate]);

  const handleSelect = (result: SearchResult) => {
    if (query.trim()) addRecentSearch(query.trim());
    go(result.path);
  };

  const handleActivityClick = (item: RecentActivityItem) => {
    go(recordPath(item.kind, item.id, "platform"));
  };

  const activityIcon = (kind: RecentActivityItem["kind"]) =>
    kind === "job" ? Briefcase : kind === "invoice" ? Receipt : FileText;

  const activityActor = (item: RecentActivityItem) => {
    if (!item.createdByUserId && item.sourceSystem === "jobber") return "Synced from Jobber";
    if (item.createdByName) return `Added by ${item.createdByName}`;
    return "Added";
  };

  const activityMetaLine = (item: RecentActivityItem, when: string) =>
    [activityActor(item), when].filter((s) => !!s && s.length > 0).join(" · ");

  const handleRecentClick = (recent: string) => setQuery(recent);

  // Group (type order = first appearance after ranking) and a flat list for keyboard nav.
  const grouped = useMemo(() => results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {}), [results]);
  const flat = useMemo(() => Object.values(grouped).flat(), [grouped]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (query) setQuery("");
      else if (embedded) onNavigate?.();
      else { setOpen(false); inputRef.current?.blur(); }
      return;
    }
    if (!flat.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => (i + 1) % flat.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(flat[activeIndex >= 0 ? activeIndex : 0]);
    }
  };

  const q = query.trim();
  const showPanel = embedded || open;

  const panel = (
    <div
      id="universal-search-results"
      role="listbox"
      className={cn(
        "rounded-2xl",
        embedded
          ? "mt-3"
          : "absolute top-full right-0 mt-2 z-[70] w-[min(420px,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto overscroll-contain"
      )}
      style={{
        background: "#0e110f",
        border: "1px solid rgba(var(--biz-accent-rgb),0.18)",
        boxShadow: "0 24px 60px -20px rgba(0,0,0,0.8)",
      }}
    >
      {loading && (
        <div className="p-2 space-y-2" aria-live="polite" aria-busy="true">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      )}

      {!loading && error !== "none" && q.length >= 2 && (
        <div role="alert" className="m-2 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[12.5px]" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: T.primary }}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#f87171" }} />
          <span>{error === "total" ? "Search couldn't reach the server. Check your connection and try again." : "Some record types couldn't be searched right now, so results may be incomplete."}</span>
        </div>
      )}

      {!loading && !q && recentSearches.length > 0 && (
        <div className="px-2 pt-2 pb-1">
          <SectionLabel>Recent Searches</SectionLabel>
          <div className="flex flex-wrap gap-1.5 px-1 pb-1">
            {recentSearches.map((r) => (
              <button
                key={r}
                onClick={() => handleRecentClick(r)}
                className="px-2.5 py-1 rounded-full text-[12px] font-body transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: T.primary }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

          {!q && (activityLoading || recentActivity.length > 0) && (
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


      {!loading && q.length >= 2 && results.length === 0 && error !== "total" && (
        <div className="px-4 py-10 text-center">
          <div className="mx-auto w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <SearchX className="w-5 h-5" style={{ color: T.muted }} />
          </div>
          <p className="font-display text-[13px] font-semibold break-words" style={{ color: T.primary }}>
            No matches for "{q}"
          </p>
          <p className="text-[12px] mt-1 font-body" style={{ color: T.secondary }}>
            Try a name, phone, email, address, or invoice / quote / job number
          </p>
        </div>
      )}

      {!loading && flat.length > 0 && (
        <div className="p-2 space-y-3">
          {Object.entries(grouped).map(([type, items]) => {
            const meta = TYPE_META[type];
            const Icon = meta?.icon || Users;
            const tint = tintFor(type);
            return (
              <div key={type} className="space-y-1">
                <div className="flex items-center gap-1.5 px-2">
                  <Icon className="w-3 h-3" style={{ color: tint.fg }} />
                  <p className="text-[9.5px] font-display font-semibold uppercase" style={{ color: T.faint, letterSpacing: "0.14em" }}>
                    {meta?.label || type}
                  </p>
                  <span className="text-[9.5px] font-display font-semibold px-1.5 rounded-full" style={{ color: tint.fg, background: tint.bg }}>
                    {items.length}
                  </span>
                </div>
                <div className="space-y-1 px-1">
                  {items.map((item) => {
                    const idx = flat.indexOf(item);
                    const statusStyle = item.type === "job" && item.meta?.status ? getJobStatusStyle(item.meta.status) : null;
                    return (
                      <button
                        key={`${item.type}-${item.source}-${item.id}`}
                        role="option"
                        aria-selected={idx === activeIndex}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          "w-full text-left flex items-center gap-3 px-2.5 py-2.5 min-h-[52px] rounded-xl transition-colors hover:bg-white/[0.06]",
                          idx === activeIndex && "bg-white/[0.08]"
                        )}
                        style={{ border: "1px solid rgba(255,255,255,0.05)" }}
                      >
                        <TypeIconTile type={item.type} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-body font-semibold truncate" style={{ color: T.primary }}>
                            <Highlight text={item.title} term={q} />
                          </span>
                          {item.subtitle && (
                            <span className="block text-[11.5px] truncate mt-0.5" style={{ color: T.secondary }}>
                              <Highlight text={item.subtitle} term={q} />
                            </span>
                          )}
                        </span>
                        {statusStyle && (
                          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-display font-semibold shrink-0" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
                            {statusStyle.label}
                          </span>
                        )}
                        {item.meta?.amount != null && item.meta.amount > 0 && (
                          <span className="ml-auto shrink-0 px-2 py-0.5 rounded-md text-[11px] font-display font-semibold" style={{ color: "var(--accent-color)", background: "rgba(var(--biz-accent-rgb),0.10)", border: "1px solid rgba(var(--biz-accent-rgb),0.20)" }}>
                            ${item.meta.amount.toLocaleString()}
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
    </div>
  );

  const input = (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl cursor-text transition-all",
        embedded ? "px-3.5 py-3 w-full" : "px-3 py-1.5 w-64 lg:w-80"
      )}
      style={{
        background: embedded ? "#121714" : "rgba(255,255,255,0.04)",
        border: "1px solid rgba(var(--biz-accent-rgb),0.22)",
        boxShadow: showPanel ? "inset 0 0 0 1px rgba(var(--biz-accent-rgb),0.35)" : "none",
      }}
      onClick={() => { setOpen(true); inputRef.current?.focus(); }}
    >
      <Search className="w-4 h-4 shrink-0" style={{ color: showPanel ? "var(--accent-color)" : "hsl(220 8% 55%)" }} />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Search records"
        aria-controls="universal-search-results"
        placeholder={embedded ? "Name, phone, address, invoice #…" : "Search… ⌘K"}
        style={{ caretColor: "var(--accent-color)", color: T.primary, fontSize: embedded ? 16 : undefined }}
        className={cn(
          "bg-transparent border-none outline-none font-body flex-1 min-w-0 placeholder:text-[#7a8088] [&::-webkit-search-cancel-button]:hidden",
          !embedded && "text-sm"
        )}
      />
      {query && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setQuery(""); setResults([]); inputRef.current?.focus(); }}
          className="p-1 rounded-md hover:bg-white/5"
          style={{ color: T.muted }}
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  if (embedded) {
    return <div ref={containerRef}>{input}{panel}</div>;
  }

  return (
    <>
      {/* Phone/tablet portrait: icon button opens the shared full-width sheet. */}
      <button
        type="button"
        onClick={() => setMobileSheetOpen(true)}
        className="md:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(var(--biz-accent-rgb),0.18)", color: "hsl(220 8% 70%)" }}
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
      </button>
      <MobileSearchSheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen} businessId={businessId} />
      {/* Desktop: inline field with dropdown. */}
      <div ref={containerRef} className="relative hidden md:block">
        {input}
        {open && panel}
      </div>
    </>
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
