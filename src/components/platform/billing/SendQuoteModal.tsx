import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Mail, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SendQuoteModalProps {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quoteNumber: string;
  validUntil: string;
  businessName: string;
  shortcode: string;
  total: number;
  quoteUrl: string;
  onSend: (data: { email: string; subject: string; message: string; sendEmail: boolean; sendSms: boolean; smsMessage?: string }) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

export default function SendQuoteModal({
  customerName, customerEmail, customerPhone,
  quoteNumber, validUntil, businessName, shortcode, total, quoteUrl,
  onSend, onClose, saving,
}: SendQuoteModalProps) {
  const [email, setEmail] = useState(customerEmail);
  const [subject, setSubject] = useState(`Quote ${quoteNumber} from ${businessName} — Valid Until ${validUntil}`);
  const [message, setMessage] = useState(
    `Please find your quote attached. You can view and approve it online using the link below.\n\nThank you for considering ${businessName}!`
  );
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [smsMessage, setSmsMessage] = useState(
    `Hi ${customerName}, ${businessName} has sent you a quote for $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}. View and approve here: ${quoteUrl} Reply STOP to unsubscribe.`
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="ops-theme max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">Send Quote</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
              )}>
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
              )}>
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
                <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Subject</label>
                <Input value={subject} onChange={e => setSubject(e.target.value)}
                  className="bg-card border-border font-body text-sm" />
              </div>
              <div>
                <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Message</label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)}
                  rows={5}
                  className="bg-card border-border font-body text-sm min-h-[120px] text-foreground" />
              </div>
            </>
          )}

          {sendSms && (
            <div>
              <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">
                Text message ({smsMessage.length} chars)
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
          <Button onClick={() => onSend({ email, subject, message, sendEmail, sendSms, smsMessage })} disabled={saving || (!sendEmail && !sendSms)} className="font-body text-sm">
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Sending…" : "Send Quote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
