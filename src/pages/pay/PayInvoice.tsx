import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CreditCard, CheckCircle, XCircle, Loader2, Shield, AlertCircle, Download, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  tax_rate?: number;
  business_phone?: string;
  business_email?: string;
  business_website?: string;
  logo_url?: string;
  public_notes?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
};

const BRAND_INFO: Record<string, { name: string; tagline: string; footer: string }> = {
  gcp: {
    name: "Gulf Coast Palms",
    tagline: "Professional Palm Tree Services — NW Florida",
    footer: "gulfcoastpalmservices.com · (850) 910-1290",
  },
  pps: {
    name: "Prestige Property Services",
    tagline: "NW Florida's Premier Property Services",
    footer: "prestigepropertyservices.com",
  },
};

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PayInvoice() {
  const { shortcode, invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelled = searchParams.get("cancelled") === "true";

  const brandKey = shortcode?.toLowerCase() || "gcp";
  const brand = BRAND_INFO[brandKey] || BRAND_INFO.gcp;
  const isGcp = brandKey === "gcp";
  const accent = isGcp ? "#22c55e" : "#ffffff";
  const accentRgb = isGcp ? "34, 197, 94" : "255, 255, 255";

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const baseUrl = `https://${projectId}.supabase.co/functions/v1`;

  const fullBg = "#09090b";
  const cardBg = "#141414";
  const cardBorder = "#1e1e1e";
  const labelColor = "#a1a1aa";

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
        if (!resp.ok || data.error) setError(data.error || "Invoice not found");
        else setInvoice(data);
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
      setError(err instanceof Error ? err.message : "Payment failed");
      setPaying(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied!", description: "Invoice link copied to clipboard." });
  };

  if (loading) {
    return (
      <div style={{ background: fullBg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div style={{ background: fullBg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ textAlign: "center" }}>
          <XCircle className="w-14 h-14 mx-auto mb-4" style={{ color: "#f87171" }} />
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>Invoice Not Found</h1>
          <p style={{ color: labelColor, fontSize: 14 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.status === "overdue" || (invoice.due_date && new Date(invoice.due_date) < new Date() && !isPaid && invoice.status !== "draft" && invoice.status !== "void");
  const isDraft = invoice.status === "draft";
  const dueNow = invoice.deposit_required && !invoice.deposit_paid && invoice.deposit_amount > 0 ? invoice.deposit_amount : invoice.balance_due;

  const statusBadge = () => {
    if (isPaid) return { label: "Paid", bg: `rgba(${accentRgb}, 0.15)`, color: accent, border: `rgba(${accentRgb}, 0.3)` };
    if (isDraft) return { label: "Draft", bg: "rgba(255,255,255,0.08)", color: "#71717a", border: "rgba(255,255,255,0.15)" };
    if (isOverdue) return { label: "Overdue", bg: "rgba(239,68,68,0.15)", color: "#f87171", border: "rgba(239,68,68,0.3)" };
    return { label: "Sent", bg: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "rgba(59,130,246,0.3)" };
  };
  const badge = statusBadge();

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } body, html { background: #09090b !important; } * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; } }`}</style>
      <style>{`@keyframes payAuraPulse { 0%,100% { opacity: 0.85; } 50% { opacity: 1; } }`}</style>

      <div style={{ background: fullBg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", padding: "24px 12px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" } as React.CSSProperties}>

        {/* ── PLATFORM-STYLE GREEN AURA (matches platform tabs) ── */}
        <div
          aria-hidden
          className="no-print"
          style={{
            position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
            background: `radial-gradient(ellipse 90% 70% at 50% 110%, rgba(${accentRgb}, 0.38), rgba(${accentRgb}, 0.14) 35%, rgba(${accentRgb}, 0.04) 60%, transparent 80%)`,
            animation: "payAuraPulse 6s ease-in-out infinite",
          }}
        />
        <div
          aria-hidden
          className="no-print"
          style={{
            position: "fixed", left: "10%", right: "10%", bottom: "-10%", height: "60vh",
            pointerEvents: "none", zIndex: 0,
            background: `radial-gradient(ellipse 60% 50% at 50% 100%, rgba(${accentRgb}, 0.25), transparent 70%)`,
            filter: "blur(40px)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Cancelled notice */}
        {cancelled && (
          <div className="no-print" style={{ maxWidth: 680, width: "100%", marginBottom: 16, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
            <AlertCircle className="w-5 h-5 mx-auto mb-1" style={{ color: "#f59e0b" }} />
            <p style={{ color: "#fbbf24", fontSize: 13, fontWeight: 600 }}>Payment Not Completed</p>
            <p style={{ color: labelColor, fontSize: 12, marginTop: 2 }}>No charges were made. You can try again below.</p>
          </div>
        )}

        {/* ── ACTION BAR ── */}
        <div className="no-print" style={{ maxWidth: 680, width: "100%", display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
          <button onClick={handleCopyLink} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${cardBorder}`, background: "rgba(255,255,255,0.04)", color: labelColor, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            <Copy className="w-4 h-4" /> Share
          </button>
          <button onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${cardBorder}`, background: "rgba(255,255,255,0.04)", color: labelColor, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>

        {/* ── INVOICE WRAPPER ── */}
        <div style={{ position: "relative", maxWidth: 680, width: "100%" }}>
          {/* ── INVOICE CARD ── */}
          <div style={{
            position: "relative", zIndex: 1,
            background: cardBg, border: `1px solid ${cardBorder}`,
            borderRadius: 16, overflow: "hidden",
            boxShadow: `0 20px 60px -20px rgba(${accentRgb}, 0.25), 0 0 0 1px rgba(255,255,255,0.02)`,
          }}>

            {/* ── HEADER ── */}
            <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${cardBorder}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `rgba(${accentRgb}, 0.12)`, border: `1px solid rgba(${accentRgb}, 0.25)`, flexShrink: 0 }}>
                    <span style={{ color: accent, fontWeight: 700, fontSize: 11, letterSpacing: "0.05em" }}>{(invoice.shortcode || brandKey).toUpperCase()}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{invoice.business_name || brand.name}</div>
                    <div style={{ fontSize: 11, color: labelColor, marginTop: 1 }}>{brand.tagline}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: "#fff" }}>{invoice.invoice_number}</p>
                  {invoice.issue_date && <p style={{ fontSize: 12, color: labelColor, marginTop: 2 }}>{invoice.issue_date}</p>}
                  <div style={{ display: "inline-block", marginTop: 6, padding: "2px 10px", borderRadius: 20, backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontSize: 10, fontWeight: 600 }}>
                    {badge.label}
                  </div>
                </div>
              </div>

              {/* Customer info */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#71717a", marginBottom: 4 }}>BILL TO</div>
                <p style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>{invoice.customer_name}</p>
                {(invoice as Record<string, unknown>).customer_address && <p style={{ fontSize: 12, color: labelColor, marginTop: 2 }}>{String((invoice as Record<string, unknown>).customer_address)}</p>}
                <p style={{ fontSize: 12, color: labelColor, marginTop: 2 }}>
                  {[(invoice as Record<string, unknown>).customer_phone, (invoice as Record<string, unknown>).customer_email].filter(Boolean).map(String).join(" · ")}
                </p>
              </div>

              {/* Due date */}
              {invoice.due_date && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: labelColor }}>Due Date</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isOverdue ? "#f87171" : "#fff" }}>{invoice.due_date}</span>
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

              {invoice.line_items && invoice.line_items.length > 0 ? (
                invoice.line_items.map((item, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "1fr 48px 80px 80px", gap: 8,
                    padding: "14px 0", alignItems: "center",
                    borderBottom: i < (invoice.line_items?.length ?? 0) - 1 ? "1px solid #1a1a1a" : "none",
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
                {invoice.subtotal != null && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <span style={{ color: labelColor }}>Subtotal</span>
                    <span style={{ color: "#fff" }}>${fmt(invoice.subtotal)}</span>
                  </div>
                )}
                {invoice.tax_total != null && invoice.tax_total > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <span style={{ color: labelColor }}>Tax{(invoice as Record<string, unknown>).tax_rate ? ` (${(invoice as Record<string, unknown>).tax_rate}%)` : ""}</span>
                    <span style={{ color: "#fff" }}>${fmt(invoice.tax_total)}</span>
                  </div>
                )}
                {invoice.deposit_required && invoice.deposit_paid && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <span style={{ color: accent }}>Deposit Paid ✓</span>
                    <span style={{ color: accent }}>${fmt(invoice.deposit_amount)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 8, borderTop: `1px solid ${cardBorder}` }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{isPaid ? "Total Paid" : "Total Due"}</span>
                  <span style={{ fontSize: 28, fontWeight: 700, color: accent }}>${fmt(isPaid ? invoice.total : dueNow)}</span>
                </div>
              </div>
            </div>

            {/* ── PAY NOW ── */}
            {!isPaid && (
              <div className="no-print" style={{ padding: "20px 20px 24px" }}>
                <div style={{ background: "#0f0f0f", border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 20, textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: accent, marginBottom: 4 }}>SECURE ONLINE PAYMENT</div>
                  <div style={{ fontSize: 12, color: labelColor, marginBottom: 14 }}>Pay securely via credit card, Apple Pay, or Google Pay</div>
                  <button
                    onClick={handlePay}
                    disabled={paying}
                    style={{
                      width: "100%", padding: 16, borderRadius: 10, border: "none",
                      cursor: paying ? "not-allowed" : "pointer",
                      fontSize: 16, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                      color: "#000", background: accent,
                      opacity: paying ? 0.7 : 1,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      boxShadow: `0 0 20px rgba(${accentRgb}, 0.3)`,
                      transition: "box-shadow 0.2s, opacity 0.2s",
                    }}
                  >
                    {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                    {paying ? "Redirecting…" : `Pay Now — $${fmt(dueNow)}`}
                  </button>
                </div>
              </div>
            )}

            {/* Paid banner */}
            {isPaid && (
              <div style={{ margin: "20px 20px 24px", background: `rgba(${accentRgb}, 0.08)`, border: `1px solid rgba(${accentRgb}, 0.22)`, borderRadius: 12, padding: 16, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <CheckCircle className="w-5 h-5" style={{ color: accent }} />
                <span style={{ color: accent, fontWeight: 600, fontSize: 14 }}>This invoice has been paid in full</span>
              </div>
            )}

            {/* Notes */}
            {invoice.public_notes && (
              <div style={{ padding: "0 20px 20px", textAlign: "center" }}>
                <p style={{ color: "#71717a", fontSize: 13, fontStyle: "italic", lineHeight: 1.6 }}>{invoice.public_notes}</p>
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
              <span style={{ color: "#71717a", fontSize: 11 }}>Secured by Stripe · 256-bit SSL encryption</span>
            </div>

            <div style={{ borderTop: `1px solid ${cardBorder}`, background: "#0f0f0f", padding: "14px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#71717a" }}>Thank you for choosing {invoice.business_name || brand.name}</div>
              <div style={{ fontSize: 11, color: "#52525b", marginTop: 4 }}>{brand.footer}</div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
