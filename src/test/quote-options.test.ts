import { describe, expect, it } from "vitest";
import { builderOptionErrors, computeOptionTotals, defaultSelection, includedForDownstream, selectionErrors, type OptionLine } from "@/lib/quote-options";
import { arboristQuoteDraft } from "@/lib/arborist-to-quote";
import type { ArboristTree } from "@/lib/arborist-quotes";

const lines: OptionLine[] = [
  { id: "r1", description: "Remove oak", quantity: 1, unit_price: 800, option_kind: "required", default_selected: true },
  { id: "h1", description: "Haul away", quantity: 1, unit_price: 250, option_kind: "alternative", option_group: "Debris handling", default_selected: true },
  { id: "h2", description: "Roadside placement", quantity: 1, unit_price: 100, option_kind: "alternative", option_group: "Debris handling", default_selected: false },
  { id: "s1", description: "Stump grinding", quantity: 1, unit_price: 150, option_kind: "optional", default_selected: false },
];

describe("customer quote options", () => {
  const extras: OptionLine[] = [
    { id: "base", description: "Removing branches and leaving base of trunk", quantity: 1, unit_price: 1300, option_kind: "required", default_selected: true },
    { id: "haul", description: "Haul-away", quantity: 1, unit_price: 200, option_kind: "optional", default_selected: false },
    { id: "stump", description: "Stump grinding", quantity: 1, unit_price: 100, option_kind: "optional", default_selected: false },
    { id: "trunk", description: "Cut remaining trunk down to ground level", quantity: 1, unit_price: 250, option_kind: "optional", default_selected: false },
  ];
  it.each([
    [[], 1300], [["haul"], 1500], [["stump"], 1400], [["trunk"], 1550],
    [["haul", "stump"], 1600], [["haul", "trunk"], 1750], [["stump", "trunk"], 1650], [["haul", "stump", "trunk"], 1850],
  ] as [string[], number][])("independent selection %j totals %s and bills only selected extras", (selected, total) => {
    expect(computeOptionTotals(extras, selected, { taxRate: 0, discountTotal: 0 }).total).toBe(total);
    expect(selectionErrors(extras, selected)).toEqual([]);
    expect(includedForDownstream(extras.map(l => ({ ...l, customer_selected: selected.includes(l.id) }))).map(l => l.id)).toEqual(["base", ...extras.filter(l => selected.includes(l.id)).map(l => l.id)]);
  });
  it("starts with no forced extra and requires a non-deselectable base", () => {
    expect(defaultSelection(extras)).toEqual([]);
    expect(builderOptionErrors(extras)).toEqual([]);
    expect(builderOptionErrors(extras.slice(1))).toEqual(["Add at least one required line of work."]);
    expect(selectionErrors(extras, ["base"]).length).toBeGreaterThan(0);
  });
  it("totals only required work plus chosen options, never every alternative", () => {
    expect(computeOptionTotals(lines, defaultSelection(lines), { taxRate: 0, discountTotal: 0 }).total).toBe(1050);
    expect(computeOptionTotals(lines, ["h2", "s1"], { taxRate: 0, discountTotal: 0 }).total).toBe(1050);
    expect(computeOptionTotals(lines, ["h2"], { taxRate: 0, discountTotal: 0 }).total).toBe(900);
  });
  it("requires exactly one choice per pick-one group", () => {
    expect(selectionErrors(lines, ["h1", "h2"]).length).toBeGreaterThan(0);
    expect(selectionErrors(lines, []).length).toBeGreaterThan(0);
    expect(selectionErrors(lines, ["h1"])).toEqual([]);
  });
  it("rejects option ids that don't belong to the quote", () => {
    expect(selectionErrors(lines, ["h1", "foreign-id"]).length).toBeGreaterThan(0);
  });
  it("builder blocks a pick-one group with only one choice or no group name", () => {
    expect(builderOptionErrors([lines[0], { ...lines[1] }]).length).toBeGreaterThan(0);
    expect(builderOptionErrors([lines[0], { ...lines[1], option_group: "" }, { ...lines[2], option_group: "" }]).length).toBeGreaterThan(0);
    expect(builderOptionErrors(lines)).toEqual([]);
  });
  it("invoices and jobs only include required and customer-chosen lines", () => {
    const accepted = lines.map(l => ({ ...l, customer_selected: l.id === "h2" }));
    expect(includedForDownstream(accepted).map(l => l.id)).toEqual(["r1", "h2"]);
  });
});

describe("arborist report to customer quote draft", () => {
  const tree = (over: Partial<ArboristTree>): ArboristTree => ({
    id: "t", species: "Live oak", service: "Removal", location: "Back yard", description: "Leaning over the house",
    priceType: "range", priceMin: "800", priceMax: "1200", customerDiscussion: "Customer wants it cheap", photos: [], ...over,
  } as ArboristTree);
  it("copies only species, work, location and description — never discussion or prices", () => {
    const draft = arboristQuoteDraft({ trees: [tree({})], property_address: "1 Main St" });
    expect(draft.lines[0].description).toBe("Tree 1: Removal — Live oak (Back yard). Leaning over the house");
    expect(draft.lines[0].description).not.toMatch(/cheap|\$|800/);
    expect(draft.scope).toBe("Tree work at 1 Main St.");
  });
  it("uses range midpoint while leaving unsure prices for office entry", () => {
    expect(arboristQuoteDraft({ trees: [tree({})], property_address: "" }).lines[0].fixedPrice).toBe("1000.00");
    expect(arboristQuoteDraft({ trees: [tree({ priceType: "unsure", priceMin: "" })], property_address: "" }).lines[0].fixedPrice).toBeNull();
    expect(arboristQuoteDraft({ trees: [tree({ priceType: "fixed", priceMin: "650" })], property_address: "" }).lines[0].fixedPrice).toBe("650.00");
  });
});
