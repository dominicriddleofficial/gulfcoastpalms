import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  Layers3,
  ChevronLeft,
  ChevronDown,
  AlertTriangle,
  RotateCcw,
  Save,
  History,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildChecklist,
  computeAutoQuantities,
  type ChecklistItemState,
  type SystemType,
  flakeProcess,
  metallicProcess,
} from "@/lib/job-checklist-templates";

const PPS_SHORTCODE = "PPS";

interface SavedChecklist {
  id: string;
  system_type: SystemType;
  job_name: string | null;
  customer: string | null;
  job_date: string | null;
  square_footage: number | null;
  items: ChecklistItemState[];
  completed: boolean;
  created_at: string;
}

export default function PlatformJobChecklists() {
  const auth = usePlatformAuth();
  const navigate = useNavigate();

  const selectedBiz = auth.businesses.find((b) => b.id === auth.selectedBusinessId);
  const isPPS = selectedBiz?.shortcode === PPS_SHORTCODE;

  // Hard gate: redirect away if active workspace is not PPS
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.selectedBusinessId) return;
    if (!isPPS) navigate("/platform", { replace: true });
  }, [auth.loading, auth.selectedBusinessId, isPPS, navigate]);

  const [activeSystem, setActiveSystem] = useState<SystemType | null>(null);

  if (!isPPS) {
    return (
      <PlatformLayout>
        <div className="text-sm text-muted-foreground">Loading…</div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout>
      {activeSystem ? (
        <ChecklistDetail
          system={activeSystem}
          businessId={auth.selectedBusinessId!}
          onBack={() => setActiveSystem(null)}
        />
      ) : (
        <ChecklistChooser
          onChoose={setActiveSystem}
          businessId={auth.selectedBusinessId!}
        />
      )}
    </PlatformLayout>
  );
}

/* ----------------------------- Chooser screen ----------------------------- */

