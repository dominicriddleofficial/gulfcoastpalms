import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import {
  resolveInvoiceDisplayAddress,
  saveInvoiceServiceAddress,
  type ServiceAddressParts,
  type ServiceAddressUpdatePayload,
} from "@/lib/invoice-address";

export type ServiceAddressCardInvoice = {
  id: string;
  service_address_line1?: string | null;
  service_address_line2?: string | null;
  service_city?: string | null;
  service_state?: string | null;
  service_zip?: string | null;
  service_formatted_address?: string | null;
  property_address?: string | null;
};

interface Props {
  invoice: ServiceAddressCardInvoice;
  /** Called with the saved parts + rebuilt formatted string so the sheet re-renders instantly. */
  onUpdated: (payload: ServiceAddressUpdatePayload) => void;
}


/** Owner-only pencil edit for the per-invoice service address override. */
export default function ServiceAddressCard({ invoice, onUpdated }: Props) {
  const { isOwner } = useUserRole();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parts, setParts] = useState<ServiceAddressParts>({
    line1: invoice.service_address_line1 ?? "",
    line2: invoice.service_address_line2 ?? "",
    city: invoice.service_city ?? "",
    state: invoice.service_state ?? "",
    zip: invoice.service_zip ?? "",
  });

  const display = resolveInvoiceDisplayAddress({
    service: {
      line1: invoice.service_address_line1,
      line2: invoice.service_address_line2,
      city: invoice.service_city,
      state: invoice.service_state,
      zip: invoice.service_zip,
      formatted: invoice.service_formatted_address,
    },
    propertyAddress: invoice.property_address,
  });

  const startEdit = () => {
    setParts({
      line1: invoice.service_address_line1 ?? "",
      line2: invoice.service_address_line2 ?? "",
      city: invoice.service_city ?? "",
      state: invoice.service_state ?? "",
      zip: invoice.service_zip ?? "",
    });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    const { error, payload } = await saveInvoiceServiceAddress(invoice.id, parts);
    setSaving(false);
    if (error) {
      toast.error(`Could not save address: ${error.message}`);
      return;
    }
    setEditing(false);
    toast.success("Service address updated");
    onUpdated(payload);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-body text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Service Address
        </p>
        {isOwner && !editing && (
          <button
            type="button"
            data-testid="service-address-edit"
            onClick={startEdit}
            className="flex items-center gap-1 font-body text-[10px] text-primary hover:underline"
          >
            <Pencil className="w-3 h-3" /> Edit address
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Input
            value={parts.line1 ?? ""}
            onChange={(e) => setParts({ ...parts, line1: e.target.value })}
            placeholder="Street address"
            className="font-body text-sm h-9"
            data-testid="service-address-line1"
          />
          <Input
            value={parts.line2 ?? ""}
            onChange={(e) => setParts({ ...parts, line2: e.target.value })}
            placeholder="Unit / suite (optional)"
            className="font-body text-sm h-9"
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              value={parts.city ?? ""}
              onChange={(e) => setParts({ ...parts, city: e.target.value })}
              placeholder="City"
              className="font-body text-sm h-9 col-span-1"
            />
            <Input
              value={parts.state ?? ""}
              onChange={(e) => setParts({ ...parts, state: e.target.value })}
              placeholder="State"
              className="font-body text-sm h-9"
            />
            <Input
              value={parts.zip ?? ""}
              onChange={(e) => setParts({ ...parts, zip: e.target.value })}
              placeholder="ZIP"
              className="font-body text-sm h-9"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 font-body text-xs flex-1" onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Saving…</> : "Save address"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 font-body text-xs text-muted-foreground"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="font-body text-sm font-semibold text-foreground" data-testid="service-address-value">
          {display || "No service address"}
        </p>
      )}
    </div>
  );
}
