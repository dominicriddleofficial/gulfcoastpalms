import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CreditCard, CheckCircle, XCircle, Loader2, Shield, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const BUSINESS_THEMES: Record<string, { name: string; accent: string; gradient: string; accentLight: string }> = {
  gcp: { name: "Gulf Coast Palms", accent: "hsl(142, 60%, 40%)", gradient: "from-green-800 to-green-600", accentLight: "hsl(142, 60%, 95%)" },
  pps: { name: "Prestige Property Services", accent: "hsl(220, 60%, 40%)", gradient: "from-blue-900 to-blue-700", accentLight: "hsl(220, 60%, 95%)" },
};

type InvoiceData = {
  id: string;
  invoice_number: string;
  total: number;
  balance_due: number;
  status: string;
  deposit_required: boolean;
  deposit_amount: number;
  deposit_paid: boolean;
  customer_name: string;
  business_name: string;
  shortcode: string;
};

export default function PayInvoice() {
  const { shortcode, invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelled = searchParams.get("cancelled") === "true";

  const theme = BUSINESS_THEMES[shortcode?.toLowerCase() || ""] || BUSINESS_THEMES.gcp;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const baseUrl = `https://${projectId}.supabase.co/functions/v1`;

  useEffect(() => {
    async function load() {
      if (!invoiceId) { setError("No invoice specified"); setLoading(false); return; }
      try {
        const resp = await fetch(`${baseUrl}/get-invoice-public`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoice_id: invoiceId }),
        });
        const data = await resp.json();
        if (!resp.ok || data.error) {
          setError(data.error || "Invoice not found");
        } else {
          setInvoice(data);
        }
      } catch {
        setError("Failed to load invoice");
      }
      setLoading(false);
    }
    load();
  }, [invoiceId, baseUrl]);

  const handlePay = async () => {
    if (!invoice) return;
    setPaying(true);
    setError(null);
    try {
      const resp = await fetch(`${baseUrl}/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoice.id, origin_url: window.location.origin }),
      });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      if (result.url) window.location.href = result.url;
    } catch (err: any) {
      setError(err.message || "Payment failed");
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <XCircle className="w-14 h-14 mx-auto text-red-400 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  if (invoice.status === "paid") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className={`bg-gradient-to-r ${theme.gradient} text-white py-6 px-4`}>
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-xl font-bold">{invoice.business_name || theme.name}</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Paid</h1>
            <p className="text-gray-500">Invoice {invoice.invoice_number} has been paid in full.</p>
          </div>
        </div>
      </div>
    );
  }

  const dueNow = invoice.deposit_required && !invoice.deposit_paid && invoice.deposit_amount > 0
    ? invoice.deposit_amount
    : invoice.balance_due;

  const dueLabel = invoice.deposit_required && !invoice.deposit_paid
    ? "Deposit Due Now"
    : "Amount Due";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className={`bg-gradient-to-r ${theme.gradient} text-white py-8 px-4`}>
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-1">{invoice.business_name || theme.name}</h1>
          <p className="text-white/60 text-sm">Secure Online Payment</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-md space-y-4">

          {/* Cancelled message */}
          {cancelled && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
              <p className="text-sm font-semibold text-amber-800">Payment Not Completed</p>
              <p className="text-xs text-amber-600 mt-0.5">No charges were made. You can try again below.</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          {/* Invoice Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Invoice header */}
            <div className="p-5 pb-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Invoice</p>
                  <p className="text-lg font-bold text-gray-900 font-mono tracking-wide">{invoice.invoice_number}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold capitalize">
                  {invoice.status}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Bill To</p>
                <p className="text-gray-900 font-semibold">{invoice.customer_name}</p>
              </div>
            </div>

            {/* Financial summary */}
            <div className="px-5 pb-5 space-y-3">
              {/* Primary: Amount due now */}
              <div className="rounded-xl p-4" style={{ backgroundColor: theme.accentLight }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: theme.accent }}>{dueLabel}</p>
                <p className="text-3xl font-extrabold tracking-tight" style={{ color: theme.accent }}>
                  ${dueNow.toLocaleString()}
                </p>
              </div>

              {/* Breakdown */}
              <div className="space-y-2 pt-1">
                {invoice.deposit_required && !invoice.deposit_paid && (
                  <SummaryRow label="Deposit Required" value={`$${invoice.deposit_amount.toLocaleString()}`} highlight />
                )}
                {invoice.deposit_required && invoice.deposit_paid && (
                  <SummaryRow label="Deposit Paid ✓" value={`$${invoice.deposit_amount.toLocaleString()}`} positive />
                )}
                <SummaryRow label="Invoice Total" value={`$${invoice.total.toLocaleString()}`} />
                {invoice.balance_due !== invoice.total && (
                  <SummaryRow label="Remaining Balance" value={`$${invoice.balance_due.toLocaleString()}`} bold />
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="px-5 pb-5">
              <Button
                onClick={handlePay}
                disabled={paying}
                className="w-full h-14 text-lg font-bold rounded-xl shadow-md transition-all"
                style={{ backgroundColor: theme.accent }}
              >
                {paying ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <CreditCard className="w-5 h-5 mr-2" />
                )}
                {paying ? "Redirecting to checkout..." : `Pay $${dueNow.toLocaleString()}`}
              </Button>
            </div>
          </div>

          {/* Trust footer */}
          <div className="flex items-center justify-center gap-1.5 text-gray-400 text-xs py-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Secured by Stripe · 256-bit SSL encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold, highlight, positive }: {
  label: string; value: string; bold?: boolean; highlight?: boolean; positive?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? "font-semibold text-gray-900" : "text-gray-500"} ${highlight ? "text-amber-600 font-medium" : ""} ${positive ? "text-green-600" : ""}`}>
        {label}
      </span>
      <span className={`text-sm ${bold ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
        {value}
      </span>
    </div>
  );
}
