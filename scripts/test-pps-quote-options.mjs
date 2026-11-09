// Isolated PGlite check of PPS customer quote options (migration 0016): PPS optional lines allowed,
// empty selections refused, stale/tampered ids refused, deposit from the selection, idempotent approval,
// and the PPS snapshot auto-invoice (chosen lines only, exactly once, never for GCP).
// Runs the real migration SQL against a throwaway database; no production connection is used.
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
CREATE TABLE public.businesses (id uuid PRIMARY KEY, shortcode text);
CREATE TABLE public.platform_customers (id uuid PRIMARY KEY, business_id uuid, display_name text);
CREATE TABLE public.platform_properties (id uuid PRIMARY KEY, address_1 text, city text, state text, zip text);
CREATE TABLE public.platform_quotes (id uuid PRIMARY KEY, business_id uuid, customer_id uuid, property_id uuid, quote_number text, status text,
  subtotal numeric, tax_rate numeric DEFAULT 0, tax_total numeric DEFAULT 0, discount_total numeric DEFAULT 0, total numeric,
  deposit_required_flag boolean, deposit_type text, deposit_value numeric, deposit_amount_calculated numeric,
  accepted_snapshot jsonb, approved_by text, approved_at timestamptz, accepted_at timestamptz, version_number int DEFAULT 1,
  scope_of_work text, public_notes text, valid_until date, billing_name text, created_at timestamptz DEFAULT now(), deleted_at timestamptz);
CREATE TABLE public.platform_quote_line_items (id uuid PRIMARY KEY, quote_id uuid, business_id uuid, description text, quantity numeric, unit text,
  unit_price numeric, discount_amount numeric DEFAULT 0, taxable_flag boolean DEFAULT true, line_total numeric, sort_order int, line_type text,
  option_kind text DEFAULT 'required', option_group text, default_selected boolean, customer_selected boolean);
CREATE TABLE public.platform_invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid, invoice_number text, customer_id uuid, property_id uuid,
  quote_id uuid, status text, issue_date date, due_date date, terms text, subtotal numeric, tax_rate numeric, tax_total numeric, discount_total numeric,
  total numeric, balance_due numeric, amount_paid numeric, public_notes text, internal_notes text, billing_name text, deposit_required boolean, deleted_at timestamptz,
  created_at timestamptz DEFAULT now());
CREATE TABLE public.platform_invoice_line_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid, invoice_id uuid, description text,
  quantity numeric, unit text, unit_price numeric, taxable_flag boolean, line_total numeric, sort_order int);
CREATE SEQUENCE inv_seq;
CREATE FUNCTION public.generate_next_number(_business_id uuid, _record_type text) RETURNS text LANGUAGE sql AS $$ SELECT 'INV-' || nextval('inv_seq') $$;
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
`);
const sql = await fs.readFile(new URL('../drizzle/migrations/0016_pps_quote_options.sql', import.meta.url), 'utf8');
await db.exec(sql);
await db.exec(`CREATE TRIGGER guard BEFORE INSERT OR UPDATE OR DELETE ON public.platform_quote_line_items FOR EACH ROW EXECUTE FUNCTION public.guard_quote_line_options();`);

const G = '00000000-0000-0000-0000-000000000001', P = '00000000-0000-0000-0000-000000000002', X = '00000000-0000-0000-0000-000000000009';
const C = 'c0000000-0000-0000-0000-000000000001', Q = 'a0000000-0000-0000-0000-000000000001', QG = 'a0000000-0000-0000-0000-000000000002';
const PATIO = 'e0000000-0000-0000-0000-000000000001', GARAGE = 'e0000000-0000-0000-0000-000000000002', OTHER = 'e0000000-0000-0000-0000-000000000099';
await db.exec(`
INSERT INTO businesses VALUES ('${G}','GCP'),('${P}','PPS'),('${X}','OTHER');
INSERT INTO platform_customers VALUES ('${C}','${P}','Fixture');
INSERT INTO platform_quotes (id,business_id,customer_id,quote_number,status,subtotal,total,deposit_required_flag,deposit_type,deposit_value,deposit_amount_calculated)
 VALUES ('${Q}','${P}','${C}','PPS-T','sent',10875,10875,true,'percentage',25,2718.75),
        ('${QG}','${G}','${C}','GCP-T','sent',1300,1300,false,null,null,0);
INSERT INTO platform_quote_line_items (id,quote_id,business_id,description,quantity,unit,unit_price,line_total,sort_order,option_kind,default_selected) VALUES
 ('${PATIO}','${Q}','${P}','Patio',605,'sq ft',7.5,4537.5,0,'optional',true),
 ('${GARAGE}','${Q}','${P}','Garage',975,'sq ft',6.5,6337.5,1,'optional',true);
