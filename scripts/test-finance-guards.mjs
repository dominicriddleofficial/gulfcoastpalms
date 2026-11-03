// Isolated PGlite check of finance bank-match guards, separate-transaction resolution and
// shared-expense allocation rules. Runs the real migrations against a throwaway database;
// no production connection is used.
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
CREATE TABLE public.workspaces (id uuid PRIMARY KEY, owner_user_id uuid);
CREATE TABLE public.businesses (id uuid PRIMARY KEY, workspace_id uuid, shortcode text, timezone text);
CREATE TABLE public.platform_payments (id uuid PRIMARY KEY, business_id uuid, amount numeric, tip_amount numeric, status text, is_refund boolean DEFAULT false);
CREATE TABLE public.finance_income (id uuid PRIMARY KEY, business_id uuid, amount numeric);
CREATE TABLE public.finance_payroll_payments (id uuid PRIMARY KEY, business_id uuid, total_amount numeric);
CREATE TABLE public.finance_expenses (id uuid PRIMARY KEY, business_id uuid, workspace_id uuid, is_shared boolean DEFAULT false, amount numeric);
INSERT INTO public.workspaces VALUES ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000aa');
INSERT INTO public.businesses VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','GCP','America/Chicago'),
  ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','PPS','America/Chicago');
`);
const dir = new URL('../drizzle/migrations/', import.meta.url);
for (const f of (await fs.readdir(dir)).filter((n) => /finance/.test(n) && n.endsWith('.sql')).sort()) {
  await db.exec(await fs.readFile(new URL(f, dir), 'utf8'));
}
const G = '00000000-0000-0000-0000-000000000001', P = '00000000-0000-0000-0000-000000000002';
await db.exec(`
INSERT INTO platform_payments VALUES ('10000000-0000-0000-0000-000000000001','${G}',100,0,'completed',false),
  ('10000000-0000-0000-0000-000000000002','${G}',100,0,'failed',false),
  ('10000000-0000-0000-0000-000000000003','${P}',100,0,'completed',false);
INSERT INTO finance_expenses VALUES ('20000000-0000-0000-0000-000000000001','${G}','00000000-0000-0000-0000-0000000000a1',false,100),
  ('20000000-0000-0000-0000-000000000002',NULL,'00000000-0000-0000-0000-0000000000a1',true,300);
INSERT INTO finance_bank_imports (id, business_id, file_sha256) VALUES ('30000000-0000-0000-0000-000000000001','${G}', repeat('a',64));
INSERT INTO finance_bank_transactions (id, import_id, business_id, row_index, row_fingerprint, txn_date, amount_cents, classification) VALUES
  ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','${G}',1,'f1','2026-02-02',10000,'income'),
  ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','${G}',2,'f2','2026-02-02',-10000,'expense');
`);
let checks = 0;
const ok = async (sql, m) => { await db.exec(`BEGIN; ${sql}; ROLLBACK;`); checks++; };
const bad = async (sql, m) => {
  let failed = false;
  try { await db.exec(`BEGIN; ${sql};`); } catch { failed = true; }
  await db.exec('ROLLBACK;');
  assert.ok(failed, m); checks++;
};
const upd = (id, set) => `UPDATE finance_bank_transactions SET ${set} WHERE id = '${id}'`;
const IN = '40000000-0000-0000-0000-000000000001', OUT = '40000000-0000-0000-0000-000000000002';

await ok(upd(IN, `classification='matched', matched_type='payment', matched_id='10000000-0000-0000-0000-000000000001'`), 'deposit matches successful same-amount payment');
await bad(upd(IN, `classification='matched', matched_type='payment', matched_id='10000000-0000-0000-0000-000000000002'`), 'failed payment cannot be matched');
await bad(upd(IN, `classification='matched', matched_type='payment', matched_id='10000000-0000-0000-0000-000000000003'`), 'other business payment cannot be matched');
await bad(upd(IN, `classification='matched', matched_type='expense', matched_id='20000000-0000-0000-0000-000000000001'`), 'deposit cannot match an expense');
await ok(upd(OUT, `classification='matched', matched_type='expense', matched_id='20000000-0000-0000-0000-000000000001'`), 'charge matches same-amount expense');
await bad(upd(OUT, `classification='matched', matched_type='expense', matched_id='20000000-0000-0000-0000-000000000002'`), 'charge cannot match a different-amount expense');
await bad(upd(OUT, `classification='matched', matched_type='payment', matched_id='10000000-0000-0000-0000-000000000001'`), 'money out cannot match a non-refund payment');
await ok(upd(OUT, `owner_resolution='separate', resolution_note='second fill-up'`), 'separate with note is allowed');
await bad(upd(OUT, `owner_resolution='separate', resolution_note=''`), 'separate needs a note');
await bad(upd(OUT, `classification='transfer', owner_resolution='separate', resolution_note='abc'`), 'separate only for income/expense');
await bad(upd(OUT, `possible_duplicate_of='${IN}'`), 'imported metadata stays immutable');
await bad(upd(OUT, `amount_cents=1`), 'imported amount stays immutable');

const alloc = (id, biz, amt) => `INSERT INTO finance_expense_allocations (id, expense_id, business_id, amount) VALUES ('${id}','20000000-0000-0000-0000-000000000002','${biz}',${amt})`;
await ok(`${alloc('50000000-0000-0000-0000-000000000001', G, 100)}; ${alloc('50000000-0000-0000-0000-000000000002', P, 200)}`, 'shares up to the total');
await bad(`${alloc('50000000-0000-0000-0000-000000000001', G, 200)}; ${alloc('50000000-0000-0000-0000-000000000002', P, 150)}`, 'shares cannot exceed the bill');
await ok(`${alloc('50000000-0000-0000-0000-000000000001', G, 200)}; UPDATE finance_expense_allocations SET amount = 50 WHERE id = '50000000-0000-0000-0000-000000000001'`, 'a share can be reduced');
await ok(`${alloc('50000000-0000-0000-0000-000000000001', G, 200)}; DELETE FROM finance_expense_allocations WHERE id = '50000000-0000-0000-0000-000000000001'`, 'a share can be removed');
await bad(`${alloc('50000000-0000-0000-0000-000000000001', G, 200)}; UPDATE finance_expenses SET amount = 150 WHERE id = '20000000-0000-0000-0000-000000000002'`, 'bill cannot drop below assigned shares');
await bad(`${alloc('50000000-0000-0000-0000-000000000001', G, 200)}; UPDATE finance_expenses SET is_shared = false WHERE id = '20000000-0000-0000-0000-000000000002'`, 'cannot un-share while shares exist');
await ok(`${alloc('50000000-0000-0000-0000-000000000001', G, 200)}; UPDATE finance_expenses SET amount = 250 WHERE id = '20000000-0000-0000-0000-000000000002'`, 'bill can drop to the assigned total or above');
const src = await fs.readFile(new URL('0011_finance_bank_resolution_and_match_guards.sql', dir), 'utf8');
assert.match(src, /FOR UPDATE/); checks++;
console.log(`finance guard checks passed: ${checks}`);
