/**
 * Light-theme print copy of the public invoice. Rendered offscreen and handed
 * to the PDF helper — the on-screen page stays dark and untouched.
 * Nothing interactive lives here: no status pill (except PAID), no Stripe line,
 * no buttons, exactly one thank-you line.
 */
import DocumentBrandMark from "@/components/platform/billing/DocumentBrandMark";
import { CHECK_REMIT, buildOfflinePaymentBlock } from "@/lib/invoice-message";
import { PRINT } from "./printTheme";

export interface PrintInvoiceData {
  invoice_number: string;
  status: string;
  payment_method?: string | null;
  business_name: string;
  shortcode: string;
  tagline: string;
  footer: string;
  logo_url?: string | null;
  issue_date?: string;
  due_date?: string;
  bill_to_name?: string | null;
  bill_to_address?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  line_items?: Array<{ description: string; quantity: number; unit_price: number; line_total: number }>;
  subtotal?: number | null;
  tax_total?: number | null;
  tax_rate?: number | null;
  deposit_paid?: boolean;
  deposit_amount?: number;
  total: number;
  amount_due: number;
  public_notes?: string | null;
  pay_url?: string;
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

export default function PrintInvoiceDocument({ data }: { data: PrintInvoiceData }) {
  const isPaid = data.status === "paid";
  const offlineBlock = buildOfflinePaymentBlock(data.payment_method, data.invoice_number, data.business_name);
  const isCheck = data.payment_method === "check";
  const items = data.line_items ?? [];
  // The footer already carries one thank-you line. Drop a note that only
  // repeats it so paper never shows the sentence twice.
  const notes = (data.public_notes || "").trim();
  const showNotes = notes && !/^thank you for choosing/i.test(notes);

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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: "24px 24px 16px", borderBottom: `1px solid ${PRINT.divider}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <DocumentBrandMark shortcode={data.shortcode} logoUrl={data.logo_url} accent={PRINT.accent} accentRgb="30, 133, 73" size={52} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{data.business_name}</div>
            <div style={{ fontSize: 11, color: PRINT.secondary, marginTop: 2 }}>{data.tagline}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em" }}>INVOICE</div>
          <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: PRINT.accent, marginTop: 2 }}>{data.invoice_number}</div>
          {data.issue_date && <div style={{ fontSize: 11, color: PRINT.secondary, marginTop: 2 }}>Issued {data.issue_date}</div>}
          {data.due_date && <div style={{ fontSize: 11, color: PRINT.secondary, marginTop: 2 }}>Due {data.due_date}</div>}
          {isPaid && (
            <div style={{ display: "inline-block", marginTop: 6, padding: "2px 10px", borderRadius: 4, border: `1px solid ${PRINT.accent}`, color: PRINT.accent, fontSize: 10, fontWeight: 700 }}>
              PAID
            </div>
          )}
        </div>
      </div>

      {/* Pay to / Bill to */}
      <div style={{ display: "flex", gap: 24, padding: "18px 24px 0" }}>
        {(isCheck || data.payment_method === "p2p") && (
          <div style={{ flex: 1 }}>
            <div style={label}>PAY TO</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{data.business_name || CHECK_REMIT.payableTo}</div>
            {isCheck && <div style={{ fontSize: 13 }}>{CHECK_REMIT.address}</div>}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={label}>BILL TO</div>
          {data.bill_to_name && <div style={{ fontSize: 13, fontWeight: 700 }}>{data.bill_to_name}</div>}
          {data.bill_to_address && <div style={{ fontSize: 13 }}>{data.bill_to_address}</div>}
          <div style={{ fontSize: 11, color: PRINT.secondary, marginTop: 2 }}>
            {[data.customer_phone, data.customer_email].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>

      {/* Line items */}
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

      {/* Totals */}
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
          {data.deposit_paid && !!data.deposit_amount && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
              <span style={{ color: PRINT.secondary }}>Deposit paid</span>
              <span>${fmt(data.deposit_amount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: `1px solid ${PRINT.divider}`, marginTop: 8, paddingTop: 10, lineHeight: 1.5 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{isPaid ? "TOTAL PAID" : "TOTAL DUE"}</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: PRINT.accent, lineHeight: 1.5, display: "inline-block" }}>
              ${fmt(isPaid ? data.total : data.amount_due)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment instructions — plain text only */}
      {!isPaid && (
        <div style={{ padding: "18px 24px 0" }}>
          <div style={{ border: `1px solid ${PRINT.divider}`, borderRadius: 8, padding: 16 }}>
            <div style={{ ...label, color: PRINT.accent }}>
              {isCheck ? "PAY BY CHECK" : offlineBlock ? "PAY BY ZELLE / VENMO / CASH APP" : "PAY ONLINE"}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-line" }}>
              {offlineBlock ?? `Pay online: ${data.pay_url ?? ""}`}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {data.public_notes && (
        <div style={{ padding: "16px 24px 0", fontSize: 12, color: PRINT.secondary, fontStyle: "italic", lineHeight: 1.6 }}>
          {data.public_notes}
        </div>
      )}

      {/* Footer — exactly one thank-you line */}
      <div style={{ marginTop: 20, borderTop: `1px solid ${PRINT.divider}`, padding: "14px 24px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: PRINT.text }}>Thank you for choosing {data.business_name}</div>
        <div style={{ fontSize: 11, color: PRINT.secondary, marginTop: 4 }}>{data.footer}</div>
      </div>
    </div>
  );
}
