import { money, priceCents, type ArboristQuote } from "@/lib/arborist-quotes";

export interface ArboristDraftLine {
  description: string;
  /** Staff-only reference; never written to the customer quote. */
  suggestion: string;
  /** Exact fixed price the arborist suggested, offered as a one-tap confirm. Null for ranges/unsure. */
  fixedPrice: string | null;
}

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

/**
 * Deterministic, customer-facing line drafts from a submitted field report.
 * Uses only species, requested work, location and the work description. Customer
 * discussion, suggested prices, general notes, arborist name and photos are never copied.
 */
export function arboristQuoteDraft(report: Pick<ArboristQuote, "trees" | "property_address">) {
  const lines: ArboristDraftLine[] = report.trees.map((tree, index) => {
    const work = clean(tree.service) || "Tree work";
    const species = clean(tree.species);
    const location = clean(tree.location);
    const detail = clean(tree.description);
    const head = `Tree ${index + 1}: ${work}${species ? ` — ${species}` : ""}${location ? ` (${location})` : ""}`;
    const low = priceCents(tree.priceMin), high = priceCents(tree.priceMax);
    const suggestion = tree.priceType === "unsure" || low === null
      ? "Arborist didn't suggest a price — enter the exact price."
      : tree.priceType === "range"
        ? `Arborist suggested ${money(low)}${high !== null ? `–${money(high)}` : ""} — enter the exact price.`
        : `Arborist suggested ${money(low)}.`;
    return {
      description: detail ? `${head}. ${detail}` : head,
      suggestion,
      fixedPrice: tree.priceType === "fixed" && low !== null ? (low / 100).toFixed(2) : null,
    };
  });
  const address = clean(report.property_address);
  return { lines, scope: address ? `Tree work at ${address}.` : "" };
}
