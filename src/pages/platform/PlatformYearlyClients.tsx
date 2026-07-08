import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Sparkles, Phone, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface YearlyRow {
  customer_id: string;
  display_name: string;
  phone: string | null;
  city: string | null;
  source: "manual" | "auto" | null;
  added_at: string | null;
  completed_count: number;
  last_job_at: string | null;
  total_revenue: number;
}

function fmtMoney(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function PlatformYearlyClients() {
  const { selectedBusinessId } = usePlatformAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["yearly-clients", selectedBusinessId],
    queryFn: async (): Promise<YearlyRow[]> => {
      if (!selectedBusinessId) return [];
      const { data: custs, error } = await supabase
        .from("platform_customers")
        .select("id, display_name, phone, yearly_trimming_source, yearly_trimming_added_at")
        .eq("business_id", selectedBusinessId)
        .eq("yearly_trimming", true)
        .order("yearly_trimming_added_at", { ascending: false });
      if (error) throw error;
      if (!custs || custs.length === 0) return [];

      const ids = custs.map((c) => c.id);
      const { data: jobs } = await supabase
        .from("platform_jobs")
        .select("customer_id, status, total, scheduled_start, property_id, deleted_at")
        .in("customer_id", ids)
        .is("deleted_at", null);

      const { data: props } = await supabase
        .from("platform_properties")
        .select("customer_id, city")
        .in("customer_id", ids);

      const cityByCustomer = new Map<string, string>();
      for (const p of props ?? []) {
        if (!cityByCustomer.has(p.customer_id) && p.city) {
          cityByCustomer.set(p.customer_id, p.city);
        }
      }

      return custs.map((c) => {
        const rows = (jobs ?? []).filter(
          (j) => j.customer_id === c.id && String(j.status ?? "").toLowerCase() === "completed",
        );
        const totalRev = rows.reduce((s, j) => s + (Number(j.total) || 0), 0);
        const last = rows
          .map((j) => j.scheduled_start)
          .filter((v): v is string => Boolean(v))
          .sort()
          .pop() ?? null;
        return {
          customer_id: c.id,
          display_name: c.display_name,
          phone: c.phone,
          city: cityByCustomer.get(c.id) ?? null,
          source: (c.yearly_trimming_source as "manual" | "auto" | null) ?? null,
          added_at: c.yearly_trimming_added_at as string | null,
          completed_count: rows.length,
          last_job_at: last,
          total_revenue: totalRev,
        };
      });
    },
    enabled: !!selectedBusinessId,
  });

  const rows = useMemo(() => {
    const list = [...(data ?? [])];
    list.sort((a, b) => (b.last_job_at ?? "").localeCompare(a.last_job_at ?? ""));
    return list;
  }, [data]);

  const totalCount = rows.length;
  const avgJobValue = useMemo(() => {
    const totals = rows.filter((r) => r.completed_count > 0);
    if (totals.length === 0) return 0;
    const sum = totals.reduce((s, r) => s + r.total_revenue / r.completed_count, 0);
    return sum / totals.length;
  }, [rows]);
  const estRecurring = Math.round(totalCount * avgJobValue);

  const removeCustomer = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from Yearly Trimming?`)) return;
    const { error } = await supabase
      .from("platform_customers")
      .update({
        yearly_trimming: false,
        yearly_trimming_source: null,
        yearly_trimming_added_at: null,
      })
      .eq("id", id);
    if (error) {
      toast.error("Could not remove", { description: error.message });
      return;
    }
    toast.success(`${name} removed from Yearly Trimming`);
    refetch();
  };

  return (
    <PlatformLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link
            to="/platform"
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
                Yearly Trimming Clients
              </h1>
            </div>
            <p className="mt-1 font-body text-[14px] text-muted-foreground">
              {isLoading
                ? "Loading…"
                : totalCount === 0
                  ? "No clients yet — flip on the toggle from a completed job."
                  : `${totalCount} yearly ${totalCount === 1 ? "client" : "clients"}${
                      estRecurring > 0
                        ? ` · est. ${fmtMoney(estRecurring)}/yr recurring`
                        : ""
                    }`}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1.4fr_1fr_0.8fr_1fr_0.9fr_40px] gap-3 px-4 py-3 border-b border-border bg-secondary/40 font-body text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
            <span>Customer</span>
            <span>Phone</span>
            <span>City</span>
            <span className="text-right">Jobs</span>
            <span>Last job</span>
            <span>Source</span>
            <span />
          </div>
          {rows.length === 0 && !isLoading && (
            <div className="p-8 text-center text-muted-foreground font-body text-sm">
              No yearly clients yet.
            </div>
          )}
          {rows.map((r) => (
            <div
              key={r.customer_id}
              className="grid grid-cols-1 md:grid-cols-[2fr_1.4fr_1fr_0.8fr_1fr_0.9fr_40px] gap-3 px-4 py-3 border-b border-border/60 last:border-b-0 items-center"
            >
              <Link
                to={`/platform/customers?id=${r.customer_id}`}
                className="font-body text-[15px] font-semibold text-foreground hover:text-primary"
              >
                {r.display_name}
              </Link>
              {r.phone ? (
                <a
                  href={`tel:${r.phone}`}
                  className="inline-flex items-center gap-1.5 font-body text-[14px] text-primary hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {r.phone}
                </a>
              ) : (
                <span className="font-body text-[13px] text-muted-foreground">—</span>
              )}
              <span className="font-body text-[14px] text-foreground/80">{r.city ?? "—"}</span>
              <span className="font-body text-[14px] text-foreground text-right tabular-nums">
                {r.completed_count}
              </span>
              <span className="font-body text-[13px] text-muted-foreground">
                {r.last_job_at ? format(new Date(r.last_job_at), "MMM d, yyyy") : "—"}
              </span>
              <span
                className={
                  r.source === "manual"
                    ? "inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-primary/15 text-primary"
                    : "inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-secondary text-muted-foreground"
                }
              >
                {r.source ?? "auto"}
              </span>
              <button
                type="button"
                onClick={() => removeCustomer(r.customer_id, r.display_name)}
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors justify-self-end"
                aria-label={`Remove ${r.display_name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </PlatformLayout>
  );
}