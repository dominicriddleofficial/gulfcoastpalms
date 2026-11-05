import { money, priceCents, emptyReportPricing, type PriceRecommendation, type ArboristQuote } from "@/lib/arborist-quotes";

export interface ArboristDraftLine {
  description: string;
  /** Staff-only reference; never written to the customer quote. */
  suggestion: string;
  /** Exact suggested fixed value, or deterministic range midpoint. Null means office input required. */
  fixedPrice: string | null;
}

export const DISPOSAL_GROUP = "Haul-away / roadside";
export function recommendedCents(value: PriceRecommendation): number | null {
  if (value.priceType === "unsure") return null;
  const low = priceCents(value.priceMin);
  const high = value.priceType === "fixed" ? low : priceCents(value.priceMax);
  if (low === null || high === null || high < low || low <= 0) return null;
  return Math.floor((low + high + 1) / 2);
}
const reference = (value: PriceRecommendation) => {
  const cents = recommendedCents(value);
  return cents === null ? "Price missing or ambiguous — office entry required."
    : value.priceType === "range" ? `${money(priceCents(value.priceMin) ?? 0)}–${money(priceCents(value.priceMax) ?? 0)}; midpoint = ${money(cents)} (nearest cent, half up).`
    : `Fixed recommendation ${money(cents)}.`;
};
export interface DisposalDraft { haul: number | null; road: number | null; scope: string; conditions: string; reference: string }
/** Required base plus nonnegative deltas: complete totals are never added twice. */
export function disposalAmounts(haul: number, road: number) {
  const base = Math.min(haul, road);
  return { base, haulDelta: haul - base, roadDelta: road - base };
}

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

/**
 * Deterministic, customer-facing line drafts from a submitted field report.
 * Uses only species, requested work, location and the work description. Customer
 * discussion, suggested prices, general notes, arborist name and photos are never copied.
 */
export function arboristQuoteDraft(report: Pick<ArboristQuote, "trees" | "property_address" | "pricing">) {
  const lines: ArboristDraftLine[] = report.trees.map((tree, index) => {
    const work = clean(tree.service) || "Tree work";
    const species = clean(tree.species);
    const location = clean(tree.location);
    const detail = clean(tree.description);
    const head = `Tree ${index + 1}: ${work}${species ? ` — ${species}` : ""}${location ? ` (${location})` : ""}`;
    const cents = recommendedCents(tree);
    const suggestion = reference(tree);
    return {
      description: detail ? `${head}. ${detail}` : head,
      suggestion,
      fixedPrice: cents === null ? null : (cents / 100).toFixed(2),
    };
  });
  const address = clean(report.property_address);
  const scope = [address ? `Tree work at ${address}.` : "", ...lines.map(l => l.description)].filter(Boolean).join("\n");
  const pricing = report.pricing;
  // Legacy reports retain their per-tree scope and do not invent disposal charges.
  if (!pricing) return { lines, scope: address ? `Tree work at ${address}.` : "", disposal: undefined };
  const p = { ...emptyReportPricing(), ...pricing };
  const whole = recommendedCents(p.wholeJob);
  const workLines = p.basis === "whole_job"
    ? [{ description: "All listed tree work — whole job", suggestion: reference(p.wholeJob), fixedPrice: whole === null ? null : (whole / 100).toFixed(2) }]
    : lines;
  const base = p.basis === "whole_job" ? whole : lines.every(l => l.fixedPrice !== null)
    ? lines.reduce((sum, l) => sum + (priceCents(l.fixedPrice ?? "") ?? 0), 0) : null;
  const haulRecommendation = recommendedCents(p.haulAway), roadRecommendation = recommendedCents(p.roadside);
  const complete = (value: number | null) => p.disposalBasis === "complete" ? value : base === null || value === null ? null : base + value;
  const haul = complete(haulRecommendation), road = complete(roadRecommendation);
  const suggestion = `${p.disposalBasis === "complete" ? "Complete haul-away total" : "Base work plus additional haul-away"}: ${reference(p.haulAway)}${p.disposalBasis === "additional" ? ` Base: ${base === null ? "missing" : money(base)}.` : ""}`;
  // Additional disposal retains per-tree missing-price flags. A supplied complete
  // job total replaces every tree charge; it never requires pricing trees again.
  const draftLines = p.disposalBasis === "complete"
    ? [{ description: "All listed tree work with haul-away — complete job", suggestion, fixedPrice: haul === null ? null : (haul / 100).toFixed(2) }]
    : [...workLines, { description: "Haul-away — additional charge", suggestion: reference(p.haulAway), fixedPrice: haulRecommendation === null ? null : (haulRecommendation / 100).toFixed(2) }];
  return { scope, lines: draftLines,
    disposal: { haul, road, scope, conditions: p.roadsideConditions.trim(), reference: `Roadside ${p.disposalBasis === "complete" ? "complete job" : "additional charge"}: ${reference(p.roadside)}` } satisfies DisposalDraft };
}
