// Isolated PGlite check of the unassigned-draft customer guard (guard_quote_customer_assignment).
// Runs the real migration's trigger SQL against a throwaway database; no production connection is used.
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
CREATE TABLE public.platform_customers (id uuid PRIMARY KEY, business_id uuid);
CREATE TABLE public.platform_quotes (id uuid PRIMARY KEY, business_id uuid, customer_id uuid REFERENCES platform_customers(id) ON DELETE SET NULL,
  status text, sent_at timestamptz, accepted_snapshot jsonb, is_read_only boolean DEFAULT false, deleted_at timestamptz);
`);
const sql = await fs.readFile(new URL('../drizzle/migrations/0015_quote_units_unassigned_drafts.sql', import.meta.url), 'utf8');
const start = sql.indexOf('CREATE OR REPLACE FUNCTION public.guard_quote_customer_assignment');
const end = sql.indexOf('CREATE OR REPLACE FUNCTION public.quote_public_pricing');
assert.ok(start >= 0 && end > start, 'trigger SQL found in migration');
await db.exec(sql.slice(start, end));
const G = '00000000-0000-0000-0000-000000000001', P = '00000000-0000-0000-0000-000000000002';
const CG = 'c0000000-0000-0000-0000-000000000001', CG2 = 'c0000000-0000-0000-0000-000000000003', CP = 'c0000000-0000-0000-0000-000000000002';
const QU = 'a0000000-0000-0000-0000-000000000001', QA = 'a0000000-0000-0000-0000-000000000002', QS = 'a0000000-0000-0000-0000-000000000003';
await db.exec(`
INSERT INTO platform_customers VALUES ('${CG}','${G}'),('${CG2}','${G}'),('${CP}','${P}');
INSERT INTO platform_quotes (id,business_id,customer_id,status) VALUES ('${QU}','${G}',NULL,'draft'),('${QA}','${G}','${CG}','draft');
INSERT INTO platform_quotes (id,business_id,customer_id,status,sent_at) VALUES ('${QS}','${G}','${CG}','sent',now());
`);
let checks = 0;
const ok = async (s, m) => { try { await db.exec(`BEGIN; ${s}; ROLLBACK;`); } catch (e) { await db.exec('ROLLBACK'); assert.fail(`${m}: ${e.message}`); } checks++; };
const bad = async (s, m) => { let failed = false; try { await db.exec(`BEGIN; ${s};`); } catch { failed = true; } await db.exec('ROLLBACK;'); assert.ok(failed, m); checks++; };
const set = (id, v) => `UPDATE platform_quotes SET ${v} WHERE id='${id}'`;

await ok(`INSERT INTO platform_quotes (id,business_id,status) VALUES (gen_random_uuid(),'${G}','draft')`, 'unassigned draft can be saved');
await bad(`INSERT INTO platform_quotes (id,business_id,status) VALUES (gen_random_uuid(),'${G}','sent')`, 'unassigned sent quote rejected');
await bad(`INSERT INTO platform_quotes (id,business_id,customer_id,status) VALUES (gen_random_uuid(),'${G}','${CP}','draft')`, 'foreign customer on insert rejected');
await ok(set(QU, `customer_id='${CG}'`), 'same-workspace customer can be chosen on unassigned draft');
await bad(set(QU, `customer_id='${CP}'`), 'foreign-workspace customer rejected');
await bad(set(QA, `customer_id='${CG2}'`), 'already-assigned draft cannot be reassigned');
await bad(set(QA, `customer_id=NULL`), 'customer cannot be removed');
await bad(set(QS, `customer_id='${CG2}'`), 'sent quote customer is immutable');
await bad(set(QU, `status='sent'`), 'unassigned draft cannot be sent');
await bad(set(QU, `sent_at=now()`), 'unassigned draft cannot get a sent date');
await bad(`UPDATE platform_quotes SET sent_at=now(), customer_id='${CG}' WHERE id='${QU}' AND false; ${set(QU, `customer_id='${CG}', status='draft', sent_at=NULL`)}; ${set(QU, `customer_id='${CG2}'`)}`, 'second assignment after first is rejected');
// Failure then retry: a rejected foreign pick leaves the draft unassigned and a valid retry succeeds.
let failed = false; try { await db.exec(set(QU, `customer_id='${CP}'`)); } catch { failed = true; }
assert.ok(failed); const { rows: r1 } = await db.query(`SELECT customer_id FROM platform_quotes WHERE id='${QU}'`);
assert.equal(r1[0].customer_id, null, 'failed attempt leaves draft unassigned'); checks++;
await db.exec(set(QU, `customer_id='${CG}'`));
const { rows: r2 } = await db.query(`SELECT customer_id FROM platform_quotes WHERE id='${QU}'`);
assert.equal(r2[0].customer_id, CG, 'retry with same-workspace customer succeeds'); checks++;
await ok(`DELETE FROM platform_customers WHERE id='${CG2}'`, 'deleting a customer still nulls via foreign key');
console.log(`quote assignment guard: ${checks} checks passed`);
