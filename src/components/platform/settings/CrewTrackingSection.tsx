import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Radio, Truck, Users, Shield, ClipboardCheck, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const INTERVAL_OPTIONS = [
  { value: 15, label: "15 sec" },
  { value: 30, label: "30 sec" },
  { value: 60, label: "1 min" },
  { value: 120, label: "2 min" },
  { value: 300, label: "5 min" },
];

type CrewSettings = {
  business_id: string;
  tracking_enabled: boolean;
  tracking_interval_seconds: number;
  geofence_radius_feet: number;
  tracking_only_during_hours: boolean;
  require_consent_before_tracking: boolean;
  require_clock_in_to_start: boolean;
  require_vehicle_at_clock_in: boolean;
  require_start_mileage: boolean;
  require_end_mileage: boolean;
  allow_employee_edit_clock: boolean;
  require_photo_to_complete: boolean;
  require_notes_to_complete: boolean;
  require_signature_to_complete: boolean;
  require_payment_to_complete: boolean;
  allow_clock_in_without_gps: boolean;
};

const DEFAULT_SETTINGS = (businessId: string): CrewSettings => ({
  business_id: businessId,
  tracking_enabled: true,
  tracking_interval_seconds: 30,
  geofence_radius_feet: 250,
  tracking_only_during_hours: false,
  require_consent_before_tracking: true,
  require_clock_in_to_start: true,
  require_vehicle_at_clock_in: false,
  require_start_mileage: false,
  require_end_mileage: false,
  allow_employee_edit_clock: false,
  require_photo_to_complete: false,
  require_notes_to_complete: false,
  require_signature_to_complete: false,
  require_payment_to_complete: false,
  allow_clock_in_without_gps: true,
});

export function CrewTrackingSection({ businessId }: { businessId: string | null }) {
  if (!businessId) return null;
  return (
    <div className="platform-card rounded-xl p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">Crew Tracking</h2>
      </div>
      <TrackingSettings businessId={businessId} />
      <hr className="border-border" />
      <VehiclesManager businessId={businessId} />
      <hr className="border-border" />
      <CrewManager businessId={businessId} />
    </div>
  );
}