function ChecklistChooser({
  onChoose,
  businessId,
}: {
  onChoose: (s: SystemType) => void;
  businessId: string;
}) {
  const [history, setHistory] = useState<SavedChecklist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("job_checklists")
        .select("id, system_type, job_name, customer, job_date, square_footage, items, completed, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) {
        setHistory((data as unknown as SavedChecklist[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
          Job Checklists
        </h2>
        <p className="font-body text-sm text-muted-foreground mt-1">
          Pre-load checklists for the trailer. Pick a system to begin.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SystemCard
          title="Flake Floor System"
          subtitle="2-day process"
          icon={<Sparkles className="w-7 h-7" />}
          onClick={() => onChoose("flake")}
        />
        <SystemCard
          title="Metallic Floor System"
          subtitle="4-day process"
          icon={<Layers3 className="w-7 h-7" />}
          onClick={() => onChoose("metallic")}
        />
      </div>

      <div className="space-y-3 pt-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">
            Recent checklists
          </h3>
        </div>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No checklists yet. Saved checklists will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <Card
                key={h.id}
                className="px-4 py-3 flex items-center justify-between bg-card/60 border-border"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
                        h.system_type === "flake"
                          ? "bg-primary/10 text-primary"
                          : "bg-accent/15 text-accent-foreground"
                      )}
                    >
                      {h.system_type}
                    </span>
                    <p className="font-body text-sm text-foreground truncate">
                      {h.job_name || "Untitled job"}
                    </p>
                    {h.completed && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {h.customer || "—"}
                    {h.job_date ? ` · ${h.job_date}` : ""}
                    {h.square_footage ? ` · ${h.square_footage} sq ft` : ""}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(h.created_at).toLocaleDateString()}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SystemCard({
  title,
  subtitle,
  icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group text-left rounded-2xl p-6 bg-card/70 border border-border",
        "transition-all duration-200 hover:border-primary/40 hover:bg-card hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]",
        "active:scale-[0.99]"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          {icon}
        </div>
        <ChevronLeft className="w-4 h-4 rotate-180 text-muted-foreground/50 group-hover:text-primary transition-colors" />
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight text-foreground mt-5">
        {title}
      </h3>
      <p className="font-body text-xs text-muted-foreground mt-1 uppercase tracking-wide">
        {subtitle}
      </p>
    </button>
  );
}

/* ----------------------------- Detail screen ----------------------------- */

function ChecklistDetail({
  system,
  businessId,
  onBack,
}: {
  system: SystemType;
  businessId: string;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [jobName, setJobName] = useState("");
  const [customer, setCustomer] = useState("");
  const [jobDate, setJobDate] = useState("");
  const [sqftStr, setSqftStr] = useState("");
  const sqft = Number(sqftStr) || 0;

  const auto = useMemo(() => computeAutoQuantities(system, sqft), [system, sqft]);

  const [items, setItems] = useState<ChecklistItemState[]>(() => buildChecklist(system));
  const [saving, setSaving] = useState(false);

  // Apply auto-calculated quantities when sqft changes
  useEffect(() => {
    setItems((prev) =>
      prev.map((it) => {
        if (!it.autoKey) return it;
        const newQty = auto[it.autoKey];
        if (newQty == null) return it;
        return { ...it, quantity: newQty };
      })
    );
  }, [auto]);

  const total = items.length;
  const checked = items.filter((i) => i.checked).length;
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

  const sections = useMemo(() => {
    const map = new Map<string, ChecklistItemState[]>();
    for (const it of items) {
      const arr = map.get(it.section) ?? [];
      arr.push(it);
      map.set(it.section, arr);
    }
    return Array.from(map.entries());
  }, [items]);

  const updateItem = (id: string, patch: Partial<ChecklistItemState>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const reset = () => {
    setItems(buildChecklist(system));
    setJobName("");
    setCustomer("");
    setJobDate("");
    setSqftStr("");
    toast({ title: "Checklist reset", description: "Ready for the next job." });
  };

  const save = async (markCompleted: boolean) => {
    setSaving(true);
    const { error } = await supabase.from("job_checklists").insert([
      {
        business_id: businessId,
        system_type: system,
        job_name: jobName || null,
        customer: customer || null,
        job_date: jobDate || null,
        square_footage: sqft || null,
        items: items as unknown as never,
        completed: markCompleted,
      },
    ]);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: markCompleted ? "Saved to job history" : "Checklist saved",
      description: jobName || "Untitled job",
    });
    if (markCompleted) onBack();
  };

  const title = system === "flake" ? "Flake Floor System" : "Metallic Floor System";
  const subtitle = system === "flake" ? "2-day process" : "4-day process";
  const process = system === "flake" ? flakeProcess : metallicProcess;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground truncate">
            {title}
          </h2>
          <p className="font-body text-[11px] uppercase tracking-wide text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Job info */}
      <Card className="p-4 bg-card/70 border-border space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Job Name</Label>
            <Input value={jobName} onChange={(e) => setJobName(e.target.value)} placeholder="e.g. Smith Garage" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Customer</Label>
            <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input type="date" value={jobDate} onChange={(e) => setJobDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Square Footage</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={sqftStr}
              onChange={(e) => setSqftStr(e.target.value)}
              placeholder="e.g. 600"
            />
          </div>
        </div>

        {sqft > 0 && (
          <div className="rounded-lg bg-primary/5 border border-primary/15 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-primary/80 font-semibold mb-1">
              Recommended kits for {sqft} sq ft
            </p>
            <ul className="text-xs text-foreground/90 space-y-0.5">
              {(Object.entries(auto) as Array<[string, number]>).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{labelForAutoKey(k)}</span>
                  <span className="font-semibold text-primary">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Progress */}
      <Card className="p-4 bg-card/70 border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="font-body text-xs uppercase tracking-wide text-muted-foreground">
            Progress
          </span>
          <span className="font-display text-sm font-semibold text-foreground">
            {checked} / {total} <span className="text-muted-foreground font-normal">({pct}%)</span>
          </span>
        </div>
        <Progress value={pct} className="h-2" />
      </Card>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map(([section, secItems]) => {
          const isWarn = section === "EASY TO FORGET";
          return (
            <Card
              key={section}
              className={cn(
                "p-4 border-border",
                isWarn
                  ? "bg-amber-500/[0.06] border-amber-500/30"
                  : "bg-card/70"
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                {isWarn && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                <h3 className={cn(
                  "font-display text-[11px] font-semibold uppercase tracking-[0.14em]",
                  isWarn ? "text-amber-300" : "text-muted-foreground"
                )}>
                  {section}
                </h3>
              </div>
              <div className="space-y-1">
                {secItems.map((it) => (
                  <ChecklistRow
                    key={it.id}
                    item={it}
                    onChange={(patch) => updateItem(it.id, patch)}
                  />
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Day-by-day process */}
      <Collapsible>
        <Card className="bg-card/70 border-border">
          <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between text-left">
            <span className="font-display text-sm font-semibold text-foreground">
              Day-by-day process
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
              {process.map((day) => (
                <div key={day.label}>
                  <p className="font-display text-xs font-semibold uppercase tracking-wide text-primary mb-1.5">
                    {day.label}
                  </p>
                  <ol className="text-sm text-foreground/85 space-y-1 list-decimal list-inside">
                    {day.steps.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2 sticky bottom-20 lg:static z-10">
        <Button
          variant="outline"
          onClick={reset}
          className="flex-1 border-border"
        >
          <RotateCcw className="w-4 h-4 mr-2" /> Reset Checklist
        </Button>
        <Button
          variant="outline"
          onClick={() => save(false)}
          disabled={saving}
          className="flex-1 border-border"
        >
          <Save className="w-4 h-4 mr-2" /> Save draft
        </Button>
        <Button
          onClick={() => save(true)}
          disabled={saving}
          className="flex-1"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" /> Save to job history
        </Button>
      </div>
    </div>
  );
}

function ChecklistRow({
  item,
  onChange,
}: {
  item: ChecklistItemState;
  onChange: (patch: Partial<ChecklistItemState>) => void;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-150",
      item.checked ? "opacity-50" : "hover:bg-secondary/40"
    )}>
      <Checkbox
        checked={item.checked}
        onCheckedChange={(v) => onChange({ checked: v === true })}
        className="h-5 w-5"
      />
      <label
        className={cn(
          "flex-1 text-sm text-foreground cursor-pointer select-none transition-all",
          item.checked && "line-through text-muted-foreground"
        )}
        onClick={() => onChange({ checked: !item.checked })}
      >
        {item.label}
        {item.autoKey && (
          <span className="ml-1.5 text-[10px] uppercase tracking-wide text-primary/70">auto</span>
        )}
      </label>
      {item.hasQuantity && (
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          value={item.quantity ?? ""}
          onChange={(e) =>
            onChange({ quantity: e.target.value === "" ? null : Number(e.target.value) })
          }
          onClick={(e) => e.stopPropagation()}
          className="w-16 h-8 text-center text-sm"
          placeholder="#"
        />
      )}
      {item.hasColorField && (
        <Input
          type="text"
          value={item.colorValue ?? ""}
          onChange={(e) => onChange({ colorValue: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          className="w-28 h-8 text-sm"
          placeholder="Color"
        />
      )}
    </div>
  );
}

function labelForAutoKey(k: string): string {
  switch (k) {
    case "xpsKits": return "XPS Polyaspartic kits";
    case "flakeBoxes": return "Flake boxes";
    case "groutCoatKits": return "Grout coat kits";
    case "baseCoatKits": return "Base coat kits";
    case "metallicPigmentKits": return "Metallic pigment kits";
    case "topCoatKits": return "T-200 top coat kits";
    default: return k;
  }
}