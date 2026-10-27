import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useCreateSheets } from "@/components/platform/CreateSheetsProvider";
import QuoteBuilder from "@/components/platform/billing/QuoteBuilder";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { QuoteEditData } from "@/lib/edit-quote";

export default function PlatformQuoteEdit() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const { businesses, userId } = usePlatformAuth();
  const { notifyCreated } = useCreateSheets();
  const queryClient = useQueryClient();
  const [data, setData] = useState<QuoteEditData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    (async () => {
      try {
        if (!quoteId) throw new Error("Quote not found.");
        const { data: quote, error: quoteError } = await supabase.from("platform_quotes")
          .select("*").eq("id", quoteId).single();
        if (quoteError || !quote) throw new Error(quoteError?.message || "Quote not found.");
        if (quote.is_read_only || quote.deleted_at) throw new Error("This quote is read-only and cannot be edited.");
        if (quote.accepted_snapshot) throw new Error("This quote was accepted with the customer's choices and can't be edited. Create a new quote for any changes.");
        const [lines, customer] = await Promise.all([
          supabase.from("platform_quote_line_items").select("*")
            .eq("quote_id", quote.id).eq("business_id", quote.business_id).order("sort_order"),
          quote.customer_id
            ? supabase.from("platform_customers").select("id, display_name, email, phone")
                .eq("id", quote.customer_id).eq("business_id", quote.business_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);
        if (lines.error) throw new Error(lines.error.message);
        if (customer.error) throw new Error(customer.error.message);
        if (!cancelled) setData({ quote, items: lines.data || [], customer: customer.data });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load quote.");
      }
    })();
    return () => { cancelled = true; };
  }, [quoteId]);

  if (!data) {
    return (
      <div className="ops-theme min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="font-body text-sm text-muted-foreground" role={error ? "alert" : "status"}>
          {error || "Loading quote…"}
        </p>
        {error && <Button variant="outline" onClick={() => navigate("/platform/quotes")}>Back to Quotes</Button>}
      </div>
    );
  }

  return (
    <QuoteBuilder
      key={data.quote.id}
      businessId={data.quote.business_id}
      businesses={businesses.map(b => ({
        id: b.id, public_brand_name: b.public_brand_name,
        shortcode: b.shortcode, logo_url: b.logo_url || null,
      }))}
      userId={userId}
      editingQuote={data}
      onClose={() => navigate("/platform/quotes")}
      onCreated={() => {
        void queryClient.invalidateQueries({ queryKey: ["platform-quotes"] });
        notifyCreated();
        navigate("/platform/quotes");
      }}
    />
  );
}
