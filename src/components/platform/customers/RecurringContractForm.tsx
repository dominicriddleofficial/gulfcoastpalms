import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, RefreshCw, Pause, Play, X } from "lucide-react";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";

interface RecurringContractFormProps {
  customerId: string;
  businessId: string;
}

interface Contract {
  id: string;
  service_type: string;
  palm_count: number | null;
  price_per_visit: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  next_scheduled_date: string | null;
  auto_renew: boolean;
  status: string;
}

const FREQ_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  biannual: "Bi-Annual",
  annual: "Annual",
};

const SERVICE_TYPES = [
  "Quarterly Trim",
  "Bi-Annual Trim",
  "Annual Trim",
  "Monthly Maintenance",
];

export default function RecurringContractForm({ customerId, businessId }: RecurringContractFormProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // New contract form
  const [serviceType, setServiceType] = useState("Quarterly Trim");
  const [palmCount, setPalmCount] = useState("");
  const [pricePerVisit, setPricePerVisit] = useState("");
  const [frequency, setFrequency] = useState("quarterly");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [contractLength, setContractLength] = useState("12");
  const [autoRenew, setAutoRenew] = useState(true);

  useEffect(() => {
    fetchContracts();
  }, [customerId, businessId]);

  const fetchContracts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("recurring_contracts")
      .select("*")
      .eq("customer_id", customerId)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    setContracts((data as Contract[]) || []);
    setLoading(false);
  };

  const getNextDate = (start: string, freq: string): string => {
    const d = new Date(start);
    switch (freq) {
      case "monthly": return format(addMonths(d, 1), "yyyy-MM-dd");
      case "quarterly": return format(addMonths(d, 3), "yyyy-MM-dd");
      case "biannual": return format(addMonths(d, 6), "yyyy-MM-dd");
      case "annual": return format(addMonths(d, 12), "yyyy-MM-dd");
      default: return format(addMonths(d, 3), "yyyy-MM-dd");
    }
  };

  const handleCreate = async () => {
    if (!pricePerVisit || Number(pricePerVisit) <= 0) { toast.error("Enter a price per visit"); return; }
    setSaving(true);
    const endDate = format(addMonths(new Date(startDate), Number(contractLength)), "yyyy-MM-dd");
    const { error } = await supabase.from("recurring_contracts").insert({
      customer_id: customerId,
      business_id: businessId,
      service_type: serviceType,
      palm_count: palmCount ? Number(palmCount) : null,
      price_per_visit: Number(pricePerVisit),
      frequency,
      start_date: startDate,
      end_date: endDate,
      next_scheduled_date: getNextDate(startDate, frequency),
      auto_renew: autoRenew,
      status: "active",
    });
    if (error) toast.error("Failed to create contract");
    else { toast.success("Contract created"); setShowAdd(false); fetchContracts(); }
    setSaving(false);
  };

  const toggleStatus = async (contract: Contract) => {
    const newStatus = contract.status === "active" ? "paused" : "active";
    await supabase.from("recurring_contracts").update({ status: newStatus }).eq("id", contract.id);
    toast.success(`Contract ${newStatus}`);
    fetchContracts();
  };

  if (loading) return <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-body text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <RefreshCw className="w-3 h-3" /> Recurring Contracts ({contracts.length})
        </p>
        <Button size="sm" variant="ghost" className="font-body text-[10px] text-primary h-6 px-2" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-3 h-3 mr-1" /> Add
        </Button>
      </div>

      {showAdd && (
        <div className="bg-secondary/50 border border-border rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-body text-[10px] text-muted-foreground mb-1 block">Service Type</label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="bg-card border-border font-body text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-body text-[10px] text-muted-foreground mb-1 block">Frequency</label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="bg-card border-border font-body text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQ_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-body text-[10px] text-muted-foreground mb-1 block"># Palms</label>
              <Input type="number" value={palmCount} onChange={e => setPalmCount(e.target.value)}
                placeholder="e.g. 12" className="bg-card border-border font-body text-xs h-8" />
            </div>
            <div>
              <label className="font-body text-[10px] text-muted-foreground mb-1 block">Price/Visit</label>
              <Input type="number" value={pricePerVisit} onChange={e => setPricePerVisit(e.target.value)}
                placeholder="$0.00" className="bg-card border-border font-body text-xs h-8" />
            </div>
            <div>
              <label className="font-body text-[10px] text-muted-foreground mb-1 block">Length (months)</label>
              <Select value={contractLength} onValueChange={setContractLength}>
                <SelectTrigger className="bg-card border-border font-body text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">1 year</SelectItem>
                  <SelectItem value="24">2 years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-body text-[10px] text-muted-foreground mb-1 block">Start Date</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="bg-card border-border font-body text-xs h-8" />
            </div>
            <div className="flex items-center justify-between pt-4">
              <label className="font-body text-[10px] text-muted-foreground">Auto-Renew</label>
              <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 font-body text-xs" onClick={handleCreate} disabled={saving}>
              {saving ? "Creating…" : "Create Contract"}
            </Button>
            <Button size="sm" variant="ghost" className="font-body text-xs" onClick={() => setShowAdd(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {contracts.length === 0 && !showAdd && (
        <p className="font-body text-sm text-muted-foreground/60">No recurring contracts</p>
      )}

      {contracts.map(c => (
        <div key={c.id} className="bg-card border border-border rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-body text-sm font-medium text-foreground">{c.service_type}</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-body font-medium ${
                c.status === "active" ? "bg-green-500/15 text-green-500" :
                c.status === "paused" ? "bg-amber-500/15 text-amber-500" :
                "bg-muted text-muted-foreground"
              }`}>
                {c.status}
              </span>
            </div>
            <button onClick={() => toggleStatus(c)} className="text-muted-foreground hover:text-foreground transition-colors">
              {c.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="font-body text-[11px] text-muted-foreground space-y-0.5">
            <p>{FREQ_LABELS[c.frequency] || c.frequency} · ${Number(c.price_per_visit).toFixed(2)}/visit{c.palm_count ? ` · ${c.palm_count} palms` : ""}</p>
            <p>{c.start_date} → {c.end_date || "Ongoing"}{c.auto_renew ? " · Auto-renew" : ""}</p>
            {c.next_scheduled_date && <p className="text-primary">Next: {c.next_scheduled_date}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
