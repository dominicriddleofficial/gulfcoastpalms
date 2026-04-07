/**
 * 2026 Premium Invoice Preview — dark atmospheric design.
 * GCP: dark green glow + bright green accents.
 * Prestige: dark monochrome + white accents.
 */

const BRAND: Record<string, {
  name: string;
  tagline: string;
  bg: string;
  cardBg: string;
  accent: string;
  accentRgb: string;
  secondaryText: string;
  borderColor: string;
  lineDivider: string;
  tableHeaderBg: string;
  glowGradient: string;
  payBtnBg: string;
  payBtnText: string;
  footerInfo: string;
}> = {
  gcp: {
    name: "Gulf Coast Palms",
    tagline: "Professional Palm Tree Services — NW Florida",
    bg: "#0a0f0a",
    cardBg: "#111811",
    accent: "#22c55e",
    accentRgb: "34, 197, 94",
    secondaryText: "#8a9e8a",
    borderColor: "rgba(34, 197, 94, 0.12)",
    lineDivider: "rgba(255,255,255,0.06)",
    tableHeaderBg: "rgba(34, 197, 94, 0.08)",
    glowGradient: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(34, 197, 94, 0.25) 0%, rgba(34, 197, 94, 0.08) 40%, transparent 70%)",
    payBtnBg: "#22c55e",
    payBtnText: "#ffffff",
    footerInfo: "gulfcoastpalmservices.com · (850) 910-1290",
  },
  pps: {
    name: "Prestige Property Services",
    tagline: "NW Florida's Premier Property Services",
    bg: "#0a0a0a",
    cardBg: "#111111",
    accent: "#ffffff",
    accentRgb: "255, 255, 255",
    secondaryText: "#888888",
    borderColor: "rgba(255, 255, 255, 0.08)",
    lineDivider: "rgba(255,255,255,0.06)",
    tableHeaderBg: "rgba(255, 255, 255, 0.05)",
    glowGradient: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 40%, transparent 70%)",
    payBtnBg: "#ffffff",
    payBtnText: "#0a0a0a",
    footerInfo: "prestigepropertyservices.com",
  },
};

interface PreviewData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  lineItems: Array<{ description: string; quantity: number; unit_price: number; line_total: number }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  publicNotes: string;
  businessName: string;
  shortcode: string;
  isDraft: boolean;
  status?: string;
  logoUrl?: string | null;
}

