import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useCreateSheets } from "@/components/platform/CreateSheetsProvider";
import QuoteBuilder, { type ArboristQuoteSource } from "@/components/platform/billing/QuoteBuilder";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { arboristQuoteDraft } from "@/lib/arborist-to-quote";
import type { ArboristTree } from "@/lib/arborist-quotes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PlatformQuoteNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const arboristId = params.get("arborist");
  const { selectedBusinessId, businesses, userId } = usePlatformAuth();
  const { notifyCreated } = useCreateSheets();
  const [source, setSource] = useState<ArboristQuoteSource | null>(null);
  const [sourceError, setSourceError] = useState("");

  useEffect(() => {
    if (!arboristId) return;
    let cancelled = false;
    (async () => {
      try {
        if (!UUID.test(arboristId)) throw new Error("Arborist report not found.");
        // Reopen the existing draft instead of creating a duplicate customer quote.
        const { data: prior } = await supabase.from("platform_quotes").select("id").eq("source_arborist_quote_id", arboristId).maybeSingle();
        if (prior) { navigate(`/platform/quotes/${prior.id}/edit`, { replace: true }); return; }
        const { data: report, error } = await supabase.from("platform_arborist_quotes")
          .select("id, business_id, status, customer_name, property_address, trees").eq("id", arboristId).maybeSingle();
        if (error || !report) throw new Error("Arborist report not found or you don't have access.");
        if (report.status !== "submitted" && report.status !== "reviewed") throw new Error("Only submitted arborist reports can become customer quotes.");
        if (report.business_id !== selectedBusinessId) throw new Error("Switch to Gulf Coast Palms to create this quote.");
        const draft = arboristQuoteDraft({ trees: report.trees as unknown as ArboristTree[], property_address: report.property_address });
        if (!cancelled) setSource({ reportId: report.id, customerName: report.customer_name, propertyAddress: report.property_address, scope: draft.scope, lines: draft.lines });
      } catch (err) { if (!cancelled) setSourceError(err instanceof Error ? err.message : "Could not load the arborist report."); }
    })();
    return () => { cancelled = true; };
  }, [arboristId, selectedBusinessId, navigate]);

  if (!selectedBusinessId) {
    return (
      <div className="ops-theme min-h-screen flex items-center justify-center bg-background p-6">
        <p className="font-body text-sm text-muted-foreground">Select a workspace before creating a quote.</p>
      </div>
    );
  }
  if (arboristId && !source) {
    return (
      <div className="ops-theme min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="font-body text-sm text-muted-foreground" role={sourceError ? "alert" : "status"}>{sourceError || "Loading arborist report…"}</p>
        {sourceError && <Button variant="outline" onClick={() => navigate("/platform/arborist-quotes")}>Back to Arborist Quotes</Button>}
      </div>
    );
  }
  return (
    <QuoteBuilder
      key={source?.reportId ?? "new"}
      businessId={selectedBusinessId}
      businesses={businesses.map(b => ({
        id: b.id, public_brand_name: b.public_brand_name,
        shortcode: b.shortcode, logo_url: b.logo_url || null,
        default_business_color: (b as Record<string, unknown>).default_business_color as string | undefined,
      }))}
      userId={userId}
      arboristSource={source ?? undefined}
      onClose={() => navigate(-1)}
      onCreated={() => { notifyCreated(); navigate("/platform/quotes"); }}
    />
  );
}
