import { describe, it, expect } from "vitest";
import { arboristReviewSummary, newArboristQuote, newArboristTree, priceCents, quoteTotals, totalLabel, validateArboristQuote } from "@/lib/arborist-quotes";

describe("arborist field report prices and validation", () => {
  it("adds mixed fixed prices and ranges exactly, without treating missing prices as zero", () => {
    const trees = [
      { ...newArboristTree(), priceMin: "600.10" },
      { ...newArboristTree(), priceType: "range" as const, priceMin: "300.20", priceMax: "400.20" },
      { ...newArboristTree(), priceType: "unsure" as const, priceMin: "999" },
      newArboristTree(),
    ];
    expect(quoteTotals(trees)).toEqual({ min: 90030, max: 100030, unpriced: 2 });
    expect(totalLabel(trees)).toBe("$900.30 – $1,000.30");
    expect(totalLabel([newArboristTree()])).toBe("Price not set");
    expect(quoteTotals([{ ...newArboristTree(), priceMin: "0" }])).toEqual({ min: 0, max: 0, unpriced: 0 });
  });
  it("rejects reversed ranges, negative, malformed, and over-precision prices", () => {
    for (const bad of ["-1", "1e3", "NaN", "0.001", "1,000", "10000000"]) expect(priceCents(bad)).toBeNull();
    const report = newArboristQuote("business", "author");
    report.trees[0] = { ...report.trees[0], priceType: "range", priceMin: "700", priceMax: "500" };
    expect(validateArboristQuote(report, false)).toContain("Tree 1: the high price must be at least the low price.");
  });
  it("permits incomplete drafts but requires each tree's scope, discussion, and photo to submit", () => {
    const report = newArboristQuote("business", "author");
    expect(validateArboristQuote(report, false)).toEqual([]);
    const errors = validateArboristQuote(report, true);
    expect(errors).toContain("Enter the customer name.");
    expect(errors).toContain("Tree 1: add at least one photo.");
    expect(errors).toContain("Tree 1: add what you discussed with the customer.");
  });
  it("accepts an explicitly unpriced complete tree and labels the copy as internal", () => {
    const report = newArboristQuote("business", "author");
    Object.assign(report, { customer_name: "Example customer", property_address: "Example property", arborist_name: "Example arborist" });
    Object.assign(report.trees[0], { species: "Magnolia", service: "Limb removal", description: "Limbs over shed", customerDiscussion: "Keep the main tree", priceType: "unsure", photos: [{ id: "photo", path: "internal/photo", name: "Tree.jpg" }] });
    expect(validateArboristQuote(report, true)).toEqual([]);
    const summary = arboristReviewSummary(report);
    expect(summary).toContain("INTERNAL ARBORIST REVIEW");
    expect(summary).toContain("TREE 1 — Magnolia — Limb removal");
    expect(summary).toContain("Keep the main tree");
    expect(summary).toContain("1 tree(s) still need pricing");
    expect(summary).not.toContain("internal/photo");
  });
});
