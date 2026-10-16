import { useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import AddressAutocomplete, { type VerifiedAddress } from "@/components/platform/AddressAutocomplete";

export interface CreatedCustomer {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
}

interface Props {
  open: boolean;
  businessId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (customer: CreatedCustomer) => void;
}

function fmtPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const emailSchema = z.string().email().max(255);

export default function NewCustomerSheet({ open, businessId, onOpenChange, onCreated }: Props) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("FL");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");
  const [verified, setVerified] = useState<VerifiedAddress | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  /** Customer already inserted on a previous attempt whose property save failed. Never re-insert. */
  const [savedCustomer, setSavedCustomer] = useState<CreatedCustomer | null>(null);

  const reset = () => {
    setFirst(""); setLast(""); setPhone(""); setEmail(""); setAddress(""); setCity("");
    setStateField("FL"); setZip(""); setNotes(""); setVerified(null); setError(null); setSavedCustomer(null);
  };

  const close = () => { if (savingRef.current) return; reset(); onOpenChange(false); };

  const finish = (c: CreatedCustomer) => { reset(); onCreated(c); onOpenChange(false); };

  const handleSave = async () => {
    if (savingRef.current) return;
    setError(null);
    const f = first.trim(), l = last.trim(), em = email.trim(), ph = phone.trim();
    const display_name = `${f} ${l}`.trim();
    if (!savedCustomer) {
      if (!display_name) { setError("Enter a first or last name."); return; }
      if (display_name.length > 100) { setError("Name must be under 100 characters."); return; }
      if (em && !emailSchema.safeParse(em).success) { setError("Enter a valid email address or leave it blank."); return; }
      if (ph && ph.replace(/\D/g, "").length < 7) { setError("Enter a valid phone number or leave it blank."); return; }
    }
    if (!businessId) { setError("No workspace for this quote."); return; }
    savingRef.current = true; setSaving(true);
    try {
      let cust = savedCustomer;
      if (!cust) {
        const { data, error: custErr } = await supabase.from("platform_customers").insert({
          business_id: businessId,
          display_name,
          first_name: f || null,
          last_name: l || null,
          phone: ph || null,
          email: em || null,
          internal_notes: notes.trim() || null,
          customer_status: "active",
        }).select("id, display_name, email, phone").single();
        if (custErr || !data) { setError(custErr?.message || "Could not save customer. Please try again."); return; }
        cust = data as CreatedCustomer;
        setSavedCustomer(cust);
      }
      const street = address.trim();
      if (street) {
        const { error: propErr } = await supabase.from("platform_properties").insert({
          business_id: businessId,
          customer_id: cust.id,
          address_1: street,
          city: city.trim(),
          state: stateField.trim() || "FL",
          zip: zip.trim(),
          formatted_address: verified?.formatted_address || null,
          street_number: verified?.street_number || null,
          route: verified?.route || null,
          county: verified?.county || null,
          latitude: verified?.latitude ?? null,
          longitude: verified?.longitude ?? null,
          map_place_id: verified?.place_id || null,
          address_verified: !!verified,
          address_verified_at: verified ? new Date().toISOString() : null,
          geocode_source: verified ? "google_places" : null,
          geocode_status: verified ? "success" : "pending",
        });
        if (propErr) {
          setError(`Customer was saved, but the address could not be saved (${propErr.message}). Retry to save the address, or continue without it.`);
          return;
        }
      }
      finish(cust);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      savingRef.current = false; setSaving(false);
    }
  };

  const locked = saving || !!savedCustomer;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl sm:max-w-lg sm:mx-auto" data-testid="new-customer-sheet">
        <SheetHeader>
          <SheetTitle className="font-display">New customer</SheetTitle>
          <SheetDescription className="font-body text-xs">Saved to your customer list and added to this quote.</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 py-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label htmlFor="nc-first">First name *</Label><Input id="nc-first" autoComplete="given-name" value={first} disabled={locked} onChange={(e) => setFirst(e.target.value)} maxLength={60} /></div>
            <div><Label htmlFor="nc-last">Last name</Label><Input id="nc-last" autoComplete="family-name" value={last} disabled={locked} onChange={(e) => setLast(e.target.value)} maxLength={60} /></div>
          </div>
          <div><Label htmlFor="nc-phone">Phone</Label><Input id="nc-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} disabled={locked} onChange={(e) => setPhone(fmtPhone(e.target.value))} placeholder="(850) 555-1234" /></div>
          <div><Label htmlFor="nc-email">Email</Label><Input id="nc-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} disabled={locked} onChange={(e) => setEmail(e.target.value)} maxLength={255} /></div>
          <AddressAutocomplete
            label="Property address (optional)"
            value={address}
            onTextChange={setAddress}
            onSelect={(v) => { setVerified(v); setAddress(v.street_address || v.formatted_address); setCity(v.city || ""); setStateField(v.state || "FL"); setZip(v.postal_code || ""); }}
            onUnverify={() => setVerified(null)}
            verified={!!verified}
            placeholder="123 Main St, Pensacola, FL"
          />
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2"><Label htmlFor="nc-city">City</Label><Input id="nc-city" value={city} disabled={saving} onChange={(e) => setCity(e.target.value)} /></div>
            <div><Label htmlFor="nc-state">State</Label><Input id="nc-state" value={stateField} disabled={saving} onChange={(e) => setStateField(e.target.value)} maxLength={2} /></div>
          </div>
          <div><Label htmlFor="nc-zip">ZIP</Label><Input id="nc-zip" inputMode="numeric" autoComplete="postal-code" value={zip} disabled={saving} onChange={(e) => setZip(e.target.value)} maxLength={10} /></div>
          <div><Label htmlFor="nc-notes">Internal notes</Label><Textarea id="nc-notes" rows={2} value={notes} disabled={locked} onChange={(e) => setNotes(e.target.value)} maxLength={2000} /></div>
          {error && <p role="alert" className="font-body text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex gap-2 pb-[env(safe-area-inset-bottom)]">
          {savedCustomer ? (
            <Button variant="outline" className="flex-1" disabled={saving} onClick={() => finish(savedCustomer)}>Continue without address</Button>
          ) : (
            <Button variant="outline" className="flex-1" disabled={saving} onClick={close}>Cancel</Button>
          )}
          <Button className="flex-1" disabled={saving} onClick={handleSave}>
            {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving…</> : savedCustomer ? "Retry address" : "Save customer"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
