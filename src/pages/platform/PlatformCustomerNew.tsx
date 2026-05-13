import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useCreateSheets } from "@/components/platform/CreateSheetsProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, MapPin, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export default function PlatformCustomerNew() {
  const navigate = useNavigate();
  const { selectedBusinessId } = usePlatformAuth();
  const { notifyCreated } = useCreateSheets();

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("FL");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!first.trim() && !last.trim()) { toast.error("Enter a first or last name"); return; }
    if (!selectedBusinessId) { toast.error("Select a workspace first"); return; }
    setSaving(true);
    const display_name = `${first} ${last}`.trim();
    const { data: cust, error } = await supabase.from("platform_customers").insert({
      business_id: selectedBusinessId,
      display_name,
      first_name: first || null,
      last_name: last || null,
      phone: phone || null,
      email: email || null,
      internal_notes: notes || null,
      customer_status: "active",
    }).select("id").single();
    if (error || !cust) { toast.error(error?.message || "Could not create customer"); setSaving(false); return; }
    if (address.trim()) {
      await supabase.from("platform_properties").insert({
        business_id: selectedBusinessId,
        customer_id: cust.id,
        address_1: address,
        city: city || "",
        state: stateField || "FL",
        zip: zip || "",
      });
    }
    toast.success("Customer created");
    notifyCreated();
    setSaving(false);
    navigate("/platform/customers");
  };

  return (
    <PlatformLayout>
      <div className="max-w-2xl mx-auto pb-32">
        <div className="flex items-center gap-3 py-4 mb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Close"
            className="flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors -ml-2"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight">New Customer</h1>
          </div>
        </div>

        <section className="bg-card/40 border border-border rounded-xl p-4 mb-4 space-y-3">
          <SectionHeader icon={User} label="Contact" />
          <div className="grid grid-cols-2 gap-2">
            <div><Label>First name *</Label><Input value={first} onChange={(e) => setFirst(e.target.value)} /></div>
            <div><Label>Last name</Label><Input value={last} onChange={(e) => setLast(e.target.value)} /></div>
          </div>
          <div><Label>Phone</Label><Input inputMode="tel" value={phone} onChange={(e) => setPhone(fmtPhone(e.target.value))} placeholder="(850) 555-1234" /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </section>

        <section className="bg-card/40 border border-border rounded-xl p-4 mb-4 space-y-3">
          <SectionHeader icon={MapPin} label="Property Address" />
          <div><Label>Street address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" /></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
            <div><Label>State</Label><Input value={stateField} onChange={(e) => setStateField(e.target.value)} maxLength={2} /></div>
          </div>
          <div><Label>Zip</Label><Input value={zip} onChange={(e) => setZip(e.target.value)} /></div>
        </section>

        <section className="bg-card/40 border border-border rounded-xl p-4 mb-4">
          <SectionHeader icon={FileText} label="Internal Notes" />
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </section>

        <div className="fixed bottom-[64px] lg:bottom-0 left-0 right-0 lg:left-[240px] z-50 bg-background/95 backdrop-blur-md border-t border-border p-3 flex gap-2 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <Button variant="outline" className="flex-1" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Customer"}</Button>
        </div>
      </div>
    </PlatformLayout>
  );
}