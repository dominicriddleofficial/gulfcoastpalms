import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Sparkles, Phone, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface YearlyRow {
  customer_id: string;
  display_name: string;
  phone: string | null;
  city: string | null;
  source: "manual" | "auto" | null;
  added_at: string | null;
  jobs_count: number;
  last_job_at: string | null;
  total_revenue: number;
}

function fmtMoney(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function PlatformYearlyClients() {
  const { selectedBusinessId } = usePlatformAuth();
  const { isOwner } = useUserRole();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["yearly-clients", selectedBusinessId],
    queryFn: async (): Promise<YearlyRow[]> => {
      if (!selectedBusinessId) return [];
      const { data: rpc, error } = await supabase.rpc("get_yearly_trimming_roster", {
        _business_id: selectedBusinessId,
      });
      if (error) throw error;
      return (rpc ?? []).map((r): YearlyRow => ({
        customer_id: r.face_customer_id,
        display_name: r.display_name ?? "",
        phone: r.phone,
        city: r.city,
        source: (r.source as "manual" | "auto" | null) ?? null,
        added_at: r.added_at,
        jobs_count: Number(r.jobs_count ?? 0),
        last_job_at: r.last_job_at,
        total_revenue: Number(r.total_revenue ?? 0),
      }));
    },
    enabled: !!selectedBusinessId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(() => {
    const list = [...(data ?? [])];
    list.sort((a, b) => (b.last_job_at ?? "").localeCompare(a.last_job_at ?? ""));
    return list;
  }, [data]);

  const totalCount = rows.length;
  const avgJobValue = useMemo(() => {
    const totals = rows.filter((r) => r.jobs_count > 0 && r.total_revenue > 0);
    if (totals.length === 0) return 0;
    const sum = totals.reduce((s, r) => s + r.total_revenue / r.jobs_count, 0);
    return sum / totals.length;
  }, [rows]);
  const estRecurring = Math.round(totalCount * avgJobValue);

  const removeCustomer = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from Yearly Trimming?`)) return;
    const { error } = await supabase
      .from("platform_customers")
      .update({
        yearly_trimming: false,
        yearly_trimming_source: "manual",
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
      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6 pb-8">
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
          </div>
        </div>

        {/* Summary stats block */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="font-body text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Yearly Clients
            </div>
            <div className="mt-1 font-display text-3xl font-bold text-foreground tabular-nums">
              {isLoading ? "—" : totalCount}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="font-body text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Est. Annual Value
            </div>
            <div className="mt-1 font-display text-3xl font-bold text-primary tabular-nums">
              {isLoading ? "—" : estRecurring > 0 ? fmtMoney(estRecurring) : "—"}
            </div>
          </div>
        </div>

        {rows.length === 0 && !isLoading && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground font-body text-sm">
            No yearly clients yet — flip on the toggle from a completed job.
          </div>
        )}

        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.customer_id}
              className="rounded-xl border border-border bg-card px-3 py-2.5"
            >
              {/* Row 1 */}
              <div className="flex items-center justify-between gap-2">
                <Link
                  to={`/platform/customers?id=${r.customer_id}`}
                  className="font-body text-[15px] font-semibold text-foreground hover:text-primary truncate"
                >
                  {r.display_name}
                </Link>
                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold tabular-nums">
                  {r.jobs_count} {r.jobs_count === 1 ? "job" : "jobs"}
                </span>
              </div>

              {/* Row 2 */}
              <div className="mt-1 flex items-center justify-between gap-2 text-[13px]">
                {r.phone ? (
                  <a
                    href={`tel:${r.phone}`}
                    className="inline-flex items-center gap-1 font-body text-primary hover:underline truncate"
                  >
                    <Phone className="w-3 h-3" />
                    {r.phone}
                  </a>
                ) : (
                  <span className="font-body text-muted-foreground">No phone</span>
                )}
                <span className="font-body text-muted-foreground truncate">
                  {r.city ?? "—"}
                </span>
              </div>

              {/* Row 3 */}
              <div className="mt-1 flex items-center justify-between gap-2 text-[12px]">
                <span className="font-body text-muted-foreground truncate">
                  Last job:{" "}
                  {r.last_job_at ? format(new Date(r.last_job_at), "MMM d, yyyy") : "—"}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isOwner && r.total_revenue > 0 && (
                    <span className="font-body text-foreground/70 tabular-nums">
                      {fmtMoney(r.total_revenue)}
                    </span>
                  )}
                  <span
                    className={
                      r.source === "manual"
                        ? "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-primary/15 text-primary"
                        : "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-secondary text-muted-foreground"
                    }
                  >
                    {r.source === "manual" ? "Asked ✓" : "Auto"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCustomer(r.customer_id, r.display_name)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label={`Remove ${r.display_name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PlatformLayout>
  );
}