import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  Receipt,
  TrendingUp,
  PieChart,
  FileSpreadsheet,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PayrollPanel from "@/pages/platform/finance/PayrollPanel";
import IncomePanel from "@/pages/platform/finance/IncomePanel";
import ExpensesPanel from "@/pages/platform/finance/ExpensesPanel";
import ProfitLossPanel from "@/pages/platform/finance/ProfitLossPanel";
import TaxCenterPanel from "@/pages/platform/finance/TaxCenterPanel";

type Section = "payroll" | "income" | "expenses" | "pnl" | "tax";

const SECTIONS: Array<{ key: Section; label: string; icon: typeof Wallet }> = [
  { key: "payroll", label: "Payroll", icon: Wallet },
  { key: "income", label: "Income", icon: TrendingUp },
  { key: "expenses", label: "Expenses", icon: Receipt },
  { key: "pnl", label: "Profit & Loss", icon: PieChart },
  { key: "tax", label: "Tax Center", icon: FileSpreadsheet },
];

export default function PlatformFinance() {
  const auth = usePlatformAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();

  const active: Section = useMemo(() => {
    const s = (section as Section) || "payroll";
    return SECTIONS.some((x) => x.key === s) ? s : "payroll";
  }, [section]);

  // Hard owner gate — RoleRoute also enforces this, but be defensive.
  useEffect(() => {
    if (auth.loading || roleLoading) return;
    if (role && role !== "owner") navigate("/platform", { replace: true });
  }, [auth.loading, roleLoading, role, navigate]);

  if (auth.loading || roleLoading) {
    return (
      <PlatformLayout>
        <div className="text-sm text-muted-foreground">Loading…</div>
      </PlatformLayout>
    );
  }

  if (role && role !== "owner") {
    return (
      <PlatformLayout>
        <div className="text-sm text-muted-foreground">Owner access only.</div>
      </PlatformLayout>
    );
  }

  const businessId = auth.selectedBusinessId;

  return (
    <PlatformLayout>
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
            Finance
          </h2>
          <p className="font-body text-sm text-muted-foreground mt-1">
            Owner-only. All numbers are workspace-scoped.
          </p>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = s.key === active;
            return (
              <Button
                key={s.key}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate(`/platform/finance/${s.key}`)}
                className={cn(
                  "shrink-0 gap-1.5",
                  isActive ? "" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
                {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
              </Button>
            );
          })}
        </div>

        {!businessId && (
          <div className="rounded-xl border border-border bg-card/60 p-6 text-center">
            <p className="font-body text-sm text-muted-foreground">
              Choose a workspace from the switcher to view finance data.
            </p>
          </div>
        )}

        {businessId && active === "payroll" && <PayrollPanel businessId={businessId} />}
        {businessId && active === "income" && <IncomePanel businessId={businessId} />}
        {businessId && active === "expenses" && <ExpensesPanel businessId={businessId} />}
        {businessId && active === "pnl" && <ProfitLossPanel businessId={businessId} />}
        {businessId && active === "tax" && <TaxCenterPanel businessId={businessId} />}
      </div>
    </PlatformLayout>
  );
}