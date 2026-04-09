import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Save, Shield, Dog, Car, KeyRound, Wrench, Building2 } from "lucide-react";
import { toast } from "sonner";

interface PropertyNotesFormProps {
  customerId: string;
  businessId: string;
}

interface PropertyNotes {
  id?: string;
  gate_code: string;
  has_dogs: boolean;
  dog_notes: string;
  parking_instructions: string;
  access_restrictions: string;
  hoa_requirements: string;
  equipment_notes: string;
  general_notes: string;
}

const EMPTY: PropertyNotes = {
  gate_code: "",
  has_dogs: false,
  dog_notes: "",
  parking_instructions: "",
  access_restrictions: "",
  hoa_requirements: "",
  equipment_notes: "",
  general_notes: "",
};

export default function PropertyNotesForm({ customerId, businessId }: PropertyNotesFormProps) {
  const [notes, setNotes] = useState<PropertyNotes>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("customer_property_notes")
        .select("*")
        .eq("customer_id", customerId)
        .eq("business_id", businessId)
        .maybeSingle();
      if (data) {
        setNotes({
          id: data.id,
          gate_code: data.gate_code || "",
          has_dogs: data.has_dogs || false,
          dog_notes: data.dog_notes || "",
          parking_instructions: data.parking_instructions || "",
          access_restrictions: data.access_restrictions || "",
          hoa_requirements: data.hoa_requirements || "",
          equipment_notes: data.equipment_notes || "",
          general_notes: data.general_notes || "",
        });
      }
      setLoading(false);
    };
    fetch();
  }, [customerId, businessId]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      customer_id: customerId,
      business_id: businessId,
      gate_code: notes.gate_code || null,
      has_dogs: notes.has_dogs,
      dog_notes: notes.dog_notes || null,
      parking_instructions: notes.parking_instructions || null,
      access_restrictions: notes.access_restrictions || null,
      hoa_requirements: notes.hoa_requirements || null,
      equipment_notes: notes.equipment_notes || null,
      general_notes: notes.general_notes || null,
    };

    if (notes.id) {
      const { error } = await supabase
        .from("customer_property_notes")
        .update(payload)
        .eq("id", notes.id);
      if (error) toast.error("Failed to save"); else toast.success("Property notes saved");
    } else {
      const { error } = await supabase
        .from("customer_property_notes")
        .insert(payload);
      if (error) toast.error("Failed to save"); else toast.success("Property notes saved");
    }
    setSaving(false);
  };

  if (loading) return <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;

  return (
    <div className="space-y-3">
      <p className="font-body text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Shield className="w-3 h-3" /> Property Notes
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <KeyRound className="w-3 h-3" /> Gate Code
          </label>
          <Input value={notes.gate_code} onChange={e => setNotes({ ...notes, gate_code: e.target.value })}
            placeholder="e.g. #1234" className="bg-secondary/50 border-border font-body text-sm" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-body text-[10px] font-medium text-muted-foreground flex items-center gap-1">
              <Dog className="w-3 h-3" /> Dogs on Property
            </label>
            <Switch checked={notes.has_dogs} onCheckedChange={v => setNotes({ ...notes, has_dogs: v })} />
          </div>
          {notes.has_dogs && (
            <Input value={notes.dog_notes} onChange={e => setNotes({ ...notes, dog_notes: e.target.value })}
              placeholder="Dog details…" className="bg-secondary/50 border-border font-body text-sm" />
          )}
        </div>
      </div>

      <div>
        <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
          <Car className="w-3 h-3" /> Parking Instructions
        </label>
        <Input value={notes.parking_instructions} onChange={e => setNotes({ ...notes, parking_instructions: e.target.value })}
          placeholder="Where to park…" className="bg-secondary/50 border-border font-body text-sm" />
      </div>

      <div>
        <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Access Restrictions</label>
        <Input value={notes.access_restrictions} onChange={e => setNotes({ ...notes, access_restrictions: e.target.value })}
          placeholder="Gate hours, locked areas…" className="bg-secondary/50 border-border font-body text-sm" />
      </div>

      <div>
        <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
          <Building2 className="w-3 h-3" /> HOA Requirements
        </label>
        <Input value={notes.hoa_requirements} onChange={e => setNotes({ ...notes, hoa_requirements: e.target.value })}
          placeholder="HOA rules…" className="bg-secondary/50 border-border font-body text-sm" />
      </div>

      <div>
        <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
          <Wrench className="w-3 h-3" /> Special Equipment Needed
        </label>
        <Input value={notes.equipment_notes} onChange={e => setNotes({ ...notes, equipment_notes: e.target.value })}
          placeholder="Bucket truck, scaffolding…" className="bg-secondary/50 border-border font-body text-sm" />
      </div>

      <div>
        <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">General Notes</label>
        <Textarea value={notes.general_notes} onChange={e => setNotes({ ...notes, general_notes: e.target.value })}
          placeholder="Anything else the crew should know…"
          className="bg-secondary/50 border-border font-body text-sm min-h-[60px]" />
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving} className="font-body text-xs w-full">
        <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Saving…" : "Save Property Notes"}
      </Button>
    </div>
  );
}
