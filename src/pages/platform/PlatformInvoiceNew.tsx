import { useNavigate, useLocation } from "react-router-dom";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useCreateSheets } from "@/components/platform/CreateSheetsProvider";
import InvoiceBuilder from "@/components/platform/billing/InvoiceBuilder";
import type { InvoicePrefillState } from "@/components/platform/CreateSheetsProvider";

export default function PlatformInvoiceNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBusinessId, businesses, userId } = usePlatformAuth();
  const { notifyCreated } = useCreateSheets();
  const prefill = (location.state as { prefill?: InvoicePrefillState } | null)?.prefill;

  if (!selectedBusinessId) {
    return (
      <div className="ops-theme min-h-screen flex items-center justify-center bg-background p-6">
        <p className="font-body text-sm text-muted-foreground">Select a workspace before creating an invoice.</p>
      </div>
    );
  }
  return (
    <InvoiceBuilder
      businessId={selectedBusinessId}
      businesses={businesses}
      userId={userId}
      prefill={prefill}
      onClose={() => navigate(-1)}
      onCreated={() => { notifyCreated(); navigate("/platform/invoices"); }}
    />
  );
}