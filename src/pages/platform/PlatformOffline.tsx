import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Lock,
  RefreshCw,
  Phone,
  MapPin,
  Search as SearchIcon,
  WifiOff,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  hasAnyMirrorFor,
  listMirroredBusinesses,
  readMirror,
  type MirrorRecord,
} from "@/lib/offlineMirror";
import { pingSupabase } from "@/lib/outageDetect";
import { filterTodayJobs, filterWeekJobs } from "@/lib/offlineJobFilters";
import { runOfflineMirrorPrefetch } from "@/lib/offlineMirrorPrefetch";

type OfflineJob = {
  id?: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  title?: string | null;
  status?: string | null;
  visit_status?: string | null;
  client_name?: string | null;
  customer_name?: string | null;
  client_phone?: string | null;
  customer_phone?: string | null;
  property_address?: string | null;
  address?: string | null;
  address_1?: string | null;
  city?: string | null;
  total_amount?: number | string | null;
};

type OfflineCustomer = {
  id?: string;
  display_name?: string | null;
  company_name?: string | null;
  phone?: string | null;
  secondary_phone?: string | null;
  email?: string | null;
};

function formatRelative(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatTimeRange(start?: string | null, end?: string | null): string {
  if (!start) return "—";
  try {
    const s = new Date(start);
    const fmt = (d: Date) =>
      d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (!end) return fmt(s);
    return `${fmt(s)} – ${fmt(new Date(end))}`;
  } catch {
    return "—";
  }
}

function mapsUrl(address: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

/**
 * Read-only offline command copy. Gated by presence of the auth snapshot
 * (a trust boundary the user has already crossed on this device) AND a
 * mirrored dataset for a business the snapshot lists.
 */
export default function PlatformOffline() {
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [schedule, setSchedule] = useState<MirrorRecord<OfflineJob[]> | null>(null);
  const [customers, setCustomers] = useState<MirrorRecord<OfflineCustomer[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"today" | "week" | "customers">("today");
  const [query, setQuery] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [backOnline, setBackOnline] = useState(false);

  // Resolve snapshot + pick a business that has mirrored data.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Snapshot key prefix from usePlatformAuth
        const SNAPSHOT_PREFIX = "platform_access_snapshot:";
        let snapUserId: string | null = null;
        type SnapEntry = {
          userId: string;
          selectedBusinessId: string | null;
          businessAccess: Array<{
            business_id: string;
            business?: { public_brand_name?: string };
          }>;
        };
        let snap: SnapEntry | null = null;
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (!k || !k.startsWith(SNAPSHOT_PREFIX)) continue;
          const raw = window.localStorage.getItem(k);
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw) as SnapEntry;
            if (parsed?.userId) { snap = parsed; snapUserId = parsed.userId; break; }
          } catch { /* ignore */ }
        }
        if (!snap || !snapUserId) {
          if (!cancelled) navigate("/platform/login", { replace: true });
          return;
        }

        const accessibleIds = new Set(snap.businessAccess.map((a) => a.business_id));
        const mirrored = await listMirroredBusinesses();
        const candidate =
          (snap.selectedBusinessId && accessibleIds.has(snap.selectedBusinessId) && mirrored.includes(snap.selectedBusinessId))
            ? snap.selectedBusinessId
            : mirrored.find((id) => accessibleIds.has(id)) ?? null;

        if (!candidate) {
          if (!cancelled) navigate("/platform/login", { replace: true });
          return;
        }

        const name = snap.businessAccess.find((a) => a.business_id === candidate)?.business?.public_brand_name ?? "";

        const [sch, cust] = await Promise.all([
          readMirror<OfflineJob[]>("schedule", candidate),
          readMirror<OfflineCustomer[]>("customers", candidate),
        ]);

        if (cancelled) return;
        setBusinessId(candidate);
        setBusinessName(name);
        setSchedule(sch);
        setCustomers(cust);
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  // 60s recovery ping.
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    if (!url || !key) return;
    let cancelled = false;
    const tick = async () => {
      const ok = await pingSupabase(url, key);
      if (cancelled) return;
      if (ok) setBackOnline(true);
    };
    const interval = window.setInterval(() => { void tick(); }, 60_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  const isOwner = !!(schedule?.isOwner ?? customers?.isOwner);
  const savedAt = Math.max(schedule?.savedAt ?? 0, customers?.savedAt ?? 0);

  const jobs: OfflineJob[] = useMemo(() => {
    const raw = schedule?.data ?? [];
    return [...raw].sort((a, b) => {
      const at = a.scheduled_start ? new Date(a.scheduled_start).getTime() : 0;
      const bt = b.scheduled_start ? new Date(b.scheduled_start).getTime() : 0;
      return at - bt;
    });
  }, [schedule]);

  const todayJobs = useMemo(() => {
    return filterTodayJobs(jobs);
  }, [jobs]);

  const weekJobs = useMemo(() => {
    return filterWeekJobs(jobs);
  }, [jobs]);

  const filteredCustomers = useMemo(() => {
    const list = customers?.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const name = (c.display_name ?? c.company_name ?? "").toLowerCase();
      const phone = (c.phone ?? "").toLowerCase();
      const email = (c.email ?? "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [customers, query]);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    let ok = false;
    if (url && key) ok = await pingSupabase(url, key);
    if (!ok) {
      try {
        const { error } = await supabase.auth.getSession();
        ok = !error;
      } catch { ok = false; }
    }
    // Fire a forced offline prefetch so a successful retry always refreshes
    // the snapshot before the user leaves this screen.
    if (ok && businessId) {
      void runOfflineMirrorPrefetch(businessId, { force: true });
    }
    setRetrying(false);
    if (ok) navigate("/platform", { replace: true });
  };

  if (loading || !businessId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#05070a", color: "rgba(255,255,255,0.55)" }}>
        <p className="font-body text-sm">Loading saved copy…</p>
      </div>
    );
  }

  return (
    <div className="ops-theme min-h-screen" style={{ background: "#05070a", color: "rgba(255,255,255,0.9)" }}>
      {/* Amber outage header */}
      <div
        className="sticky top-0 z-30 px-4 py-3"
        style={{ background: "rgba(245, 158, 11, 0.14)", borderBottom: "1px solid rgba(245, 158, 11, 0.35)", color: "#fde68a" }}
      >
        <div className="max-w-3xl mx-auto flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <WifiOff className="w-4 h-4 mt-[2px] shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="font-body font-semibold text-[13px] leading-tight">
                OFFLINE COPY — saved {savedAt ? formatRelative(savedAt) : "recently"}.
              </p>
              <p className="font-body text-[11px] opacity-80 leading-snug">
                Viewing only; editing returns when servers are back.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold min-h-[44px] sm:min-h-0 hover:brightness-110 transition-[filter]"
            style={{ background: "rgba(245,158,11,0.22)", color: "#fef3c7" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} aria-hidden />
            Retry
          </button>
        </div>
      </div>

      {backOnline && (
        <div
          className="px-4 py-3"
          style={{ background: "rgba(34,197,94,0.14)", borderBottom: "1px solid rgba(34,197,94,0.35)", color: "#bbf7d0" }}
        >
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[12px] font-body">
              <CheckCircle2 className="w-4 h-4" aria-hidden />
              Back online.
            </span>
            <Link
              to="/platform"
              className="inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold min-h-[44px] sm:min-h-0 hover:brightness-110 transition-[filter]"
              style={{ background: "rgba(34,197,94,0.22)", color: "#dcfce7" }}
            >
              Return to live app
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 pb-24 pt-4">
        <header className="mb-4">
          <p
            className="font-body text-[10px] font-semibold uppercase mb-1"
            style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.45)" }}
          >
            Read-only command copy
          </p>
          <h1 className="font-display text-2xl font-semibold text-white leading-tight">
            {businessName || "Your business"}
          </h1>
        </header>

        {/* Tabs */}
        <div
          role="tablist"
          className="grid grid-cols-3 gap-1 rounded-2xl p-1 mb-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {(
            [
              ["today", `Today (${todayJobs.length})`],
              ["week", `This Week (${weekJobs.length})`],
              ["customers", `Customers (${customers?.data?.length ?? 0})`],
            ] as const
          ).map(([id, label]) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id)}
                className="min-h-[44px] rounded-xl text-[12px] font-semibold font-body transition-colors"
                style={{
                  background: active ? "rgba(255,255,255,0.08)" : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.55)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {tab === "today" && <JobList jobs={todayJobs} isOwner={isOwner} emptyLabel="No jobs saved for today." />}
        {tab === "week" && <JobList jobs={weekJobs} isOwner={isOwner} emptyLabel="No jobs saved for this week." />}

        {tab === "customers" && (
          <div>
            <div className="relative mb-3">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search saved customers"
                className="w-full min-h-[44px] rounded-xl pl-10 pr-4 text-[14px] font-body text-white placeholder:text-white/35"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
            </div>
            <CustomerList customers={filteredCustomers} emptyLabel={customers ? "No customers match." : "No customers saved."} />
          </div>
        )}
      </div>
    </div>
  );
}

function readOnlyBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-body font-semibold"
      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}
    >
      <Lock className="w-3 h-3" aria-hidden />
      Read only
    </span>
  );
}

