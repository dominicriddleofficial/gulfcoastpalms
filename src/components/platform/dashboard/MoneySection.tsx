import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { SectionCard, MetricTile, fmtMoney } from "./primitives";
import { subDays } from "date-fns";

export default function MoneySection() {
  const { selectedBusinessId, userId, loading } = usePlatformAuth();
  const ready = !loading && !!userId && !!selectedBusinessId;
  const today = new Date().toISOString().slice(0, 10);
  const since30d = subDays(new Date(), 30).toISOString().slice(0, 10);

  const invoices = useQuery({
    queryKey: ["dash-money-invoices", selectedBusinessId],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_invoices")
        .select("status, total, balance_due, due_date")
        .eq("business_id", selectedBusinessId!)
        .not("status", "in", "(paid,void)");
      const rows = data ?? [];
      const open = rows.filter((r) => Number(r.balance_due) > 0);
      const overdue = open.filter((r) => r.due_date && r.due_date < today);
      const outstanding = open.reduce(
        (s, r) => s + (Number(r.balance_due) || 0),
        0,
      );
      const overdueAmt = overdue.reduce(
        (s, r) => s + (Number(r.balance_due) || 0),
        0,
      );
      return {
        openCount: open.length,
        overdueCount: overdue.length,
        outstanding,
        overdueAmt,
      };
    },
  });

  const payments30d = useQuery({
    queryKey: ["dash-money-pay-30", selectedBusinessId, since30d],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_payments")
        .select("amount")
        .eq("business_id", selectedBusinessId!)
        .gte("payment_date", since30d);
      return (data ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    },
  });

  const grossRevenue30d = useQuery({
    queryKey: ["dash-money-rev-30", selectedBusinessId, since30d],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_invoices")
        .select("total")
        .eq("business_id", selectedBusinessId!)
        .gte("issue_date", since30d);
      return (data ?? []).reduce((s, r) => s + (Number(r.total) || 0), 0);
    },
  });

  const inv = invoices.data;

  return (
    <SectionCard title="Money" subtitle="Invoices, payments, revenue · 30d">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <MetricTile
          label="Open invoices"
          value={inv?.openCount ?? 0}
          loading={invoices.isPending}
          to="/platform/invoices?status=open"
          hint={fmtMoney(inv?.outstanding ?? 0)}
        />
        <MetricTile
          label="Overdue invoices"
          value={inv?.overdueCount ?? 0}
          loading={invoices.isPending}
          to="/platform/invoices?status=overdue"
          intent={(inv?.overdueCount ?? 0) > 0 ? "bad" : "good"}
          hint={fmtMoney(inv?.overdueAmt ?? 0)}
        />
        <MetricTile
          label="Payments 30d"
          value={fmtMoney(payments30d.data ?? 0)}
          loading={payments30d.isPending}
          to="/platform/payments"
          intent="good"
        />
        <MetricTile
          label="Outstanding balance"
          value={fmtMoney(inv?.outstanding ?? 0)}
          loading={invoices.isPending}
          to="/platform/invoices?status=open"
        />
        <MetricTile
          label="Gross revenue 30d"
          value={fmtMoney(grossRevenue30d.data ?? 0)}
          loading={grossRevenue30d.isPending}
          to="/platform/finance"
        />
      </div>
    </SectionCard>
  );
}