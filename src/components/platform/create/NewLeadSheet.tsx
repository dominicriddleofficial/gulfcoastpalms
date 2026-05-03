import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useCreateSheets } from "../CreateSheetsProvider";

const SOURCES = ["Facebook Ad", "Google", "Referral", "Walk-up", "Phone-in", "Other"];
const SERVICES = ["Palm trim", "Palm removal", "Stump grind", "Hurricane prep", "Installation", "Other"];

function fmtPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function NewLeadSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { selectedBusinessId } = usePlatformAuth();
  const { notifyCreated } = useCreateSheets();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("Phone-in");
  const [service, setService] = useState("Palm trim");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setName(""); setPhone(""); setEmail(""); setSource("Phone-in"); setService("Palm trim"); setNotes(""); }
  }, [open]);

  const save = async () => {
    if (!selectedBusinessId) { toast.error("Select a workspace"); return; }
    if (!name.trim()) { toast.error("Enter a name"); return; }
    setSaving(true);
    const { error } = await supabase.from("platform_leads").insert({
      business_id: selectedBusinessId,
      inquiry_name: name.trim(),
      inquiry_phone: phone || null,
      inquiry_email: email || null,
      lead_source: source,
      requested_service: service,
      message: notes || null,
      lead_status: "new",
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Lead logged");
    notifyCreated();
    setSaving(false);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[88vh] sm:h-auto sm:max-w-lg sm:right-0 sm:left-auto sm:inset-y-0 sm:rounded-l-xl overflow-y-auto">
        <SheetHeader><SheetTitle>Log a lead</SheetTitle></SheetHeader>
        <div className="space-y-3 mt-4">
          <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Phone</Label><Input inputMode="tel" value={phone} onChange={(e) => setPhone(fmtPhone(e.target.value))} placeholder="(850) 555-1234" /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div>
            <Label>Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Service interest</Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <div className="flex gap-2 mt-5 sticky bottom-0 bg-background py-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="flex-1" onClick={save} disabled={saving}>{saving ? "Saving..." : "Log lead"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}