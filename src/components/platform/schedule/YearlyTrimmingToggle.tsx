import { useEffect, useState } from "react";
import { Sparkles, Loader2, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";

function formatFriendlyDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

interface Props {
  customerId: string | null;
  customerName: string | null;
  jobberJobId?: string | null;
  /** Platform job id being viewed. Used to clone forward one year. */
  sourceJobId?: string | null;
}

/**
 * Toggle displayed on a job's detail sheet that flips the CUSTOMER's
 * `yearly_trimming` flag (source='manual' when set from here).
 * Manual flag always wins over the auto-flag trigger.
 *
 * Works for both platform jobs (customerId provided) and Jobber-synced jobs
 * (only jobberJobId is known — the RPC resolves the platform customer).
 */
export default function YearlyTrimmingToggle({ customerId, customerName, jobberJobId, sourceJobId }: Props) {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [resolvedCustomerId, setResolvedCustomerId] = useState<string | null>(customerId ?? null);
  const [nextVisitDate, setNextVisitDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setResolvedCustomerId(customerId ?? null);
    if (!customerId && !jobberJobId) {
      setEnabled(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc("get_yearly_trimming_for_job", {
        _jobber_job_id: jobberJobId ?? null,
        _customer_id: customerId ?? null,
      });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : null;
      if (!error && row) {
        setResolvedCustomerId(row.customer_id ?? null);
        setEnabled(Boolean(row.enabled));
        setSource((row.source as string | null) ?? null);
        // Look up an existing next-year auto job for this customer
        if (row.customer_id) {
          const { data: nj } = await supabase
            .from("platform_jobs")
            .select("scheduled_start")
            .eq("customer_id", row.customer_id)
            .eq("origin", "yearly_auto")
            .eq("status", "scheduled")
            .is("deleted_at", null)
            .gte("scheduled_start", new Date().toISOString().slice(0, 10))
            .order("scheduled_start", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (!cancelled) setNextVisitDate((nj?.scheduled_start as string | null) ?? null);
        }
      } else {
        setEnabled(false);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, jobberJobId]);

  const onToggle = async (next: boolean) => {
    if (saving) return;
    if (!resolvedCustomerId && !jobberJobId) return;
    setSaving(true);
    // Optimistic
    const prevEnabled = enabled;
    const prevSource = source;
    setEnabled(next);
    setSource("manual");
    const { data, error } = await supabase.rpc("set_yearly_trimming_for_job", {
      _jobber_job_id: jobberJobId ?? null,
      _customer_id: resolvedCustomerId ?? null,
      _value: next,
      _source_job_id: sourceJobId ?? null,
    });
    setSaving(false);
    if (error) {
      setEnabled(prevEnabled);
      setSource(prevSource);
      toast.error("Could not update yearly trimming", { description: error.message });
      return;
    }
    const row = (Array.isArray(data) ? data[0] : null) as
      | {
          out_customer_id?: string | null;
          out_next_job_id?: string | null;
          out_next_visit_date?: string | null;
        }
      | null;
    if (row?.out_customer_id) setResolvedCustomerId(row.out_customer_id);
    const newDate = next ? (row?.out_next_visit_date ?? null) : null;
    setNextVisitDate(newDate);
    qc.invalidateQueries({ queryKey: ["yearly-clients"] });
    qc.invalidateQueries({ queryKey: ["yearly-clients-count"] });
    qc.invalidateQueries({ queryKey: ["schedule-jobs"] });
    if (next) {
      const label = newDate ? formatFriendlyDate(newDate) : null;
      toast.success(
        label ? `Added — next visit booked for ${label}` : "Added to Yearly Trimming roster",
        { description: customerName ?? undefined },
      );
    } else {
      toast(`${customerName || "Customer"} removed from Yearly Trimming clients`);
    }
  };

  if (!customerId && !jobberJobId) {
    return (
      <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="font-body text-[13px] font-bold uppercase tracking-wide text-foreground/80">
            Yearly Trimming
          </p>
        </div>
        <p className="font-body text-[13px] text-muted-foreground">
          Sync this job to a customer to enable the yearly-trimming flag.
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        "rounded-2xl border p-4 transition-colors " +
        (enabled
          ? "border-primary/60 bg-primary/[0.10] shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]"
          : "border-border/60 bg-secondary/30")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className={"w-4 h-4 " + (enabled ? "text-primary" : "text-muted-foreground")} />
            <p className="font-body text-[13px] font-bold uppercase tracking-wide text-foreground">
              Yearly Trimming Client
            </p>
          </div>
          <p className="font-body text-[13px] text-muted-foreground leading-snug">
            {enabled
              ? `On the yearly list${source === "manual" ? " (manual)" : source === "auto" ? " (auto)" : ""}. We reach out next year.`
              : "Ask the customer: “Want us back every year?” Flip on if yes."}
          </p>
          {enabled && nextVisitDate && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-2.5 py-1">
              <CalendarCheck className="w-3.5 h-3.5 text-primary" />
              <span className="font-body text-[12px] font-bold text-primary">
                Next visit: {formatFriendlyDate(nextVisitDate)}
              </span>
            </div>
          )}
        </div>
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            checked={enabled ?? false}
            disabled={saving}
            onCheckedChange={onToggle}
            aria-label="Toggle yearly trimming"
          />
        )}
      </div>
    </div>
  );
}