import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CreditCard, CheckCircle, XCircle, Loader2, Shield, AlertCircle, Printer } from "lucide-react";

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
  public_notes?: string;
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

const fmt = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  const secondaryText = `rgba(255,255,255,${isGcp ? "0.45" : "0.50"})`;

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

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="invoice-page-bg" style={{ background: `radial-gradient(ellipse 70% 45% at 50% 0%, rgba(${accentRgb}, 0.22) 0%, rgba(${accentRgb}, 0.07) 45%, transparent 70%), #080d08`, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  /* ── Error ── */
  if (error && !invoice) {
    return (
      <div className="invoice-page-bg" style={{ background: `radial-gradient(ellipse 70% 45% at 50% 0%, rgba(${accentRgb}, 0.22) 0%, rgba(${accentRgb}, 0.07) 45%, transparent 70%), #080d08`, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
        <div style={{ textAlign: "center" }}>
          <XCircle className="w-14 h-14 mx-auto mb-4" style={{ color: "#f87171" }} />
          <h1 style={{ color: "#fff", fontSize: "20px", fontWeight: 700, marginBottom: "8px", fontFamily: "'Inter', sans-serif" }}>Invoice Not Found</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "14px" }}>{error}</p>
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
    if (isPaid) return { label: "PAID", bg: `rgba(${accentRgb}, 0.15)`, color: accent, border: `rgba(${accentRgb}, 0.3)` };
    if (isDraft) return { label: "DRAFT", bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", border: "rgba(255,255,255,0.15)" };
    if (isOverdue) return { label: "OVERDUE", bg: "rgba(239,68,68,0.15)", color: "#f87171", border: "rgba(239,68,68,0.3)" };
    return { label: "SENT", bg: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "rgba(59,130,246,0.3)" };
  };
  const badge = statusBadge();

  const pageBg = `radial-gradient(ellipse 70% 45% at 50% 0%, rgba(${accentRgb}, 0.22) 0%, rgba(${accentRgb}, 0.07) 45%, transparent 70%), radial-gradient(ellipse 35% 25% at 10% 50%, rgba(${accentRgb}, 0.09) 0%, transparent 60%), radial-gradient(ellipse 30% 20% at 90% 30%, rgba(${accentRgb}, 0.07) 0%, transparent 55%), #080d08`;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body, html { background: #080d08 !important; }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
          body > *:not(.invoice-page-bg) { display: none !important; }
        }
      `}</style>

      <div className="invoice-page-bg" style={{ background: pageBg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center" } as React.CSSProperties}>

        {/* Cancelled notice */}
        {cancelled && (
          <div className="no-print" style={{ maxWidth: 680, width: "100%", marginBottom: 16, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
            <AlertCircle className="w-5 h-5 mx-auto mb-1" style={{ color: "#f59e0b" }} />
            <p style={{ color: "#fbbf24", fontSize: 13, fontWeight: 600 }}>Payment Not Completed</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>No charges were made. You can try again below.</p>
          </div>
        )}

        {/* ── INVOICE CARD ── */}
        <div className="invoice-card" style={{
          maxWidth: 680, width: "100%",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid rgba(${accentRgb}, 0.20)`,
          borderRadius: 20, overflow: "hidden", position: "relative",
          boxShadow: `0 0 60px rgba(${accentRgb}, 0.08), 0 24px 48px rgba(0,0,0,0.4)`,
        }}>

          {/* DRAFT watermark */}
          {isDraft && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-35deg)", fontSize: 120, fontWeight: 900, color: `rgba(${accentRgb}, 0.06)`, letterSpacing: 12, pointerEvents: "none", zIndex: 10, userSelect: "none", whiteSpace: "nowrap" }}>
              DRAFT
            </div>
          )}

          {/* PAID stamp */}
          {isPaid && (
            <div style={{ position: "absolute", top: 80, right: 40, transform: "rotate(-15deg)", fontSize: 52, fontWeight: 900, color: `rgba(${accentRgb}, 0.80)`, border: `4px solid rgba(${accentRgb}, 0.60)`, borderRadius: 8, padding: "4px 16px", pointerEvents: "none", zIndex: 10, userSelect: "none", whiteSpace: "nowrap" }}>
              PAID ✓
            </div>
          )}

          {/* ── HEADER ── */}
          <div style={{ background: `rgba(${accentRgb}, 0.10)`, borderBottom: `1px solid rgba(${accentRgb}, 0.20)`, padding: "32px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                {invoice.logo_url && (
                  <img src={invoice.logo_url} alt={brand.name} style={{ height: 44, marginBottom: 8, filter: "brightness(0) invert(1)" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#fff" }}>
                  {invoice.business_name || brand.name}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
                  {brand.tagline}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em", color: "#fff" }}>INVOICE</div>
                <div style={{ display: "inline-block", marginTop: 8, padding: "3px 12px", borderRadius: 20, backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {badge.label}
                </div>
              </div>
            </div>
          </div>

          {/* ── META ── */}
          <div style={{ padding: "24px", display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 50%" }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>BILL TO</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{invoice.customer_name}</div>
              {invoice.business_email && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginTop: 3 }}>{invoice.business_email}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              {[
                { label: "INVOICE #", value: invoice.invoice_number, isAccent: true },
                ...(invoice.issue_date ? [{ label: "ISSUED", value: invoice.issue_date, isAccent: false }] : []),
                ...(invoice.due_date ? [{ label: "DUE", value: invoice.due_date, isAccent: false, isOverdue }] : []),
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>{item.label}</div>
                  <div style={{ fontSize: item.isAccent ? 14 : 13, fontWeight: item.isAccent ? 700 : 400, fontFamily: item.isAccent ? "monospace" : "inherit", color: item.isAccent ? accent : (item as any).isOverdue ? "#f87171" : "#fff", marginTop: 2 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 24px" }} />

          {/* ── LINE ITEMS ── */}
          {invoice.line_items && invoice.line_items.length > 0 && (
            <div style={{ padding: "0", marginBottom: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: `rgba(${accentRgb}, 0.07)`, borderBottom: `1px solid rgba(${accentRgb}, 0.15)` }}>
                    {["Description", "Qty", "Unit Price", "Total"].map((h, i) => (
                      <th key={h} style={{ textAlign: i === 0 ? "left" : i === 1 ? "center" : "right", padding: "10px 24px", fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.40)", ...(i === 1 ? { width: 50 } : i > 1 ? { width: 100 } : {}) }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((item, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "14px 24px", color: "#fff", fontSize: 14 }}>{item.description}</td>
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
              {invoice.subtotal != null && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
                  <span style={{ color: secondaryText }}>Subtotal</span>
                  <span style={{ color: "#fff" }}>{fmt(invoice.subtotal)}</span>
                </div>
              )}
              {invoice.tax_total != null && invoice.tax_total > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
                  <span style={{ color: secondaryText }}>Tax</span>
                  <span style={{ color: secondaryText }}>{fmt(invoice.tax_total)}</span>
                </div>
              )}
              {invoice.deposit_required && invoice.deposit_paid && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
                  <span style={{ color: accent }}>Deposit Paid ✓</span>
                  <span style={{ color: accent }}>{fmt(invoice.deposit_amount)}</span>
                </div>
              )}
              <div style={{ borderTop: `1px solid rgba(${accentRgb}, 0.20)`, marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 13, letterSpacing: "0.05em" }}>
                  {isPaid ? "TOTAL PAID" : "TOTAL DUE"}
                </span>
                <span style={{ color: accent, fontWeight: 800, fontSize: 26 }}>
                  {fmt(isPaid ? invoice.total : dueNow)}
                </span>
              </div>
            </div>
          </div>

          {/* ── PAY NOW ── */}
          {!isPaid && (
            <div className="no-print" style={{ padding: "0 24px 24px" }}>
              <div style={{ background: `rgba(${accentRgb}, 0.08)`, border: `1px solid rgba(${accentRgb}, 0.22)`, borderRadius: 12, padding: "20px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: accent, marginBottom: 4 }}>SECURE ONLINE PAYMENT</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 14 }}>Click below to pay securely via credit card, Apple Pay, or Google Pay</div>
                <button
                  onClick={handlePay}
                  disabled={paying}
                  style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", cursor: paying ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: isGcp ? "#fff" : "#0a0a0a", background: accent, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s, transform 0.15s", opacity: paying ? 0.7 : 1 }}
                >
                  {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                  {paying ? "Redirecting…" : `Pay Now — ${fmt(dueNow)}`}
                </button>
              </div>
            </div>
          )}

          {/* Paid banner */}
          {isPaid && (
            <div style={{ margin: "0 24px 24px", background: `rgba(${accentRgb}, 0.08)`, border: `1px solid rgba(${accentRgb}, 0.22)`, borderRadius: 12, padding: "16px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <CheckCircle className="w-5 h-5" style={{ color: accent }} />
              <span style={{ color: accent, fontWeight: 600, fontSize: 14 }}>This invoice has been paid in full</span>
            </div>
          )}

          {/* Notes */}
          {invoice.public_notes && (
            <div style={{ padding: "0 24px 20px", textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, fontStyle: "italic", lineHeight: 1.6 }}>{invoice.public_notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="no-print" style={{ display: "flex", justifyContent: "center", gap: 12, padding: "0 24px 20px" }}>
            <button onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              <Printer className="w-4 h-4" /> Download PDF
            </button>
          </div>

          {/* Trust badge */}
          <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0 24px 16px" }}>
            <Shield className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.25)" }} />
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>Secured by Stripe · 256-bit SSL encryption</span>
          </div>

          {/* ── FOOTER ── */}
          <div style={{ borderTop: `1px solid rgba(${accentRgb}, 0.12)`, background: `rgba(${accentRgb}, 0.05)`, padding: "14px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Thank you for choosing {invoice.business_name || brand.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{brand.footer}</div>
          </div>
        </div>

        {/* Error toast */}
        {error && (
          <div className="no-print" style={{ maxWidth: 680, width: "100%", marginTop: 16, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
            <p style={{ color: "#f87171", fontSize: 13, fontWeight: 500 }}>{error}</p>
          </div>
        )}
      </div>
    </>
  );
}
