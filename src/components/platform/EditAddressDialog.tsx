import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AddressAutocomplete, { type VerifiedAddress } from "@/components/platform/AddressAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Which physical table the property record lives in. */
  target: "platform_property" | "jobber_property";
  propertyId: string;
  businessId: string;
  /**
   * Optional: when present, the dialog allows "Add as new property for this customer"
   * which creates a new platform_properties row instead of overwriting.
   * For jobber_property targets, also pass the matched local platform customer
   * so the new address can be filed under the right customer.
   */
  customerId?: string | null;
  initial: {
    address_1: string;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    verified?: boolean;
  };
  onSaved?: (updated: any) => void;
}

export default function EditAddressDialog({
  open,
  onOpenChange,
  target,
  propertyId,
  businessId,
  customerId,
  initial,
  onSaved,
}: Props) {
  const [address, setAddress] = useState(initial.address_1 || "");
  const [city, setCity] = useState(initial.city || "");
  const [stateField, setStateField] = useState(initial.state || "FL");
  const [zip, setZip] = useState(initial.zip || "");
  const [verified, setVerified] = useState<VerifiedAddress | null>(null);
  const [wasVerified, setWasVerified] = useState(!!initial.verified);
  const [saving, setSaving] = useState(false);
  const canAddNew = target === "platform_property" && !!customerId;
  const [mode, setMode] = useState<"update" | "add_new">("update");

  const handleSelect = (v: VerifiedAddress) => {
    setVerified(v);
    setWasVerified(true);
    setAddress(v.street_address || v.formatted_address);
    if (v.city) setCity(v.city);
    if (v.state) setStateField(v.state);
    if (v.postal_code) setZip(v.postal_code);
  };

  const handleUnverify = () => {
    setVerified(null);
    setWasVerified(false);
  };

  const save = async () => {
    if (!address.trim()) {
      toast.error("Address is required");
      return;
    }
    setSaving(true);

    // "Add as new" path — create another platform_properties row under the same customer.
    if (mode === "add_new" && canAddNew && customerId) {
      const v = verified;
      const insertRow: Record<string, any> = {
        business_id: businessId,
        customer_id: customerId,
        address_1: v ? v.street_address || v.formatted_address : address.trim(),
        address_2: null,
        city: v?.city || city.trim() || "Unknown",
        state: v?.state || stateField.trim() || "FL",
        zip: v?.postal_code || zip.trim() || "",
        country: "US",
        property_type: "residential",
      };
      if (v) {
        insertRow.formatted_address = v.formatted_address;
        insertRow.street_number = v.street_number;
        insertRow.route = v.route;
        insertRow.county = v.county;
        insertRow.latitude = v.latitude;
        insertRow.longitude = v.longitude;
        insertRow.map_place_id = v.place_id;
        insertRow.address_verified = true;
        insertRow.address_verified_at = new Date().toISOString();
        insertRow.geocode_source = "google_places";
        insertRow.geocode_status = "success";
      }
      const { data: created, error: insErr } = await supabase
        .from("platform_properties")
        .insert([insertRow as never])
        .select("*")
        .single();
      setSaving(false);
      if (insErr || !created) {
        toast.error(insErr?.message || "Unable to add new address.");
        return;
      }
      toast.success(verified ? "New verified address added" : "New address added");
      onSaved?.(created);
      onOpenChange(false);
      return;
    }

    const { data, error } = await supabase.functions.invoke("update-address", {
      body: {
        target,
        property_id: propertyId,
        business_id: businessId,
        verified: verified ?? null,
        free_text: verified
          ? null
          : { address_1: address.trim(), city: city.trim(), state: stateField.trim(), zip: zip.trim() },
      },
    });
    setSaving(false);

    if (error || (data && (data as any).error)) {
      // supabase.functions.invoke wraps non-2xx responses in a FunctionsHttpError.
      // The actual JSON error body is on error.context (a Response); read it
      // so the user sees the real backend message instead of a generic
      // "Edge Function returned a non-2xx status code".
      let msg = (data as any)?.error || error?.message || "Unable to update address.";
      const ctx = (error as any)?.context;
      if (ctx && typeof ctx.json === "function") {
        try {
          const body = await ctx.json();
          if (body?.error) msg = body.error;
        } catch {
          try {
            const text = await ctx.text();
            if (text) msg = text.slice(0, 300);
          } catch { /* ignore */ }
        }
      }
      console.error("[update-address] failed", { msg, error, data });
      toast.error(msg);
      return;
    }
    toast.success(verified ? "Verified address saved" : "Address saved (unverified)");
    onSaved?.((data as any)?.property);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Edit address</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {canAddNew && (
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider">Save as</p>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as "update" | "add_new")} className="gap-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <RadioGroupItem value="update" id="mode-update" className="mt-0.5" />
                  <div className="text-xs">
                    <div className="text-foreground font-medium">Update this address</div>
                    <div className="text-muted-foreground">Replaces the current address on file.</div>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <RadioGroupItem value="add_new" id="mode-add" className="mt-0.5" />
                  <div className="text-xs">
                    <div className="text-foreground font-medium">Add as new property</div>
                    <div className="text-muted-foreground">Keeps the old one and adds this under the same customer.</div>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}
          <AddressAutocomplete
            label="Street address"
            value={address}
            onTextChange={setAddress}
            onSelect={handleSelect}
            onUnverify={handleUnverify}
            verified={!!verified || wasVerified}
            placeholder="Start typing the property address…"
          />
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">State</Label>
              <Input
                value={stateField}
                onChange={(e) => setStateField(e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Zip</Label>
            <Input value={zip} onChange={(e) => setZip(e.target.value)} className="mt-1" />
          </div>

          {verified ? (
            <p className="text-[11px] text-primary flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Verified address — map pin will be accurate.
            </p>
          ) : (
            <p className="text-[11px] text-amber-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Address not verified — pick a suggestion for accurate map pin.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save address"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}