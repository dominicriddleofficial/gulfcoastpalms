import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Mail, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface SendInvoiceModalProps {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  invoiceNumber: string;
  dueDate: string;
  businessName: string;
  shortcode: string;
  onSend: (data: { email: string; subject: string; message: string; ccEmail: string }) => Promise<void>;
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
              onClick={() => setSendEmail(!sendEmail)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-body font-medium transition-all",
                sendEmail ? "bg-primary/15 text-primary border-primary/30" : "bg-card text-muted-foreground border-border"
              )}
            >
              <Mail className="w-4 h-4" /> Email
            </button>
            <button
              onClick={() => setSendSms(!sendSms)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-body font-medium transition-all",
                sendSms ? "bg-primary/15 text-primary border-primary/30" : "bg-card text-muted-foreground border-border"
              )}
            >
              <Smartphone className="w-4 h-4" /> Text
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
                Hi {customerName}, your invoice from {businessName} is ready. Pay online here: [PAYMENT_LINK]
              </p>
              <p className="font-body text-[10px] text-muted-foreground mt-2">→ {customerPhone || "No phone on file"}</p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} className="font-body text-sm">Cancel</Button>
          <Button onClick={onSend} disabled={saving || (!sendEmail && !sendSms)} className="font-body text-sm">
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Sending…" : "Send Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
