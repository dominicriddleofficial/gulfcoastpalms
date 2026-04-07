import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, XCircle, CheckCircle, MessageSquare, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

/* Brand config — same design system as invoices */
const BRAND: Record<string, {
  name: string; tagline: string; headerBg: string; accent: string;
  accentLight: string; tableHeaderBg: string; tableHeaderText: string;
  altRowBg: string; borderColor: string; footerBg: string;
  footerText: string; footerSubText: string; ctaBg: string;
  ctaText: string; ctaRadius: string; contactColor: string;
}> = {
  gcp: {
    name: "Gulf Coast Palms", tagline: "Professional Palm Tree Services — NW Florida",
    headerBg: "#1a5c38", accent: "#1a5c38", accentLight: "#f4faf6",
    tableHeaderBg: "#1a5c38", tableHeaderText: "#ffffff", altRowBg: "#f4faf6",
    borderColor: "#d0e8d8", footerBg: "#1a5c38", footerText: "#ffffff",
    footerSubText: "rgba(255,255,255,0.7)", ctaBg: "#1a5c38", ctaText: "#ffffff",
    ctaRadius: "8px", contactColor: "#ffffff",
  },
  pps: {
    name: "Prestige Property Services", tagline: "NW Florida's Premier Property Services",
    headerBg: "#141414", accent: "#141414", accentLight: "#f8f8f8",
    tableHeaderBg: "#141414", tableHeaderText: "#ffffff", altRowBg: "#f8f8f8",
    borderColor: "#e8e8e8", footerBg: "#141414", footerText: "#ffffff",
    footerSubText: "#888888", ctaBg: "#141414", ctaText: "#ffffff",
    ctaRadius: "2px", contactColor: "#888888",
  },
};

type QuoteData = {
  id: string;
  quote_number: string;
  total: number;
  status: string;
  customer_name: string;
  business_name: string;
  shortcode: string;
  valid_until?: string;
  public_notes?: string;
  line_items?: Array<{
    description: string; quantity: number; unit_price: number;
    line_total: number; line_type?: string;
  }>;
  subtotal?: number;
  tax_total?: number;
  logo_url?: string;
  business_phone?: string;
  business_email?: string;
};

