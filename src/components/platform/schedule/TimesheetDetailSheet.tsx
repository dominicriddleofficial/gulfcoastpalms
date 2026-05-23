import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  MapPin,
  Pencil,
  Check,
  AlertTriangle,
  History,
  Navigation,
} from "lucide-react";
import { GoogleMap, PolylineF, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { useGoogleMapsKey } from "@/hooks/useGoogleMapsKey";
import { useTimesheetDetail } from "@/hooks/useTimesheets";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function TimesheetDetailSheet({
  sessionId,
  onClose,
  onChanged,
}: {
  sessionId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useTimesheetDetail(sessionId);
  const { apiKey: mapsKey } = useGoogleMapsKey();
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: mapsKey ?? "",
  });

  const [editing, setEditing] = useState<null | "clock_in_at" | "clock_out_at">(null);
  const [editValue, setEditValue] = useState("");
  const [reason, setReason] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setEditing(null);
      setEditValue("");
      setReason("");
    }
  }, [sessionId]);

  const session = data?.session;
  const timeline = data?.timeline ?? [];
  const gps = data?.gpsPoints ?? [];
  const edits = data?.edits ?? [];

  const path = gps.map((p) => ({ lat: p.lat, lng: p.lng }));
  const center = path.length > 0 ? path[Math.floor(path.length / 2)] : null;

  const startEdit = (field: "clock_in_at" | "clock_out_at") => {
    const cur = session?.[field];
    setEditValue(cur ? format(new Date(cur), "yyyy-MM-dd'T'HH:mm") : "");
    setReason("");
    setEditing(field);
  };

  const saveEdit = async () => {
    if (!session || !editing) return;
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    if (!editValue) {
      toast.error("New value is required");
      return;
    }
    setSavingEdit(true);
    const newIso = new Date(editValue).toISOString();
    const oldVal = session[editing] as string | null;
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;

    const update: Record<string, string | number | null> = { [editing]: newIso };
    // recompute total_minutes when both ends known
    const newIn = editing === "clock_in_at" ? newIso : session.clock_in_at;
    const newOut = editing === "clock_out_at" ? newIso : session.clock_out_at;
    if (newIn && newOut) {
      update.total_minutes = Math.max(
        0,
        Math.round((new Date(newOut).getTime() - new Date(newIn).getTime()) / 60_000),
      );
    }
    update.approval_status = "needs_review";

    const { error: e1 } = await supabase
      .from("platform_clock_sessions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(update as any)
      .eq("id", session.id);
    if (e1) {
      toast.error(e1.message);
      setSavingEdit(false);
      return;
    }
    if (uid) {
      const { error: e2 } = await supabase.from("platform_timesheet_edits").insert({
        business_id: session.business_id,
        clock_session_id: session.id,
        edited_by: uid,
        field_name: editing,
        old_value: oldVal,
        new_value: newIso,
        reason: reason.trim(),
      });
      if (e2) {
        toast.error(`Edit saved but audit failed: ${e2.message}`);
      }
    }
    toast.success("Timesheet edited — marked for review");
    setEditing(null);
    setSavingEdit(false);
    refetch();
    qc.invalidateQueries({ queryKey: ["timesheets"] });
    onChanged?.();
  };

  const approve = async () => {
    if (!session) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("platform_clock_sessions")
      .update({
        approval_status: "approved",
        approved_by: u.user?.id ?? null,
        approved_at: new Date().toISOString(),
      })
      .eq("id", session.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Approved");
    refetch();
    qc.invalidateQueries({ queryKey: ["timesheets"] });
    onChanged?.();
  };

  const totalMin = session
    ? session.clock_out_at
      ? session.total_minutes ?? 0
      : Math.round((Date.now() - new Date(session.clock_in_at).getTime()) / 60_000)
    : 0;

  return (
    <Sheet open={!!sessionId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto bg-background"
      >
        <SheetHeader>
          <SheetTitle className="font-display">Shift Detail</SheetTitle>
        </SheetHeader>

        {isLoading || !session ? (
          <div className="space-y-3 mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {/* Summary */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-sm font-extrabold">
                  {format(new Date(session.schedule_date), "EEE, MMM d, yyyy")}
                </p>
                <Badge variant="outline" className="capitalize">
                  {session.approval_status?.replace(/_/g, " ") ?? "open"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/30 rounded-lg p-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">
                    Clock In
                  </p>
                  <p className="font-display font-extrabold tabular-nums">
                    {format(new Date(session.clock_in_at), "h:mm a")}
                  </p>
                  <button
                    type="button"
                    onClick={() => startEdit("clock_in_at")}
                    className="text-[10px] text-primary inline-flex items-center gap-1 mt-1 hover:underline"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </div>
                <div className="bg-secondary/30 rounded-lg p-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">
                    Clock Out
                  </p>
                  <p className="font-display font-extrabold tabular-nums">
                    {session.clock_out_at
                      ? format(new Date(session.clock_out_at), "h:mm a")
                      : "—"}
                  </p>
                  <button
                    type="button"
                    onClick={() => startEdit("clock_out_at")}
                    className="text-[10px] text-primary inline-flex items-center gap-1 mt-1 hover:underline"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Hours" value={(totalMin / 60).toFixed(1)} />
                <Stat label="GPS Pings" value={String(gps.length)} />
                <Stat label="Edits" value={String(edits.length)} />
              </div>
              {!session.clock_out_at && (
                <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-body">
                  <AlertTriangle className="w-3.5 h-3.5" /> Missing clock-out
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 gap-1.5" onClick={approve}>
                  <Check className="w-4 h-4" /> Approve
                </Button>
              </div>
            </div>

            {/* Edit form */}
            {editing && (
              <div className="bg-card border border-primary/40 rounded-2xl p-4 space-y-3">
                <p className="font-display text-sm font-extrabold">
                  Edit {editing === "clock_in_at" ? "Clock-In" : "Clock-Out"}
                </p>
                <div>
                  <Label className="text-xs">New time</Label>
                  <Input
                    type="datetime-local"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Reason (required)</Label>
                  <Textarea
                    rows={2}
                    placeholder="Why is this change needed?"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit} disabled={savingEdit}>
                    Save edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(null)}
                    disabled={savingEdit}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Map / route */}
            {path.length > 0 && isLoaded && center && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-border flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-primary" />
                  <p className="font-display text-sm font-extrabold">GPS Route</p>
                  <span className="text-xs text-muted-foreground font-body ml-auto">
                    {gps.length} pings
                  </span>
                </div>
                <div className="h-64">
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    center={center}
                    zoom={13}
                    options={{
                      disableDefaultUI: true,
                      zoomControl: true,
                    }}
                  >
                    <PolylineF
                      path={path}
                      options={{
                        strokeColor: "#22c55e",
                        strokeWeight: 3,
                        strokeOpacity: 0.85,
                      }}
                    />
                    <MarkerF position={path[0]} label="A" />
                    <MarkerF position={path[path.length - 1]} label="B" />
                  </GoogleMap>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <p className="font-display text-sm font-extrabold">Timeline</p>
              </div>
              {timeline.length === 0 ? (
                <p className="text-xs text-muted-foreground font-body">No events recorded.</p>
              ) : (
                <ol className="space-y-2">
                  {timeline.map((t, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-foreground">{t.label}</p>
                        <p className="font-body text-[11px] text-muted-foreground tabular-nums">
                          {format(new Date(t.at), "h:mm:ss a")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Edits log */}
            {edits.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-primary" />
                  <p className="font-display text-sm font-extrabold">Admin Edits</p>
                </div>
                <ul className="space-y-2">
                  {edits.map((e) => (
                    <li key={e.id} className="text-xs font-body border-l-2 border-purple-500/50 pl-2">
                      <p className="font-bold text-foreground">
                        {e.field_name.replace(/_/g, " ")} changed
                      </p>
                      <p className="text-muted-foreground">
                        {e.old_value
                          ? format(new Date(e.old_value), "MMM d h:mm a")
                          : "—"}{" "}
                        →{" "}
                        {e.new_value
                          ? format(new Date(e.new_value), "MMM d h:mm a")
                          : "—"}
                      </p>
                      <p className="text-muted-foreground italic">"{e.reason}"</p>
                      <p className="text-muted-foreground text-[10px] mt-0.5">
                        {format(new Date(e.created_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary/30 rounded-lg p-2 text-center">
      <p className="font-display font-extrabold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase text-muted-foreground tracking-wider font-body">{label}</p>
    </div>
  );
}