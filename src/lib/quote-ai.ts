import { normalizeUnit } from "@/lib/quote-units";

/** Shape returned by the quote-ai function (validated again here; never trusted for money). */
export interface AiSection { heading: string; quantity: number | null; unit: string; steps: string[]; exclusions: string[] }
export interface AiLine {
  section_index: number | null; description: string; quantity: number | null; unit: string;
  unit_rate: number | null; price_status: "stated" | "missing" | "ambiguous"; issue: string | null;
}
export interface AiDraft { title: string | null; sections: AiSection[]; lines: AiLine[]; unresolved: string[] }

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
const strs = (v: unknown) => (Array.isArray(v) ? v.map(x => str(x)).filter(Boolean).slice(0, 40) : []);

/** Runtime validation of the AI's structured output. Throws on an unusable shape. */
export function parseAiDraft(raw: unknown): AiDraft {
  if (!raw || typeof raw !== "object") throw new Error("The AI response was not a quote draft.");
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.sections) || !Array.isArray(r.lines)) throw new Error("The AI response was not a quote draft.");
  const sections = r.sections.slice(0, 30).map((s): AiSection => {
    const o = (s ?? {}) as Record<string, unknown>;
    return { heading: str(o.heading, 120) || "Work area", quantity: num(o.quantity), unit: normalizeUnit(str(o.unit, 20)), steps: strs(o.steps), exclusions: strs(o.exclusions) };
  });
  const lines = r.lines.slice(0, 50).map((l): AiLine => {
    const o = (l ?? {}) as Record<string, unknown>;
    const status = o.price_status === "stated" || o.price_status === "ambiguous" ? o.price_status : "missing";
    const idx = typeof o.section_index === "number" && Number.isInteger(o.section_index) && o.section_index >= 0 && o.section_index < sections.length ? o.section_index : null;
    return { section_index: idx, description: str(o.description, 300), quantity: num(o.quantity), unit: normalizeUnit(str(o.unit, 20)),
      unit_rate: num(o.unit_rate), price_status: status, issue: str(o.issue, 300) || null };
  }).filter(l => l.description);
  return { title: str(r.title, 160) || null, sections, lines, unresolved: strs(r.unresolved) };
}

/** Editable review row. Strings so the user can type freely; money is derived in cents. */
export interface ReviewLine { id: string; description: string; qty: string; unit: string; rate: string; issue: string | null }

/** Largest accepted unit rate ($1,000,000.00) and quantity; anything bigger is a typo, not a price. */
export const MAX_RATE_CENTS = 100_000_000;
export const MAX_QTY = 1_000_000;

/** Exact dollars→cents from user text ("7.5", "$1,200.00"); null when not a valid, bounded non-negative amount. */
export function dollarsToCents(text: string): number | null {
  const t = String(text ?? "").replace(/[$,\s]/g, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(t)) return null;
  const [whole, frac = ""] = t.split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  return Number.isSafeInteger(cents) && cents <= MAX_RATE_CENTS ? cents : null;
}