function JobList({ jobs, isOwner, emptyLabel }: { jobs: OfflineJob[]; isOwner: boolean; emptyLabel: string }) {
  if (jobs.length === 0) {
    return (
      <div
        className="rounded-2xl p-6 text-center text-[13px] text-white/55 font-body"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {emptyLabel}
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {jobs.map((j, i) => {
        const name = j.client_name ?? j.customer_name ?? "Customer";
        const phone = j.client_phone ?? j.customer_phone ?? null;
        const address = j.property_address ?? j.address ?? null;
        const amt = Number(j.total_amount ?? 0);
        return (
          <li
            key={j.id ?? `${name}-${i}`}
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-body text-[11px] text-white/50 tracking-wide uppercase">
                  {formatTimeRange(j.scheduled_start, j.scheduled_end)}
                </p>
                <p className="font-display text-[15px] font-semibold text-white truncate">{name}</p>
                {j.title && <p className="font-body text-[13px] text-white/70 truncate">{j.title}</p>}
              </div>
              {readOnlyBadge()}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center gap-1 min-h-[44px] rounded-full px-3 text-[12px] font-body font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.85)" }}
                >
                  <Phone className="w-3.5 h-3.5" aria-hidden />
                  {phone}
                </a>
              )}
              {address && (
                <a
                  href={mapsUrl(address)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 min-h-[44px] rounded-full px-3 text-[12px] font-body max-w-full"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.85)" }}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{address}</span>
                </a>
              )}
              {isOwner && Number.isFinite(amt) && amt > 0 && (
                <span
                  className="inline-flex items-center rounded-full px-3 min-h-[28px] text-[12px] font-body font-semibold"
                  style={{ background: "rgba(34,197,94,0.12)", color: "#bbf7d0" }}
                >
                  ${amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CustomerList({ customers, emptyLabel }: { customers: OfflineCustomer[]; emptyLabel: string }) {
  if (customers.length === 0) {
    return (
      <div
        className="rounded-2xl p-6 text-center text-[13px] text-white/55 font-body"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {emptyLabel}
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {customers.map((c, i) => {
        const name = c.display_name ?? c.company_name ?? "Customer";
        return (
          <li
            key={c.id ?? `${name}-${i}`}
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-[15px] font-semibold text-white truncate">{name}</p>
                {c.email && <p className="font-body text-[12px] text-white/55 truncate">{c.email}</p>}
              </div>
              {readOnlyBadge()}
            </div>
            {c.phone && (
              <div className="mt-3">
                <a
                  href={`tel:${c.phone}`}
                  className="inline-flex items-center gap-1 min-h-[44px] rounded-full px-3 text-[12px] font-body font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.85)" }}
                >
                  <Phone className="w-3.5 h-3.5" aria-hidden />
                  {c.phone}
                </a>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export const _internal = { formatRelative, hasAnyMirrorFor };