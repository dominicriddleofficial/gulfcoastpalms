import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useCreateSheets } from "../CreateSheetsProvider";
import CustomerPicker, { CustomerLite } from "./CustomerPicker";
import NewCustomerSheet from "./NewCustomerSheet";
import LineItemsEditor, { LineItem } from "./LineItemsEditor";

export default function NewInvoiceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { selectedBusinessId } = usePlatformAuth();
  const { notifyCreated } = useCreateSheets();

  const [customer, setCustomer] = useState<CustomerLite | null>(null);
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [taxRate, setTaxRate] = useState(0);
  const [terms, setTerms] = useState("Net 14");
  const [dueDate, setDueDate] = useState<string>(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setCustomer(null); setItems([{ description: "", quantity: 1, unit_price: 0 }]);
      setTaxRate(0); setTerms("Net 14"); setNotes("");
      setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
    }
  }, [open]);

  const subtotal = useMemo(() => items.reduce((s, it) => s + it.quantity * it.unit_price, 0), [items]);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const save = async () => {
    if (!selectedBusinessId) { toast.error("Select a workspace"); return; }
    if (!customer) { toast.error("Pick a customer"); return; }
    if (items.every(i => !i.description.trim())) { toast.error("Add at least one line item"); return; }

    setSaving(true);
    const { data: numData } = await supabase.rpc("generate_next_number", {
      _business_id: selectedBusinessId, _record_type: "invoice",
    });
    const invoiceNumber = (typeof numData === "string" ? numData : `I-${Date.now().toString().slice(-6)}`);

    const { data: { user } } = await supabase.auth.getUser();

    const { data: inv, error } = await supabase.from("platform_invoices").insert({
      business_id: selectedBusinessId,
      invoice_number: invoiceNumber,
      customer_id: customer.id,
      status: "draft",
      source: "platform",
      is_read_only: false,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: dueDate,
      terms,
      subtotal,
      tax_rate: taxRate,
      tax_total: tax,
      total,
      balance_due: total,
      public_notes: notes || null,
      created_by_user_id: user?.id || null,
    }).select("id").single();

    if (error || !inv) { toast.error(error?.message || "Could not create invoice"); setSaving(false); return; }

    const lineRows = items.filter(i => i.description.trim()).map((it, idx) => ({
      business_id: selectedBusinessId,
      invoice_id: inv.id,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      line_total: it.quantity * it.unit_price,
      sort_order: idx,
    }));
    if (lineRows.length) await supabase.from("platform_invoice_line_items").insert(lineRows);

    toast.success(`Invoice ${invoiceNumber} created`);
    notifyCreated();
    setSaving(false);
    onClose();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="h-[92vh] sm:h-auto sm:max-w-xl sm:right-0 sm:left-auto sm:inset-y-0 sm:rounded-l-xl overflow-y-auto">
          <SheetHeader><SheetTitle>New invoice</SheetTitle></SheetHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label>Customer *</Label>
              <CustomerPicker businessId={selectedBusinessId} value={customer} onChange={setCustomer} onCreateNew={() => setShowNewCustomer(true)} />
            </div>
            <div>
              <Label>Line items</Label>
              <LineItemsEditor items={items} onChange={setItems} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
              <div><Label>Terms</Label><Input value={terms} onChange={(e) => setTerms(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Tax rate (%)</Label><Input type="number" min={0} step="0.001" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} /></div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Subtotal: ${subtotal.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Tax: ${tax.toFixed(2)}</p>
                <p className="text-base font-semibold text-foreground">Total: ${total.toFixed(2)}</p>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <div className="flex gap-2 mt-5 sticky bottom-0 bg-background py-3">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="flex-1" onClick={save} disabled={saving}>{saving ? "Saving..." : "Create invoice"}</Button>
          </div>
        </SheetContent>
      </Sheet>
      <NewCustomerSheet open={showNewCustomer} onClose={() => setShowNewCustomer(false)} onCreated={(c) => { setCustomer(c); setShowNewCustomer(false); }} />
    </>
  );
}