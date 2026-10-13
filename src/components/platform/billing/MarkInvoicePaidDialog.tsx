import { useRef, useState } from "react";
import { format } from "date-fns";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PAYMENT_METHODS, type PlatformInvoice } from "@/hooks/usePlatformInvoices";
import { remainingInvoiceBalance } from "@/lib/record-invoice-payment";

export default function MarkInvoicePaidDialog({ invoice, onClose, onConfirm }: {
  invoice: PlatformInvoice;
  onClose: () => void;
  onConfirm: (amount: number, method: string, notes: string, paymentDate: string) => Promise<boolean>;
}) {
  const [method, setMethod] = useState(invoice.payment_method === "check" ? "check" : "other");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const amount = remainingInvoiceBalance(invoice);
  const today = format(new Date(), "yyyy-MM-dd");

  const submit = async () => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    try {
      const saved = await onConfirm(amount, method, notes || "Marked as paid — payment already received", date);
      if (saved) onClose();
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="ops-theme bg-background border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Paid</DialogTitle>
          <DialogDescription>
            Record payment already received for {invoice.invoice_number}
            {invoice.customer_name ? ` · ${invoice.customer_name}` : ""}. This does not charge the customer.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-secondary/50 p-4">
          <p className="text-xs text-muted-foreground">Payment received</p>
          <p className="text-2xl font-bold text-foreground">${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-1">The remaining balance will be $0.00.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="paid-method" className="text-sm font-medium">Payment method</label>
          <select id="paid-method" value={method} onChange={e => setMethod(e.target.value)} disabled={saving}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {PAYMENT_METHODS.filter(m => m.value !== "card").map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="paid-date" className="text-sm font-medium">Date received</label>
          <Input id="paid-date" type="date" value={date} max={today} onChange={e => setDate(e.target.value)} disabled={saving} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="paid-notes" className="text-sm font-medium">Notes (optional)</label>
          <Textarea id="paid-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Check number or payment reference" disabled={saving} />
        </div>
        <p className="text-xs text-muted-foreground">Online payments made through this invoice update automatically. Use this for payments received separately.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="flex-1" onClick={submit} disabled={saving || amount <= 0 || !date || date > today}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            {saving ? "Saving…" : "Mark as Paid"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