export default function ViewQuote() {
  const { shortcode, quoteId } = useParams();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Approval flow state
  const [approving, setApproving] = useState(false);
  const [approverName, setApproverName] = useState("");
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [approved, setApproved] = useState(false);

  // Change request state
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
  const [changeSubmitting, setChangeSubmitting] = useState(false);
  const [changeSubmitted, setChangeSubmitted] = useState(false);

  const brand = BRAND[shortcode?.toLowerCase() || ""] || BRAND.gcp;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const baseUrl = `https://${projectId}.supabase.co/functions/v1`;

  useEffect(() => {
    async function load() {
      if (!quoteId) { setError("No quote specified"); setLoading(false); return; }
      try {
        const resp = await fetch(`${baseUrl}/get-quote-public`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quote_id: quoteId }),
        });
        const data = await resp.json();
        if (!resp.ok || data.error) setError(data.error || "Quote not found");
        else setQuote(data);
      } catch {
        setError("Failed to load quote");
      }
      setLoading(false);
    }
    load();
  }, [quoteId, baseUrl]);

  const handleApprove = async () => {
    if (!quote || !approverName.trim()) return;
    setApproving(true);
    try {
      const resp = await fetch(`${baseUrl}/approve-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quote.id, approved_by: approverName.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error || "Approval failed");
      setApproved(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approval failed";
      setError(msg);
    }
    setApproving(false);
  };

  const handleChangeRequest = async () => {
    if (!quote || !changeNotes.trim()) return;
    setChangeSubmitting(true);
    try {
      const resp = await fetch(`${baseUrl}/approve-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quote.id, action: "request_changes", change_notes: changeNotes.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error || "Request failed");
      setChangeSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setError(msg);
    }
    setChangeSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <XCircle className="w-14 h-14 mx-auto text-red-400 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Quote Not Found</h1>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  // Success states
  if (approved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: brand.accent }} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Approved!</h1>
          <p className="text-gray-500">Your quote has been approved. We'll be in touch shortly to schedule your service.</p>
        </div>
      </div>
    );
  }

  if (changeSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <MessageSquare className="w-16 h-16 mx-auto text-blue-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Received</h1>
          <p className="text-gray-500">Your request has been received. We'll follow up with an updated quote.</p>
        </div>
      </div>
    );
  }

  const isApproved = quote.status === "approved" || quote.status === "accepted" || quote.status === "won";

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="w-full" style={{ backgroundColor: brand.headerBg, padding: "32px 24px" }}>
        <div className="max-w-3xl mx-auto flex justify-between items-start">
          <div>
            {quote.logo_url && <img src={quote.logo_url} alt={brand.name} className="h-10 mb-2" style={{ filter: "brightness(0) invert(1)" }} />}
            <h1 className="text-xl font-bold text-white tracking-tight">{quote.business_name || brand.name}</h1>
            <p className="text-sm mt-1" style={{ color: brand.footerSubText }}>{brand.tagline}</p>
          </div>
          <div className="text-right text-sm" style={{ color: brand.contactColor }}>
            {quote.business_phone && <p>{quote.business_phone}</p>}
            {quote.business_email && <p>{quote.business_email}</p>}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 text-center">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {/* Approved stamp */}
        {isApproved && (
          <div className="flex items-center justify-center mb-6">
            <div className="border-4 border-green-500 text-green-500 font-bold text-3xl px-8 py-3 rounded-lg transform -rotate-6 uppercase tracking-widest opacity-80">
              APPROVED
            </div>
          </div>
        )}

        {/* Quote meta */}
        <div className="flex justify-between items-start mb-8">
          <h2 className="text-2xl font-bold tracking-tight uppercase" style={{ color: brand.accent }}>QUOTE</h2>
          <div className="text-right text-sm space-y-1">
            <div><span className="text-gray-400 text-xs uppercase">Quote #</span><br /><span className="font-mono font-semibold" style={{ color: brand.accent }}>{quote.quote_number}</span></div>
            {quote.valid_until && <div><span className="text-gray-400 text-xs uppercase">Valid Until</span><br /><span className="text-gray-700">{quote.valid_until}</span></div>}
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Prepared For</p>
          <p className="text-lg font-bold" style={{ color: brand.accent }}>{quote.customer_name}</p>
        </div>

        {/* Line items */}
        {quote.line_items && quote.line_items.length > 0 && (
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
                {quote.line_items.map((item, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 1 ? brand.altRowBg : "#ffffff", borderTop: `1px solid ${brand.borderColor}` }}>
                    <td className="py-3 px-4 text-gray-800">
                      {item.description}
                      {item.line_type === "optional" && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">Optional</span>
                      )}
                    </td>
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
            {quote.subtotal != null && (
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-gray-700">${quote.subtotal.toLocaleString()}</span></div>
            )}
            {quote.tax_total != null && quote.tax_total > 0 && (
              <div className="flex justify-between"><span className="text-gray-500">Tax</span><span className="text-gray-700">${quote.tax_total.toLocaleString()}</span></div>
            )}
            <div className="border-t pt-2 flex justify-between" style={{ borderColor: brand.accent }}>
              <span className="font-bold text-base" style={{ color: brand.accent }}>TOTAL</span>
              <span className="font-bold text-xl" style={{ color: brand.accent }}>${quote.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Scope / Notes */}
        {quote.public_notes && (
          <div className="mb-8 p-4 rounded-lg" style={{ backgroundColor: brand.accentLight, border: `1px solid ${brand.borderColor}` }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Scope of Work</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.public_notes}</p>
          </div>
        )}

        {/* Validity */}
        {quote.valid_until && (
          <p className="text-xs text-gray-400 text-center mb-8">
            This quote is valid for 30 days from the date issued
          </p>
        )}

        {/* ── Approval Section ── */}
        {!isApproved && quote.status !== "changes_requested" && (
          <div className="space-y-4 mb-8">
            {!showApproveConfirm && !showChangeRequest && (
              <>
                <Button
                  onClick={() => setShowApproveConfirm(true)}
                  className="w-full h-14 text-lg font-bold shadow-md"
                  style={{ backgroundColor: brand.ctaBg, color: brand.ctaText, borderRadius: brand.ctaRadius }}
                >
                  <CheckCircle className="w-5 h-5 mr-2" /> Approve This Quote
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowChangeRequest(true)}
                  className="w-full gap-2"
                >
                  <MessageSquare className="w-4 h-4" /> Request Changes
                </Button>
              </>
            )}

            {/* Approve confirm */}
            {showApproveConfirm && (
              <div className="border rounded-xl p-6 space-y-4" style={{ borderColor: brand.borderColor }}>
                <p className="text-sm text-gray-600">By approving this quote you agree to the listed scope of work and pricing.</p>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Name (typed signature)</label>
                  <Input value={approverName} onChange={(e) => setApproverName(e.target.value)} placeholder="Enter your full name" className="mt-1" />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleApprove}
                    disabled={approving || !approverName.trim()}
                    className="flex-1 font-bold"
                    style={{ backgroundColor: brand.ctaBg, color: brand.ctaText, borderRadius: brand.ctaRadius }}
                  >
                    {approving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Confirm Approval
                  </Button>
                  <Button variant="outline" onClick={() => setShowApproveConfirm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Change request */}
            {showChangeRequest && (
              <div className="border rounded-xl p-6 space-y-4" style={{ borderColor: brand.borderColor }}>
                <p className="text-sm text-gray-600">Describe what you'd like to change or any questions you have:</p>
                <Textarea value={changeNotes} onChange={(e) => setChangeNotes(e.target.value)} placeholder="Enter your feedback…" rows={4} />
                <div className="flex gap-3">
                  <Button
                    onClick={handleChangeRequest}
                    disabled={changeSubmitting || !changeNotes.trim()}
                    className="flex-1 font-bold"
                    style={{ backgroundColor: brand.ctaBg, color: brand.ctaText, borderRadius: brand.ctaRadius }}
                  >
                    {changeSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Submit Request
                  </Button>
                  <Button variant="outline" onClick={() => setShowChangeRequest(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trust */}
        <div className="flex items-center justify-center gap-1.5 text-gray-400 text-xs py-2">
          <Shield className="w-3.5 h-3.5" />
          <span>Secure Document · {quote.business_name || brand.name}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full" style={{ backgroundColor: brand.footerBg, padding: "24px" }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-medium" style={{ color: brand.footerText }}>
            Thank you for choosing {quote.business_name || brand.name}
          </p>
          <p className="text-xs mt-2" style={{ color: brand.footerSubText }}>{brand.tagline}</p>
        </div>
      </div>
    </div>
  );
}
