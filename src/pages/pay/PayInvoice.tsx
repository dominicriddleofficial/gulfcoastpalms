import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, CheckCircle, XCircle, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const BUSINESS_THEMES: Record<string, { name: string; accent: string; gradient: string }> = {
  gcp: { name: "Gulf Coast Palms", accent: "hsl(142, 60%, 40%)", gradient: "from-green-800 to-green-600" },
  pps: { name: "Prestige Property Services", accent: "hsl(220, 60%, 40%)", gradient: "from-blue-900 to-blue-700" },
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

  useEffect(() => {
    async function load() {
      if (!invoiceId) { setError("No invoice specified"); setLoading(false); return; }

      const { data, error: fetchErr } = await supabase
        .from("platform_invoices")
        .select("*, platform_customers(display_name), businesses(shortcode, public_brand_name)")
        .eq("id", invoiceId)
        .single();

      if (fetchErr || !data) {
        setError("Invoice not found");
        setLoading(false);
        return;
      }

      setInvoice({
        id: data.id,
        invoice_number: data.invoice_number,
        total: Number(data.total) || 0,
        balance_due: Number(data.balance_due) || Number(data.total) || 0,
        status: data.status,
        deposit_required: !!data.deposit_required,
        deposit_amount: Number(data.deposit_amount) || 0,
        deposit_paid: !!data.deposit_paid,
        customer_name: (data as any).platform_customers?.display_name || "Customer",
        business_name: (data as any).businesses?.public_brand_name || theme.name,
        shortcode: (data as any).businesses?.shortcode || shortcode || "",
      });
      setLoading(false);
    }
    load();
  }, [invoiceId, shortcode]);

  const handlePay = async () => {
    if (!invoice) return;
    setPaying(true);
    setError(null);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoice.id,
          origin_url: window.location.origin,
        }),
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-1">Invoice Not Found</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  if (invoice.status === "paid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm mx-auto px-6">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Paid</h1>
          <p className="text-gray-500">Invoice {invoice.invoice_number} has been paid in full.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Business header */}
      <div className={`bg-gradient-to-r ${theme.gradient} text-white py-8 px-4`}>
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-1">{invoice.business_name}</h1>
          <p className="text-white/70 text-sm">Secure Online Payment</p>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-4">
          {cancelled && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <p className="text-sm text-amber-700">Payment was cancelled. You can try again below.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Invoice card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Invoice</p>
                  <p className="text-lg font-bold text-gray-900 font-mono">{invoice.invoice_number}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium capitalize">
                  {invoice.status}
                </span>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-0.5">Bill To</p>
                <p className="text-gray-900 font-medium">{invoice.customer_name}</p>
              </div>

              <div className="border-t border-gray-100 pt-4">
                {invoice.deposit_required && !invoice.deposit_paid && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Deposit Required</span>
                    <span className="font-medium text-gray-900">${invoice.deposit_amount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Invoice Total</span>
                  <span className="text-gray-700">${invoice.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-baseline border-t border-gray-100 pt-2">
                  <span className="text-gray-900 font-semibold">Amount Due</span>
                  <span className="text-2xl font-bold" style={{ color: theme.accent }}>
                    ${invoice.balance_due.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <Button
                onClick={handlePay}
                disabled={paying}
                className="w-full h-14 text-lg font-semibold rounded-xl shadow-md"
                style={{ backgroundColor: theme.accent }}
              >
                {paying ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <CreditCard className="w-5 h-5 mr-2" />
                )}
                {paying ? "Redirecting to checkout..." : `Pay $${invoice.balance_due.toLocaleString()}`}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-gray-400 text-xs">
            <Shield className="w-3.5 h-3.5" />
            <span>Secured by Stripe · 256-bit SSL encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}
