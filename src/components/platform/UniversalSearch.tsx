import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Users, FileText, Briefcase, Receipt, MapPin, Phone, Target, Activity } from "lucide-react";
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
          .eq("business_id", businessId).or(`display_name.ilike.${like},phone.ilike.${like},email.ilike.${like}`).limit(6),
        // Jobber jobs — title, job_number, client_name, property_address
        supabase.from("jobber_jobs").select("id, title, job_number, status, client_name, property_address, total_amount, business_id")
          .eq("business_id", businessId).or(`title.ilike.${like},job_number.ilike.${like},client_name.ilike.${like},property_address.ilike.${like}`).limit(6),
        // Jobber properties — street1, city
        supabase.from("jobber_properties").select("id, street1, city, business_id")
          .eq("business_id", businessId).or(`street1.ilike.${like},city.ilike.${like}`).limit(4),
        // Platform customers
        supabase.from("platform_customers").select("id, display_name, email, phone")
          .eq("business_id", businessId).or(`display_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`).limit(4),
        // Platform invoices
        supabase.from("platform_invoices").select("id, invoice_number, total, status")
          .eq("business_id", businessId).ilike("invoice_number", like).limit(3),
        // Crew members
        supabase.from("platform_crew_members").select("id, display_name, phone")
          .eq("business_id", businessId).or(`display_name.ilike.${like},phone.ilike.${like}`).limit(5),
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
          .or(`inquiry_name.ilike.${like},inquiry_phone.ilike.${like},inquiry_email.ilike.${like}`).limit(4),
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

    setResults(allResults);
    setLoading(false);
  }, [businessId, isOwner]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
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
          "flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-1.5 cursor-text transition-all",
          open ? "w-full md:w-80 ring-2 ring-primary/20" : "w-10 md:w-64"
        )}
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
      >
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search… ⌘K"
          className={cn(
            "bg-transparent border-none outline-none font-body text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0",
            !embedded && !open && "hidden md:block"
          )}
        />
        {open && query && (
          <button onClick={() => { setQuery(""); setResults([]); }} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          "bg-card border border-border rounded-xl overflow-y-auto",
          embedded
            ? "mt-2 max-h-[70vh]"
            : "absolute top-full left-0 right-0 mt-1 shadow-xl z-[70] max-h-[60vh] min-w-[280px] md:min-w-[360px]"
        )}>
          {loading && (
            <div className="px-4 py-3 text-sm text-muted-foreground font-body">Searching…</div>
          )}

          {!loading && !query && recentSearches.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Recent Searches</p>
              {recentSearches.map((r) => (
                <button
                  key={r}
                  onClick={() => handleRecentClick(r)}
                  className="w-full text-left px-3 py-2 min-h-[44px] text-sm font-body text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {!query && (activityLoading || recentActivity.length > 0) && (
            <div className="p-2 border-b border-border/40">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1.5">
                <Activity className="w-3 h-3" />
                Recent Activity
              </p>
              {activityLoading && recentActivity.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground font-body">Loading…</div>
              )}
              {recentActivity.map((item) => {
                const Icon = activityIcon(item.kind);
                const numberPart = item.number ? `${item.kind === "job" ? "Job" : item.kind === "invoice" ? "Invoice" : "Quote"} ${item.number}` : item.title;
                const titleLine = item.number && item.title && item.title !== item.number
                  ? `${numberPart} — ${item.title}`
                  : numberPart;
                const when = (() => {
                  try {
                    return formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });
                  } catch {
                    return "";
                  }
                })();
                const showAmount = isOwner && (item.kind === "invoice" || item.kind === "quote") && item.total != null && item.total > 0;
                return (
                  <button
                    key={`${item.kind}-${item.id}`}
                    onClick={() => handleActivityClick(item)}
                    className="w-full text-left px-3 py-2 min-h-[44px] rounded-lg hover:bg-secondary/50 transition-colors flex items-center gap-2"
                  >
                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium font-body text-foreground truncate">
                        {titleLine}
                      </span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {activityActor(item)} · {when}
                      </span>
                    </span>
                    {showAmount && (
                      <span className="ml-auto text-xs font-body font-semibold text-foreground shrink-0">
                        ${item.total!.toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground font-body">No results for "{query}"</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try a phone number, address, or name</p>
            </div>
          )}

          {!loading && Object.keys(grouped).length > 0 && (
            <div className="p-1.5">
              {Object.entries(grouped).map(([type, items]) => {
                const meta = TYPE_META[type];
                const Icon = meta?.icon || Users;
                return (
                  <div key={type} className="mb-1">
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1.5">
                      <Icon className="w-3 h-3" />
                      {meta?.label || type} ({items.length})
                    </p>
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors group flex items-center gap-2"
                      >
                        <span className="text-sm font-medium font-body text-foreground truncate">{item.title}</span>
                        {item.subtitle && (
                          <span className="text-xs text-muted-foreground truncate">{item.subtitle}</span>
                        )}
                        {item.meta?.statusLabel && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-body font-medium shrink-0"
                            style={{ backgroundColor: item.meta.statusBg, color: item.meta.statusText }}
                          >
                            {item.meta.statusLabel}
                          </span>
                        )}
                        {item.meta?.amount != null && item.meta.amount > 0 && (
                          <span className="ml-auto text-xs font-body font-semibold text-foreground shrink-0">
                            ${item.meta.amount.toLocaleString()}
                          </span>
                        )}
                      </button>
                    ))}
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
