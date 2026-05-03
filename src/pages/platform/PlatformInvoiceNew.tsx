import { useNavigate } from "react-router-dom";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useCreateSheets } from "@/components/platform/CreateSheetsProvider";
import InvoiceBuilder from "@/components/platform/billing/InvoiceBuilder";

export default function PlatformInvoiceNew() {
  const navigate = useNavigate();
  const { selectedBusinessId, businesses, userId } = usePlatformAuth();
  const { notifyCreated } = useCreateSheets();

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
      onClose={() => navigate(-1)}
      onCreated={() => { notifyCreated(); navigate("/platform/invoices"); }}
    />
  );
}