import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

/**
 * Dashboard quick-link card showing the deduplicated count of Yearly Trimming
 * clients via the get_yearly_trimming_count RPC. Visible to owner + manager.
 */
export default function YearlyClientsTile() {
  const { selectedBusinessId } = usePlatformAuth();
  const { role, isLoading } = useUserRole();
  const allowed = role === "owner" || role === "manager" || role === "office_manager";

  const { data } = useQuery({
    queryKey: ["yearly-clients-count", selectedBusinessId],
    queryFn: async () => {
      if (!selectedBusinessId) return 0;
      const { data, error } = await supabase.rpc("get_yearly_trimming_count", {
        _business_id: selectedBusinessId,
      });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    enabled: !!selectedBusinessId && allowed,
    staleTime: 60 * 1000,
  });

  if (isLoading || !allowed) return null;

  return (
    <Link
      to="/platform/yearly-clients"
      className="group block rounded-2xl p-4 md:p-5 transition-colors"
      style={{
        background:
          "linear-gradient(180deg, rgba(var(--biz-accent-rgb),0.10) 0%, rgba(var(--biz-accent-rgb),0.03) 100%)",
        border: "1px solid rgba(var(--biz-accent-rgb),0.28)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 24px -16px rgba(var(--biz-accent-rgb),0.35)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="rounded-lg p-2"
          style={{
            background: "rgba(var(--biz-accent-rgb),0.15)",
            border: "1px solid rgba(var(--biz-accent-rgb),0.30)",
          }}
        >
          <Sparkles className="w-4 h-4" style={{ color: "rgb(var(--biz-accent-rgb))" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-body uppercase"
            style={{ fontSize: "10px", letterSpacing: "0.16em", color: "hsl(220 8% 60%)" }}
          >
            Yearly Trimming Clients
          </div>
          <div className="mt-1 flex items-baseline gap-2 flex-wrap">
            <span
              className="font-display font-bold"
              style={{ fontSize: "22px", color: "#fff", letterSpacing: "-0.02em" }}
            >
              {data ?? 0}
            </span>
            <span className="font-body" style={{ fontSize: "12px", color: "hsl(220 8% 65%)" }}>
              recurring revenue asset
            </span>
          </div>
        </div>
        <span
          className="font-body opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ fontSize: "11px", color: "hsl(220 8% 65%)" }}
        >
          View →
        </span>
      </div>
    </Link>
  );
}
