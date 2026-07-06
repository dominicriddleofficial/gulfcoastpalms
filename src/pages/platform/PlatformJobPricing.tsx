import { todayLocalKey } from "@/lib/localDate";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Layers3, Sparkles, Copy, Save, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const PPS_SHORTCODE = "PPS";

type SystemType = "flake" | "metallic";

interface LineItem {
  label: string;
  detail?: string;
  amount: number;
  section: "Materials" | "Rentals" | "Miscellaneous";
}

interface EstimateResult {
  lineItems: LineItem[];
  totalCost: number;
  minPrice: number;
  standardPrice: number;
  premiumPrice: number;
}

const ceilDiv = (a: number, b: number) => Math.max(0, Math.ceil(a / b));
const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function computeFlake(sqft: number): EstimateResult {
  const items: LineItem[] = [];
  const baseKits = ceilDiv(sqft, 300);
  items.push({
    section: "Materials",
    label: "XPS Polyaspartic base coat kits",
    detail: `${baseKits} kit${baseKits === 1 ? "" : "s"} (1 kit / 300 sq ft)`,
    amount: baseKits * 175,
  });
  const flakeBoxes = ceilDiv(sqft, 250) * 1; // 2 boxes per 500 = 1 box per 250
  // priced at $100 per 2 boxes = $50/box
  items.push({
    section: "Materials",
    label: "Flake boxes",
    detail: `${flakeBoxes} box${flakeBoxes === 1 ? "" : "es"} (2 / 500 sq ft)`,
    amount: flakeBoxes * 50,
  });
  const topKits = sqft > 400 ? 2 : ceilDiv(sqft, 500);
  items.push({
    section: "Materials",
    label: "Polyaspartic top coat",
    detail: `${topKits} kit${topKits === 1 ? "" : "s"}${sqft > 400 ? " (over 400 sq ft → 2 kits)" : ""}`,
    amount: topKits * 150,
  });
  items.push({
    section: "Rentals",
    label: "Walk-behind grinder (Sunbelt)",
    amount: 200,
  });
  items.push({
    section: "Rentals",
    label: "Sander",
    detail: "Not required for flake system",
    amount: 0,
  });
  items.push({
    section: "Miscellaneous",
    label: "Tape, resin paper, acetone, denatured alcohol, bonnet pads, chip brushes",
    amount: 275,
  });

  const totalCost = items.reduce((s, i) => s + i.amount, 0);
  return {
    lineItems: items,
    totalCost,
    minPrice: totalCost * 2.5,
    standardPrice: totalCost * 3,
    premiumPrice: totalCost * 3.5,
  };
}

function computeMetallic(sqft: number, whiteBase: boolean): EstimateResult {
  const items: LineItem[] = [];
  const lotionKits = ceilDiv(sqft, 500);
  items.push({
    section: "Materials",
    label: "Lotion / grout coat",
    detail: `${lotionKits} kit${lotionKits === 1 ? "" : "s"} (1 / 500 sq ft)`,
    amount: lotionKits * 150,
  });
  const baseRaw = ceilDiv(sqft, 300);
  const baseKits = whiteBase ? baseRaw * 2 : baseRaw;
  items.push({
    section: "Materials",
    label: "Base coat kits",
    detail: `${baseKits} kit${baseKits === 1 ? "" : "s"}${whiteBase ? " (white = double base coat)" : ""}`,
    amount: baseKits * 150,
  });
  // 6 kits per 500 sq ft proportionally → ceil(sqft * 6 / 500)
  const pigmentKits = Math.max(1, Math.ceil((sqft * 6) / 500));
  items.push({
    section: "Materials",
    label: "Metallic pigment kits",
    detail: `${pigmentKits} kit${pigmentKits === 1 ? "" : "s"} (6 / 500 sq ft)`,
    amount: pigmentKits * 150,
  });
  const topKits = ceilDiv(sqft, 500);
  items.push({
    section: "Materials",
    label: "T-200 top coat",
    detail: `${topKits} kit${topKits === 1 ? "" : "s"} (1 / 500 sq ft)`,
    amount: topKits * 200,
  });
  items.push({
    section: "Materials",
    label: "Thixo (crack filler)",
    amount: 50,
  });
  items.push({ section: "Rentals", label: "Walk-behind grinder (Sunbelt)", amount: 200 });
  items.push({ section: "Rentals", label: "Sander", amount: 100 });
  items.push({
    section: "Miscellaneous",
    label: "Tape, resin paper, acetone, denatured alcohol, bonnet pads, chip brushes",
    amount: 275,
  });

  const totalCost = items.reduce((s, i) => s + i.amount, 0);
  return {
    lineItems: items,
    totalCost,
    minPrice: totalCost * 2.5,
    standardPrice: totalCost * 3,
    premiumPrice: totalCost * 3.5,
  };
}

