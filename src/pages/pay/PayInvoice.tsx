import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CreditCard, CheckCircle, XCircle, Loader2, Shield, AlertCircle, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ── Business brand config ── */
const BRAND: Record<string, {
  name: string;
  tagline: string;
  headerBg: string;
  accent: string;
  accentLight: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  altRowBg: string;
  borderColor: string;
  footerBg: string;
  footerText: string;
  footerSubText: string;
  ctaBg: string;
  ctaText: string;
  ctaRadius: string;
  contactColor: string;
}> = {
  gcp: {
    name: "Gulf Coast Palms",
    tagline: "Professional Palm Tree Services — NW Florida",
    headerBg: "#1a5c38",
    accent: "#1a5c38",
    accentLight: "#f4faf6",
    tableHeaderBg: "#1a5c38",
    tableHeaderText: "#ffffff",
    altRowBg: "#f4faf6",
    borderColor: "#d0e8d8",
    footerBg: "#1a5c38",
    footerText: "#ffffff",
    footerSubText: "rgba(255,255,255,0.7)",
    ctaBg: "#1a5c38",
    ctaText: "#ffffff",
    ctaRadius: "8px",
    contactColor: "#ffffff",
  },
  pps: {
    name: "Prestige Property Services",
    tagline: "NW Florida's Premier Property Services",
    headerBg: "#141414",
    accent: "#141414",
    accentLight: "#f8f8f8",
    tableHeaderBg: "#141414",
    tableHeaderText: "#ffffff",
    altRowBg: "#f8f8f8",
    borderColor: "#e8e8e8",
    footerBg: "#141414",
    footerText: "#ffffff",
    footerSubText: "#888888",
    ctaBg: "#141414",
    ctaText: "#ffffff",
    ctaRadius: "2px",
    contactColor: "#888888",
  },
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
  issue_date?: string;
  due_date?: string;
  line_items?: Array<{ description: string; quantity: number; unit_price: number; line_total: number }>;
  subtotal?: number;
  tax_total?: number;
  business_phone?: string;
  business_email?: string;
  business_website?: string;
  logo_url?: string;
};