export default function InvoicePreviewPanel({ data }: { data: PreviewData }) {
  const brand = BRAND[data.shortcode?.toLowerCase()] || BRAND.gcp;
  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const isPaid = data.status === "paid";
  const isOverdue = data.status === "overdue";

  const statusBadge = () => {
    if (isPaid) return { label: "PAID", bg: "rgba(34,197,94,0.15)", color: "#22c55e" };
    if (data.isDraft) return { label: "DRAFT", bg: "rgba(255,255,255,0.08)", color: "#888" };
    if (isOverdue) return { label: "OVERDUE", bg: "rgba(239,68,68,0.15)", color: "#ef4444" };
    return { label: "SENT", bg: "rgba(59,130,246,0.15)", color: "#3b82f6" };
  };

  const badge = statusBadge();

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        backgroundColor: brand.bg,
        color: "#ffffff",
        position: "relative",
        overflow: "hidden",
        borderRadius: "12px",
        WebkitPrintColorAdjust: "exact",
        colorAdjust: "exact",
      } as React.CSSProperties}
    >
      {/* DRAFT watermark */}
      {data.isDraft && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%) rotate(-30deg)",
          fontSize: "72px", fontWeight: 900,
          color: `rgba(${brand.accentRgb}, 0.06)`,
          letterSpacing: "12px", pointerEvents: "none", zIndex: 10,
          userSelect: "none", whiteSpace: "nowrap",
        }}>
          DRAFT
        </div>
      )}

      {/* PAID stamp */}
      {isPaid && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%) rotate(-30deg)",
          fontSize: "64px", fontWeight: 900,
          color: "rgba(34, 197, 94, 0.12)",
          letterSpacing: "8px", pointerEvents: "none", zIndex: 10,
          userSelect: "none", whiteSpace: "nowrap",
          border: "4px solid rgba(34, 197, 94, 0.12)",
          borderRadius: "16px", padding: "8px 32px",
        }}>
          PAID ✓
        </div>
      )}

      {/* Header with glow */}
      <div style={{
        background: `${brand.glowGradient}, ${brand.bg}`,
        padding: "40px 32px 32px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          {/* Left - business info */}
          <div>
            <div style={{
              fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em",
              textTransform: "uppercase", color: "#fff",
            }}>
              {data.businessName || brand.name}
            </div>
            <div style={{
              fontSize: "11px", color: brand.secondaryText, marginTop: "4px",
            }}>
              {brand.tagline}
            </div>
          </div>

          {/* Right - INVOICE label + badge */}
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontSize: "42px", fontWeight: 800, lineHeight: 1,
              letterSpacing: "-0.02em", color: "#fff",
            }}>
              INVOICE
            </div>
            <div style={{
              display: "inline-block", marginTop: "8px",
              padding: "3px 12px", borderRadius: "20px",
              backgroundColor: badge.bg, color: badge.color,
              fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}>
              {badge.label}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{
        height: "1px",
        background: `rgba(${brand.accentRgb}, 0.2)`,
        margin: "0 32px",
      }} />

      {/* Meta Section */}
      <div style={{ padding: "28px 32px", display: "flex", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
        {/* Bill To */}
        <div style={{ flex: "1 1 50%" }}>
          <div style={{
            fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em",
            textTransform: "uppercase", color: brand.secondaryText, marginBottom: "8px",
          }}>
            BILL TO
          </div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>
            {data.customerName}
          </div>
          {data.customerEmail && (
            <div style={{ fontSize: "12px", color: brand.secondaryText, marginTop: "3px" }}>
              {data.customerEmail}
            </div>
          )}
          {data.customerPhone && (
            <div style={{ fontSize: "12px", color: brand.secondaryText, marginTop: "2px" }}>
              {data.customerPhone}
            </div>
          )}
        </div>

        {/* Invoice details */}
        <div style={{ textAlign: "right" }}>
          <div style={{ marginBottom: "12px" }}>
            <div style={{
              fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em",
              textTransform: "uppercase", color: brand.secondaryText,
            }}>
              INVOICE #
            </div>
            <div style={{
              fontSize: "14px", fontWeight: 700, fontFamily: "monospace",
              color: brand.accent, marginTop: "2px",
            }}>
              {data.invoiceNumber}
            </div>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <div style={{
              fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em",
              textTransform: "uppercase", color: brand.secondaryText,
            }}>
              ISSUED
            </div>
            <div style={{ fontSize: "13px", color: "#fff", marginTop: "2px" }}>
              {data.issueDate}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em",
              textTransform: "uppercase", color: brand.secondaryText,
            }}>
              DUE
            </div>
            <div style={{
              fontSize: "13px", marginTop: "2px",
              color: isOverdue ? "#ef4444" : "#fff",
            }}>
              {data.dueDate}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      {data.lineItems.length > 0 && (
        <div style={{ padding: "0 32px", marginBottom: "24px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{
                backgroundColor: brand.tableHeaderBg,
                borderBottom: `1px solid rgba(${brand.accentRgb}, 0.2)`,
              }}>
                <th style={{
                  textAlign: "left", padding: "10px 12px",
                  fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em",
                  textTransform: "uppercase", color: brand.secondaryText,
                }}>Description</th>
                <th style={{
                  textAlign: "center", padding: "10px 8px", width: 50,
                  fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em",
                  textTransform: "uppercase", color: brand.secondaryText,
                }}>Qty</th>
                <th style={{
                  textAlign: "right", padding: "10px 8px", width: 90,
                  fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em",
                  textTransform: "uppercase", color: brand.secondaryText,
                }}>Unit Price</th>
                <th style={{
                  textAlign: "right", padding: "10px 12px", width: 90,
                  fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em",
                  textTransform: "uppercase", color: brand.secondaryText,
                }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${brand.lineDivider}` }}>
                  <td style={{ padding: "10px 12px", color: "#fff", fontSize: "14px" }}>{item.description}</td>
                  <td style={{ padding: "10px 8px", textAlign: "center", color: brand.secondaryText }}>{item.quantity}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right", color: brand.secondaryText }}>{fmt(item.unit_price)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 500 }}>{fmt(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      <div style={{ padding: "0 32px 24px", display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: "220px" }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            padding: "5px 0", fontSize: "13px",
          }}>
            <span style={{ color: brand.secondaryText }}>Subtotal</span>
            <span style={{ color: "#fff" }}>{fmt(data.subtotal)}</span>
          </div>
          {data.taxAmount > 0 && (
            <div style={{
              display: "flex", justifyContent: "space-between",
              padding: "5px 0", fontSize: "13px",
            }}>
              <span style={{ color: brand.secondaryText }}>Tax ({data.taxRate}%)</span>
              <span style={{ color: brand.secondaryText }}>{fmt(data.taxAmount)}</span>
            </div>
          )}
          {data.discountAmount > 0 && (
            <div style={{
              display: "flex", justifyContent: "space-between",
              padding: "5px 0", fontSize: "13px",
            }}>
              <span style={{ color: brand.secondaryText }}>Discount</span>
              <span style={{ color: brand.secondaryText }}>-{fmt(data.discountAmount)}</span>
            </div>
          )}
          {/* Divider */}
          <div style={{
            borderTop: `1px solid rgba(${brand.accentRgb}, 0.2)`,
            marginTop: "8px", paddingTop: "10px",
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
          }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: "13px", letterSpacing: "0.05em" }}>
              TOTAL DUE
            </span>
            <span style={{ color: brand.accent, fontWeight: 800, fontSize: "24px" }}>
              {fmt(data.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment CTA */}
      <div style={{ padding: "0 32px 24px" }}>
        <div style={{
          background: `rgba(${brand.accentRgb}, 0.08)`,
          border: `1px solid rgba(${brand.accentRgb}, 0.2)`,
          borderRadius: "12px", padding: "20px", textAlign: "center",
        }}>
          <div style={{
            fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em",
            textTransform: "uppercase", color: brand.accent, marginBottom: "12px",
          }}>
            PAY ONLINE
          </div>
          <div style={{
            display: "inline-block", width: "100%",
            backgroundColor: brand.payBtnBg, color: brand.payBtnText,
            padding: "14px 24px", borderRadius: "8px",
            fontSize: "16px", fontWeight: 700, cursor: "pointer",
            textAlign: "center",
          }}>
            Pay Now — {fmt(data.total)}
          </div>
        </div>
      </div>

      {/* Notes */}
      {data.publicNotes && (
        <div style={{ padding: "0 32px 24px" }}>
          <div style={{
            fontSize: "13px", color: brand.secondaryText, fontStyle: "italic",
            lineHeight: 1.6,
          }}>
            {data.publicNotes}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        borderTop: `1px solid rgba(${brand.accentRgb}, 0.15)`,
        background: `rgba(${brand.accentRgb}, 0.04)`,
        padding: "16px 32px", textAlign: "center",
      }}>
        <div style={{ fontSize: "12px", color: brand.secondaryText }}>
          Thank you for choosing {data.businessName || brand.name}
        </div>
        <div style={{ fontSize: "11px", color: brand.secondaryText, opacity: 0.6, marginTop: "4px" }}>
          {brand.footerInfo}
        </div>
      </div>
    </div>
  );
}
