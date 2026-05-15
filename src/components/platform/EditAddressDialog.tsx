import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AddressAutocomplete, { type VerifiedAddress } from "@/components/platform/AddressAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Which physical table the property record lives in. */
  target: "platform_property" | "jobber_property";
  propertyId: string;
  businessId: string;
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
      const msg =
        (data as any)?.error ||
        error?.message ||
        "Unable to update address.";
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