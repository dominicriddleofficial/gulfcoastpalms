import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, XCircle, CheckCircle, MessageSquare, Shield, Download, Share2, Copy, Mail, Phone, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

/* ── Brand tokens ── */
const BRAND: Record<string, {
  name: string; tagline: string; accent: string; accentRgb: string;
  secondaryText: string; footerInfo: string;
}> = {
  gcp: {
    name: "Gulf Coast Palms", tagline: "Professional Palm Tree Services — NW Florida",
    accent: "#22c55e", accentRgb: "34, 197, 94",
    secondaryText: "rgba(255,255,255,0.45)", footerInfo: "gulfcoastpalmservices.com · (850) 910-1290",
  },
  pps: {
    name: "Prestige Property Services", tagline: "NW Florida's Premier Property Services",
    accent: "#ffffff", accentRgb: "255, 255, 255",
    secondaryText: "rgba(255,255,255,0.50)", footerInfo: "prestigepropertyservices.com",
  },
};

type QuoteData = {
  id: string;
  quote_number: string;
  total: number;
  status: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  business_name: string;
  shortcode: string;
  valid_until?: string;
  created_at?: string;
  public_notes?: string;
  scope_of_work?: string;
  line_items?: Array<{ description: string; quantity: number; unit_price: number; line_total: number; line_type?: string }>;
  subtotal?: number;
  tax_total?: number;
  tax_rate?: number;
  discount_amount?: number;
  deposit_required?: boolean;
  deposit_amount?: number;
  logo_url?: string;
  business_phone?: string;
  business_email?: string;
};

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ViewQuote() {
  const { shortcode, quoteId } = useParams();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [approverName, setApproverName] = useState("");
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [approved, setApproved] = useState(false);
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
  const [changeSubmitting, setChangeSubmitting] = useState(false);
  const [changeSubmitted, setChangeSubmitted] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const brandKey = shortcode?.toLowerCase() || "gcp";
  const brand = BRAND[brandKey] || BRAND.gcp;
  const accent = brand.accent;
  const accentRgb = brand.accentRgb;

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
      setError(err instanceof Error ? err.message : "Approval failed");
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
      setError(err instanceof Error ? err.message : "Request failed");
    }
    setChangeSubmitting(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied!", description: "Quote link copied to clipboard." });
  };

  const pageBg = `radial-gradient(ellipse 70% 45% at 50% 0%, rgba(${accentRgb}, 0.22) 0%, rgba(${accentRgb}, 0.07) 45%, transparent 70%), radial-gradient(ellipse 35% 25% at 10% 50%, rgba(${accentRgb}, 0.09) 0%, transparent 60%), radial-gradient(ellipse 30% 20% at 90% 30%, rgba(${accentRgb}, 0.07) 0%, transparent 55%), #09090b`;

  /* Loading */
  if (loading) {
    return (
      <div style={{ background: pageBg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  /* Error */
  if (error && !quote) {
    return (
      <div style={{ background: pageBg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ textAlign: "center" }}>
          <XCircle className="w-14 h-14 mx-auto mb-4" style={{ color: "#f87171" }} />
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>Quote Not Found</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  const isApproved = quote.status === "approved" || quote.status === "accepted" || quote.status === "won";
  const isExpired = quote.status === "expired";
  const isDeclined = quote.status === "declined";
  const isChangesReq = quote.status === "changes_requested";

  /* Approved success */
  if (approved) {
    return (
      <div style={{ background: pageBg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: accent }} />
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Quote Approved!</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>We'll be in touch shortly to schedule your service.</p>
        </div>
      </div>
    );
  }

  /* Change request submitted */
  if (changeSubmitted) {
    return (
      <div style={{ background: pageBg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <MessageSquare className="w-16 h-16 mx-auto text-blue-400 mb-4" />
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Request Received</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>We'll follow up with an updated quote.</p>
        </div>
      </div>
    );
  }

  /* Status badge */
  const statusBadge = () => {
    if (isApproved) return { label: "APPROVED", bg: `rgba(${accentRgb}, 0.15)`, color: accent, border: `rgba(${accentRgb}, 0.3)` };
    if (isChangesReq) return { label: "CHANGES REQUESTED", bg: "rgba(249,115,22,0.15)", color: "#f97316", border: "rgba(249,115,22,0.3)" };
    if (isDeclined) return { label: "DECLINED", bg: "rgba(239,68,68,0.15)", color: "#ef4444", border: "rgba(239,68,68,0.3)" };
    if (isExpired) return { label: "EXPIRED", bg: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "rgba(245,158,11,0.3)" };
    if (quote.status === "viewed") return { label: "VIEWED", bg: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "rgba(59,130,246,0.3)" };
    if (quote.status === "sent") return { label: "SENT", bg: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "rgba(59,130,246,0.3)" };
    if (quote.status === "draft") return { label: "DRAFT", bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", border: "rgba(255,255,255,0.15)" };
    return { label: "QUOTE", bg: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "rgba(59,130,246,0.3)" };
  };
  const badge = statusBadge();

  const grandTotal = quote.total || 0;

  /* Payment milestones */
  const milestones = quote.deposit_required && quote.deposit_amount && quote.deposit_amount > 0
    ? [
        { label: "Deposit to Schedule — 20%", amount: grandTotal * 0.2, status: "next" as const },
        { label: "Day of Install — 40%", amount: grandTotal * 0.4, status: "upcoming" as const },
        { label: "On Completion — 40%", amount: grandTotal * 0.4, status: "upcoming" as const },
      ]
    : [
        { label: "Full Payment on Completion", amount: grandTotal, status: "next" as const },
      ];

  const paidTotal = milestones.filter(m => m.status === "paid").reduce((s, m) => s + m.amount, 0);
  const progressPct = grandTotal > 0 ? (paidTotal / grandTotal) * 100 : 0;

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } body, html { background: #09090b !important; } * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; } }`}</style>

      <div style={{ background: pageBg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center" } as React.CSSProperties}>

        {/* ── ACTION BAR ── */}
        <div className="no-print" style={{ maxWidth: 680, width: "100%", display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
          <button onClick={handleCopyLink} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            <Copy className="w-4 h-4" /> Share
          </button>
          <button onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>

        {/* ── QUOTE CARD ── */}
        <div style={{
          maxWidth: 680, width: "100%",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid rgba(${accentRgb}, 0.20)`,
          borderRadius: 20, overflow: "hidden", position: "relative",
          boxShadow: `0 0 60px rgba(${accentRgb}, 0.08), 0 24px 48px rgba(0,0,0,0.4)`,
        }}>

          {/* Approved stamp watermark */}
          {isApproved && (
            <div style={{ position: "absolute", top: 80, right: 40, transform: "rotate(-15deg)", fontSize: 52, fontWeight: 900, color: `rgba(${accentRgb}, 0.80)`, border: `4px solid rgba(${accentRgb}, 0.60)`, borderRadius: 8, padding: "4px 16px", pointerEvents: "none", zIndex: 10, userSelect: "none", whiteSpace: "nowrap" }}>
              APPROVED ✓
            </div>
          )}

          {/* ── HEADER ── */}
          <div style={{ background: `rgba(${accentRgb}, 0.10)`, borderBottom: `1px solid rgba(${accentRgb}, 0.20)`, padding: "32px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                {quote.logo_url && (
                  <img src={quote.logo_url} alt={brand.name} style={{ height: 44, marginBottom: 8, filter: "brightness(0) invert(1)" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#fff" }}>
                  {quote.business_name || brand.name}
                </div>
                <div style={{ fontSize: 11, color: brand.secondaryText, marginTop: 4 }}>{brand.tagline}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em", color: "#fff" }}>QUOTE</div>
                <div style={{ display: "inline-block", marginTop: 8, padding: "3px 12px", borderRadius: 20, backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {badge.label}
                </div>
              </div>
            </div>
          </div>

          {/* ── META ── */}
          <div style={{ padding: "24px", display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 50%" }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>PREPARED FOR</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{quote.customer_name}</div>
              {quote.customer_email && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginTop: 3 }}>{quote.customer_email}</div>}
              {quote.customer_phone && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginTop: 2 }}>{quote.customer_phone}</div>}
              {quote.customer_address && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginTop: 2 }}>{quote.customer_address}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              {[
                { label: "QUOTE #", value: quote.quote_number, isAccent: true },
                ...(quote.created_at ? [{ label: "DATE", value: new Date(quote.created_at).toLocaleDateString(), isAccent: false }] : []),
                ...(quote.valid_until ? [{ label: "VALID UNTIL", value: quote.valid_until, isAccent: false }] : []),
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>{item.label}</div>
                  <div style={{ fontSize: item.isAccent ? 14 : 13, fontWeight: item.isAccent ? 700 : 400, fontFamily: item.isAccent ? "monospace" : "inherit", color: item.isAccent ? accent : "#fff", marginTop: 2 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 24px" }} />

          {/* ── LINE ITEMS ── */}
          {quote.line_items && quote.line_items.length > 0 && (
            <div style={{ padding: 0, marginBottom: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: `rgba(${accentRgb}, 0.07)`, borderBottom: `1px solid rgba(${accentRgb}, 0.15)` }}>
                    {["Description", "Qty", "Unit Price", "Total"].map((h, i) => (
                      <th key={h} style={{ textAlign: i === 0 ? "left" : i === 1 ? "center" : "right", padding: "10px 24px", fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.40)", ...(i === 1 ? { width: 50 } : i > 1 ? { width: 100 } : {}) }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quote.line_items.map((item, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "14px 24px", color: "#fff", fontSize: 14 }}>
                        {item.description}
                        {item.line_type === "optional" && (
                          <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>Optional</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 24px", textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 13 }}>{item.quantity}</td>
                      <td style={{ padding: "14px 24px", textAlign: "right", color: "rgba(255,255,255,0.55)", fontSize: 13 }}>{fmt(item.unit_price)}</td>
                      <td style={{ padding: "14px 24px", textAlign: "right", color: "#fff", fontWeight: 500, fontSize: 14 }}>{fmt(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TOTALS ── */}
          <div style={{ padding: "20px 24px", display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: 240 }}>
              {quote.subtotal != null && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
                  <span style={{ color: brand.secondaryText }}>Subtotal</span>
                  <span style={{ color: "#fff" }}>{fmt(quote.subtotal)}</span>
                </div>
              )}
              {quote.tax_total != null && quote.tax_total > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
                  <span style={{ color: brand.secondaryText }}>Tax{quote.tax_rate ? ` (${quote.tax_rate}%)` : ""}</span>
                  <span style={{ color: brand.secondaryText }}>{fmt(quote.tax_total)}</span>
                </div>
              )}
              {(quote.discount_amount ?? 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
                  <span style={{ color: brand.secondaryText }}>Discount</span>
                  <span style={{ color: brand.secondaryText }}>-{fmt(quote.discount_amount!)}</span>
                </div>
              )}
              <div style={{ borderTop: `1px solid rgba(${accentRgb}, 0.20)`, marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 13, letterSpacing: "0.05em" }}>TOTAL</span>
                <span style={{ color: accent, fontWeight: 800, fontSize: 26 }}>{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* ── SCOPE OF WORK ── */}
          {(quote.scope_of_work || quote.public_notes) && (
            <div style={{ padding: "0 24px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>SCOPE OF WORK</div>
              <div style={{ background: `rgba(${accentRgb}, 0.05)`, border: `1px solid rgba(${accentRgb}, 0.12)`, borderRadius: 12, padding: 16, fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {quote.scope_of_work || quote.public_notes}
              </div>
            </div>
          )}

          {/* ── PAYMENT MILESTONES ── */}
          {milestones.length > 1 && (
            <div style={{ padding: "0 24px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>PAYMENT MILESTONES</div>

              {/* Progress bar */}
              <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 4, marginBottom: 12, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progressPct}%`, background: accent, borderRadius: 4, transition: "width 0.5s ease" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {milestones.map((ms, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
                    {/* Status indicator */}
                    <div style={{ flexShrink: 0 }}>
                      {ms.status === "paid" ? (
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Check className="w-4 h-4" style={{ color: "#000" }} />
                        </div>
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${ms.status === "next" ? accent : "rgba(255,255,255,0.15)"}`, background: "transparent" }} />
                      )}
                    </div>
                    {/* Label + amount */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{ms.label}</div>
                      <div style={{ fontSize: 13, color: brand.secondaryText, marginTop: 2 }}>{fmt(ms.amount)}</div>
                    </div>
                    {/* Status badge */}
                    <div style={{ flexShrink: 0 }}>
                      {ms.status === "paid" && (
                        <span style={{ padding: "4px 12px", borderRadius: 20, background: `rgba(${accentRgb}, 0.15)`, color: accent, fontSize: 11, fontWeight: 600 }}>Paid</span>
                      )}
                      {ms.status === "next" && (
                        <span style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(245,158,11,0.15)", color: "#fbbf24", fontSize: 11, fontWeight: 600 }}>Next Payment</span>
                      )}
                      {ms.status === "upcoming" && (
                        <span style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 600 }}>Upcoming</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 24px" }} />

          {/* ── APPROVAL SECTION ── */}
          {!isApproved && !isDeclined && !isExpired && !isChangesReq && (
            <div className="no-print" style={{ padding: "24px" }}>
              {!showApproveConfirm && !showChangeRequest && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    onClick={() => setShowApproveConfirm(true)}
                    style={{ width: "100%", padding: 16, borderRadius: 12, border: "none", cursor: "pointer", fontSize: 16, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: brandKey === "gcp" ? "#fff" : "#0a0a0a", background: accent, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 0 20px rgba(${accentRgb}, 0.3)`, transition: "transform 0.15s" }}
                  >
                    <CheckCircle className="w-5 h-5" /> Approve & Pay Deposit
                  </button>
                  <button
                    onClick={() => setShowChangeRequest(true)}
                    style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "'Inter', sans-serif", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    <MessageSquare className="w-4 h-4" /> Request Changes
                  </button>
                </div>
              )}

              {/* Approve confirm */}
              {showApproveConfirm && (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: 24 }}>
                  <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 16 }}>By approving this quote you agree to the listed scope of work and pricing.</p>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 6 }}>YOUR NAME (TYPED SIGNATURE)</label>
                    <input
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      placeholder="Enter your full name"
                      style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 15, fontFamily: "'Inter', sans-serif", outline: "none" }}
                    />
                  </div>

                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 16 }}>
                    <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} style={{ marginTop: 3, accentColor: accent }} />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>I agree to the scope of work, pricing, and payment terms outlined in this quote.</span>
                  </label>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={handleApprove}
                      disabled={approving || !approverName.trim() || !agreedToTerms}
                      style={{ flex: 1, padding: 14, borderRadius: 10, border: "none", cursor: approving || !approverName.trim() || !agreedToTerms ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: brandKey === "gcp" ? "#fff" : "#0a0a0a", background: accent, opacity: approving || !approverName.trim() || !agreedToTerms ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                    >
                      {approving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Confirm Approval
                    </button>
                    <button onClick={() => setShowApproveConfirm(false)} style={{ padding: "14px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 14 }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Change request */}
              {showChangeRequest && (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: 24 }}>
                  <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 16 }}>Describe what you'd like to change or any questions:</p>
                  <textarea
                    value={changeNotes}
                    onChange={(e) => setChangeNotes(e.target.value)}
                    placeholder="Enter your feedback…"
                    rows={4}
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 14, fontFamily: "'Inter', sans-serif", outline: "none", resize: "vertical" }}
                  />
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button
                      onClick={handleChangeRequest}
                      disabled={changeSubmitting || !changeNotes.trim()}
                      style={{ flex: 1, padding: 14, borderRadius: 10, border: "none", cursor: changeSubmitting || !changeNotes.trim() ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: brandKey === "gcp" ? "#fff" : "#0a0a0a", background: accent, opacity: changeSubmitting || !changeNotes.trim() ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                    >
                      {changeSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Submit Request
                    </button>
                    <button onClick={() => setShowChangeRequest(false)} style={{ padding: "14px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 14 }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Validity notice */}
          {quote.valid_until && !isApproved && (
            <div style={{ padding: "0 24px 20px" }}>
              <div style={{ background: `rgba(${accentRgb}, 0.05)`, border: `1px solid rgba(${accentRgb}, 0.10)`, borderRadius: 10, padding: "10px 16px", textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                This quote is valid until {quote.valid_until}. Pricing subject to change after expiration.
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: "0 24px 16px" }}>
              <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 16px", textAlign: "center" }}>
                <p style={{ color: "#f87171", fontSize: 13, fontWeight: 500 }}>{error}</p>
              </div>
            </div>
          )}

          {/* Trust badge */}
          <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0 24px 16px" }}>
            <Shield className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.25)" }} />
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>Secure Document · {quote.business_name || brand.name}</span>
          </div>

          {/* ── FOOTER ── */}
          <div style={{ borderTop: `1px solid rgba(${accentRgb}, 0.12)`, background: `rgba(${accentRgb}, 0.05)`, padding: "14px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Thank you for considering {quote.business_name || brand.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{brand.footerInfo}</div>
          </div>
        </div>
      </div>
    </>
  );
}
