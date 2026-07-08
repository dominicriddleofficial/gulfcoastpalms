import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";

interface Props {
  customerId: string | null;
  customerName: string | null;
}

/**
 * Toggle displayed on a job's detail sheet that flips the CUSTOMER's
 * `yearly_trimming` flag (source='manual' when set from here).
 * Manual flag always wins over the auto-flag trigger.
 */
export default function YearlyTrimmingToggle({ customerId, customerName }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!customerId) {
      setEnabled(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("platform_customers")
        .select("yearly_trimming, yearly_trimming_source")
        .eq("id", customerId)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data) {
        setEnabled(Boolean(data.yearly_trimming));
        setSource((data.yearly_trimming_source as string | null) ?? null);
      } else {
        setEnabled(false);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const onToggle = async (next: boolean) => {
    if (!customerId || saving) return;
    setSaving(true);
    const patch = next
      ? {
          yearly_trimming: true,
          yearly_trimming_source: "manual",
          yearly_trimming_added_at: new Date().toISOString(),
        }
      : {
          yearly_trimming: false,
          yearly_trimming_source: null,
          yearly_trimming_added_at: null,
        };
    const { error } = await supabase
      .from("platform_customers")
      .update(patch)
      .eq("id", customerId);
    setSaving(false);
    if (error) {
      toast.error("Could not update yearly trimming", { description: error.message });
      return;
    }
    setEnabled(next);
    setSource(next ? "manual" : null);
    if (next) {
      toast.success(`${customerName || "Customer"} added to Yearly Trimming clients`);
    } else {
      toast(`${customerName || "Customer"} removed from Yearly Trimming clients`);
    }
  };

  if (!customerId) {
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
    <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="font-body text-[13px] font-bold uppercase tracking-wide text-foreground">
              Yearly Trimming Client
            </p>
          </div>
          <p className="font-body text-[13px] text-muted-foreground leading-snug">
            {enabled
              ? `On the yearly list${source === "manual" ? " (manual)" : source === "auto" ? " (auto)" : ""}. We reach out next year.`
              : "Ask the customer: “Want us back every year?” Flip on if yes."}
          </p>
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