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
import AddressAutocomplete, { type VerifiedAddress } from "@/components/platform/AddressAutocomplete";
import { todayLocalKey } from "@/lib/localDate";

function SectionHeader({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-primary" />
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">{label}</p>
    </div>
  );
}

const inputCls =
  "bg-background/60 border-border/80 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-primary/50";
const labelCls = "text-foreground/90 text-xs font-medium mb-1.5 block";

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
  const [date, setDate] = useState(() => prefill?.scheduledDate ?? todayLocalKey());
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(60);
  const [address, setAddress] = useState(prefill?.address ?? "");
  const [total, setTotal] = useState<string>(prefill?.total != null ? String(prefill.total) : "");
  const [notes, setNotes] = useState(prefill?.internalNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [verifiedAddr, setVerifiedAddr] = useState<VerifiedAddress | null>(null);

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

  // Pre-fill address from customer's primary property (only if not provided via prefill)
  useEffect(() => {
    if (!customer || !selectedBusinessId || address) return;
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
  }, [customer, selectedBusinessId, address]);

  const handleSave = async () => {
    if (!selectedBusinessId) { toast.error("Select a workspace"); return; }
    if (!customer) { toast.error("Pick a customer"); return; }
    if (!title.trim()) { toast.error("Enter a job title"); return; }
    setSaving(true);

    // Prevent accidental duplicate when prefilled from a quote
    if (prefill?.fromQuoteId) {
      const { data: existing } = await supabase
        .from("platform_jobs")
        .select("id, job_number")
        .eq("quote_id", prefill.fromQuoteId)
        .limit(1);
      if (existing && existing.length > 0) {
        const ok = confirm(
          `Job ${existing[0].job_number} was already created from this quote. Create another?`,
        );
        if (!ok) { setSaving(false); return; }
      }
    }

    const { data, error } = await supabase.functions.invoke("create-platform-job", {
      body: {
        business_id: selectedBusinessId,
        customer: { id: customer.id, display_name: customer.display_name },
        address_freeform: address || null,
        verified_address: verifiedAddr,
        title: title.trim(),
        description: description || null,
        internal_notes: notes || null,
        scheduled_date: date,
        scheduled_start_time: time,
        duration_minutes: duration,
        total: isOwner && total ? Number(total) : null,
        quote_id: prefill?.fromQuoteId ?? null,
      },
    });
    const errMsg =
      (data && typeof data === "object" && "error" in data ? (data as { error?: string }).error : null) ||
      error?.message;
    if (errMsg) {
      toast.error(errMsg);
      setSaving(false);
      return;
    }
    const created = data as { job?: { job_number?: string; scheduled_start?: string } };
    toast.success(`Job ${created?.job?.job_number || jobNumber} saved`);
    notifyCreated();
    setSaving(false);
    const targetDate = created?.job?.scheduled_start || date;
    navigate(`/platform/schedule?date=${targetDate}`);
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
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight">New Job</h1>
            <p className="font-mono text-xs text-muted-foreground tracking-tight">{jobNumber}</p>
          </div>
        </div>

        <section className="bg-card/80 border border-border rounded-xl p-4 mb-4 shadow-sm">
          <SectionHeader icon={User} label="Customer" />
          <CustomerPicker
            businessId={selectedBusinessId}
            value={customer}
            onChange={setCustomer}
            onCreateNew={() => navigate("/platform/customers/new")}
          />
        </section>

        <section className="bg-card/80 border border-border rounded-xl p-4 mb-4 space-y-3 shadow-sm">
          <SectionHeader icon={Briefcase} label="Job Details" />
          <div>
            <Label className={labelCls}>Title *</Label>
            <Input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Palm trim — 8 palms" />
          </div>
          <div>
            <Label className={labelCls}>Description</Label>
            <Textarea rows={3} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the work, materials, special considerations…" />
          </div>
          <AddressAutocomplete
            label="Address"
            value={address}
            onTextChange={setAddress}
            onSelect={(v) => {
              setVerifiedAddr(v);
              setAddress(v.formatted_address);
            }}
            onUnverify={() => setVerifiedAddr(null)}
            verified={!!verifiedAddr}
            placeholder={customer ? "Search address…" : "Select a customer first to auto-fill"}
          />
          {customer && !verifiedAddr && (
            <p className="text-[11px] text-muted-foreground/80 mt-1.5">Auto-filled from customer record. Pick a suggestion to verify.</p>
          )}
          {isOwner && (
            <div>
              <Label className={labelCls}>Total ($)</Label>
              <Input className={inputCls} type="number" min={0} step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0.00" />
            </div>
          )}
        </section>

        <section className="bg-card/80 border border-border rounded-xl p-4 mb-4 space-y-3 shadow-sm">
          <SectionHeader icon={CalIcon} label="Schedule" />
          <div className="grid grid-cols-2 gap-2">
            <div><Label className={labelCls}>Date *</Label><Input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label className={labelCls}>Start time</Label><Input className={inputCls} type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          </div>
          <div><Label className={labelCls}>Duration (min)</Label><Input className={inputCls} type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 60)} /></div>
        </section>

        <section className="bg-card/80 border border-border rounded-xl p-4 mb-4 shadow-sm">
          <SectionHeader icon={FileText} label="Internal Notes" />
          <Textarea rows={3} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </section>

        <div className="fixed bottom-[64px] lg:bottom-0 left-0 right-0 lg:left-[240px] z-50 bg-background/95 backdrop-blur-md border-t border-border p-3 flex gap-2 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <Button variant="outline" className="flex-1" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Create Job"}</Button>
        </div>
      </div>
    </PlatformLayout>
  );
}