// Isolated PGlite check of PPS option-quote deposit accounting (migration 0017) on top of 0016: PPS optional lines allowed,
// empty selections refused, stale/tampered ids refused, deposit from the selection, idempotent approval,
// and the PPS snapshot auto-invoice (chosen lines only, exactly once, never for GCP).
// Runs the real migration SQL against a throwaway database; no production connection is used.
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
CREATE TABLE public.businesses (id uuid PRIMARY KEY, shortcode text);
CREATE TABLE public.platform_customers (id uuid PRIMARY KEY, business_id uuid, display_name text, email text, phone text);
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
  total numeric, balance_due numeric, amount_paid numeric, public_notes text, internal_notes text, billing_name text, deposit_required boolean, deposit_amount numeric, deposit_paid boolean, deleted_at timestamptz,
  created_at timestamptz DEFAULT now());
CREATE TABLE public.platform_invoice_line_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid, invoice_id uuid, description text,
  quantity numeric, unit text, unit_price numeric, taxable_flag boolean, line_total numeric, sort_order int);
CREATE SEQUENCE inv_seq;
CREATE FUNCTION public.generate_next_number(_business_id uuid, _record_type text) RETURNS text LANGUAGE sql AS $$ SELECT 'INV-' || nextval('public.inv_seq') $$;
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
`);
const sql = await fs.readFile(new URL('../drizzle/migrations/0016_pps_quote_options.sql', import.meta.url), 'utf8');
await db.exec(sql);
await db.exec(await fs.readFile(new URL('../drizzle/migrations/0017_pps_option_deposit_same_invoice.sql', import.meta.url), 'utf8'));
await db.exec(`CREATE TRIGGER guard BEFORE INSERT OR UPDATE OR DELETE ON public.platform_quote_line_items FOR EACH ROW EXECUTE FUNCTION public.guard_quote_line_options();`);

const G = '00000000-0000-0000-0000-000000000001', P = '00000000-0000-0000-0000-000000000002', X = '00000000-0000-0000-0000-000000000009';
const C = 'c0000000-0000-0000-0000-000000000001', Q = 'a0000000-0000-0000-0000-000000000001', QG = 'a0000000-0000-0000-0000-000000000002';
const PATIO = 'e0000000-0000-0000-0000-000000000001', GARAGE = 'e0000000-0000-0000-0000-000000000002', OTHER = 'e0000000-0000-0000-0000-000000000099';
await db.exec(`
INSERT INTO businesses VALUES ('${G}','GCP'),('${P}','PPS'),('${X}','OTHER');
INSERT INTO platform_customers (id,business_id,display_name) VALUES ('${C}','${P}','Fixture');
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
const approve = (sel) => `SELECT public.approve_quote_options('${Q}','Pat',ARRAY[${sel.map(s => `'${s}'`).join(',')}]::uuid[],${fp})`;
const one = async (q) => (await db.query(q)).rows[0];
// Mirrors stripe-webhook crediting (integer cents) against meta.invoice_id.
const credit = async (inv, amount, deposit) => {
  const i = await one(`SELECT total, amount_paid FROM platform_invoices WHERE id='${inv}'`);
  const paid = Math.round(Number(i.amount_paid) * 100) + Math.round(amount * 100), tot = Math.round(Number(i.total) * 100);
  await db.query(`UPDATE platform_invoices SET amount_paid=$1, balance_due=$2, status=$3 ${deposit ? ', deposit_paid=true' : ''} WHERE id=$4`,
    [paid / 100, Math.max(0, tot - paid) / 100, tot - paid <= 1 ? 'paid' : 'partial', inv]);
};

// Both selected: one full invoice, deposit recorded on it, charge = 271875 cents.
await db.exec('BEGIN;');
await db.query(`${approve([PATIO, GARAGE])}`);
const both = (await one(`SELECT public.quote_deposit_checkout_target('${Q}') AS r`)).r;
const bi = await one(`SELECT total, deposit_required, deposit_amount, (SELECT count(*) FROM platform_invoices) n FROM platform_invoices WHERE id='${both.invoice_id}'`);
assert.deepEqual([Number(bi.total), bi.deposit_required, Number(bi.deposit_amount), Number(bi.n), both.charge_cents], [10875, true, 2718.75, 1, 271875]); checks++;
await db.exec('ROLLBACK;');

