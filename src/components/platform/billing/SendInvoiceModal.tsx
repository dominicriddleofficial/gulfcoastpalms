import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Mail, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SendInvoiceModalProps {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  invoiceNumber: string;
  dueDate: string;
  businessName: string;
  shortcode: string;
  onSend: (data: { email: string; subject: string; message: string; ccEmail: string; sendEmail: boolean; sendSms: boolean }) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

export default function SendInvoiceModal({
  customerName, customerEmail, customerPhone,
  invoiceNumber, dueDate, businessName, shortcode,
  onSend, onClose, saving,
}: SendInvoiceModalProps) {
  const [email, setEmail] = useState(customerEmail);
  const [ccEmail, setCcEmail] = useState("");
  const [subject, setSubject] = useState(`Invoice ${invoiceNumber} from ${businessName} — Due ${dueDate}`);
  const [message, setMessage] = useState(
    `Hi ${customerName},\n\nPlease find your invoice attached. You can pay online using the link below.\n\nThank you for your business!`
  );
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">Send Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
                <Textarea value={message} onChange={e => setMessage(e.target.value)}
                  className="bg-card border-border font-body text-sm min-h-[80px]" />
              </div>
            </>
          )}

          {sendSms && (
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="font-body text-[10px] text-muted-foreground mb-1">Text message preview:</p>
              <p className="font-body text-xs text-foreground">
                Hi {customerName}, your invoice from {businessName} is ready. Pay online here: [PAYMENT_LINK]. Reply STOP to unsubscribe.
              </p>
              <p className="font-body text-[10px] text-muted-foreground mt-2">→ {customerPhone || "No phone on file"}</p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} className="font-body text-sm">Cancel</Button>
          <Button onClick={() => onSend({ email, subject, message, ccEmail, sendEmail, sendSms })} disabled={saving || (!sendEmail && !sendSms)} className="font-body text-sm">
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Sending…" : "Send Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