export default function PlatformJobPricing() {
  const auth = usePlatformAuth();
  const navigate = useNavigate();

  const selectedBiz = auth.businesses.find((b) => b.id === auth.selectedBusinessId);
  const isPPS = selectedBiz?.shortcode === PPS_SHORTCODE;

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
        <EstimatorView
          system={activeSystem}
          businessId={auth.selectedBusinessId!}
          onBack={() => setActiveSystem(null)}
        />
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Job Pricing</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Quick cost estimators for epoxy floor systems. Enter square footage, get materials cost and suggested pricing.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PickerCard
              icon={<Sparkles className="w-5 h-5" />}
              title="Flake Floor Estimate"
              description="XPS polyaspartic base, flake broadcast, polyaspartic top coat."
              onClick={() => setActiveSystem("flake")}
            />
            <PickerCard
              icon={<Layers3 className="w-5 h-5" />}
              title="Metallic Floor Estimate"
              description="Grout coat, base, metallic pigment, T-200 top coat."
              onClick={() => setActiveSystem("metallic")}
            />
          </div>
        </div>
      )}
    </PlatformLayout>
  );
}

function PickerCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left group"
    >
      <Card className="p-5 bg-card/60 border-border/60 hover:border-primary/60 hover:bg-card transition-all">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            {icon}
          </div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </Card>
    </button>
  );
}