export function parseQty(text: string): number | null {
  const t = String(text ?? "").replace(/[,\s]/g, "");
  if (!/^\d{1,7}(\.\d{1,3})?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 && n <= MAX_QTY ? n : null;
}

/** Signed builder money text → cents (option deltas may be negative). Invalid or out-of-range text → null. */
export function signedDollarsToCents(text: string): number | null {
  const t = String(text ?? "").trim();
  const neg = t.startsWith("-");
  const c = dollarsToCents(neg ? t.slice(1) : t);
  return c === null ? null : neg ? -c : c;
}

/** Builder line amount in exact cents: same rounding as the AI review (integer milli-quantity × cents). */
export function builderLineCents(qty: string, price: string, discountDollars = 0): number {
  const q = parseQty(qty) ?? 0;
  const rate = signedDollarsToCents(price) ?? 0;
  return lineCents(q, rate) - Math.round((Number(discountDollars) || 0) * 100);
}

/**
 * AI-origin builder lines stay unresolved until they have BOTH a valid quantity and an explicit positive rate.
 * Derived from the current values every time, so editing one field (or deleting a rate) can never clear it.
 */
export function aiLineProblem(qty: string, price: string, note?: string | null): string | null {
  if (parseQty(qty) === null) return note || "Enter a quantity.";
  const rate = dollarsToCents(price);
  if (rate === null || rate === 0) return note || "Enter a price.";
  return null;
}

/** Line amount in cents, rounded half-up once. Uses integer milli-quantities to avoid float drift. */
export function lineCents(qty: number, rateCents: number): number {
  const milli = Math.round(qty * 1000);
  return Math.round((milli * rateCents) / 1000);
}

const AI_RATE = (rate: number | null) => (rate === null ? "" : (Math.round(rate * 100) / 100).toFixed(2));

export function toReviewLines(draft: AiDraft, makeId: () => string = () => crypto.randomUUID()): ReviewLine[] {
  return draft.lines.map(l => {
    const flagged = l.price_status !== "stated" || l.quantity === null || l.unit_rate === null;
    return {
      id: makeId(), description: l.description, unit: l.unit,
      qty: l.quantity === null ? "" : String(l.quantity),
      // Unclear prices stay empty so they can never be applied as $0.
      rate: flagged ? "" : AI_RATE(l.unit_rate),
      issue: flagged ? (l.issue || (l.price_status === "ambiguous" ? "Price is unclear — enter it." : "Price not stated — enter it.")) : null,
    };
  });
}

/** A line is unresolved until both quantity and rate are valid and the rate is above zero. */
export function lineStatus(line: ReviewLine): { cents: number | null; problem: string | null } {
  const qty = parseQty(line.qty);
  const rate = dollarsToCents(line.rate);
  if (!line.description.trim()) return { cents: null, problem: "Add a description." };
  if (qty === null) return { cents: null, problem: line.issue || "Enter a quantity." };
  if (rate === null || rate === 0) return { cents: null, problem: line.issue || "Enter a price." };
  return { cents: lineCents(qty, rate), problem: null };
}

export function reviewTotals(lines: ReviewLine[]) {
  let subtotalCents = 0; let unresolved = 0;
  for (const l of lines) { const s = lineStatus(l); if (s.cents === null) unresolved++; else subtotalCents += s.cents; }
  return { subtotalCents, unresolved };
}

const qtyText = (q: number | null, unit: string) => (q === null ? "" : ` — ${q.toLocaleString("en-US", { maximumFractionDigits: 3 })}${unit === "each" ? "" : ` ${unit}`}`);

/** Customer-facing scope: one clearly separated section per area, steps in order, exclusions stated. */
export function scopeText(draft: AiDraft): string {
  return draft.sections.map(s => [
    `${s.heading}${qtyText(s.quantity, s.unit)}`,
    ...s.steps.map(step => `• ${step}`),
    ...s.exclusions.map(x => `Not included: ${x.replace(/^(no|not included:?)\s+/i, "")}`),
  ].join("\n")).join("\n\n");
}

/** Builder lines produced by Apply. Unresolved lines keep an empty price and their issue. */
export interface AppliedLine { description: string; qty: string; unit: string; price: string; issue: string | null }
export function toAppliedLines(lines: ReviewLine[]): AppliedLine[] {
  return lines.filter(l => l.description.trim()).map(l => {
    const s = lineStatus(l);
    const rate = dollarsToCents(l.rate);
    return { description: l.description.trim(), qty: parseQty(l.qty) === null ? "" : String(parseQty(l.qty)), unit: normalizeUnit(l.unit),
      price: s.problem || rate === null ? "" : (rate / 100).toFixed(2), issue: s.problem };
  });
}

/** True when the builder already holds work that Apply would replace (needs explicit confirmation). */
export function builderHasWork(scope: string, lines: Array<{ description: string; price: string }>): boolean {
  return !!scope.trim() || lines.some(l => l.description.trim() || l.price.trim());
}

export const formatCents = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
