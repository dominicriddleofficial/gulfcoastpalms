import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useCreateSheets, CreateSheetsProvider } from "../CreateSheetsProvider";

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (customer: { id: string; display_name: string; phone: string | null; email: string | null }) => void;
}

export default function NewCustomerSheet({ open, onClose, onCreated }: Props) {
  const { selectedBusinessId } = usePlatformAuth();
  // notifyCreated is optional — when used standalone there's still a provider above us
  let notifyCreated: () => void = () => {};
  try { notifyCreated = useCreateSheets().notifyCreated; } catch { /* not in provider */ }

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("FL");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setFirst(""); setLast(""); setPhone(""); setEmail("");
    setAddress(""); setCity(""); setState("FL"); setZip(""); setNotes("");
  };

  const handleSave = async () => {
    if (!first.trim() && !last.trim()) {
      toast.error("Enter a first or last name");
      return;
    }
    if (!selectedBusinessId) {
      toast.error("Select a workspace first");
      return;
    }
    setSaving(true);
    const display_name = `${first} ${last}`.trim();
    const { data: cust, error } = await supabase
      .from("platform_customers")
      .insert({
        business_id: selectedBusinessId,
        display_name,
        first_name: first || null,
        last_name: last || null,
        phone: phone || null,
        email: email || null,
        internal_notes: notes || null,
        customer_status: "active",
      })
      .select("id, display_name, phone, email")
      .single();

    if (error || !cust) {
      toast.error(error?.message || "Could not create customer");
      setSaving(false);
      return;
    }

    if (address.trim()) {
      await supabase.from("platform_properties").insert({
        business_id: selectedBusinessId,
        customer_id: cust.id,
        address_1: address,
        city: city || "",
        state: state || "FL",
        zip: zip || "",
      });
    }

    toast.success("Customer created");
    notifyCreated();
    onCreated?.(cust);
    reset();
    setSaving(false);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[92vh] sm:h-auto sm:max-w-lg sm:right-0 sm:left-auto sm:inset-y-0 sm:rounded-l-xl overflow-y-auto">
        <SheetHeader><SheetTitle>New customer</SheetTitle></SheetHeader>
        <div className="space-y-3 mt-4">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>First name *</Label><Input value={first} onChange={(e) => setFirst(e.target.value)} /></div>
            <div><Label>Last name</Label><Input value={last} onChange={(e) => setLast(e.target.value)} /></div>
          </div>
          <div><Label>Phone</Label><Input inputMode="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(850) 555-1234" /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" /></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
            <div><Label>State</Label><Input value={state} onChange={(e) => setState(e.target.value)} maxLength={2} /></div>
          </div>
          <div><Label>Zip</Label><Input value={zip} onChange={(e) => setZip(e.target.value)} /></div>
          <div><Label>Internal notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <div className="flex gap-2 mt-5 sticky bottom-0 bg-background py-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Create customer"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Re-export the provider here to satisfy circular import expectations
export { CreateSheetsProvider };