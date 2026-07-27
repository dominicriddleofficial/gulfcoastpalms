/**
 * Shared helpers for building the customer-ready invoice message
 * (used by both the invoice list/detail Copy action and the
 * Send Invoice modal's "Copy Invoice (no contact info)" action).
 */

export interface InvoiceMessageInput {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string | null | undefined;
  total: number | null | undefined;
  businessName: string | null | undefined;
  shortcode: string | null | undefined;
  origin?: string;
  /** 'card' (default) uses the online pay link wording; 'check' adds remit-to instructions. */
  paymentMethod?: string | null;
}

/** Mail-in remit address for Gulf Coast Palms check payments. */
export const CHECK_REMIT = {
  payableTo: "Gulf Coast Palms",
  address: "7371 Grand Navarre Blvd, Navarre, FL 32566",
} as const;

/**
 * Plain-text remit-to block shown on check invoices across every channel
 * (email, SMS, copied message, hosted invoice page).
 */
export function buildRemitBlock(invoiceNumber: string, businessName?: string | null): string {
  const payable = businessName || CHECK_REMIT.payableTo;
  return `Please make checks payable to: ${payable}\nMail to: ${CHECK_REMIT.address}\nReference: ${invoiceNumber}`;
}

export function isCheckMethod(method: string | null | undefined): boolean {
  return method === "check";
}

export function getInvoicePaymentUrl(input: {
  invoiceId: string;
  invoiceNumber: string;
  shortcode: string | null | undefined;
  origin?: string;
}): string {
  const origin = input.origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const sc = (input.shortcode || input.invoiceNumber?.split("-")[0] || "gcp").toLowerCase();
  return `${origin}/pay/${sc}/${input.invoiceId}`;
}

export function buildInvoiceMessage(input: InvoiceMessageInput): string {
  const firstName = (input.customerName || "there").trim().split(/\s+/)[0];
  const totalStr = `$${Number(input.total || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const bizName = input.businessName || "Gulf Coast Palms";
  const link = getInvoicePaymentUrl(input);
  if (isCheckMethod(input.paymentMethod)) {
    return `Hi ${firstName}, here's your invoice from ${bizName} — ${input.invoiceNumber} for ${totalStr}. View your invoice here: ${link}\n\n${buildRemitBlock(input.invoiceNumber, bizName)}\n\nThank you for your business!`;
  }
  return `Hi ${firstName}, here's your invoice from ${bizName} — ${input.invoiceNumber} for ${totalStr}. View and pay here: ${link}\nThank you for your business!`;
}

/**
 * Copy text to clipboard. Resolves to true on success. On failure the caller
 * should surface a manual-copy dialog (older iOS Safari, non-secure contexts).
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  return false;
}