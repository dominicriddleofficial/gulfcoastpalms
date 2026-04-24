import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Loader2, XCircle, CheckCircle, MessageSquare, Shield, Download, Copy, Check, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/* ── Brand tokens ── */
const BRAND: Record<string, {
  name: string; tagline: string; accent: string; accentRgb: string;
  secondaryText: string; footerInfo: string;
}> = {
  gcp: {
    name: "Gulf Coast Palms", tagline: "Professional Palm Tree Services — NW Florida",
    accent: "#22c55e", accentRgb: "34, 197, 94",
    secondaryText: "#a1a1aa", footerInfo: "gulfcoastpalmservices.com · (850) 910-1290",
  },
  pps: {
    name: "Prestige Property Services", tagline: "NW Florida's Premier Property Services",
    accent: "#ffffff", accentRgb: "255, 255, 255",
    secondaryText: "#a1a1aa", footerInfo: "prestigepropertyservices.com",
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
  approval_token?: string;
};

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Signature Pad ── */
function SignaturePad({ onSignatureChange }: { onSignatureChange: (hasSignature: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    if (!hasDrawn) { setHasDrawn(true); onSignatureChange(true); }
  };

  const endDraw = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#a1a1aa" }}>SIGNATURE</span>
        <button onClick={clear} style={{ fontSize: 11, color: "#a1a1aa", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", textDecoration: "underline" }}>Clear</button>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={120}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
        style={{ width: "100%", height: 120, borderRadius: 10, border: "1px solid #1e1e1e", background: "#0a0a0a", cursor: "crosshair", touchAction: "none" }}
      />
      {!hasDrawn && <p style={{ fontSize: 11, color: "#71717a", marginTop: 6, textAlign: "center" }}>Draw your signature above</p>}
    </div>
  );
}

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
  const [hasSignature, setHasSignature] = useState(false);

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
        body: JSON.stringify({ quote_id: quote.id, approved_by: approverName.trim(), approval_token: quote.approval_token }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error || "Approval failed");
      setApproved(true);

      // Immediately kick off Stripe Checkout for the 20% deposit
      try {
        const checkoutResp = await fetch(`${baseUrl}/create-checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quote_id: quote.id, origin_url: window.location.origin }),
        });
        const checkoutData = await checkoutResp.json();
        if (checkoutResp.ok && checkoutData.url) {
          window.location.href = checkoutData.url;
        } else {
          toast({
            title: "Approved — payment link unavailable",
            description: checkoutData.message || "We'll follow up with a payment link shortly.",
          });
        }
      } catch {
        toast({ title: "Approved", description: "We'll follow up with a payment link shortly." });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Approval failed");
    }
    setApproving(false);
  };

  // Direct "Send Payment" button on the deposit milestone — skips approval flow
  const handlePayDeposit = async () => {
    if (!quote) return;
    try {
      const resp = await fetch(`${baseUrl}/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quote.id, origin_url: window.location.origin }),
      });
      const data = await resp.json();
      if (resp.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Payment unavailable", description: data.message || "Could not start checkout.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Payment unavailable", description: "Could not start checkout.", variant: "destructive" });
    }
  };

  const handleChangeRequest = async () => {
    if (!quote || !changeNotes.trim()) return;
    setChangeSubmitting(true);
    try {
      const resp = await fetch(`${baseUrl}/approve-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quote.id, action: "request_changes", change_notes: changeNotes.trim(), approval_token: quote.approval_token }),
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

  /* Fullscreen wrappers */
  const fullBg = "#09090b";

  if (loading) {
    return (
      <div style={{ background: fullBg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div style={{ background: fullBg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ textAlign: "center" }}>
          <XCircle className="w-14 h-14 mx-auto mb-4" style={{ color: "#f87171" }} />
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>Quote Not Found</h1>
          <p style={{ color: "#a1a1aa", fontSize: 14 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  const isApproved = quote.status === "approved" || quote.status === "accepted" || quote.status === "won";
  const isExpired = quote.status === "expired";
  const isDeclined = quote.status === "declined";
  const isChangesReq = quote.status === "changes_requested";

  if (approved) {
    return (
      <div style={{ background: fullBg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: accent }} />
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Quote Approved!</h1>
          <p style={{ color: "#a1a1aa", fontSize: 14 }}>We'll be in touch shortly to schedule your service.</p>
        </div>
      </div>
    );
  }

  if (changeSubmitted) {
    return (
      <div style={{ background: fullBg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <MessageSquare className="w-16 h-16 mx-auto text-blue-400 mb-4" />
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Request Received</h1>
          <p style={{ color: "#a1a1aa", fontSize: 14 }}>We'll follow up with an updated quote.</p>
        </div>
      </div>
    );
  }

  /* Status badge */
  const statusBadge = () => {
    if (isApproved) return { label: "Approved", bg: `rgba(${accentRgb}, 0.15)`, color: accent, border: `rgba(${accentRgb}, 0.3)` };
    if (isChangesReq) return { label: "Changes Requested", bg: "rgba(249,115,22,0.15)", color: "#f97316", border: "rgba(249,115,22,0.3)" };
    if (isDeclined) return { label: "Declined", bg: "rgba(239,68,68,0.15)", color: "#ef4444", border: "rgba(239,68,68,0.3)" };
    if (isExpired) return { label: "Expired", bg: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "rgba(245,158,11,0.3)" };
    if (quote.status === "viewed") return { label: "Viewed", bg: "rgba(139,92,246,0.15)", color: "#8b5cf6", border: "rgba(139,92,246,0.3)" };
    if (quote.status === "sent") return { label: "Sent", bg: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "rgba(59,130,246,0.3)" };
    if (quote.status === "draft") return { label: "Draft", bg: "rgba(255,255,255,0.08)", color: "#71717a", border: "rgba(255,255,255,0.15)" };
    return { label: "Quote", bg: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "rgba(59,130,246,0.3)" };
  };
  const badge = statusBadge();

  const grandTotal = quote.total || 0;

  /* Payment milestones — 20/40/40 */
  const milestones: Array<{ label: string; amount: number; status: "paid" | "next" | "upcoming"; date: string | null }> = [
    { label: "Deposit to Schedule — 20%", amount: grandTotal * 0.2, status: isApproved ? "paid" : "next", date: isApproved ? "Apr 10, 2026" : null },
    { label: "Day of Install — 40%", amount: grandTotal * 0.4, status: isApproved ? "next" : "upcoming", date: null },
    { label: "On Completion — 40%", amount: grandTotal * 0.4, status: "upcoming", date: null },
  ];

  const paidTotal = milestones.filter(m => m.status === "paid").reduce((s, m) => s + m.amount, 0);
  const progressPct = grandTotal > 0 ? (paidTotal / grandTotal) * 100 : 0;

  /* ── Card shared styles ── */
  const cardBg = "#141414";
  const cardBorder = "#1e1e1e";
  const labelColor = "#a1a1aa";

  return (
    <>
      <style>{`
        @media print { .no-print { display: none !important; } body, html { background: #09090b !important; } * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; } }
        @keyframes auraPulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
      `}</style>

      <div style={{ background: fullBg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", padding: "24px 12px", display: "flex", flexDirection: "column", alignItems: "center" } as React.CSSProperties}>

        {/* ── ACTION BAR ── */}
        <div className="no-print" style={{ maxWidth: 680, width: "100%", display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
          <button onClick={handleCopyLink} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${cardBorder}`, background: "rgba(255,255,255,0.04)", color: labelColor, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            <Copy className="w-4 h-4" /> Share
          </button>
          <button onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${cardBorder}`, background: "rgba(255,255,255,0.04)", color: labelColor, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>

        {/* ── GREEN AURA GLOW (fades bottom → top, gentle pulse) ── */}
        <div style={{ position: "relative", maxWidth: 680, width: "100%" }}>
          <div style={{
            position: "absolute", inset: "-120px -120px -40px -120px",
            background: `radial-gradient(ellipse 80% 70% at 50% 100%, rgba(${accentRgb}, 0.22) 0%, rgba(${accentRgb}, 0.12) 25%, rgba(${accentRgb}, 0.05) 50%, transparent 75%)`,
            pointerEvents: "none", zIndex: 0,
            animation: "auraPulse 6s ease-in-out infinite",
            transformOrigin: "center bottom",
          }} />

          {/* ── QUOTE CARD ── */}
          <div style={{
            position: "relative", zIndex: 1,
            background: cardBg, border: `1px solid ${cardBorder}`,
            borderRadius: 16, overflow: "hidden",
          }}>

            {/* ── HEADER ── */}
            <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${cardBorder}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `rgba(${accentRgb}, 0.12)`, border: `1px solid rgba(${accentRgb}, 0.25)`, flexShrink: 0 }}>
                    <span style={{ color: accent, fontWeight: 700, fontSize: 11, letterSpacing: "0.05em" }}>{(quote.shortcode || brandKey).toUpperCase()}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{quote.business_name || brand.name}</div>
                    <div style={{ fontSize: 11, color: labelColor, marginTop: 1 }}>{brand.tagline}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: "#fff" }}>{quote.quote_number}</p>
                  <p style={{ fontSize: 12, color: labelColor, marginTop: 2 }}>{quote.created_at ? new Date(quote.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}</p>
                  <div style={{ display: "inline-block", marginTop: 6, padding: "2px 10px", borderRadius: 20, backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontSize: 10, fontWeight: 600 }}>
                    {badge.label}
                  </div>
                </div>
              </div>

              {/* Customer info */}
              <div>
                <p style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>{quote.customer_name}</p>
                {quote.customer_address && <p style={{ fontSize: 12, color: labelColor, marginTop: 2 }}>{quote.customer_address}</p>}
                <p style={{ fontSize: 12, color: labelColor, marginTop: 2 }}>
                  {[quote.customer_phone, quote.customer_email].filter(Boolean).join(" · ")}
                </p>
              </div>

              {/* Scope summary */}
              {(quote.scope_of_work || quote.public_notes) && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${cardBorder}` }}>
                  <p style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Scope of Work</p>
                  <p style={{ fontSize: 12, color: labelColor, marginTop: 4, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{quote.scope_of_work || quote.public_notes}</p>
                </div>
              )}
            </div>

            {/* ── LINE ITEMS ── */}
            <div style={{ padding: "20px 20px 0" }}>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 48px 80px 80px", gap: 8,
                paddingBottom: 8, marginBottom: 4,
                fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: labelColor,
                borderBottom: `1px solid ${cardBorder}`,
              }}>
                <span>Item</span>
                <span style={{ textAlign: "center" }}>Qty</span>
                <span style={{ textAlign: "right" }}>Unit Price</span>
                <span style={{ textAlign: "right" }}>Total</span>
              </div>

              {quote.line_items && quote.line_items.length > 0 ? (
                quote.line_items.map((item, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "1fr 48px 80px 80px", gap: 8,
                    padding: "14px 0", alignItems: "center",
                    borderBottom: i < (quote.line_items?.length ?? 0) - 1 ? `1px solid #1a1a1a` : "none",
                  }}>
                    <span style={{ color: "#fff", fontSize: 14, lineHeight: 1.4 }}>{item.description}</span>
                    <span style={{ textAlign: "center", fontSize: 13, color: labelColor }}>{item.quantity}</span>
                    <span style={{ textAlign: "right", fontSize: 13, color: labelColor }}>${fmt(item.unit_price)}</span>
                    <span style={{ textAlign: "right", fontSize: 14, color: "#fff", fontWeight: 500 }}>${fmt(item.line_total)}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: "24px 0", textAlign: "center", color: "#71717a", fontSize: 13, fontStyle: "italic" }}>No items added yet</div>
              )}
            </div>

            {/* ── TOTALS ── */}
            <div style={{ padding: "16px 20px 0" }}>
              <div style={{ marginTop: 8, paddingTop: 12, borderTop: `1px solid ${cardBorder}`, display: "flex", flexDirection: "column", gap: 6 }}>
                {quote.subtotal != null && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <span style={{ color: labelColor }}>Subtotal</span>
                    <span style={{ color: "#fff" }}>${fmt(quote.subtotal)}</span>
                  </div>
                )}
                {quote.tax_total != null && quote.tax_total > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <span style={{ color: labelColor }}>Tax{quote.tax_rate ? ` (${quote.tax_rate}%)` : ""}</span>
                    <span style={{ color: "#fff" }}>${fmt(quote.tax_total)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 8, borderTop: `1px solid ${cardBorder}` }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Grand Total</span>
                  <span style={{ fontSize: 28, fontWeight: 700, color: accent }}>${fmt(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* ── PAYMENT MILESTONES ── */}
            <div style={{ padding: "20px 20px 24px" }}>
              <div style={{
                borderRadius: 12, overflow: "hidden",
                background: "#0f0f0f", border: `1px solid ${cardBorder}`,
              }}>
                {/* Progress bar */}
                <div style={{ height: 6, width: "100%", background: cardBorder }}>
                  <div style={{ height: "100%", width: `${progressPct}%`, background: accent, borderRadius: "0 3px 3px 0", transition: "width 0.7s ease" }} />
                </div>

                <div style={{ padding: 0 }}>
                  {milestones.map((ms, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "16px 16px",
                      borderBottom: i < milestones.length - 1 ? `1px solid #1a1a1a` : "none",
                    }}>
                      {/* Circle indicator */}
                      <div style={{ flexShrink: 0 }}>
                        {ms.status === "paid" ? (
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `rgba(${accentRgb}, 0.2)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Check className="w-4 h-4" style={{ color: accent }} />
                          </div>
                        ) : (
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            border: `2px solid ${ms.status === "next" ? accent : "#333"}`,
                            background: "transparent",
                          }} />
                        )}
                      </div>

                      {/* Label + amount (left aligned) */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{ms.label}</p>
                        <p style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: ms.status === "paid" ? accent : "#fff" }}>
                          ${fmt(ms.amount)}
                        </p>
                      </div>

                      {/* Status badge (right) */}
                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        {ms.status === "paid" && (
                          <>
                            <span style={{ padding: "3px 10px", borderRadius: 20, background: `rgba(${accentRgb}, 0.12)`, color: accent, fontSize: 11, fontWeight: 600 }}>Paid</span>
                            {ms.date && <span style={{ fontSize: 10, color: labelColor }}>{ms.date}</span>}
                          </>
                        )}
                        {ms.status === "next" && (
                          <>
                            <span style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(234,179,8,0.12)", color: "#eab308", fontSize: 11, fontWeight: 600 }}>Next Payment</span>
                            <button
                              onClick={handlePayDeposit}
                              style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              padding: "6px 14px", borderRadius: 8, border: "none",
                              background: accent, color: "#000", fontSize: 12, fontWeight: 600,
                              cursor: "pointer", fontFamily: "'Inter', sans-serif",
                              transition: "box-shadow 0.2s",
                            }}
                              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 16px rgba(${accentRgb}, 0.3)`)}
                              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                            >
                              <Send className="w-3 h-3" /> Pay Now
                            </button>
                          </>
                        )}
                        {ms.status === "upcoming" && (
                          <span style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(161,161,170,0.1)", color: "#71717a", fontSize: 11, fontWeight: 600 }}>Upcoming</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── SIGNATURE & APPROVAL ── */}
            {!isApproved && !isDeclined && !isExpired && !isChangesReq && (
              <div className="no-print" style={{ padding: "0 20px 24px" }}>
                <div style={{ background: "#0f0f0f", border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 20 }}>

                  {!showApproveConfirm && !showChangeRequest && (
                    <>
                      <SignaturePad onSignatureChange={setHasSignature} />

                      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginTop: 16, marginBottom: 16 }}>
                        <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} style={{ marginTop: 3, accentColor: accent }} />
                        <span style={{ fontSize: 12, color: labelColor, lineHeight: 1.5 }}>I agree to the scope of work, pricing, and payment terms outlined above</span>
                      </label>

                      <button
                        onClick={() => setShowApproveConfirm(true)}
                        disabled={!agreedToTerms || !hasSignature}
                        style={{
                          width: "100%", padding: 16, borderRadius: 10, border: "none",
                          cursor: (!agreedToTerms || !hasSignature) ? "not-allowed" : "pointer",
                          fontSize: 16, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                          color: "#000", background: accent,
                          opacity: (!agreedToTerms || !hasSignature) ? 0.4 : 1,
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          transition: "box-shadow 0.2s, opacity 0.2s",
                          boxShadow: (agreedToTerms && hasSignature) ? `0 0 20px rgba(${accentRgb}, 0.3)` : "none",
                        }}
                      >
                        <CheckCircle className="w-5 h-5" /> Approve & Pay Deposit
                      </button>

                      <button
                        onClick={() => setShowChangeRequest(true)}
                        style={{ width: "100%", marginTop: 10, padding: 12, borderRadius: 10, border: `1px solid ${cardBorder}`, background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "'Inter', sans-serif", color: "#71717a", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                      >
                        <MessageSquare className="w-4 h-4" /> Request Changes
                      </button>
                    </>
                  )}

                  {/* Approve confirm */}
                  {showApproveConfirm && (
                    <div>
                      <p style={{ color: labelColor, fontSize: 13, marginBottom: 16 }}>By approving this quote you agree to the listed scope of work and pricing.</p>
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: labelColor, display: "block", marginBottom: 6 }}>YOUR NAME (TYPED SIGNATURE)</label>
                        <input
                          value={approverName}
                          onChange={(e) => setApproverName(e.target.value)}
                          placeholder="Enter your full name"
                          style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${cardBorder}`, background: "#0a0a0a", color: "#fff", fontSize: 15, fontFamily: "'Inter', sans-serif", outline: "none" }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={handleApprove}
                          disabled={approving || !approverName.trim()}
                          style={{ flex: 1, padding: 14, borderRadius: 10, border: "none", cursor: approving || !approverName.trim() ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: "#000", background: accent, opacity: approving || !approverName.trim() ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                        >
                          {approving && <Loader2 className="w-4 h-4 animate-spin" />}
                          Confirm Approval
                        </button>
                        <button onClick={() => setShowApproveConfirm(false)} style={{ padding: "14px 20px", borderRadius: 10, border: `1px solid ${cardBorder}`, background: "transparent", color: "#71717a", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 14 }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Change request */}
                  {showChangeRequest && (
                    <div>
                      <p style={{ color: labelColor, fontSize: 13, marginBottom: 16 }}>Describe what you'd like to change:</p>
                      <textarea
                        value={changeNotes}
                        onChange={(e) => setChangeNotes(e.target.value)}
                        placeholder="Enter your feedback…"
                        rows={4}
                        style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${cardBorder}`, background: "#0a0a0a", color: "#fff", fontSize: 14, fontFamily: "'Inter', sans-serif", outline: "none", resize: "vertical" }}
                      />
                      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                        <button onClick={handleChangeRequest} disabled={changeSubmitting || !changeNotes.trim()} style={{ flex: 1, padding: 14, borderRadius: 10, border: "none", cursor: changeSubmitting || !changeNotes.trim() ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: "#000", background: accent, opacity: changeSubmitting || !changeNotes.trim() ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          {changeSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                          Submit Request
                        </button>
                        <button onClick={() => setShowChangeRequest(false)} style={{ padding: "14px 20px", borderRadius: 10, border: `1px solid ${cardBorder}`, background: "transparent", color: "#71717a", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 14 }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Validity notice */}
            {quote.valid_until && !isApproved && (
              <div style={{ padding: "0 20px 20px" }}>
                <div style={{ background: "#0f0f0f", border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "10px 16px", textAlign: "center", fontSize: 11, color: "#71717a" }}>
                  This quote is valid until {quote.valid_until}. Pricing subject to change after expiration.
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ padding: "0 20px 16px" }}>
                <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 16px", textAlign: "center" }}>
                  <p style={{ color: "#f87171", fontSize: 13, fontWeight: 500 }}>{error}</p>
                </div>
              </div>
            )}

            {/* Trust badge + footer */}
            <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 20px" }}>
              <Shield className="w-3.5 h-3.5" style={{ color: "#71717a" }} />
              <span style={{ color: "#71717a", fontSize: 11 }}>Secure Document · {quote.business_name || brand.name}</span>
            </div>

            <div style={{ borderTop: `1px solid ${cardBorder}`, background: "#0f0f0f", padding: "14px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#71717a" }}>Thank you for considering {quote.business_name || brand.name}</div>
              <div style={{ fontSize: 11, color: "#52525b", marginTop: 4 }}>{brand.footerInfo}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
