import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Users, FileText, Briefcase, Receipt, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: "customer" | "lead" | "quote" | "job" | "invoice" | "property" | "crew";
  id: string;
  title: string;
  subtitle: string;
  path: string;
}

const TYPE_META: Record<string, { label: string; icon: typeof Users }> = {
  customer: { label: "Customers", icon: Users },
  lead: { label: "Leads", icon: Phone },
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
}

export default function UniversalSearch({ businessId }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();

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

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

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
      // Parallel searches
      const [customers, leads, quotes, jobs, invoices, properties, crew] = await Promise.all([
        supabase.from("platform_customers").select("id, display_name, email, phone")
          .eq("business_id", businessId).or(`display_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`).limit(5),
        supabase.from("platform_leads").select("id, inquiry_name, inquiry_email, inquiry_phone, requested_service")
          .eq("business_id", businessId).or(`inquiry_name.ilike.${like},inquiry_email.ilike.${like},inquiry_phone.ilike.${like}`).limit(5),
        supabase.from("platform_quotes").select("id, quote_number, total, status, customer:platform_customers!platform_quotes_customer_id_fkey(display_name)")
          .eq("business_id", businessId).or(`quote_number.ilike.${like}`).limit(5),
        supabase.from("platform_jobs").select("id, job_number, title, status, customer:platform_customers!platform_jobs_customer_id_fkey(display_name)")
          .eq("business_id", businessId).or(`job_number.ilike.${like},title.ilike.${like}`).limit(5),
        supabase.from("platform_invoices").select("id, invoice_number, total, status, customer:platform_customers!platform_invoices_customer_id_fkey(display_name)")
          .eq("business_id", businessId).or(`invoice_number.ilike.${like}`).limit(5),
        supabase.from("platform_properties").select("id, address_1, city, customer:platform_customers!platform_properties_customer_id_fkey(display_name)")
          .eq("business_id", businessId).or(`address_1.ilike.${like},city.ilike.${like}`).limit(5),
        supabase.from("platform_crew_members").select("id, display_name, phone")
          .eq("business_id", businessId).or(`display_name.ilike.${like},phone.ilike.${like}`).limit(5),
      ]);

      customers.data?.forEach(c => allResults.push({
        type: "customer", id: c.id, title: c.display_name,
        subtitle: [c.phone, c.email].filter(Boolean).join(" · "),
        path: "/platform/customers",
      }));

      leads.data?.forEach(l => allResults.push({
        type: "lead", id: l.id, title: l.inquiry_name,
        subtitle: [l.inquiry_phone, l.requested_service].filter(Boolean).join(" · "),
        path: "/platform/leads",
      }));

      quotes.data?.forEach(q => {
        const cust = Array.isArray(q.customer) ? q.customer[0] : q.customer;
        allResults.push({
          type: "quote", id: q.id, title: q.quote_number,
          subtitle: [cust?.display_name, q.total ? `$${q.total}` : null, q.status].filter(Boolean).join(" · "),
          path: "/platform/quotes",
        });
      });

      jobs.data?.forEach(j => {
        const cust = Array.isArray(j.customer) ? j.customer[0] : j.customer;
        allResults.push({
          type: "job", id: j.id, title: j.job_number,
          subtitle: [cust?.display_name, j.title, j.status].filter(Boolean).join(" · "),
          path: "/platform/jobs",
        });
      });

      invoices.data?.forEach(inv => {
        const cust = Array.isArray(inv.customer) ? inv.customer[0] : inv.customer;
        allResults.push({
          type: "invoice", id: inv.id, title: inv.invoice_number,
          subtitle: [cust?.display_name, inv.total ? `$${inv.total}` : null, inv.status].filter(Boolean).join(" · "),
          path: "/platform/invoices",
        });
      });

      properties.data?.forEach(p => {
        const cust = Array.isArray(p.customer) ? p.customer[0] : p.customer;
        allResults.push({
          type: "property", id: p.id, title: p.address_1,
          subtitle: [p.city, cust?.display_name].filter(Boolean).join(" · "),
          path: "/platform/customers",
        });
      });

      crew.data?.forEach(c => allResults.push({
        type: "crew", id: c.id, title: c.display_name,
        subtitle: c.phone || "",
        path: "/platform/settings",
      }));

    } catch {
      // Silently fail
    }

    setResults(allResults);
    setLoading(false);
  }, [businessId]);

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
            !open && "hidden md:block"
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
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-[70] max-h-[60vh] overflow-y-auto min-w-[280px] md:min-w-[360px]">
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
                  className="w-full text-left px-3 py-2 text-sm font-body text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                >
                  {r}
                </button>
              ))}
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
                        <span className="text-sm font-medium font-body text-foreground">{item.title}</span>
                        {item.subtitle && (
                          <span className="text-xs text-muted-foreground truncate">{item.subtitle}</span>
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