/* ─── 1. Tracking + Clock-in + Job Completion settings ─── */
function TrackingSettings({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["crew-settings", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_crew_settings")
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle();
      if (error) throw error;
      return (data as CrewSettings | null) ?? null;
    },
  });

  const [draft, setDraft] = useState<CrewSettings | null>(null);
  useEffect(() => {
    setDraft(data ?? DEFAULT_SETTINGS(businessId));
  }, [data, businessId]);

  const setField = <K extends keyof CrewSettings>(key: K, value: CrewSettings[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const save = async () => {
    if (!draft) return;
    const { error } = await supabase
      .from("platform_crew_settings")
      .upsert(draft, { onConflict: "business_id" });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Crew tracking settings saved");
    qc.invalidateQueries({ queryKey: ["crew-settings", businessId] });
  };

  if (isLoading || !draft) {
    return <div className="h-32 bg-card border border-border rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-5">
      {/* Tracking */}
      <SubGroup icon={Radio} title="Tracking">
        <RowSwitch
          label="Enable crew tracking"
          checked={draft.tracking_enabled}
          onChange={(v) => setField("tracking_enabled", v)}
        />
        <div className="flex items-center justify-between gap-3 py-2">
          <Label className="text-sm">GPS tracking interval</Label>
          <Select
            value={String(draft.tracking_interval_seconds)}
            onValueChange={(v) => setField("tracking_interval_seconds", Number(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVAL_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-3 py-2">
          <div>
            <Label className="text-sm">Default geofence radius</Label>
            <p className="font-body text-[11px] text-muted-foreground">
              Feet — used to detect arrival at a job
            </p>
          </div>
          <Input
            type="number"
            min={50}
            max={2000}
            step={25}
            value={draft.geofence_radius_feet}
            onChange={(e) => setField("geofence_radius_feet", Number(e.target.value) || 250)}
            className="w-28"
          />
        </div>
        <RowSwitch
          label="Tracking stops at clock-out"
          description="Always enforced for privacy"
          checked
          disabled
        />
        <RowSwitch
          label="Track only during scheduled work hours"
          checked={draft.tracking_only_during_hours}
          onChange={(v) => setField("tracking_only_during_hours", v)}
        />
        <RowSwitch
          label="Require employee consent before first clock-in"
          checked={draft.require_consent_before_tracking}
          onChange={(v) => setField("require_consent_before_tracking", v)}
        />
        <div className="bg-secondary/40 rounded-lg p-3 text-[11px] font-body text-muted-foreground">
          <Shield className="inline w-3 h-3 mr-1 text-primary" />
          Privacy notice shown to employees: <span className="italic">"Location is tracked only
          while you are clocked in for work and stops when you clock out."</span>
        </div>
      </SubGroup>

      {/* Clock-in rules */}
      <SubGroup icon={ClipboardCheck} title="Clock-In Rules">
        <RowSwitch
          label="Require clock-in before starting jobs"
          checked={draft.require_clock_in_to_start}
          onChange={(v) => setField("require_clock_in_to_start", v)}
        />
        <RowSwitch
          label="Require vehicle selection at clock-in"
          checked={draft.require_vehicle_at_clock_in}
          onChange={(v) => setField("require_vehicle_at_clock_in", v)}
        />
        <RowSwitch
          label="Require starting mileage"
          checked={draft.require_start_mileage}
          onChange={(v) => setField("require_start_mileage", v)}
        />
        <RowSwitch
          label="Require ending mileage"
          checked={draft.require_end_mileage}
          onChange={(v) => setField("require_end_mileage", v)}
        />
        <RowSwitch
          label="Allow employees to edit clock time"
          description="Recommended off — admin edits require a reason"
          checked={draft.allow_employee_edit_clock}
          onChange={(v) => setField("allow_employee_edit_clock", v)}
        />
      </SubGroup>

      {/* Job completion rules */}
      <SubGroup icon={ClipboardCheck} title="Job Completion Rules">
        <RowSwitch
          label="Require photo before completing job"
          checked={draft.require_photo_to_complete}
          onChange={(v) => setField("require_photo_to_complete", v)}
        />
        <RowSwitch
          label="Require note before completing job"
          checked={draft.require_notes_to_complete}
          onChange={(v) => setField("require_notes_to_complete", v)}
        />
        <RowSwitch
          label="Require customer signature"
          checked={draft.require_signature_to_complete}
          onChange={(v) => setField("require_signature_to_complete", v)}
        />
        <RowSwitch
          label="Require payment status before completing job"
          checked={draft.require_payment_to_complete}
          onChange={(v) => setField("require_payment_to_complete", v)}
        />
      </SubGroup>

      <div className="flex justify-end">
        <Button size="sm" onClick={save}>
          Save tracking settings
        </Button>
      </div>
    </div>
  );
}

/* ─── 4. Vehicle Management ─── */
type Vehicle = {
  id: string;
  business_id: string;
  name: string;
  truck_number: string | null;
  license_plate: string | null;
  trailer_attached: boolean;
  active: boolean;
  assigned_employee_user_id: string | null;
  notes: string | null;
};

function VehiclesManager({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ["crew-vehicles", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_vehicles")
        .select("id, business_id, name, truck_number, license_plate, trailer_attached, active, assigned_employee_user_id, notes")
        .eq("business_id", businessId)
        .order("name");
      if (error) throw error;
      return (data as Vehicle[]) ?? [];
    },
  });

  const { data: employees = [] } = useQuery<{ user_id: string; name: string }[]>({
    queryKey: ["crew-employees-light", businessId],
    queryFn: async () => {
      const { data: access } = await supabase
        .from("user_business_access")
        .select("user_id")
        .eq("business_id", businessId)
        .eq("active_status", "active");
      const ids = ((access as any[]) ?? []).map((a) => a.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("platform_user_profiles")
        .select("user_id, display_name, email")
        .in("user_id", ids);
      return ((profiles as any[]) ?? []).map((p) => ({
        user_id: p.user_id,
        name: p.display_name ?? p.email ?? "Unknown",
      }));
    },
  });

  const [editing, setEditing] = useState<Vehicle | null>(null);

  const remove = async (id: string) => {
    if (!confirm("Delete this vehicle?")) return;
    const { error } = await supabase.from("platform_vehicles").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Vehicle deleted");
    qc.invalidateQueries({ queryKey: ["crew-vehicles", businessId] });
  };

  return (
    <SubGroup icon={Truck} title="Vehicles">
      <div className="flex justify-between items-center mb-2">
        <p className="font-body text-xs text-muted-foreground">
          {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() =>
            setEditing({
              id: "",
              business_id: businessId,
              name: "",
              truck_number: "",
              license_plate: "",
              trailer_attached: false,
              active: true,
              assigned_employee_user_id: null,
              notes: "",
            })
          }
        >
          <Plus className="w-4 h-4" /> Add vehicle
        </Button>
      </div>
      {isLoading ? (
        <div className="h-16 bg-card border border-border rounded-xl animate-pulse" />
      ) : vehicles.length === 0 ? (
        <p className="font-body text-xs text-muted-foreground text-center py-4">
          No vehicles yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {vehicles.map((v) => {
            const assignee = employees.find((e) => e.user_id === v.assigned_employee_user_id);
            return (
              <div
                key={v.id}
                className="flex items-center justify-between gap-2 bg-secondary/40 rounded-lg p-2.5"
              >
                <div className="min-w-0">
                  <p className="font-body text-sm font-semibold truncate">
                    {v.name}
                    {v.truck_number ? ` · #${v.truck_number}` : ""}
                    {!v.active && (
                      <span className="ml-2 text-[10px] text-muted-foreground">(inactive)</span>
                    )}
                  </p>
                  <p className="font-body text-[11px] text-muted-foreground truncate">
                    {v.license_plate ?? "—"}
                    {v.trailer_attached ? " · Trailer" : ""}
                    {assignee ? ` · ${assignee.name}` : ""}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(v)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(v.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <VehicleDialog
        businessId={businessId}
        vehicle={editing}
        employees={employees}
        onClose={() => setEditing(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["crew-vehicles", businessId] })}
      />
    </SubGroup>
  );
}

function VehicleDialog({
  businessId,
  vehicle,
  employees,
  onClose,
  onSaved,
}: {
  businessId: string;
  vehicle: Vehicle | null;
  employees: { user_id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Vehicle | null>(vehicle);
  useEffect(() => setDraft(vehicle), [vehicle]);
  if (!draft) return null;

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const payload = {
      business_id: businessId,
      name: draft.name.trim(),
      truck_number: draft.truck_number?.trim() || null,
      license_plate: draft.license_plate?.trim() || null,
      trailer_attached: draft.trailer_attached,
      active: draft.active,
      assigned_employee_user_id: draft.assigned_employee_user_id,
      notes: draft.notes?.trim() || null,
    };
    const res = draft.id
      ? await supabase.from("platform_vehicles").update(payload).eq("id", draft.id)
      : await supabase.from("platform_vehicles").insert(payload);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(draft.id ? "Vehicle updated" : "Vehicle added");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={!!vehicle} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Name *">
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              maxLength={80}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Truck number">
              <Input
                value={draft.truck_number ?? ""}
                onChange={(e) => setDraft({ ...draft, truck_number: e.target.value })}
                maxLength={20}
              />
            </Field>
            <Field label="License plate">
              <Input
                value={draft.license_plate ?? ""}
                onChange={(e) => setDraft({ ...draft, license_plate: e.target.value })}
                maxLength={20}
              />
            </Field>
          </div>
          <Field label="Assigned employee">
            <Select
              value={draft.assigned_employee_user_id ?? "none"}
              onValueChange={(v) =>
                setDraft({ ...draft, assigned_employee_user_id: v === "none" ? null : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.user_id} value={e.user_id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <RowSwitch
            label="Trailer attached"
            checked={draft.trailer_attached}
            onChange={(v) => setDraft({ ...draft, trailer_attached: v })}
          />
          <RowSwitch
            label="Active"
            checked={draft.active}
            onChange={(v) => setDraft({ ...draft, active: v })}
          />
          <Field label="Notes">
            <Textarea
              rows={2}
              value={draft.notes ?? ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              maxLength={500}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save vehicle</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── 5. Crew Management (per-employee permissions) ─── */
type CrewMemberRow = {
  user_id: string;
  business_id: string;
  role_name: string;
  active_status: string;
  can_clock_in: boolean;
  can_see_all_jobs: boolean;
  assigned_vehicle_id: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
};

function CrewManager({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const { data: vehicles = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["crew-vehicles-light", businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_vehicles")
        .select("id, name")
        .eq("business_id", businessId)
        .eq("active", true)
        .order("name");
      return ((data as any[]) ?? []).map((v) => ({ id: v.id, name: v.name }));
    },
  });

  const { data: rows = [], isLoading } = useQuery<CrewMemberRow[]>({
    queryKey: ["crew-members", businessId],
    queryFn: async () => {
      const { data: access } = await supabase
        .from("user_business_access")
        .select("user_id, business_id, role_name, active_status, can_clock_in, can_see_all_jobs, assigned_vehicle_id")
        .eq("business_id", businessId);
      const list = (access as any[]) ?? [];
      if (list.length === 0) return [];
      const ids = list.map((a) => a.user_id);
      const { data: profiles } = await supabase
        .from("platform_user_profiles")
        .select("user_id, display_name, email, phone")
        .in("user_id", ids);
      const profileMap = new Map(
        ((profiles as any[]) ?? []).map((p) => [p.user_id, p]),
      );
      return list.map((a) => {
        const p = profileMap.get(a.user_id);
        return {
          user_id: a.user_id,
          business_id: a.business_id,
          role_name: a.role_name,
          active_status: a.active_status,
          can_clock_in: a.can_clock_in ?? true,
          can_see_all_jobs: a.can_see_all_jobs ?? true,
          assigned_vehicle_id: a.assigned_vehicle_id ?? null,
          display_name: p?.display_name ?? null,
          email: p?.email ?? null,
          phone: p?.phone ?? null,
        };
      });
    },
  });

  const updateMember = async (
    userId: string,
    patch: Partial<Pick<CrewMemberRow, "can_clock_in" | "can_see_all_jobs" | "assigned_vehicle_id" | "active_status">>,
  ) => {
    const { error } = await supabase
      .from("user_business_access")
      .update(patch)
      .eq("business_id", businessId)
      .eq("user_id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["crew-members", businessId] });
  };

  return (
    <SubGroup icon={Users} title="Crew Members">
      {isLoading ? (
        <div className="h-16 bg-card border border-border rounded-xl animate-pulse" />
      ) : rows.length === 0 ? (
        <p className="font-body text-xs text-muted-foreground text-center py-4">
          No crew members yet. Invite team members from the Team page.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((m) => (
            <div key={m.user_id} className="bg-secondary/40 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-body text-sm font-semibold truncate">
                    {m.display_name ?? m.email ?? "Unknown"}
                  </p>
                  <p className="font-body text-[11px] text-muted-foreground truncate">
                    {m.role_name} · {m.phone ?? m.email ?? "—"}
                  </p>
                </div>
                <Switch
                  checked={m.active_status === "active"}
                  onCheckedChange={(v) =>
                    updateMember(m.user_id, { active_status: v ? "active" : "inactive" })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Can clock in</span>
                  <Switch
                    checked={m.can_clock_in}
                    onCheckedChange={(v) => updateMember(m.user_id, { can_clock_in: v })}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Sees all jobs</span>
                  <Switch
                    checked={m.can_see_all_jobs}
                    onCheckedChange={(v) => updateMember(m.user_id, { can_see_all_jobs: v })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Assigned vehicle</Label>
                <Select
                  value={m.assigned_vehicle_id ?? "none"}
                  onValueChange={(v) =>
                    updateMember(m.user_id, { assigned_vehicle_id: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </SubGroup>
  );
}

/* ─── shared bits ─── */
function SubGroup({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Radio;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <h3 className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function RowSwitch({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div>
        <Label className="text-sm">{label}</Label>
        {description && (
          <p className="font-body text-[11px] text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}