import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { Link } from "react-router-dom";
import { Activity } from "lucide-react";

interface KpiRow {
  snapshot_date: string;
  revenue_today: number;
  revenue_week: number;
  revenue_month: number;
  jobs_today: number;
  jobs_week: number;
  quotes_open: number;
  quote_conversion_30d: number;
  invoices_outstanding_count: number;
  invoices_outstanding_total: number;
  payments_collected_30d: number;
  refreshed_at: string;
}

function fmtMoney(n: number): string {
  return `$${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function KpiSnapshotWidget() {
  const { selectedBusinessId } = useBusinessContext();
  const { data } = useQuery({
    queryKey: ["kpi-snapshot", selectedBusinessId],
    queryFn: async (): Promise<KpiRow | null> => {
      if (!selectedBusinessId) return null;
      const { data, error } = await supabase
        .from("business_kpi_snapshots")
        .select("snapshot_date, revenue_today, revenue_week, revenue_month, jobs_today, jobs_week, quotes_open, quote_conversion_30d, invoices_outstanding_count, invoices_outstanding_total, payments_collected_30d, refreshed_at")
        .eq("business_id", selectedBusinessId)
        .order("snapshot_date", { ascending: false })
        .limit(1).maybeSingle();
      if (error) throw error;
      return (data as KpiRow | null) ?? null;
    },
    enabled: !!selectedBusinessId,
    refetchInterval: 5 * 60_000,
  });

  if (!data) return null;

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold">Snapshot</h3>
        </div>
        <Link to="/platform/backend-health" className="text-xs text-muted-foreground hover:text-foreground">
          Backend health →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Stat label="Revenue today" value={fmtMoney(data.revenue_today)} />
        <Stat label="Revenue 30d" value={fmtMoney(data.revenue_month)} />
        <Stat label="Jobs today" value={String(data.jobs_today)} />
        <Stat label="Jobs 7d" value={String(data.jobs_week)} />
        <Stat label="Open quotes" value={String(data.quotes_open)} />
        <Stat label="Conversion 30d" value={`${Number(data.quote_conversion_30d).toFixed(0)}%`} />
        <Stat label="Outstanding inv." value={`${data.invoices_outstanding_count} · ${fmtMoney(data.invoices_outstanding_total)}`} />
        <Stat label="Payments 30d" value={fmtMoney(data.payments_collected_30d)} />
      </div>
      <p className="text-[10px] text-muted-foreground mt-3">
        Snapshot {new Date(data.refreshed_at).toLocaleTimeString()} · {data.snapshot_date}
      </p>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}