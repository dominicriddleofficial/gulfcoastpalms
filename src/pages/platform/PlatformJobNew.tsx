import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useCreateSheets, type JobPrefillState } from "@/components/platform/CreateSheetsProvider";
import CustomerPicker, { type CustomerLite } from "@/components/platform/create/CustomerPicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, User, Calendar as CalIcon, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function SectionHeader({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-primary" />
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
    </div>
  );
}

export default function PlatformJobNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as { prefill?: JobPrefillState } | null)?.prefill;
  const { selectedBusinessId } = usePlatformAuth();
  const { isOwner } = useUserRole();
  const { notifyCreated } = useCreateSheets();

  const [jobNumber, setJobNumber] = useState("Generating…");
  const [customer, setCustomer] = useState<CustomerLite | null>(prefill?.customer ?? null);
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [description, setDescription] = useState(prefill?.description ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(60);
  const [address, setAddress] = useState("");
  const [total, setTotal] = useState<string>(prefill?.total != null ? String(prefill.total) : "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedBusinessId) return;
    (async () => {
      const { data, error } = await supabase.rpc("generate_next_number", {
        _business_id: selectedBusinessId, _record_type: "job",
      });
      if (!error && typeof data === "string") setJobNumber(data);
      else setJobNumber(`J-${Date.now().toString().slice(-6)}`);
    })();
  }, [selectedBusinessId]);

  // Pre-fill address from customer's primary property
  useEffect(() => {
    if (!customer || !selectedBusinessId) return;
    (async () => {
      const { data } = await supabase
        .from("platform_properties")
        .select("address_1, city, state, zip")
        .eq("business_id", selectedBusinessId)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) setAddress(`${data.address_1}, ${data.city}, ${data.state} ${data.zip}`.trim());
    })();
  }, [customer, selectedBusinessId]);

  const handleSave = async () => {
    if (!selectedBusinessId) { toast.error("Select a workspace"); return; }
    if (!customer) { toast.error("Pick a customer"); return; }
    if (!title.trim()) { toast.error("Enter a job title"); return; }
    setSaving(true);
    const scheduledStart = new Date(`${date}T${time}:00`).toISOString();
    const scheduledEnd = new Date(new Date(scheduledStart).getTime() + duration * 60000).toISOString();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: row, error } = await supabase.from("platform_jobs").insert({
      business_id: selectedBusinessId,
      job_number: jobNumber,
      customer_id: customer.id,
      quote_id: prefill?.fromQuoteId ?? null,
      title: title.trim(),
      description: description || null,
      status: "scheduled",
      source: "platform",
      is_read_only: false,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      estimated_duration_minutes: duration,
      total: isOwner && total ? Number(total) : null,
      internal_notes: notes || null,
      created_by_user_id: user?.id || null,
    }).select("id").single();
    if (error) { toast.error(error.message); setSaving(false); return; }
    if (prefill?.fromQuoteId) {
      await supabase.from("platform_quotes").update({ status: "converted" }).eq("id", prefill.fromQuoteId);
    }
    toast.success(`Job ${jobNumber} created`);
    notifyCreated();
    setSaving(false);
    navigate("/platform/jobs");
    void row;
  };

  return (
    <PlatformLayout>
      <div className="max-w-2xl mx-auto pb-32">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><X className="w-5 h-5" /></Button>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">New Job</h1>
              <p className="font-mono text-[11px] text-muted-foreground">{jobNumber}</p>
            </div>
          </div>
        </div>

        <section className="bg-card/40 border border-border rounded-xl p-4 mb-4">
          <SectionHeader icon={User} label="Customer" />
          <CustomerPicker
            businessId={selectedBusinessId}
            value={customer}
            onChange={setCustomer}
            onCreateNew={() => navigate("/platform/customers/new")}
          />
        </section>

        <section className="bg-card/40 border border-border rounded-xl p-4 mb-4 space-y-3">
          <SectionHeader icon={Briefcase} label="Job Details" />
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Palm trim — 8 palms" /></div>
          <div><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Auto-fills from customer" /></div>
          {isOwner && (
            <div><Label>Total ($)</Label><Input type="number" min={0} step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} /></div>
          )}
        </section>

        <section className="bg-card/40 border border-border rounded-xl p-4 mb-4 space-y-3">
          <SectionHeader icon={CalIcon} label="Schedule" />
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>Start time</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          </div>
          <div><Label>Duration (min)</Label><Input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 60)} /></div>
        </section>

        <section className="bg-card/40 border border-border rounded-xl p-4 mb-4">
          <SectionHeader icon={FileText} label="Internal Notes" />
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </section>

        <div className="fixed bottom-0 left-0 right-0 lg:left-[240px] z-30 bg-background/95 backdrop-blur-md border-t border-border p-3 flex gap-2 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <Button variant="outline" className="flex-1" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Create Job"}</Button>
        </div>
      </div>
    </PlatformLayout>
  );
}