import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Mail, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

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
  onSend: (data: { email: string; subject: string; message: string; sendEmail: boolean; sendSms: boolean }) => Promise<void>;
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
    `Hi ${customerName},\n\nPlease find your quote attached. You can approve it online using the link below.\n\nThank you for considering ${businessName}!`
  );
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">Send Quote</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setSendEmail(!sendEmail)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-body font-medium transition-all",
                sendEmail ? "bg-primary/15 text-primary border-primary/30" : "bg-card text-muted-foreground border-border"
              )}>
              <Mail className="w-4 h-4" /> Email
            </button>
            <button onClick={() => setSendSms(!sendSms)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-body font-medium transition-all",
                sendSms ? "bg-primary/15 text-primary border-primary/30" : "bg-card text-muted-foreground border-border"
              )}>
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
                Hi {customerName}, {businessName} has sent you a quote for ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}. View and approve here: {quoteUrl} Reply STOP to unsubscribe.
              </p>
              <p className="font-body text-[10px] text-muted-foreground mt-2">→ {customerPhone || "No phone on file"}</p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} className="font-body text-sm">Cancel</Button>
          <Button onClick={() => onSend({ email, subject, message, sendEmail, sendSms })} disabled={saving || (!sendEmail && !sendSms)} className="font-body text-sm">
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Sending…" : "Send Quote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
