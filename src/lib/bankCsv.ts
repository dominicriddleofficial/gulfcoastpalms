/** Strict bank statement CSV parsing for owner-reviewed import. */

export class CsvFormatError extends Error {}

/** RFC-4180 style parsing. Quoted fields may contain commas and line breaks. Malformed quoting throws. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false; let wasQuoted = false; let line = 1;
  const t = text.replace(/^\uFEFF/, "");
  if (!t.trim()) throw new CsvFormatError("The file is empty");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else { q = false; wasQuoted = true; } }
      else { if (ch === "\n") line++; cell += ch; }
    } else if (ch === '"') {
      if (cell !== "" || wasQuoted) throw new CsvFormatError(`Line ${line}: a quote mark appears inside an unquoted value`);
      q = true;
    }
    else if (ch === ",") { row.push(cell); cell = ""; wasQuoted = false; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(cell); cell = ""; wasQuoted = false; line++;
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      if (wasQuoted && ch.trim() !== "") throw new CsvFormatError(`Line ${line}: text after a closing quote mark`);
      cell += ch;
    }
  }
  if (q) throw new CsvFormatError("A quoted value is never closed — the file may be cut off");
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  if (rows.length === 0) throw new CsvFormatError("The file has no rows");
  return rows;
}

const validYmd = (y: number, m: number, d: number) => {
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** Accepts YYYY-MM-DD or MM/DD/YYYY (4-digit years only). */
export function parseBankDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let y: number, mo: number, d: number;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) { mo = +m[1]; d = +m[2]; y = +m[3]; }
  else return null;
  if (!validYmd(y, mo, d)) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "$1,234.56", "-12.30", "(12.30)" → cents. Anything else → null. */
export function parseMoneyCents(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1).trim(); }
  if (s.startsWith("-")) { if (neg) return null; neg = true; s = s.slice(1).trim(); }
  s = s.replace(/^\$/, "");
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.replace(/,/g, "").split(".");
  const c = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(c)) return null;
  return neg ? -c : c;
}

export interface ColumnMap { date: number; description: number; amount?: number; debit?: number; credit?: number }

export function guessColumns(header: string[]): Partial<ColumnMap> {
  const find = (re: RegExp) => { const i = header.findIndex((h) => re.test(h.trim().toLowerCase())); return i >= 0 ? i : undefined; };
  return {
    date: find(/^(posted |transaction |post )?date/),
    description: find(/desc|memo|payee|details|name/),
    amount: find(/^amount$|^amt$/),
    debit: find(/debit|withdraw/),
    credit: find(/credit|deposit/),
  };
}

export interface ParsedBankRow { rowIndex: number; txnDate: string; description: string; amountCents: number; fingerprint: string; raw: Record<string, string> }
export interface RowError { rowIndex: number; message: string }

export const normDesc = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Validates every data row. Identical rows inside one file are all kept; each
 * gets an occurrence number in its fingerprint so a later overlapping import
 * flags the same occurrence as a possible duplicate instead of skipping it.
 */
/** Column-map problems (out of range, same column used twice, missing amount columns). Empty list = valid. */
export function validateColumnMap(map: ColumnMap, width: number): string[] {
  const errs: string[] = [];
  const used: Array<[string, number | undefined]> = [["date", map.date], ["description", map.description], ["amount", map.amount], ["money out", map.debit], ["money in", map.credit]];
  const seen = new Map<number, string>();
  for (const [name, idx] of used) {
    if (idx === undefined) continue;
    if (!Number.isInteger(idx) || idx < 0 || idx >= width) { errs.push(`The ${name} column is not in the file`); continue; }
    const other = seen.get(idx);
    if (other) errs.push(`The ${name} and ${other} columns point at the same column`); else seen.set(idx, name);
  }
  if (map.date === undefined || map.description === undefined) errs.push("Pick the date and description columns");
  if (map.amount === undefined && map.debit === undefined && map.credit === undefined) errs.push("Pick an amount column, or money-out/money-in columns");
  return errs;
}

export function mapBankRows(rows: string[][], map: ColumnMap, hasHeader = true): { rows: ParsedBankRow[]; errors: RowError[] } {
  if (rows.length === 0 || (hasHeader && rows.length < 2)) return { rows: [], errors: [{ rowIndex: 0, message: "The file has no transaction rows" }] };
  const width = rows[0].length;
  const mapErrs = validateColumnMap(map, width);
  if (mapErrs.length) return { rows: [], errors: mapErrs.map((message) => ({ rowIndex: 0, message })) };
  const header = hasHeader ? rows[0] : rows[0].map((_, i) => `col${i + 1}`);
  const body = hasHeader ? rows.slice(1) : rows;
  const out: ParsedBankRow[] = []; const errors: RowError[] = [];
  const seen = new Map<string, number>();
  body.forEach((r, i) => {
    const rowIndex = i + 1;
    if (r.length !== width) { errors.push({ rowIndex, message: `Row has ${r.length} columns but the header has ${width}` }); return; }
    const date = parseBankDate(r[map.date] ?? "");
    if (!date) { errors.push({ rowIndex, message: `Date "${r[map.date] ?? ""}" isn't a valid date` }); return; }
    let amt: number | null = null;
    if (map.amount !== undefined) amt = parseMoneyCents(r[map.amount] ?? "");
    else {
      const d = (r[map.debit ?? -1] ?? "").trim(); const c = (r[map.credit ?? -1] ?? "").trim();
      const dv = d ? parseMoneyCents(d) : 0; const cv = c ? parseMoneyCents(c) : 0;
      if (dv === null || cv === null) { errors.push({ rowIndex, message: "Money-out or money-in is not a valid dollar amount" }); return; }
      if (dv !== 0 && cv !== 0) { errors.push({ rowIndex, message: "Both money-out and money-in have amounts" }); return; }
      amt = dv !== 0 ? -Math.abs(dv) : Math.abs(cv);
    }
    if (amt === null || amt === 0) { errors.push({ rowIndex, message: "Amount is missing or not a valid dollar amount" }); return; }
    const description = (r[map.description] ?? "").trim().slice(0, 500);
    const base = `${date}|${amt}|${normDesc(description)}`;
    const n = (seen.get(base) ?? 0) + 1; seen.set(base, n);
    const raw: Record<string, string> = {};
    header.forEach((h, j) => { raw[(h || `col${j + 1}`).slice(0, 60)] = (r[j] ?? "").slice(0, 300); });
    out.push({ rowIndex, txnDate: date, description, amountCents: amt, fingerprint: `${base}|#${n}`, raw });
  });
  return { rows: out, errors };
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Candidate existing records for a bank row: same money direction (money in ↔ receipts,
 * money out ↔ expenses/payroll/refunds), same amount, within N days. Callers pass only
 * successful, in-scope records; `direction` is "in" for receipts and "out" for money paid out.
 */
export function suggestMatches<T extends { date: string; amountCents: number; direction: "in" | "out" }>(row: { txnDate: string; amountCents: number }, records: T[], days = 5): T[] {
  const d0 = Date.parse(`${row.txnDate}T00:00:00Z`);
  const dir = row.amountCents > 0 ? "in" : "out";
  return records.filter((r) => r.direction === dir && Math.abs(r.amountCents) === Math.abs(row.amountCents)
    && Math.abs(Date.parse(`${r.date}T00:00:00Z`) - d0) <= days * 86_400_000);
}
