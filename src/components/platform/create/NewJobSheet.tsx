import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useCreateSheets } from "../CreateSheetsProvider";
import CustomerPicker, { CustomerLite } from "./CustomerPicker";
import NewCustomerSheet from "./NewCustomerSheet";

export interface JobPrefill {
  customer?: CustomerLite | null;
  title?: string;
  description?: string;
  total?: number | null;
  /** When set, after the new job is saved this quote will be marked converted and linked. */
  fromQuoteId?: string;
}

interface Props { open: boolean; onClose: () => void; prefill?: JobPrefill }

export default function NewJobSheet({ open, onClose, prefill }: Props) {
  const { selectedBusinessId } = usePlatformAuth();
  const { isOwner } = useUserRole();
  const { notifyCreated } = useCreateSheets();

  const [customer, setCustomer] = useState<CustomerLite | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(60);
  const [address, setAddress] = useState("");
  const [total, setTotal] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  useEffect(() => {
    if (!open) {
      setCustomer(null); setTitle(""); setDescription("");
      setDate(new Date().toISOString().slice(0, 10)); setTime("09:00");
      setDuration(60); setAddress(""); setTotal(""); setNotes("");
    } else if (prefill) {
      if (prefill.customer) setCustomer(prefill.customer);
      if (prefill.title) setTitle(prefill.title);
      if (prefill.description) setDescription(prefill.description);
      if (prefill.total != null) setTotal(String(prefill.total));
    }
  }, [open, prefill]);

  // Pre-fill address from customer's primary property
  useEffect(() => {
    if (!customer || !selectedBusinessId) return;
    (async () => {
      const { data } = await supabase
        .from("platform_properties")
        .select("address_1, city, state, zip")
        .eq("business_id", selectedBusinessId)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) setAddress(`${data.address_1}, ${data.city}, ${data.state} ${data.zip}`.trim());
    })();
  }, [customer, selectedBusinessId]);

  const handleSave = async () => {
    if (!selectedBusinessId) { toast.error("Select a workspace"); return; }
    if (!customer) { toast.error("Pick a customer"); return; }
    if (!title.trim()) { toast.error("Enter a job title"); return; }

    setSaving(true);

    // Generate job number
    let jobNumber: string | null = null;
    const { data: numData, error: numErr } = await supabase.rpc("generate_next_number", {
      _business_id: selectedBusinessId,
      _record_type: "job",
    });
    if (!numErr && typeof numData === "string") jobNumber = numData;
    else jobNumber = `J-${Date.now().toString().slice(-6)}`;

    const scheduledStart = new Date(`${date}T${time}:00`).toISOString();
    const scheduledEnd = new Date(new Date(scheduledStart).getTime() + duration * 60000).toISOString();

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("platform_jobs").insert({
      business_id: selectedBusinessId,
      job_number: jobNumber,
      customer_id: customer.id,
      title: title.trim(),
      description: description || null,
      status: "scheduled",
      source: "platform",
      is_read_only: false,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      estimated_duration_minutes: duration,
      total: isOwner && total ? Number(total) : null,
      internal_notes: notes || null,
      created_by_user_id: user?.id || null,
    });

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    // If converting from a quote, mark the quote as converted and link it
    if (prefill?.fromQuoteId) {
      await supabase.from("platform_quotes")
        .update({ status: "converted" })
        .eq("id", prefill.fromQuoteId);
    }

    toast.success(`Job ${jobNumber} created`);
    notifyCreated();
    setSaving(false);
    onClose();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="h-[92vh] sm:h-auto sm:max-w-lg sm:right-0 sm:left-auto sm:inset-y-0 sm:rounded-l-xl overflow-y-auto">
          <SheetHeader><SheetTitle>New job</SheetTitle></SheetHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label>Customer *</Label>
              <CustomerPicker
                businessId={selectedBusinessId}
                value={customer}
                onChange={setCustomer}
                onCreateNew={() => setShowNewCustomer(true)}
              />
            </div>
            <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Palm trim — 8 palms" /></div>
            <div><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div><Label>Start time</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
            </div>
            <div><Label>Duration (min)</Label><Input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 60)} /></div>
            <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Auto-fills from customer" /></div>
            {isOwner && (
              <div><Label>Total ($)</Label><Input type="number" min={0} step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} /></div>
            )}
            <div><Label>Internal notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <div className="flex gap-2 mt-5 sticky bottom-0 bg-background py-3">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Create job"}</Button>
          </div>
        </SheetContent>
      </Sheet>
      <NewCustomerSheet
        open={showNewCustomer}
        onClose={() => setShowNewCustomer(false)}
        onCreated={(c) => { setCustomer(c); setShowNewCustomer(false); }}
      />
    </>
  );
}