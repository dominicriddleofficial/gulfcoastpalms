import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Mail, Smartphone, ClipboardCopy, CreditCard, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { buildRemitBlock } from "@/lib/invoice-message";

export type InvoicePaymentMethod = "card" | "check";

interface SendInvoiceModalProps {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  invoiceNumber: string;
  dueDate: string;
  businessName: string;
  shortcode: string;
  paymentMethod: InvoicePaymentMethod;
  onPaymentMethodChange: (method: InvoicePaymentMethod) => void;
  onSend: (data: { email: string; subject: string; message: string; ccEmail: string; sendEmail: boolean; sendSms: boolean; smsMessage: string }) => Promise<void>;
  onCopy: () => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

export default function SendInvoiceModal({
  customerName, customerEmail, customerPhone,
  invoiceNumber, dueDate, businessName, shortcode,
  paymentMethod, onPaymentMethodChange,
  onSend, onCopy, onClose, saving,
}: SendInvoiceModalProps) {
  const isCheck = paymentMethod === "check";
  const remitBlock = buildRemitBlock(invoiceNumber, businessName);

  const defaultMessage = (check: boolean) =>
    check
      ? `Hi ${customerName},\n\nPlease find your invoice attached. This invoice is payable by check.\n\n${remitBlock}\n\nThank you for your business!`
      : `Hi ${customerName},\n\nPlease find your invoice attached. You can pay online using the link below.\n\nThank you for your business!`;
  const defaultSms = (check: boolean) =>
    check
      ? `Hi ${customerName}, your invoice from ${businessName} is ready. View it here: [PAYMENT_LINK]. ${remitBlock.replace(/\n/g, " ")} Reply STOP to unsubscribe.`
      : `Hi ${customerName}, your invoice from ${businessName} is ready. Pay online here: [PAYMENT_LINK]. Reply STOP to unsubscribe.`;

  const [email, setEmail] = useState(customerEmail);
  const [ccEmail, setCcEmail] = useState("");
  const [subject, setSubject] = useState(`Invoice ${invoiceNumber} from ${businessName} — Due ${dueDate}`);
  const [message, setMessage] = useState(defaultMessage(isCheck));
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [smsMessage, setSmsMessage] = useState(defaultSms(isCheck));

  // Re-template the email/SMS body when the payment method changes so check
  // invoices carry the remit-to block instead of pay-online wording.
  const lastMethod = useRef(paymentMethod);
  useEffect(() => {
    if (lastMethod.current === paymentMethod) return;
    lastMethod.current = paymentMethod;
    setMessage(defaultMessage(paymentMethod === "check"));
    setSmsMessage(defaultSms(paymentMethod === "check"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="ops-theme max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">Send Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment method */}
          <div>
            <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block uppercase tracking-wider">Payment method</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onPaymentMethodChange("card")}
                aria-pressed={!isCheck}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-xs font-body font-semibold transition-all",
                  !isCheck ? "bg-primary/15 text-primary border-primary" : "bg-card text-muted-foreground border-border"
                )}
              >
                <CreditCard className="w-3.5 h-3.5" /> Card (online link)
              </button>
              <button
                type="button"
                onClick={() => onPaymentMethodChange("check")}
                aria-pressed={isCheck}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-xs font-body font-semibold transition-all",
                  isCheck ? "bg-primary/15 text-primary border-primary" : "bg-card text-muted-foreground border-border"
                )}
              >
                <Landmark className="w-3.5 h-3.5" /> Check (mail-in)
              </button>
            </div>
            {isCheck && (
              <p className="font-body text-[10px] text-muted-foreground mt-1.5 whitespace-pre-line bg-card border border-border rounded-md p-2">
                {remitBlock}
              </p>
            )}
          </div>

          {/* Send methods */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSendEmail(!sendEmail)}
              aria-pressed={sendEmail}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-body font-semibold transition-all",
                sendEmail
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-muted-foreground border-border opacity-60"
              )}
            >
              <Mail className="w-4 h-4" /> Email {sendEmail ? "✓" : ""}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!customerPhone) {
                  toast.error("No phone number on file for this customer");
                  return;
                }
                setSendSms(!sendSms);
              }}
              aria-pressed={sendSms}
              disabled={!customerPhone}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-body font-semibold transition-all",
                !customerPhone && "opacity-30 cursor-not-allowed",
                sendSms && customerPhone
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-muted-foreground border-border opacity-60"
              )}
            >
              <Smartphone className="w-4 h-4" /> Text {sendSms ? "✓" : ""}
              {!customerPhone && <span className="text-[10px]">(no phone)</span>}
            </button>
          </div>

          {/* Save without sending and copy a customer-ready message for Messenger or any other channel. */}
          <Button
            type="button"
            variant="outline"
            onClick={onCopy}
            disabled={saving}
            className="w-full h-12 font-body text-sm justify-center border-primary/40 text-primary hover:text-primary"
          >
            <ClipboardCopy className="w-4 h-4 mr-1.5" />
            {saving ? "Saving…" : "Copy Invoice (no contact info)"}
          </Button>

          {sendEmail && (
            <>
              <div>
                <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Send to</label>
                <Input value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="customer@email.com" className="bg-card border-border font-body text-sm" />
              </div>
              <div>
                <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">CC (optional)</label>
                <Input value={ccEmail} onChange={e => setCcEmail(e.target.value)}
                  placeholder="cc@email.com" className="bg-card border-border font-body text-sm" />
              </div>
              <div>
                <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Subject</label>
                <Input value={subject} onChange={e => setSubject(e.target.value)}
                  className="bg-card border-border font-body text-sm" />
              </div>
              <div>
                <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Message</label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  readOnly={false}
                  disabled={false}
                  rows={5}
                  className="bg-card border-border font-body text-sm min-h-[120px] text-foreground"
                />
                <p className="font-body text-[10px] text-muted-foreground mt-1">Edit freely — this is the email body the customer will see.</p>
              </div>
            </>
          )}

          {sendSms && (
            <div>
              <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">
                Text message ({smsMessage.length} chars) — [PAYMENT_LINK] will be replaced
              </label>
              <Textarea
                value={smsMessage}
                onChange={e => setSmsMessage(e.target.value)}
                readOnly={false}
                disabled={false}
                rows={4}
                className="bg-card border-border font-body text-sm min-h-[90px] text-foreground"
              />
              <p className="font-body text-[10px] text-muted-foreground mt-1">→ {customerPhone || "No phone on file"}</p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} className="font-body text-sm">Cancel</Button>
          <Button onClick={() => onSend({ email, subject, message, ccEmail, sendEmail, sendSms, smsMessage })} disabled={saving || (!sendEmail && !sendSms)} className="font-body text-sm">
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Sending…" : "Send Invoice"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
