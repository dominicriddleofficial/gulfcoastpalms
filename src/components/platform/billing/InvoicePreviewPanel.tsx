/**
 * Live invoice preview — renders the branded invoice exactly as the customer sees it.
 * Used in both the builder right panel and the full-screen preview dialog.
 */

const BRAND: Record<string, {
  name: string; tagline: string; headerBg: string; accent: string;
  accentLight: string; tableHeaderBg: string; tableHeaderText: string;
  altRowBg: string; borderColor: string; footerBg: string; footerText: string;
  footerSubText: string;
}> = {
  gcp: {
    name: "Gulf Coast Palms",
    tagline: "Professional Palm Tree Services — NW Florida",
    headerBg: "#1a5c38", accent: "#1a5c38", accentLight: "#f4faf6",
    tableHeaderBg: "#1a5c38", tableHeaderText: "#ffffff", altRowBg: "#f4faf6",
    borderColor: "#d0e8d8", footerBg: "#1a5c38", footerText: "#ffffff",
    footerSubText: "rgba(255,255,255,0.7)",
  },
  pps: {
    name: "Prestige Property Services",
    tagline: "NW Florida's Premier Property Services",
    headerBg: "#141414", accent: "#141414", accentLight: "#f8f8f8",
    tableHeaderBg: "#141414", tableHeaderText: "#ffffff", altRowBg: "#f8f8f8",
    borderColor: "#e8e8e8", footerBg: "#141414", footerText: "#ffffff",
    footerSubText: "#888888",
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
}

export default function InvoicePreviewPanel({ data }: { data: PreviewData }) {
  const brand = BRAND[data.shortcode?.toLowerCase()] || BRAND.gcp;
  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", position: "relative" }}>
      {/* DRAFT watermark */}
      {data.isDraft && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%) rotate(-30deg)",
          fontSize: "80px", fontWeight: 900, color: "rgba(0,0,0,0.06)",
          letterSpacing: "12px", pointerEvents: "none", zIndex: 10,
          userSelect: "none", whiteSpace: "nowrap",
        }}>
          DRAFT
        </div>
      )}

      {/* Header */}
      <div style={{ backgroundColor: brand.headerBg, padding: "24px 20px" }}>
        <h2 style={{ color: "#fff", fontSize: "16px", fontWeight: 700, margin: 0 }}>{data.businessName || brand.name}</h2>
        <p style={{ color: brand.footerSubText, fontSize: "11px", marginTop: 4 }}>{brand.tagline}</p>
      </div>

      {/* Body */}
      <div style={{ padding: "24px 20px" }}>
        {/* Invoice label + meta */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ color: brand.accent, fontSize: "20px", fontWeight: 700, letterSpacing: "2px" }}>INVOICE</h3>
          <div style={{ textAlign: "right", fontSize: "11px" }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: "#999", textTransform: "uppercase", fontSize: "9px" }}>Invoice #</span><br />
              <span style={{ color: brand.accent, fontFamily: "monospace", fontWeight: 600 }}>{data.invoiceNumber}</span>
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: "#999", textTransform: "uppercase", fontSize: "9px" }}>Issued</span><br />
              <span style={{ color: "#555" }}>{data.issueDate}</span>
            </div>
            <div>
              <span style={{ color: "#999", textTransform: "uppercase", fontSize: "9px" }}>Due</span><br />
              <span style={{ color: "#555" }}>{data.dueDate}</span>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: "9px", fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 4 }}>Bill To</p>
          <p style={{ fontSize: "14px", fontWeight: 700, color: brand.accent }}>{data.customerName}</p>
          {data.customerEmail && <p style={{ fontSize: "11px", color: "#666" }}>{data.customerEmail}</p>}
          {data.customerPhone && <p style={{ fontSize: "11px", color: "#666" }}>{data.customerPhone}</p>}
        </div>

        {/* Line items */}
        {data.lineItems.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: 20 }}>
            <thead>
              <tr style={{ backgroundColor: brand.tableHeaderBg, color: brand.tableHeaderText }}>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: "10px", fontWeight: 600, textTransform: "uppercase" }}>Description</th>
                <th style={{ textAlign: "center", padding: "8px 6px", fontSize: "10px", fontWeight: 600, width: 50 }}>Qty</th>
                <th style={{ textAlign: "right", padding: "8px 6px", fontSize: "10px", fontWeight: 600, width: 80 }}>Price</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "10px", fontWeight: 600, width: 80 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item, i) => (
                <tr key={i} style={{ backgroundColor: i % 2 === 1 ? brand.altRowBg : "#fff", borderTop: `1px solid ${brand.borderColor}` }}>
                  <td style={{ padding: "8px 10px", color: "#333" }}>{item.description}</td>
                  <td style={{ padding: "8px 6px", textAlign: "center", color: "#666" }}>{item.quantity}</td>
                  <td style={{ padding: "8px 6px", textAlign: "right", color: "#666" }}>{fmt(item.unit_price)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 500, color: "#333" }}>{fmt(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
          <div style={{ width: 200 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px" }}>
              <span style={{ color: "#999" }}>Subtotal</span>
              <span style={{ color: "#333" }}>{fmt(data.subtotal)}</span>
            </div>
            {data.taxAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px" }}>
                <span style={{ color: "#999" }}>Tax ({data.taxRate}%)</span>
                <span style={{ color: "#333" }}>{fmt(data.taxAmount)}</span>
              </div>
            )}
            {data.discountAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px" }}>
                <span style={{ color: "#999" }}>Discount</span>
                <span style={{ color: "#333" }}>-{fmt(data.discountAmount)}</span>
              </div>
            )}
            <div style={{ borderTop: `2px solid ${brand.accent}`, marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: brand.accent, fontWeight: 700, fontSize: "14px" }}>TOTAL DUE</span>
              <span style={{ color: brand.accent, fontWeight: 700, fontSize: "18px" }}>{fmt(data.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {data.publicNotes && (
          <div style={{ backgroundColor: brand.accentLight, borderRadius: 6, padding: "12px 14px", marginBottom: 16 }}>
            <p style={{ fontSize: "11px", color: "#555" }}>{data.publicNotes}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: brand.footerBg, padding: "16px 20px", textAlign: "center" }}>
        <p style={{ color: brand.footerText, fontSize: "12px", fontWeight: 500 }}>
          Thank you for choosing {data.businessName || brand.name}
        </p>
        <p style={{ color: brand.footerSubText, fontSize: "10px", marginTop: 4 }}>{brand.tagline}</p>
      </div>
    </div>
  );
}