`);
let checks = 0;
const fails = async (s, pattern, m) => { let msg = ''; try { await db.exec(`BEGIN; ${s};`); } catch (e) { msg = e.message; } await db.exec('ROLLBACK;'); assert.match(msg, pattern, m); checks++; };
const fp = `public.quote_pricing_fingerprint('${Q}')`;
const approve = (sel, f = fp) => `SELECT public.approve_quote_options('${Q}','Pat',ARRAY[${sel.map(s => `'${s}'`).join(',')}]::uuid[],${f})`;

await fails(`INSERT INTO platform_quote_line_items (id,quote_id,business_id,description,quantity,unit_price,line_total,option_kind) VALUES (gen_random_uuid(),'${Q}','${X}','x',1,1,1,'optional')`, /only available/, 'other businesses still cannot offer options');
const { rows: pub } = await db.query(`SELECT public.quote_public_pricing('${Q}') AS r`);
assert.equal(pub[0].r.quote.deposit_type, 'percentage'); assert.equal(Number(pub[0].r.quote.deposit_value), 25); checks++;
await fails(approve([]), /quote_nothing_selected/, 'empty selection refused');
await fails(approve([OTHER]), /quote_invalid_option/, 'tampered id refused');
await fails(approve([PATIO], `'stale'`), /quote_stale/, 'stale fingerprint refused');
const { rows: fp1 } = await db.query(`SELECT ${fp} AS f`);
await db.exec(`BEGIN; UPDATE platform_quotes SET deposit_value=50 WHERE id='${Q}';`);
const { rows: fp2 } = await db.query(`SELECT ${fp} AS f`); await db.exec('ROLLBACK;');
assert.notEqual(fp1[0].f, fp2[0].f, 'deposit plan changes invalidate the fingerprint'); checks++;

for (const [sel, total, dep] of [[[PATIO, GARAGE], 10875, 2718.75], [[GARAGE], 6337.5, 1584.38]]) {
  await db.exec('BEGIN;');
  const { rows } = await db.query(`${approve(sel)} AS r`);
  assert.equal(Number(rows[0].r.snapshot.total), total); assert.equal(Number(rows[0].r.snapshot.deposit_amount), dep); checks++;
  await db.exec('ROLLBACK;');
}
// Patio only: approve, retry idempotently, auto-invoice twice -> one invoice with only the patio.
const { rows: a } = await db.query(`${approve([PATIO])} AS r`);
assert.equal(a[0].r.status, 'approved'); assert.equal(Number(a[0].r.snapshot.total), 4537.5); assert.equal(Number(a[0].r.snapshot.deposit_amount), 1134.38); checks++;
const { rows: again } = await db.query(`${approve([PATIO], `'whatever'`)} AS r`);
assert.equal(again[0].r.status, 'already_approved'); checks++;
await fails(approve([GARAGE]), /quote_already_approved/, 'different selection after approval refused');
await fails(`UPDATE platform_quote_line_items SET unit_price=1 WHERE id='${GARAGE}'`, /accepted/, 'accepted lines are immutable');
const { rows: i1 } = await db.query(`SELECT public.invoice_accepted_quote_on_approval('${Q}') AS r`);
const { rows: i2 } = await db.query(`SELECT public.invoice_accepted_quote_on_approval('${Q}') AS r`);
assert.equal(i1[0].r.status, 'created'); assert.equal(i2[0].r.status, 'existing'); assert.equal(i2[0].r.invoice_id, i1[0].r.invoice_id); checks++;
const { rows: inv } = await db.query(`SELECT total, balance_due, (SELECT array_agg(description) FROM platform_invoice_line_items WHERE invoice_id=i.id) d, (SELECT count(*) FROM platform_invoices) n FROM platform_invoices i`);
assert.equal(Number(inv[0].total), 4537.5); assert.equal(Number(inv[0].balance_due), 4537.5); assert.deepEqual(inv[0].d, ['Patio']); assert.equal(Number(inv[0].n), 1); checks++;
const { rows: st } = await db.query(`SELECT status FROM platform_quotes WHERE id='${Q}'`); assert.equal(st[0].status, 'won'); checks++;
await fails(`SELECT public.invoice_accepted_quote_on_approval('${QG}')`, /Only Prestige/, 'GCP approvals never auto-invoice');
const { rows: acl } = await db.query(`SELECT has_function_privilege('anon','public.invoice_accepted_quote_on_approval(uuid)','EXECUTE') a, has_function_privilege('authenticated','public.invoice_accepted_quote_on_approval(uuid)','EXECUTE') b, has_function_privilege('service_role','public.invoice_accepted_quote_on_approval(uuid)','EXECUTE') c`);
assert.deepEqual([acl[0].a, acl[0].b, acl[0].c], [false, false, true], 'auto-invoice is service-role only'); checks++;
console.log(`pps quote options: ${checks} checks passed`);
