import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { Users, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CREW_PARAM } from "@/lib/search/universalSearch";

/** Read-only crew roster; focuses `?crew=<id>` when opened from search. */
export default function CrewMembersSection({ businessId }: { businessId: string | null }) {
  const location = useLocation();
  const focusId = new URLSearchParams(location.search).get(CREW_PARAM);
  const focusRef = useRef<HTMLLIElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["platform-crew-members", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_crew_members")
        .select("id, display_name, role, phone, email, status")
        .eq("business_id", businessId as string)
        .order("display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!focusId || isLoading) return;
    (focusRef.current ?? sectionRef.current)?.scrollIntoView({ block: "center" });
  }, [focusId, isLoading, location.key]);

  const missing = !!focusId && !isLoading && !isError && !data.some((c) => c.id === focusId);

  return (
    <section id="crew-members" ref={sectionRef} className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">Crew members</h2>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading crew…</p>}
      {isError && <p role="alert" className="text-sm text-destructive">Couldn't load crew members.</p>}
      {missing && (
        <p role="alert" className="flex items-center gap-2 text-sm text-foreground">
          <AlertTriangle className="h-4 w-4 text-destructive" /> That crew member isn't available in this workspace.
        </p>
      )}
      {!isLoading && !isError && data.length === 0 && <p className="text-sm text-muted-foreground">No crew members yet.</p>}
      <ul className="space-y-2">
        {data.map((c) => {
          const focused = c.id === focusId;
          return (
            <li
              key={c.id}
              ref={focused ? focusRef : undefined}
              data-focused={focused || undefined}
              className={`rounded-lg border p-3 ${focused ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border bg-secondary/30"}`}
            >
              <p className="text-sm font-medium text-foreground">{c.display_name}</p>
              <p className="text-xs text-muted-foreground">{[c.role, c.phone, c.email, c.status].filter(Boolean).join(" · ")}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
