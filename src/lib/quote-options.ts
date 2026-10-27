/**
 * Customer-selectable quote options (GCP). Mirrors the server's approve_quote_options
 * arithmetic exactly (integer cents) so the live total on the customer page matches
 * what the server records. The server is always authoritative.
 */
export type OptionKind = "required" | "optional" | "alternative";
export interface OptionLine {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number | null;
  taxable_flag?: boolean | null;
  option_kind?: OptionKind | string | null;
  option_group?: string | null;
  default_selected?: boolean | null;
  customer_selected?: boolean | null;
}
export const OPTION_KIND_LABELS: Record<OptionKind, string> = { required: "Required", optional: "Optional add-on", alternative: "Pick one" };

export const kindOf = (line: OptionLine): OptionKind =>
  line.option_kind === "optional" || line.option_kind === "alternative" ? line.option_kind : "required";
export const hasOptions = (lines: OptionLine[]) => lines.some(line => kindOf(line) !== "required");
export const lineCents = (line: OptionLine) => Math.round(((Number(line.quantity) || 0) * (Number(line.unit_price) || 0) - (Number(line.discount_amount) || 0)) * 100);

export function defaultSelection(lines: OptionLine[]): string[] {
  return lines.filter(line => kindOf(line) !== "required" && line.default_selected).map(line => line.id);
}

export function isIncluded(line: OptionLine, selected: ReadonlySet<string> | string[]) {
  const set = selected instanceof Set ? selected : new Set(selected);
  return kindOf(line) === "required" || set.has(line.id);
}

export function computeOptionTotals(lines: OptionLine[], selected: string[] | ReadonlySet<string>, opts: { taxRate: number; discountTotal: number }) {
  let sub = 0, taxable = 0;
  for (const line of lines) {
    if (!isIncluded(line, selected)) continue;
    const cents = lineCents(line);
    sub += cents;
    if (line.taxable_flag !== false) taxable += cents;
  }
  const tax = Math.round(taxable * (Number(opts.taxRate) || 0) / 100);
  const discount = Math.min(Math.round((Number(opts.discountTotal) || 0) * 100), sub);
  const total = Math.max(0, sub + tax - discount);
  return { subtotal: sub / 100, taxTotal: tax / 100, discountTotal: discount / 100, total: total / 100 };
}

export interface OptionGroup { name: string; lines: OptionLine[] }
export function groupOptions(lines: OptionLine[]) {
  const required = lines.filter(line => kindOf(line) === "required");
  const optional = lines.filter(line => kindOf(line) === "optional");
  const groups: OptionGroup[] = [];
  for (const line of lines.filter(l => kindOf(l) === "alternative")) {
    const name = (line.option_group || "").trim();
    let group = groups.find(g => g.name === name);
    if (!group) { group = { name, lines: [] }; groups.push(group); }
    group.lines.push(line);
  }
  return { required, optional, groups };
}

/** Problems with a selection: every pick-one group needs exactly one choice; ids must belong to the quote. */
export function selectionErrors(lines: OptionLine[], selected: string[]): string[] {
  const errors: string[] = [];
  const selectable = new Set(lines.filter(l => kindOf(l) !== "required").map(l => l.id));
  if (selected.some(id => !selectable.has(id))) errors.push("One of the chosen options is not part of this quote.");
  for (const group of groupOptions(lines).groups) {
    const n = group.lines.filter(l => selected.includes(l.id)).length;
    if (n !== 1) errors.push(`Choose one option for ${group.name || "each choice"}.`);
  }
  return errors;
}

/** Builder checks before saving: groups need a name, at least two choices, and exactly one proposed default. */
export function builderOptionErrors(lines: OptionLine[]): string[] {
  const errors: string[] = [];
  const { groups } = groupOptions(lines);
  if (lines.some(l => kindOf(l) === "alternative" && !(l.option_group || "").trim())) errors.push("Name each pick-one group (for example \"Debris handling\").");
  for (const group of groups) {
    if (!group.name) continue;
    if (group.lines.length < 2) errors.push(`"${group.name}" needs at least two choices.`);
    if (group.lines.filter(l => l.default_selected).length !== 1) errors.push(`Mark exactly one proposed choice for "${group.name}".`);
  }
  if (!lines.some(l => kindOf(l) === "required")) errors.push("Add at least one required line of work.");
  return errors;
}

/**
 * Lines that belong on an invoice or job. After an option approval only the customer's
 * chosen lines are included; legacy/no-option quotes include every line.
 */
export function includedForDownstream<T extends OptionLine>(lines: T[]): T[] {
  return lines.filter(line => kindOf(line) === "required" || line.customer_selected === true);
}