function EstimatorView({
  system,
  businessId,
  onBack,
}: {
  system: SystemType;
  businessId: string;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [sqft, setSqft] = useState<number>(400);
  const [customer, setCustomer] = useState("");
  const [date, setDate] = useState(() => todayLocalKey());
  const [whiteBase, setWhiteBase] = useState(false);
  const [saving, setSaving] = useState(false);

  const result = useMemo<EstimateResult>(() => {
    const s = Math.max(0, Number.isFinite(sqft) ? sqft : 0);
    return system === "flake" ? computeFlake(s) : computeMetallic(s, whiteBase);
  }, [system, sqft, whiteBase]);

  const grouped = useMemo(() => {
    const sections: Record<string, LineItem[]> = { Materials: [], Rentals: [], Miscellaneous: [] };
    for (const i of result.lineItems) sections[i.section].push(i);
    return sections;
  }, [result]);

  const buildSummary = () => {
    const lines: string[] = [];
    lines.push(`${system === "flake" ? "FLAKE" : "METALLIC"} FLOOR ESTIMATE`);
    if (customer) lines.push(`Customer: ${customer}`);
    if (date) lines.push(`Date: ${date}`);
    lines.push(`Square footage: ${sqft} sq ft`);
    if (system === "metallic") lines.push(`White base coat: ${whiteBase ? "Yes" : "No"}`);
    lines.push("");
    for (const section of ["Materials", "Rentals", "Miscellaneous"] as const) {
      lines.push(section.toUpperCase());
      for (const it of grouped[section]) {
        lines.push(`  • ${it.label}${it.detail ? ` — ${it.detail}` : ""}: ${fmt(it.amount)}`);
      }
      lines.push("");
    }
    lines.push(`TOTAL MATERIAL COST: ${fmt(result.totalCost)}`);
    lines.push("");
    lines.push("SUGGESTED PRICING");
    lines.push(`  Minimum (×2.5): ${fmt(result.minPrice)}  →  profit ${fmt(result.minPrice - result.totalCost)}`);
    lines.push(`  Standard (×3): ${fmt(result.standardPrice)}  →  profit ${fmt(result.standardPrice - result.totalCost)}`);
    lines.push(`  Premium (×3.5): ${fmt(result.premiumPrice)}  →  profit ${fmt(result.premiumPrice - result.totalCost)}`);
    return lines.join("\n");
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildSummary());
      toast({ title: "Estimate copied", description: "Paste it anywhere." });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard not available.", variant: "destructive" });
    }
  };

  const onSave = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (!userId) {
      toast({ title: "Not signed in", variant: "destructive" });
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("pps_job_estimates").insert([{
      business_id: businessId,
      created_by: userId,
      system_type: system,
      customer_name: customer || null,
      job_date: date || null,
      square_footage: sqft,
      options: system === "metallic" ? { white_base_coat: whiteBase } : {},
        line_items: result.lineItems as unknown as never,
      total_cost: result.totalCost,
      suggested_min_price: result.minPrice,
      suggested_standard_price: result.standardPrice,
      suggested_premium_price: result.premiumPrice,
    }]);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Estimate saved" });
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-4 h-4" /> Back to estimators
      </button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {system === "flake" ? "Flake Floor Estimate" : "Metallic Floor Estimate"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter square footage to auto-calculate materials and suggested pricing.
        </p>
      </div>

      {/* Inputs */}
      <Card className="p-4 bg-card/60 border-border/60 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="sqft">Square footage</Label>
            <Input
              id="sqft"
              type="number"
              inputMode="numeric"
              min={0}
              value={Number.isFinite(sqft) ? sqft : 0}
              onChange={(e) => setSqft(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer">Customer name</Label>
            <Input
              id="customer"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        {system === "metallic" && (
          <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">White base coat?</p>
              <p className="text-xs text-muted-foreground">Doubles base coat kits required.</p>
            </div>
            <Switch checked={whiteBase} onCheckedChange={setWhiteBase} />
          </div>
        )}
      </Card>

      {/* Line items — invoice style */}
      <Card className="p-4 bg-card/60 border-border/60">
        {(["Materials", "Rentals", "Miscellaneous"] as const).map((section) => (
          <div key={section} className="mb-4 last:mb-0">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
              {section}
            </h3>
            <ul className="divide-y divide-border/50">
              {grouped[section].map((it, idx) => (
                <li key={idx} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground font-medium">{it.label}</p>
                    {it.detail && (
                      <p className="text-xs text-muted-foreground mt-0.5">{it.detail}</p>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums shrink-0",
                      it.amount === 0 ? "text-muted-foreground" : "text-foreground"
                    )}
                  >
                    {fmt(it.amount)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Total material cost
          </span>
          <span className="text-2xl font-bold tabular-nums text-foreground">{fmt(result.totalCost)}</span>
        </div>
      </Card>

      {/* Pricing tiers */}
      <div className="grid gap-3 sm:grid-cols-3">
        <PriceTierCard
          label="Minimum"
          multiplier="× 2.5"
          price={result.minPrice}
          cost={result.totalCost}
        />
        <PriceTierCard
          label="Standard"
          multiplier="× 3"
          price={result.standardPrice}
          cost={result.totalCost}
          highlight
        />
        <PriceTierCard
          label="Premium"
          multiplier="× 3.5"
          price={result.premiumPrice}
          cost={result.totalCost}
        />
      </div>

      {system === "metallic" && (
        <Card className="p-4 bg-muted/30 border-dashed border-border/60">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Sanity check:</span> 400 sq ft premium metallic ≈ $2,100 materials + $200 grinder + $100 sander + $275 misc ≈ <span className="font-semibold text-foreground">$2,675 total cost</span>. Standard metallic ≈ $1,900 materials.
          </p>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
        <Button variant="outline" onClick={onCopy} className="gap-2">
          <Copy className="w-4 h-4" /> Copy estimate
        </Button>
        <Button onClick={onSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save estimate"}
        </Button>
      </div>
    </div>
  );
}

function PriceTierCard({
  label,
  multiplier,
  price,
  cost,
  highlight,
}: {
  label: string;
  multiplier: string;
  price: number;
  cost: number;
  highlight?: boolean;
}) {
  const profit = price - cost;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  return (
    <Card
      className={cn(
        "p-4 border-border/60",
        highlight ? "bg-primary/10 border-primary/40" : "bg-card/60"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">{multiplier}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{fmt(price)}</p>
      <div className="mt-3 flex items-center gap-1.5 text-sm">
        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
        <span className="font-semibold text-emerald-500 tabular-nums">{fmt(profit)}</span>
        <span className="text-muted-foreground">profit · {margin.toFixed(0)}% margin</span>
      </div>
    </Card>
  );
}