// Patio only.
await db.query(approve([PATIO]));
const a1 = (await one(`SELECT public.invoice_accepted_quote_on_approval('${Q}') AS r`)).r;
const a2 = (await one(`SELECT public.invoice_accepted_quote_on_approval('${Q}') AS r`)).r;
assert.equal(a2.status, 'existing'); assert.equal(a2.invoice_id, a1.invoice_id); checks++; // approval retry: no second invoice
const t1 = (await one(`SELECT public.quote_deposit_checkout_target('${Q}') AS r`)).r;
const t2 = (await one(`SELECT public.quote_deposit_checkout_target('${Q}') AS r`)).r;
assert.equal(t1.invoice_id, a1.invoice_id); assert.equal(t2.invoice_id, a1.invoice_id); assert.equal(t1.charge_cents, 113438); checks++;
const pi = await one(`SELECT total, deposit_amount, (SELECT array_agg(description) FROM platform_invoice_line_items WHERE invoice_id=i.id) d, (SELECT count(*) FROM platform_invoices) n FROM platform_invoices i WHERE id='${a1.invoice_id}'`);
assert.deepEqual([Number(pi.total), Number(pi.deposit_amount), pi.d, Number(pi.n)], [4537.5, 1134.38, ['Patio'], 1]); checks++;
// Partial payment toward the deposit: only the remainder is still owed.
await db.exec('BEGIN;'); await credit(a1.invoice_id, 100, false);
assert.equal((await one(`SELECT public.quote_deposit_checkout_target('${Q}') AS r`)).r.charge_cents, 103438); checks++;
await db.exec('ROLLBACK;');
// Webhook credits the deposit against the SAME invoice.
await credit(a1.invoice_id, t1.charge_cents / 100, true);
const paid = await one(`SELECT amount_paid, balance_due, status, deposit_paid, (SELECT count(*) FROM platform_invoices) n FROM platform_invoices WHERE id='${a1.invoice_id}'`);
assert.deepEqual([Number(paid.amount_paid), Number(paid.balance_due), paid.status, paid.deposit_paid, Number(paid.n)], [1134.38, 3403.12, 'partial', true, 1]); checks++;
await fails(`SELECT public.quote_deposit_checkout_target('${Q}')`, /deposit_already_paid/, 'second deposit checkout refused once paid');
const ap = (await one(`SELECT public.invoice_accepted_quote_on_approval('${Q}') AS r`)).r;
assert.equal(ap.invoice_id, a1.invoice_id); assert.equal(Number((await one('SELECT count(*) n FROM platform_invoices')).n), 1); checks++;
// GCP: never auto-invoiced, never quote-deposit payable.
await db.exec(`UPDATE platform_quotes SET accepted_snapshot='{"total":1300,"lines":[]}', deposit_required_flag=true WHERE id='${QG}'`);
await fails(`SELECT public.quote_deposit_checkout_target('${QG}')`, /quote_not_payable/, 'GCP quote deposit checkout refused');
await fails(`SELECT public.invoice_accepted_quote_on_approval('${QG}')`, /Only Prestige/, 'GCP never auto-invoices');
const acl = await one(`SELECT has_function_privilege('anon','public.quote_deposit_checkout_target(uuid)','EXECUTE') a, has_function_privilege('authenticated','public.quote_deposit_checkout_target(uuid)','EXECUTE') b, has_function_privilege('service_role','public.quote_deposit_checkout_target(uuid)','EXECUTE') c, has_function_privilege('authenticated','public.invoice_accepted_quote_on_approval(uuid)','EXECUTE') d`);
assert.deepEqual([acl.a, acl.b, acl.c, acl.d], [false, false, true, false]); checks++;
console.log(`pps deposit accounting: ${checks} checks passed`);
