export const ARBORIST_SERVICES = ["Tree removal", "Tree trimming", "Limb removal", "Palm trimming", "Other"] as const;
export const ARBORIST_STATUSES = { draft: "Draft", submitted: "Needs review", reviewed: "Reviewed" } as const;
export const ARBORIST_PHOTO_BUCKET = "arborist-quote-photos";
export const MAX_TREE_PHOTOS = 8;
export const MAX_TREES = 100;

export interface ArboristPhoto { id: string; path: string; name: string }
export interface ArboristTree {
  id: string;
  species: string;
  service: string;
  location: string;
  description: string;
  customerDiscussion: string;
  priceType: "fixed" | "range" | "unsure";
  priceMin: string;
  priceMax: string;
  photos: ArboristPhoto[];
}
export interface ArboristQuote {
  id: string;
  business_id: string;
  author_id: string;
  customer_name: string;
  property_address: string;
  visit_date: string;
  arborist_name: string;
  general_notes: string;
  trees: ArboristTree[];
  status: keyof typeof ARBORIST_STATUSES;
  version: number;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
}

export function newArboristTree(): ArboristTree {
  return { id: crypto.randomUUID(), species: "", service: "", location: "", description: "", customerDiscussion: "", priceType: "fixed", priceMin: "", priceMax: "", photos: [] };
}
export function newArboristQuote(businessId: string, authorId: string): ArboristQuote {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return { id: crypto.randomUUID(), business_id: businessId, author_id: authorId, customer_name: "", property_address: "", visit_date: date, arborist_name: "", general_notes: "", trees: [newArboristTree()], status: "draft", version: 0, created_at: "", updated_at: "", submitted_at: null, reviewed_at: null };
}

// Work in cents so per-tree ranges add up exactly. Empty is never a zero-dollar quote.
export function priceCents(value: string): number | null {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value.trim())) return null;
  return Math.round(Number(value) * 100);
}
export function treePrice(tree: ArboristTree): { min: number; max: number } | null {
  if (tree.priceType === "unsure") return null;
  const min = priceCents(tree.priceMin);
  const max = tree.priceType === "range" ? priceCents(tree.priceMax) : min;
  return min === null || max === null || max < min ? null : { min, max };
}
export const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
export function priceLabel(tree: ArboristTree): string {
  const value = treePrice(tree);
  return value ? (value.min === value.max ? money(value.min) : `${money(value.min)} – ${money(value.max)}`) : "Price not set";
}
export function quoteTotals(trees: ArboristTree[]) {
  return trees.reduce((sum, tree) => {
    const price = treePrice(tree);
    return price ? { ...sum, min: sum.min + price.min, max: sum.max + price.max } : { ...sum, unpriced: sum.unpriced + 1 };
  }, { min: 0, max: 0, unpriced: 0 });
}
export function totalLabel(trees: ArboristTree[]) {
  const totals = quoteTotals(trees);
  if (totals.unpriced === trees.length) return "Price not set";
  return totals.min === totals.max ? money(totals.min) : `${money(totals.min)} – ${money(totals.max)}`;
}

export function validateArboristQuote(quote: ArboristQuote, submitting: boolean): string[] {
  const errors: string[] = [];
  if (!quote.visit_date || !/^\d{4}-\d{2}-\d{2}$/.test(quote.visit_date)) errors.push("Choose a visit date.");
  if (quote.trees.length < 1 || quote.trees.length > MAX_TREES) errors.push(`Add between 1 and ${MAX_TREES} trees.`);
  if (submitting) {
    if (!quote.customer_name.trim()) errors.push("Enter the customer name.");
    if (!quote.property_address.trim()) errors.push("Enter the property address.");
    if (!quote.arborist_name.trim()) errors.push("Enter the arborist's name.");
  }
  quote.trees.forEach((tree, i) => {
    const prefix = `Tree ${i + 1}:`;
    if (tree.priceType !== "unsure") {
      if (tree.priceMin.trim() && priceCents(tree.priceMin) === null) errors.push(`${prefix} enter a valid, nonnegative price with up to two decimals.`);
      if (tree.priceType === "range" && tree.priceMax.trim() && priceCents(tree.priceMax) === null) errors.push(`${prefix} enter a valid high price.`);
      if (tree.priceType === "range" && priceCents(tree.priceMin) !== null && priceCents(tree.priceMax) !== null && Number(tree.priceMax) < Number(tree.priceMin)) errors.push(`${prefix} the high price must be at least the low price.`);
      if (submitting && !treePrice(tree)) errors.push(`${prefix} add a suggested price, or choose “Not sure yet”.`);
    }
    if (submitting) {
      if (!tree.species.trim()) errors.push(`${prefix} enter the tree type (or “Unknown”).`);
      if (!(ARBORIST_SERVICES as readonly string[]).includes(tree.service)) errors.push(`${prefix} choose the requested work.`);
      if (!tree.description.trim()) errors.push(`${prefix} describe the tree and work needed.`);
      if (!tree.customerDiscussion.trim()) errors.push(`${prefix} add what you discussed with the customer.`);
      if (!tree.photos.length) errors.push(`${prefix} add at least one photo.`);
    }
    if (tree.photos.length > MAX_TREE_PHOTOS) errors.push(`${prefix} keep up to ${MAX_TREE_PHOTOS} photos.`);
  });
  return errors;
}

export function arboristReviewSummary(quote: ArboristQuote) {
  const totals = quoteTotals(quote.trees);
  return [
    "INTERNAL ARBORIST REVIEW — suggested pricing", quote.customer_name, quote.property_address,
    `Visited: ${quote.visit_date} | Arborist: ${quote.arborist_name}`, `${quote.trees.length} trees`, "",
    ...quote.trees.flatMap((tree, i) => [
      `TREE ${i + 1} — ${tree.species} — ${tree.service}`,
      ...(tree.location ? [`Location: ${tree.location}`] : []),
      `Tree / work: ${tree.description}`, `Customer discussion: ${tree.customerDiscussion}`,
      `Suggested price: ${priceLabel(tree)}`, `${tree.photos.length} photo(s) in the internal report`, "",
    ]),
    `${totals.unpriced ? "Priced trees subtotal" : "Suggested total"}: ${totalLabel(quote.trees)}`,
    ...(totals.unpriced ? [`${totals.unpriced} tree(s) still need pricing.`] : []),
    ...(quote.general_notes ? [`Job notes: ${quote.general_notes}`] : []),
  ].join("\n");
}
