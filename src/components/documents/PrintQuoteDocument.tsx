/**
 * Light-theme print copy of the public quote. Rendered offscreen and handed to
 * the PDF helper. No status pill, no signature pad, no approve / request
 * buttons — approved quotes print a plain signature proof instead.
 */
import DocumentBrandMark from "@/components/platform/billing/DocumentBrandMark";
import { PRINT } from "./printTheme";

export interface PrintQuoteData {
  quote_number: string;
  business_name: string;
  shortcode: string;
  tagline: string;
  footer: string;
  logo_url?: string | null;
  created_at?: string;
  valid_until?: string;
  customer_name?: string | null;
  customer_address?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  scope_of_work?: string | null;
  line_items?: Array<{ description: string; quantity: number; unit_price: number; line_total: number }>;
  subtotal?: number | null;
  tax_total?: number | null;
  tax_rate?: number | null;
  total: number;
  approved_at?: string | null;
  approved_by?: string | null;
  is_approved: boolean;
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const label: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: PRINT.secondary,
  marginBottom: 4,
};

export default function PrintQuoteDocument({ data }: { data: PrintQuoteData }) {
  const items = data.line_items ?? [];
  const created = data.created_at
    ? new Date(data.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  return (
    <div
      style={{
        width: 680,
        background: PRINT.bg,
        color: PRINT.text,
        fontFamily: "'Inter', Helvetica, Arial, sans-serif",
        WebkitPrintColorAdjust: "exact",
      } as React.CSSProperties}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: "24px 24px 16px", borderBottom: `1px solid ${PRINT.divider}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <DocumentBrandMark shortcode={data.shortcode} logoUrl={data.logo_url} accent={PRINT.accent} accentRgb="30, 133, 73" size={52} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{data.business_name}</div>
            <div style={{ fontSize: 11, color: PRINT.secondary, marginTop: 2 }}>{data.tagline}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em" }}>QUOTE</div>
          <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: PRINT.accent, marginTop: 2 }}>{data.quote_number}</div>
          {created && <div style={{ fontSize: 11, color: PRINT.secondary, marginTop: 2 }}>{created}</div>}
          {data.valid_until && <div style={{ fontSize: 11, color: PRINT.secondary, marginTop: 2 }}>Valid until {data.valid_until}</div>}
        </div>
      </div>

      <div style={{ padding: "18px 24px 0" }}>
        <div style={label}>PREPARED FOR</div>
        {data.customer_name && <div style={{ fontSize: 13, fontWeight: 700 }}>{data.customer_name}</div>}
        {data.customer_address && <div style={{ fontSize: 13 }}>{data.customer_address}</div>}
        <div style={{ fontSize: 11, color: PRINT.secondary, marginTop: 2 }}>
          {[data.customer_phone, data.customer_email].filter(Boolean).join(" · ")}
        </div>
      </div>

      {data.scope_of_work && (
        <div style={{ padding: "16px 24px 0" }}>
          <div style={label}>SCOPE OF WORK</div>
          <div style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{data.scope_of_work}</div>
        </div>
      )}

      <div style={{ padding: "18px 24px 0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: PRINT.tableHeaderBg }}>
              <th style={{ textAlign: "left", padding: "8px 10px", ...label, marginBottom: 0 }}>Item</th>
              <th style={{ textAlign: "center", padding: "8px 6px", width: 48, ...label, marginBottom: 0 }}>Qty</th>
              <th style={{ textAlign: "right", padding: "8px 6px", width: 90, ...label, marginBottom: 0 }}>Unit</th>
              <th style={{ textAlign: "right", padding: "8px 10px", width: 90, ...label, marginBottom: 0 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${PRINT.divider}` }}>
                <td style={{ padding: "9px 10px", fontSize: 13 }}>{item.description}</td>
                <td style={{ padding: "9px 6px", textAlign: "center", color: PRINT.secondary }}>{item.quantity}</td>
                <td style={{ padding: "9px 6px", textAlign: "right", color: PRINT.secondary }}>${fmt(item.unit_price)}</td>
                <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 600 }}>${fmt(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 24px 0" }}>
        <div style={{ width: 260 }}>
          {data.subtotal != null && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
              <span style={{ color: PRINT.secondary }}>Subtotal</span>
              <span>${fmt(data.subtotal)}</span>
            </div>
          )}
          {data.tax_total != null && data.tax_total > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
              <span style={{ color: PRINT.secondary }}>Tax{data.tax_rate ? ` (${data.tax_rate}%)` : ""}</span>
              <span>${fmt(data.tax_total)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: `1px solid ${PRINT.divider}`, marginTop: 8, paddingTop: 10, lineHeight: 1.5 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>GRAND TOTAL</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: PRINT.accent, lineHeight: 1.5, display: "inline-block" }}>${fmt(data.total)}</span>
          </div>
        </div>
      </div>

      {data.is_approved && (
        <div style={{ padding: "18px 24px 0" }}>
          <div style={{ border: `1px solid ${PRINT.divider}`, borderRadius: 8, padding: 16 }}>
            <div style={label}>SIGNATURE</div>
            <div style={{ fontFamily: "'Brush Script MT', cursive", fontSize: 24, lineHeight: 1.6 }}>
              {data.approved_by || data.customer_name}
            </div>
            <div style={{ borderTop: `1px solid ${PRINT.divider}`, marginTop: 10, paddingTop: 10, fontSize: 12, color: PRINT.accent, fontWeight: 600 }}>
              Approved
              {data.approved_at ? ` ${new Date(data.approved_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : ""}
              {data.approved_by ? ` · ${data.approved_by}` : ""}
            </div>
            <div style={{ fontSize: 11, color: PRINT.secondary, marginTop: 4 }}>
              Scope of work, pricing and payment terms accepted.
            </div>
          </div>
        </div>
      )}

      {data.valid_until && !data.is_approved && (
        <div style={{ padding: "16px 24px 0", fontSize: 11, color: PRINT.secondary }}>
          This quote is valid until {data.valid_until}. Pricing subject to change after expiration.
        </div>
      )}

      <div style={{ marginTop: 20, borderTop: `1px solid ${PRINT.divider}`, padding: "14px 24px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: PRINT.text }}>Thank you for choosing {data.business_name}</div>
        <div style={{ fontSize: 11, color: PRINT.secondary, marginTop: 4 }}>{data.footer}</div>
      </div>
    </div>
  );
}
