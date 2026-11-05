import { describe, it, expect } from "vitest";
import { arboristQuoteDraft, disposalAmounts, recommendedCents } from "@/lib/arborist-to-quote";
import { emptyReportPricing, newArboristTree, type PriceRecommendation } from "@/lib/arborist-quotes";
import { computeOptionTotals, defaultSelection, includedForDownstream, type OptionLine } from "@/lib/quote-options";
const range = (a: string, b: string): PriceRecommendation => ({ priceType: "range", priceMin: a, priceMax: b });
describe("office-controlled report pricing", () => {
  it("preserves fixed cents", () => expect(recommendedCents({ priceType: "fixed", priceMin: "123.45", priceMax: "" })).toBe(12345));
  it("rounds odd-cent arithmetic midpoints half up", () => expect(recommendedCents(range("1.00", "1.01"))).toBe(101));
  it("flags missing/reversed/zero recommendations rather than inventing prices", () => {
    for (const r of [range("", "100"), range("100", "50"), range("0", "0")]) expect(recommendedCents(r)).toBeNull();
  });
  it("whole-job amount replaces priced trees, while additional hauling stays separate", () => {
    const pricing = { ...emptyReportPricing(), basis: "whole_job" as const, wholeJob: range("6000", "7000"), haulAway: { priceType: "fixed" as const, priceMin: "1000", priceMax: "" } };
    const draft = arboristQuoteDraft({ trees: [{ ...newArboristTree(), priceMin: "9999" }], property_address: "1 Main", pricing });
    expect(draft.lines.map(l => l.fixedPrice)).toEqual(["6500.00", "1000.00"]);
    expect(draft.disposal?.haul).toBe(750000);
  });
  it("keeps individual missing tree prices flagged for additional-charge reports", () => {
    const draft = arboristQuoteDraft({ trees: [newArboristTree(), { ...newArboristTree(), priceMin: "250" }], property_address: "", pricing: emptyReportPricing() });
    expect(draft.lines.map(l => l.fixedPrice)).toEqual([null, "250.00", null]);
  });
  it("complete recommendations make one hauling draft at 7500, never 6500+7500+trees", () => {
    const pricing = { ...emptyReportPricing(), disposalBasis: "complete" as const, haulAway: range("7000", "8000"), roadside: range("6000", "7000") };
    const draft = arboristQuoteDraft({ trees: [{ ...newArboristTree(), priceMin: "2000", customerDiscussion: "private" }], property_address: "1 Main", pricing });
    expect(draft.lines).toHaveLength(1); expect(draft.lines[0].fixedPrice).toBe("7500.00");
    expect(draft.lines[0].description).not.toMatch(/roadside|private|7000|8000/i);
    expect(draft.disposal?.road).toBe(650000);
  });
  it("does not guess missing complete alternative amounts", () => {
    const pricing = { ...emptyReportPricing(), disposalBasis: "complete" as const, haulAway: range("7000", "8000") };
    expect(arboristQuoteDraft({ trees: [newArboristTree()], property_address: "", pricing }).disposal?.road).toBeNull();
  });
  const choiceLines = (): OptionLine[] => {
    const a = disposalAmounts(750000, 650000);
    return [{ id: "base", description: "Tree work", quantity: 1, unit_price: a.base / 100, option_kind: "required" },
      { id: "haul", description: "Haul-away", quantity: 1, unit_price: a.haulDelta / 100, option_kind: "alternative", option_group: "Disposal", default_selected: true },
      { id: "road", description: "Roadside", quantity: 1, unit_price: a.roadDelta / 100, option_kind: "alternative", option_group: "Disposal", default_selected: false }];
  };
  it("explicit alternatives total 6500 or 7500 and default only to hauling", () => {
    const l = choiceLines(); expect(defaultSelection(l)).toEqual(["haul"]);
    expect(computeOptionTotals(l, ["road"], { taxRate: 0, discountTotal: 0 }).total).toBe(6500);
    expect(computeOptionTotals(l, ["haul"], { taxRate: 0, discountTotal: 0 }).total).toBe(7500);
  });
  it("tax/discount apply once to the selected complete total", () => {
    expect(computeOptionTotals(choiceLines(), ["road"], { taxRate: 7, discountTotal: 100 }).total).toBe(6855);
    expect(computeOptionTotals(choiceLines(), ["haul"], { taxRate: 7, discountTotal: 100 }).total).toBe(7925);
  });
  it("invoice scope includes selected choice only", () => {
    const accepted = choiceLines().map(l => ({ ...l, customer_selected: l.id === "road" }));
    expect(includedForDownstream(accepted).map(l => l.id)).toEqual(["base", "road"]);
  });
});