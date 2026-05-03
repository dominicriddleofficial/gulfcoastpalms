import { useNavigate } from "react-router-dom";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useCreateSheets } from "@/components/platform/CreateSheetsProvider";
import QuoteBuilder from "@/components/platform/billing/QuoteBuilder";

export default function PlatformQuoteNew() {
  const navigate = useNavigate();
  const { selectedBusinessId, businesses, userId } = usePlatformAuth();
  const { notifyCreated } = useCreateSheets();

  if (!selectedBusinessId) {
    return (
      <div className="ops-theme min-h-screen flex items-center justify-center bg-background p-6">
        <p className="font-body text-sm text-muted-foreground">Select a workspace before creating a quote.</p>
      </div>
    );
  }
  return (
    <QuoteBuilder
      businessId={selectedBusinessId}
      businesses={businesses.map(b => ({
        id: b.id, public_brand_name: b.public_brand_name,
        shortcode: b.shortcode, logo_url: b.logo_url || null,
        default_business_color: (b as Record<string, unknown>).default_business_color as string | undefined,
      }))}
      userId={userId}
      onClose={() => navigate(-1)}
      onCreated={() => { notifyCreated(); navigate("/platform/quotes"); }}
    />
  );
}