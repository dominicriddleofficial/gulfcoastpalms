import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useCreateSheets } from "@/components/platform/CreateSheetsProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Target, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SOURCES = ["Facebook Ad", "Google", "Referral", "Walk-up", "Phone-in", "Other"];
const SERVICES = ["Palm trim", "Palm removal", "Stump grind", "Hurricane prep", "Installation", "Other"];

function fmtPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function SectionHeader({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-primary" />
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
    </div>
  );
}

export default function PlatformLeadNew() {
  const navigate = useNavigate();
  const { selectedBusinessId } = usePlatformAuth();
  const { notifyCreated } = useCreateSheets();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("Phone-in");
  const [service, setService] = useState("Palm trim");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

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
    navigate("/platform/leads");
  };

  return (
    <PlatformLayout>
      <div className="max-w-2xl mx-auto pb-32">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><X className="w-5 h-5" /></Button>
          <h1 className="font-display text-lg font-bold text-foreground">Log a Lead</h1>
        </div>

        <section className="bg-card/40 border border-border rounded-xl p-4 mb-4 space-y-3">
          <SectionHeader icon={Phone} label="Contact" />
          <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Phone</Label><Input inputMode="tel" value={phone} onChange={(e) => setPhone(fmtPhone(e.target.value))} placeholder="(850) 555-1234" /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </section>

        <section className="bg-card/40 border border-border rounded-xl p-4 mb-4 space-y-3">
          <SectionHeader icon={Target} label="Inquiry" />
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
        </section>

        <section className="bg-card/40 border border-border rounded-xl p-4 mb-4">
          <SectionHeader icon={FileText} label="Notes" />
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </section>

        <div className="fixed bottom-0 left-0 right-0 lg:left-[240px] z-30 bg-background/95 backdrop-blur-md border-t border-border p-3 flex gap-2 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <Button variant="outline" className="flex-1" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
          <Button className="flex-1" onClick={save} disabled={saving}>{saving ? "Saving…" : "Log Lead"}</Button>
        </div>
      </div>
    </PlatformLayout>
  );
}