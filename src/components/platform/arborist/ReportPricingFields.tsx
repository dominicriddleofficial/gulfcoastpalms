import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { emptyReportPricing, type PriceRecommendation, type ReportPricing } from "@/lib/arborist-quotes";

const select = "min-h-11 rounded-md border border-input bg-background px-3 text-base text-foreground w-full";
export default function ReportPricingFields({ value, onChange }: { value?: ReportPricing; onChange: (value: ReportPricing) => void }) {
  const p = value ?? emptyReportPricing();
  const update = (patch: Partial<ReportPricing>) => onChange({ ...p, ...patch });
  const recommendation = (key: "wholeJob" | "haulAway" | "roadside", title: string) => {
    const r = p[key];
    const change = (patch: Partial<PriceRecommendation>) => update({ [key]: { ...r, ...patch } });
    return <fieldset className="space-y-3"><legend className="text-sm font-semibold mb-2">{title}</legend>
      <select aria-label={`${title} pricing`} className={select} value={r.priceType} onChange={e => change({ priceType: e.target.value as PriceRecommendation["priceType"] })}><option value="unsure">Not priced yet</option><option value="fixed">Fixed price</option><option value="range">Price range</option></select>
      {r.priceType !== "unsure" && <Input aria-label={`${title} low price`} inputMode="decimal" placeholder="Price ($)" value={r.priceMin} onChange={e => change({ priceMin: e.target.value })} />}
      {r.priceType === "range" && <Input aria-label={`${title} high price`} inputMode="decimal" placeholder="High price ($)" value={r.priceMax} onChange={e => change({ priceMax: e.target.value })} />}
    </fieldset>;
  };
  return <section aria-label="Whole-job and disposal pricing" className="space-y-5 border border-border bg-card p-4 sm:p-6 rounded-lg">
    <h2 className="text-lg font-semibold">Whole-job & disposal recommendations</h2>
    <label className="block space-y-2"><span className="text-sm">Work pricing basis</span><select className={select} value={p.basis} onChange={e => update({ basis: e.target.value as ReportPricing["basis"] })}><option value="per_tree">Sum per-tree work prices</option><option value="whole_job">One whole-job work price (replaces tree prices)</option></select></label>
    {p.basis === "whole_job" && recommendation("wholeJob", "Whole-job work")}
    <label className="block space-y-2"><span className="text-sm">Disposal amounts represent</span><select className={select} value={p.disposalBasis} onChange={e => update({ disposalBasis: e.target.value as ReportPricing["disposalBasis"] })}><option value="additional">Additional charge on top of work</option><option value="complete">Complete job totals including all work</option></select></label>
    <div className="grid sm:grid-cols-2 gap-5">{recommendation("haulAway", "Haul-away")}{recommendation("roadside", "Roadside")}</div>
    <label className="block space-y-2"><span className="text-sm">Roadside conditions for office review</span><Textarea maxLength={2000} value={p.roadsideConditions} onChange={e => update({ roadsideConditions: e.target.value })} /></label>
  </section>;
}