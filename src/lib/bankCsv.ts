/** Strict bank statement CSV parsing for owner-reviewed import. */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  const t = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
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
export function mapBankRows(rows: string[][], map: ColumnMap, hasHeader = true): { rows: ParsedBankRow[]; errors: RowError[] } {
  const header = hasHeader ? rows[0] : rows[0].map((_, i) => `col${i + 1}`);
  const body = hasHeader ? rows.slice(1) : rows;
  const out: ParsedBankRow[] = []; const errors: RowError[] = [];
  const seen = new Map<string, number>();
  body.forEach((r, i) => {
    const rowIndex = i + 1;
    const date = parseBankDate(r[map.date] ?? "");
    if (!date) { errors.push({ rowIndex, message: `Date "${r[map.date] ?? ""}" isn't a valid date` }); return; }
    let amt: number | null = null;
    if (map.amount !== undefined) amt = parseMoneyCents(r[map.amount] ?? "");
    else {
      const d = (r[map.debit ?? -1] ?? "").trim(); const c = (r[map.credit ?? -1] ?? "").trim();
      if (d && c) { errors.push({ rowIndex, message: "Both money-out and money-in are filled" }); return; }
      const v = parseMoneyCents(d || c);
      amt = v === null ? null : d ? -Math.abs(v) : Math.abs(v);
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

/** Candidate existing records with the same amount within N days. */
export function suggestMatches<T extends { date: string; amountCents: number }>(row: { txnDate: string; amountCents: number }, records: T[], days = 5): T[] {
  const d0 = Date.parse(`${row.txnDate}T00:00:00Z`);
  return records.filter((r) => Math.abs(r.amountCents) === Math.abs(row.amountCents)
    && Math.abs(Date.parse(`${r.date}T00:00:00Z`) - d0) <= days * 86_400_000);
}
