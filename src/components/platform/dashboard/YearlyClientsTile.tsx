import { Link } from "react-router-dom";
import { UsersRound, ChevronRight } from "lucide-react";
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

  const { data, isPending, isError } = useQuery({
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
    <Link to="/platform/yearly-clients" className="command-link-card">
      <span className="link-card-icon"><UsersRound className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <div className="command-link-card-title">Yearly trimming clients</div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <span className="command-link-card-value">{isPending || isError ? "—" : data ?? 0}</span>
          <span className="command-link-card-caption">{isError ? "Data unavailable" : "Recurring client base"}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
