/** Units a quote line can be billed in. Stored as the label text in platform_quote_line_items.unit. */
export const QUOTE_UNITS = ["each", "sq ft", "linear ft", "hour", "job"] as const;
export type QuoteUnit = (typeof QUOTE_UNITS)[number];

export function normalizeUnit(unit: string | null | undefined): string {
  const u = (unit ?? "").trim().toLowerCase().replace(/_/g, " ");
  if (!u) return "each";
  if (["sqft", "sq. ft.", "sq ft", "square feet", "square foot", "sf"].includes(u)) return "sq ft";
  if (["lf", "linear feet", "linear foot", "linear ft"].includes(u)) return "linear ft";
  if (u === "hr" || u === "hours") return "hour";
  return u;
}

const isEach = (unit: string | null | undefined) => normalizeUnit(unit) === "each";

/** "605 sq ft" for measured units; plain quantity for counted items. */
export function formatQuantity(quantity: number, unit?: string | null): string {
  const q = Number(quantity).toLocaleString("en-US", { maximumFractionDigits: 3 });
  return isEach(unit) ? q : `${q} ${normalizeUnit(unit)}`;
}

/** Suffix for unit prices: " / sq ft" for measured units, "" for each. */
export function unitPriceSuffix(unit?: string | null): string {
  return isEach(unit) ? "" : ` / ${normalizeUnit(unit)}`;
}