export default function PayInvoice() {
  const { shortcode, invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelled = searchParams.get("cancelled") === "true";

  const brand = BRAND[shortcode?.toLowerCase() || ""] || BRAND.gcp;
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment failed";
      setError(message);
      setPaying(false);
    }
  };

  const handlePrint = () => window.print();

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

  const isPaid = invoice.status === "paid";
  const dueNow = invoice.deposit_required && !invoice.deposit_paid && invoice.deposit_amount > 0
    ? invoice.deposit_amount
    : invoice.balance_due;
  const dueLabel = invoice.deposit_required && !invoice.deposit_paid ? "Deposit Due Now" : "Amount Due";

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* ── HEADER ── */}
        <div className="w-full" style={{ backgroundColor: brand.headerBg, padding: "32px 24px" }}>
          <div className="max-w-3xl mx-auto flex justify-between items-start">
            <div>
              {invoice.logo_url && (
                <img src={invoice.logo_url} alt={brand.name} className="h-10 mb-2" style={{ filter: "brightness(0) invert(1)" }} />
              )}
              <h1 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
                {invoice.business_name || brand.name}
              </h1>
              <p className="text-sm mt-1" style={{ color: brand.footerSubText }}>{brand.tagline}</p>
            </div>
            <div className="text-right text-sm" style={{ color: brand.contactColor }}>
              {invoice.business_phone && <p>{invoice.business_phone}</p>}
              {invoice.business_email && <p>{invoice.business_email}</p>}
              {invoice.business_website && <p>{invoice.business_website}</p>}
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Cancelled / Error notices */}
          {cancelled && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-center no-print">
              <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
              <p className="text-sm font-semibold text-amber-800">Payment Not Completed</p>
              <p className="text-xs text-amber-600 mt-0.5">No charges were made. You can try again below.</p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 text-center no-print">
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          {/* PAID overlay */}
          {isPaid && (
            <div className="flex items-center justify-center mb-6">
              <div className="border-4 border-green-500 text-green-500 font-bold text-3xl px-8 py-3 rounded-lg transform -rotate-6 uppercase tracking-widest opacity-80">
                PAID
              </div>
            </div>
          )}

          {/* Invoice label + meta */}
          <div className="flex justify-between items-start mb-8">
            <h2 className="text-2xl font-bold tracking-tight uppercase" style={{ color: brand.accent }}>
              INVOICE
            </h2>
            <div className="text-right text-sm space-y-1">
              <div><span className="text-gray-400 text-xs uppercase">Invoice #</span><br /><span className="font-mono font-semibold" style={{ color: brand.accent }}>{invoice.invoice_number}</span></div>
              {invoice.issue_date && <div><span className="text-gray-400 text-xs uppercase">Issued</span><br /><span className="text-gray-700">{invoice.issue_date}</span></div>}
              {invoice.due_date && <div><span className="text-gray-400 text-xs uppercase">Due</span><br /><span className="text-gray-700">{invoice.due_date}</span></div>}
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Bill To</p>
            <p className="text-lg font-bold" style={{ color: brand.accent }}>{invoice.customer_name}</p>
          </div>

          {/* Pay Now CTA — above fold */}
          {!isPaid && (
            <div className="mb-8 no-print">
              <Button
                onClick={handlePay}
                disabled={paying}
                className="w-full h-14 text-lg font-bold shadow-md transition-all"
                style={{ backgroundColor: brand.ctaBg, color: brand.ctaText, borderRadius: brand.ctaRadius }}
              >
                {paying ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
                {paying ? "Redirecting…" : `Pay $${dueNow.toLocaleString()} Now`}
              </Button>
            </div>
          )}

          {/* Line items table */}
          {invoice.line_items && invoice.line_items.length > 0 && (
            <div className="mb-6 overflow-hidden" style={{ border: `1px solid ${brand.borderColor}` }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: brand.tableHeaderBg, color: brand.tableHeaderText }}>
                    <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wide">Description</th>
                    <th className="text-center py-3 px-4 font-semibold uppercase text-xs tracking-wide w-20">Qty</th>
                    <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wide w-28">Unit Price</th>
                    <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wide w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((item, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 1 ? brand.altRowBg : "#ffffff", borderTop: `1px solid ${brand.borderColor}` }}>
                      <td className="py-3 px-4 text-gray-800">{item.description}</td>
                      <td className="py-3 px-4 text-center text-gray-600">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-gray-600">${item.unit_price.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-800">${item.line_total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2 text-sm">
              {invoice.subtotal != null && (
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-gray-700">${invoice.subtotal.toLocaleString()}</span></div>
              )}
              {invoice.tax_total != null && invoice.tax_total > 0 && (
                <div className="flex justify-between"><span className="text-gray-500">Tax</span><span className="text-gray-700">${invoice.tax_total.toLocaleString()}</span></div>
              )}
              {invoice.deposit_required && !invoice.deposit_paid && (
                <div className="flex justify-between text-amber-600"><span>Deposit Required</span><span>${invoice.deposit_amount.toLocaleString()}</span></div>
              )}
              {invoice.deposit_required && invoice.deposit_paid && (
                <div className="flex justify-between text-green-600"><span>Deposit Paid ✓</span><span>${invoice.deposit_amount.toLocaleString()}</span></div>
              )}
              <div className="border-t pt-2 flex justify-between" style={{ borderColor: brand.accent }}>
                <span className="font-bold text-base" style={{ color: brand.accent }}>{isPaid ? "TOTAL PAID" : dueLabel.toUpperCase()}</span>
                <span className="font-bold text-xl" style={{ color: brand.accent }}>
                  ${(isPaid ? invoice.total : dueNow).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Payment status */}
          {isPaid && (
            <div className="flex items-center justify-center gap-2 py-4 mb-6 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-semibold">This invoice has been paid in full</span>
            </div>
          )}

          {/* Download / Print */}
          <div className="flex gap-3 justify-center no-print mb-8">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" /> Download PDF
            </Button>
          </div>

          {/* Trust footer */}
          <div className="flex items-center justify-center gap-1.5 text-gray-400 text-xs py-2 no-print">
            <Shield className="w-3.5 h-3.5" />
            <span>Secured by Stripe · 256-bit SSL encryption</span>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="w-full" style={{ backgroundColor: brand.footerBg, padding: "24px" }}>
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-medium" style={{ color: brand.footerText, fontFamily: "'Inter', sans-serif" }}>
              Thank you for choosing {invoice.business_name || brand.name}
            </p>
            <p className="text-xs mt-2" style={{ color: brand.footerSubText }}>
              {brand.tagline}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
