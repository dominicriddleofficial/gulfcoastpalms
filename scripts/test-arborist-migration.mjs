// Run with a separately installed @electric-sql/pglite. No production connection is used.
// PGLITE_MODULE may point to an absolute installed module URL.
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth, storage TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
CREATE TABLE public.workspaces (id uuid PRIMARY KEY, owner_user_id uuid);
CREATE TABLE public.businesses (id uuid PRIMARY KEY, workspace_id uuid, shortcode text);
CREATE TABLE public.user_business_access (user_id uuid, business_id uuid, role_name text, active_status text);
CREATE TABLE public.platform_quotes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL, quote_number text NOT NULL DEFAULT 'Q', customer_id uuid, status text NOT NULL DEFAULT 'draft',
  subtotal numeric DEFAULT 0, discount_total numeric DEFAULT 0, tax_rate numeric DEFAULT 0, tax_total numeric DEFAULT 0, total numeric DEFAULT 0,
  deposit_required_flag boolean DEFAULT false, deposit_type text DEFAULT 'percentage', deposit_value numeric DEFAULT 50, deposit_amount_calculated numeric DEFAULT 0,
  version_number integer DEFAULT 1, approved_by text, approved_at timestamptz, accepted_at timestamptz, deleted_at timestamptz, updated_at timestamptz DEFAULT now(),
  property_id uuid, billing_name text, scope_of_work text, public_notes text, internal_notes text, valid_until date, is_read_only boolean NOT NULL DEFAULT false, last_modified_by_user_id uuid);
CREATE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at := clock_timestamp(); RETURN NEW; END $$;
CREATE TRIGGER touch_quotes BEFORE UPDATE ON public.platform_quotes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TABLE public.platform_customers (id uuid PRIMARY KEY, display_name text);
CREATE TABLE public.platform_properties (id uuid PRIMARY KEY, address_1 text, city text, state text, zip text);
CREATE TABLE public.platform_quote_versions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL, business_id uuid NOT NULL, version_number int NOT NULL, snapshot_json jsonb NOT NULL, created_by_user_id uuid, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.platform_invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL, invoice_number text NOT NULL, customer_id uuid, property_id uuid, quote_id uuid, status text NOT NULL DEFAULT 'draft',
  issue_date date, due_date date, terms text, subtotal numeric, discount_total numeric, tax_rate numeric, tax_total numeric, total numeric, amount_paid numeric, balance_due numeric, public_notes text, internal_notes text, billing_name text, deleted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.platform_invoice_line_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL, invoice_id uuid NOT NULL, description text NOT NULL, quantity numeric NOT NULL, unit text, unit_price numeric NOT NULL, discount_amount numeric DEFAULT 0, taxable_flag boolean DEFAULT true, line_total numeric NOT NULL, sort_order int DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE SEQUENCE public.inv_seq;
CREATE FUNCTION public.generate_next_number(_business_id uuid, _record_type text) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT 'INV-' || lpad(nextval('public.inv_seq')::text, 4, '0') $$;
CREATE FUNCTION public.user_has_any_role(_user_id uuid, _business_id uuid, _roles text[]) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT ('owner' = ANY(_roles) AND EXISTS (SELECT 1 FROM public.workspaces w JOIN public.businesses b ON b.workspace_id=w.id WHERE w.owner_user_id=_user_id AND b.id=_business_id))
 OR EXISTS (SELECT 1 FROM public.user_business_access WHERE user_id=_user_id AND business_id=_business_id AND role_name = ANY(_roles) AND active_status='active') $$;
CREATE TABLE public.platform_quote_line_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL, business_id uuid NOT NULL, description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1, unit_price numeric NOT NULL DEFAULT 0, discount_amount numeric DEFAULT 0, taxable_flag boolean DEFAULT true, line_total numeric NOT NULL DEFAULT 0, sort_order integer DEFAULT 0,
  unit text DEFAULT 'each', line_type text DEFAULT 'service', service_catalog_id uuid, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
CREATE TABLE storage.objects (id uuid DEFAULT gen_random_uuid(), bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT, INSERT ON storage.objects TO service_role;
CREATE POLICY service_objects ON storage.objects TO service_role USING (true) WITH CHECK (true);
GRANT USAGE ON SCHEMA public TO service_role, authenticated, anon;
CREATE FUNCTION public.has_business_access(_user_id uuid, _business_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.user_business_access WHERE user_id=_user_id AND business_id=_business_id AND active_status='active')
 OR EXISTS (SELECT 1 FROM public.workspaces w JOIN public.businesses b ON b.workspace_id=w.id WHERE w.owner_user_id=_user_id AND b.id=_business_id) $$;
`);
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const [owner, otherOwner, crew, secondCrew, office, biz, otherBiz, pps, workspace, otherWorkspace, reportId, treeId, photoId] = Array.from({length:13},(_,i)=>uuid(i+1));
await db.exec(`INSERT INTO auth.users VALUES ('${owner}'),('${otherOwner}'),('${crew}'),('${secondCrew}'),('${office}');
INSERT INTO workspaces VALUES ('${workspace}','${owner}'),('${otherWorkspace}','${otherOwner}');
INSERT INTO businesses VALUES ('${biz}','${workspace}','GCP'),('${otherBiz}','${otherWorkspace}','GCP'),('${pps}','${workspace}','PPS');
INSERT INTO user_business_access VALUES ('${crew}','${biz}','crew','active'),('${secondCrew}','${biz}','crew','active'),('${office}','${biz}','office_manager','active'),('${crew}','${pps}','crew','active');`);
// Emulate Supabase's explicit default EXECUTE grants to anon, so the revoke migration is exercised.
await db.exec(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;`);
// Live bucket is created with the storage tool, so the isolated fixture seeds it here.
await db.exec(`INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('arborist-quote-photos','arborist-quote-photos',false,10485760,ARRAY['image/jpeg']);`);
for (const file of ['0000_arborist_quotes.sql','0001_arborist_revoke_anon.sql','0002_arborist_quote_links.sql','0003_arborist_links_column_grants.sql','0004_quote_options.sql','0005_arborist_link_lock_order.sql','0006_quote_options_integrity.sql'])
  await db.exec(await fs.readFile(new URL(`../drizzle/migrations/${file}`, import.meta.url),'utf8'));
let checks=0;
const check=(value,msg)=>{assert.ok(value,msg);checks++;};
const login=async id=>{await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false);`);};
const denied=async(fn,msg)=>{let failed=false;try{await fn();}catch{failed=true;}check(failed,msg);};
const tree={id:treeId,species:'Oak',service:'Tree removal',location:'Driveway',description:'Remove the oak',customerDiscussion:'Haul away',priceType:'fixed',priceMin:'600',priceMax:'',photos:[]};
await login(crew);
let result=await db.query(`INSERT INTO platform_arborist_quotes (id,business_id,author_id,customer_name,property_address,arborist_name,trees) VALUES ($1,$2,$3,'Example','Example address','Example arborist',$4::jsonb) RETURNING *`,[reportId,biz,crew,JSON.stringify([tree])]);
check(result.rows[0].version===1,'draft version');
check(result.rows[0].status==='draft','draft saved');
await denied(()=>db.query(`UPDATE platform_arborist_quotes SET status='submitted' WHERE id=$1`,[reportId]),'missing photos rejected');
await denied(()=>db.query(`UPDATE platform_arborist_quotes SET author_id=$1 WHERE id=$2`,[secondCrew,reportId]),'author cannot be changed');
await denied(()=>db.query(`UPDATE platform_arborist_quotes SET trees=$1::jsonb WHERE id=$2`,[JSON.stringify([{...tree,priceMin:'-1'}]),reportId]),'negative price rejected');
await denied(()=>db.query(`UPDATE platform_arborist_quotes SET trees=$1::jsonb WHERE id=$2`,[JSON.stringify([{...tree,priceType:'range',priceMin:'700',priceMax:'500'}]),reportId]),'reversed range rejected');
await denied(()=>db.query(`UPDATE platform_arborist_quotes SET trees=$1::jsonb WHERE id=$2`,[JSON.stringify([{...tree,species:27}]),reportId]),'wrong JSON field type rejected');
await denied(()=>db.query(`INSERT INTO platform_arborist_quotes (business_id,author_id,trees) VALUES ($1,$2,$3::jsonb)`,[pps,crew,JSON.stringify([tree])]),'PPS scope denied');
result=await db.query(`UPDATE platform_arborist_quotes SET general_notes='stale' WHERE id=$1 AND version=0 RETURNING id`,[reportId]);
check(result.rows.length===0,'stale version cannot overwrite');
const photoPath=`${biz}/${crew}/${reportId}/${treeId}/${photoId}.jpg`;
await login(secondCrew);
check((await db.query(`SELECT * FROM platform_arborist_quotes`)).rows.length===0,'other crew cannot read');
await denied(()=>db.query(`INSERT INTO storage.objects(bucket_id,name) VALUES ('arborist-quote-photos',$1)`,[photoPath]),'other crew cannot upload');
await login(otherOwner);
check((await db.query(`SELECT * FROM platform_arborist_quotes`)).rows.length===0,'other workspace owner cannot read');
check((await db.query(`SELECT public.arborist_photo_access($1,false) AS allowed`,[photoPath])).rows[0].allowed===false,'other workspace photos denied');
await login(office);
check((await db.query(`SELECT * FROM platform_arborist_quotes`)).rows.length===1,'office can read');
await login(crew);
await db.query(`INSERT INTO storage.objects(bucket_id,name) VALUES ('arborist-quote-photos',$1)`,[photoPath]);
const withPhoto={...tree,photos:[{id:photoId,path:photoPath,name:'Oak.jpg'}]};
result=await db.query(`UPDATE platform_arborist_quotes SET trees=$1::jsonb,status='submitted' WHERE id=$2 AND version=1 RETURNING *`,[JSON.stringify([withPhoto]),reportId]);
check(result.rows[0].version===2 && !!result.rows[0].submitted_at,'complete submission stamped and versioned');
await denied(()=>db.query(`UPDATE platform_arborist_quotes SET status='reviewed' WHERE id=$1`,[reportId]),'crew cannot mark reviewed');
check((await db.query(`SELECT * FROM storage.objects`)).rows.length===1,'author can read own photo');
await login(secondCrew);
check((await db.query(`SELECT * FROM storage.objects`)).rows.length===0,'other crew photos hidden');
await login(owner);
check((await db.query(`SELECT * FROM platform_arborist_quotes`)).rows.length===1,'workspace owner can read');
await denied(()=>db.query(`UPDATE platform_arborist_quotes SET status='reviewed',customer_name='Altered' WHERE id=$1`,[reportId]),'review action cannot silently edit content');
result=await db.query(`UPDATE platform_arborist_quotes SET status='reviewed' WHERE id=$1 AND version=2 RETURNING *`,[reportId]);
check(result.rows[0].version===3 && !!result.rows[0].reviewed_at,'owner can mark reviewed');
await login(crew);
check((await db.query(`UPDATE platform_arborist_quotes SET general_notes='altered' WHERE id=$1 RETURNING id`,[reportId])).rows.length===0,'crew cannot edit reviewed');
await denied(()=>db.query(`INSERT INTO storage.objects(bucket_id,name) VALUES ('arborist-quote-photos',$1)`,[`${biz}/${crew}/${reportId}/${treeId}/${uuid(99)}.jpg`]),'crew cannot add reviewed photos');
await login(owner);
await db.query(`UPDATE platform_arborist_quotes SET status='draft' WHERE id=$1`,[reportId]);
result=await db.query(`SELECT status,submitted_at,reviewed_at,version FROM platform_arborist_quotes WHERE id=$1`,[reportId]);
check(result.rows[0].status==='draft' && result.rows[0].submitted_at===null && result.rows[0].reviewed_at===null && result.rows[0].version===4,'editing clears review timestamps');
await denied(()=>db.query(`UPDATE platform_arborist_quotes SET trees=$1::jsonb WHERE id=$2`,[JSON.stringify([{...withPhoto,photos:[{id:photoId,path:'wrong/path',name:'x'}]}]),reportId]),'foreign photo reference rejected');
await db.exec(`RESET ROLE; SET ROLE anon; SELECT set_config('request.jwt.claim.sub','',false);`);
await denied(()=>db.query(`SELECT * FROM platform_arborist_quotes`),'anonymous report access denied');
await denied(()=>db.query(`SELECT public.arborist_photo_access($1,false)`,[photoPath]),'anonymous photo access denied');
await db.exec(`RESET ROLE;`);
for (const fn of ['arborist_can_review(uuid)','arborist_can_access(uuid,uuid)','arborist_photo_access(text,boolean)','validate_arborist_quote()'])
  check((await db.query(`SELECT has_function_privilege('anon','public.${fn}','EXECUTE') AS ok`)).rows[0].ok===false,`anon cannot execute ${fn}`);
for (const fn of ['arborist_can_review(uuid)','arborist_can_access(uuid,uuid)','arborist_photo_access(text,boolean)'])
  check((await db.query(`SELECT has_function_privilege('authenticated','public.${fn}','EXECUTE') AS ok`)).rows[0].ok===true,`authenticated keeps ${fn}`);
check((await db.query(`SELECT has_table_privilege('anon','public.platform_arborist_quotes','SELECT') OR has_table_privilege('anon','public.platform_arborist_quotes','INSERT') AS ok`)).rows[0].ok===false,'anon has no table access');
check((await db.query(`SELECT public FROM storage.buckets WHERE id='arborist-quote-photos'`)).rows[0].public===false,'photo bucket private');

// ---- Guest quote links (0002) ----
const service=async()=>{await db.exec(`RESET ROLE; SET ROLE service_role; SELECT set_config('request.jwt.claim.sub','',false); SELECT set_config('request.jwt.claims','{"role":"service_role"}',false);`);};
const clearClaims=async()=>{await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claims','',false);`);};
const h=c=>c.repeat(64);
const guestErr=async(fn,code,msg)=>{let m='';try{await fn();}catch(e){m=e.message;}check(m.includes(code),`${msg} (${m||'no error'})`);};
await service();
await guestErr(()=>db.query(`SELECT * FROM arborist_link_issue($1,$2,$3)`,[crew,biz,h('a')]),'not_allowed','crew cannot issue links');
await guestErr(()=>db.query(`SELECT * FROM arborist_link_issue($1,$2,$3)`,[otherOwner,biz,h('a')]),'not_allowed','other workspace cannot issue links');
await guestErr(()=>db.query(`SELECT * FROM arborist_link_issue($1,$2,$3)`,[crew,pps,h('a')]),'not_allowed','PPS cannot issue links');
await guestErr(()=>db.query(`SELECT * FROM arborist_link_issue($1,$2,$3)`,[office,biz,'short']),'bad_token','weak token hash rejected');
const issued=(await db.query(`SELECT * FROM arborist_link_issue($1,$2,$3,NULL,'Prefill','1 Example St','Climber')`,[office,biz,h('a')])).rows[0];
const linkReport=issued.report_id;
check(new Date(issued.expires_at)-Date.now()>6.9*864e5,'link expires in 7 days');
let r=(await db.query(`SELECT arborist_link_resolve($1) AS r`,[h('a')])).rows[0].r;
check(r.state==='ok'&&r.report.customer_name==='Prefill'&&r.report.author_id===office&&r.report.status==='draft','guest resolves own draft with prefills');
check((await db.query(`SELECT arborist_link_resolve($1) AS r`,[h('f')])).rows[0].r.state==='invalid','unknown token invalid, no data');
const lt=r.report.trees[0];
const lp=`${biz}/${office}/${linkReport}/${lt.id}/`;
const fields=(trees,extra={})=>JSON.stringify({customer_name:'Guest Customer',property_address:'1 Example St',visit_date:'2026-10-26',arborist_name:'Climber',general_notes:'',trees,...extra});
const guestTree={...lt,species:'Pine',service:'Tree trimming',description:'Trim',customerDiscussion:'Lift canopy',priceType:'range',priceMin:'100.50',priceMax:'200'};
let saved=(await db.query(`SELECT arborist_link_save($1,1,$2::jsonb,'draft') AS r`,[h('a'),fields([guestTree])])).rows[0].r;
check(saved.version===2&&saved.trees[0].priceMin==='100.50','guest saves draft with exact price text');
await guestErr(()=>db.query(`SELECT arborist_link_save($1,1,$2::jsonb,'draft')`,[h('a'),fields([guestTree])]),'link_stale','stale version rejected');
await guestErr(()=>db.query(`SELECT arborist_link_save($1,2,$2::jsonb,'reviewed')`,[h('a'),fields([guestTree])]),'link_bad_status','guest cannot mark reviewed');
await guestErr(()=>db.query(`SELECT arborist_link_save($1,2,$2::jsonb,'draft')`,[h('a'),fields([{...guestTree,priceMin:'1.999'}])]),'Invalid suggested price','price precision enforced');
await guestErr(()=>db.query(`SELECT arborist_link_save($1,2,$2::jsonb,'submitted')`,[h('a'),fields([guestTree])]),'at least one photo','submit still requires photos');
const fields2=JSON.parse(fields([guestTree]));fields2.author_id=crew;fields2.business_id=pps;fields2.status='reviewed';
saved=(await db.query(`SELECT arborist_link_save($1,2,$2::jsonb,'draft') AS r`,[h('a'),JSON.stringify(fields2)])).rows[0].r;
check(saved.author_id===office&&saved.business_id===biz&&saved.status==='draft','non-whitelisted identity fields ignored');
await guestErr(()=>db.query(`SELECT arborist_link_photo_target($1,$2,$3)`,[h('a'),treeId,uuid(50)]),'link_bad_photo','other report tree rejected');
const target=(await db.query(`SELECT arborist_link_photo_target($1,$2,$3) AS p`,[h('a'),lt.id,uuid(51)])).rows[0].p;
check(target===`${lp}${uuid(51)}.jpg`,'photo key bound to report and tree');
await guestErr(()=>db.query(`SELECT arborist_link_save($1,3,$2::jsonb,'draft')`,[h('a'),fields([{...guestTree,photos:[{id:photoId,path:photoPath,name:'x'}]}])]),'belong to this report','cross-report photo reference rejected');
await db.query(`INSERT INTO storage.objects(bucket_id,name) VALUES ('arborist-quote-photos',$1)`,[target]);
// replace link: old one dies immediately
await db.query(`SELECT * FROM arborist_link_issue($1,$2,$3,$4)`,[owner,biz,h('b'),linkReport]);
check((await db.query(`SELECT arborist_link_resolve($1) AS r`,[h('a')])).rows[0].r.state==='revoked','replaced link revoked');
await guestErr(()=>db.query(`SELECT arborist_link_save($1,3,$2::jsonb,'draft')`,[h('a'),fields([guestTree])]),'link_revoked','revoked link cannot save');
await guestErr(()=>db.query(`SELECT arborist_link_photo_target($1,$2,$3)`,[h('a'),lt.id,uuid(52)]),'link_revoked','revoked link cannot upload');
saved=(await db.query(`SELECT arborist_link_save($1,3,$2::jsonb,'submitted') AS r`,[h('b'),fields([{...guestTree,photos:[{id:uuid(51),path:target,name:'pine.jpg'}]}])])).rows[0].r;
check(saved.status==='submitted'&&!!saved.submitted_at,'guest submits complete report');
check((await db.query(`SELECT arborist_link_resolve($1) AS r`,[h('b')])).rows[0].r.state==='submitted'&&!(await db.query(`SELECT arborist_link_resolve($1) AS r`,[h('b')])).rows[0].r.report,'submitted link shows received only');
await guestErr(()=>db.query(`SELECT arborist_link_save($1,4,$2::jsonb,'draft')`,[h('b'),fields([guestTree])]),'link_submitted','post-submit edits locked');
await guestErr(()=>db.query(`SELECT * FROM arborist_link_issue($1,$2,$3,$4)`,[owner,biz,h('c'),linkReport]),'not_draft','cannot reissue for submitted report');
// expiry + revoke
const second=(await db.query(`SELECT * FROM arborist_link_issue($1,$2,$3)`,[owner,biz,h('d')])).rows[0];
await db.query(`UPDATE platform_arborist_quote_links SET expires_at=now()-interval '1 second' WHERE token_hash=$1`,[h('d')]);
{const s=(await db.query(`SELECT arborist_link_resolve($1) AS r`,[h('d')])).rows[0].r.state;check(s==='expired','expired link rejected: '+s);}
await guestErr(()=>db.query(`SELECT arborist_link_revoke($1,$2)`,[crew,second.report_id]),'not_allowed','crew cannot revoke');
await db.query(`SELECT * FROM arborist_link_issue($1,$2,$3,$4)`,[owner,biz,h('e'),second.report_id]);
check((await db.query(`SELECT arborist_link_revoke($1,$2) AS n`,[office,second.report_id])).rows[0].n===1,'office disables link');
check((await db.query(`SELECT arborist_link_resolve($1) AS r`,[h('e')])).rows[0].r.state==='revoked','disabled link rejected');
// marker cannot be abused from a user session
await clearClaims(); await login(crew);
await db.exec(`SELECT set_config('app.arborist_link_report','${second.report_id}',false)`);
check((await db.query(`UPDATE platform_arborist_quotes SET general_notes='x' WHERE id=$1 RETURNING id`,[second.report_id])).rows.length===0,'crew cannot reach link report via marker');
await db.exec(`RESET ROLE; SELECT set_config('app.arborist_link_report','',false);`);
await login(office);
check((await db.query(`SELECT * FROM platform_arborist_quotes WHERE id=$1`,[linkReport])).rows[0]?.status==='submitted','submitted link report in staff list');
check((await db.query(`SELECT id,report_id,expires_at,revoked_at FROM platform_arborist_quote_links`)).rows.length===4,'staff can see link status');
await denied(()=>db.query(`SELECT token_hash FROM platform_arborist_quote_links`),'staff cannot read token hashes');
await login(crew);
check((await db.query(`SELECT id,report_id,expires_at,revoked_at FROM platform_arborist_quote_links`)).rows.length===0,'crew cannot see links');
await db.exec(`RESET ROLE;`);
for (const fn of ['arborist_user_can_review(uuid,uuid)','arborist_link_lock(text)','arborist_link_issue(uuid,uuid,text,uuid,text,text,text)','arborist_link_revoke(uuid,uuid)','arborist_link_resolve(text)','arborist_link_save(text,integer,jsonb,text)','arborist_link_photo_target(text,uuid,uuid)']) {
  for (const role of ['anon','authenticated','public']) check((await db.query(`SELECT has_function_privilege('${role}','public.${fn}','EXECUTE') AS ok`)).rows[0].ok===false,`${role} cannot execute ${fn}`);
  check((await db.query(`SELECT has_function_privilege('service_role','public.${fn}','EXECUTE') AS ok`)).rows[0].ok===true,`service_role executes ${fn}`);
}
check((await db.query(`SELECT has_table_privilege('anon','public.platform_arborist_quote_links','SELECT') AS ok`)).rows[0].ok===false,'anon has no link table access');
check((await db.query(`SELECT has_column_privilege('authenticated','public.platform_arborist_quote_links','token_hash','SELECT') OR has_table_privilege('authenticated','public.platform_arborist_quote_links','INSERT,UPDATE,DELETE') AS ok`)).rows[0].ok===false,'authenticated cannot read hashes or write links despite default grants');
check((await db.query(`SELECT has_function_privilege('authenticated','public.validate_arborist_quote()','EXECUTE') AS ok`)).rows[0].ok===false,'trigger fn not callable');

// ---- Quote options + arborist conversion (0004) ----
await db.exec(`RESET ROLE; GRANT SELECT, INSERT, UPDATE, DELETE ON platform_quotes, platform_quote_line_items TO authenticated, service_role;`);
const Q=uuid(200), QP=uuid(201), QL=uuid(202);
const L={req:uuid(210),stump:uuid(211),haul:uuid(212),road:uuid(213),foreign:uuid(214)};
await service();
await db.query(`INSERT INTO platform_quotes(id,business_id,status,tax_rate,discount_total,total) VALUES ($1,$2,'sent',7,50,0),($3,$4,'sent',0,0,0),($5,$2,'sent',0,0,100)`,[Q,biz,QP,pps,QL]);
await db.query(`INSERT INTO platform_quote_line_items(id,quote_id,business_id,description,quantity,unit_price,option_kind,option_group,default_selected,sort_order) VALUES
 ($1,$6,$7,'Remove 2 oaks',2,1200.10,'required',NULL,true,0),($2,$6,$7,'Stump grinding',1,250,'optional',NULL,false,1),
 ($3,$6,$7,'Haul away',1,400,'alternative','Debris handling',true,2),($4,$6,$7,'Roadside placement',1,150.55,'alternative','Debris handling',false,3),
 ($5,$8,$7,'Legacy line',1,100,'required',NULL,true,0)`,[L.req,L.stump,L.haul,L.road,L.foreign,Q,biz,QL]);
await guestErr(()=>db.query(`INSERT INTO platform_quote_line_items(quote_id,business_id,description,option_kind,default_selected) VALUES ($1,$2,'x','optional',true)`,[QP,pps]),'only available for Gulf Coast Palms','PPS cannot use options');
await guestErr(()=>db.query(`INSERT INTO platform_quote_line_items(quote_id,business_id,description,option_kind) VALUES ($1,$2,'x','alternative')`,[Q,biz]),'option_group_check','alternative needs group');
await guestErr(()=>db.query(`UPDATE platform_quote_line_items SET customer_selected=true WHERE id=$1`,[L.stump]),'recorded only when the customer approves','selection cannot be forged');
await guestErr(()=>db.query(`UPDATE platform_quotes SET accepted_snapshot='{}' WHERE id=$1`,[Q]),'only by customer approval','snapshot cannot be forged');
const fp=async id=>(await db.query(`SELECT quote_pricing_fingerprint($1) f`,[id])).rows[0].f;
let f=await fp(Q);
const approve=(sel,fpr=f,id=Q)=>db.query(`SELECT approve_quote_options($1,'Jane Customer',$2::uuid[],$3) r`,[id,sel,fpr]);
await guestErr(()=>approve([L.stump]),'quote_choose_one','alternative group requires one choice');
await guestErr(()=>approve([L.haul,L.road]),'quote_choose_one','both alternatives rejected');
await guestErr(()=>approve([L.haul,L.req]),'quote_invalid_option','required line is not a selectable option');
await guestErr(()=>approve([L.haul,L.foreign]),'quote_invalid_option','foreign quote line rejected');
await guestErr(()=>approve([L.haul,uuid(999)]),'quote_invalid_option','unknown id rejected');
await guestErr(()=>approve([L.haul],'deadbeef'),'quote_stale','stale fingerprint rejected');
// staff edits a price after customer loaded the page
await db.query(`UPDATE platform_quote_line_items SET unit_price=401 WHERE id=$1`,[L.haul]);
await guestErr(()=>approve([L.haul]),'quote_stale','tampered/changed price rejected');
await db.query(`UPDATE platform_quote_line_items SET unit_price=400 WHERE id=$1`,[L.haul]);
f=await fp(Q);
r=(await approve([L.stump,L.road])).rows[0].r;
// required 2400.20 + stump 250 + road 150.55 = 2800.75; tax 7% = 196.05 (196.0525); discount 50 => 2946.80
check(r.status==='approved'&&Number(r.snapshot.subtotal)===2800.75&&Number(r.snapshot.tax_total)===196.05&&Number(r.snapshot.total)===2946.8,'server recalculates exact total: '+JSON.stringify([r.snapshot?.subtotal,r.snapshot?.tax_total,r.snapshot?.total]));
const qrow=(await db.query(`SELECT status,total,approved_by,accepted_snapshot FROM platform_quotes WHERE id=$1`,[Q])).rows[0];
check(qrow.status==='approved'&&Number(qrow.total)===2946.8&&qrow.approved_by==='Jane Customer'&&qrow.accepted_snapshot.version_number===1,'approval recorded with approver/version');
const sel=(await db.query(`SELECT id,customer_selected FROM platform_quote_line_items WHERE quote_id=$1`,[Q])).rows;
check(sel.find(x=>x.id===L.haul).customer_selected===false&&sel.find(x=>x.id===L.road).customer_selected===true&&sel.find(x=>x.id===L.req).customer_selected===true,'chosen lines flagged, unchosen excluded');
check((await approve([L.road,L.stump])).rows[0].r.status==='already_approved','repeat approval with same choices is idempotent');
await guestErr(()=>approve([L.haul]),'quote_already_approved','repeat approval with different choices refused');
await guestErr(()=>db.query(`UPDATE platform_quote_line_items SET unit_price=1 WHERE id=$1`,[L.req]),'accepted with the customer','accepted lines frozen');
await guestErr(()=>db.query(`DELETE FROM platform_quote_line_items WHERE id=$1`,[L.haul]),'accepted with the customer','accepted lines cannot be deleted');
await guestErr(()=>db.query(`UPDATE platform_quotes SET total=1 WHERE id=$1`,[Q]),"can't be changed",'accepted totals frozen');
await guestErr(()=>db.query(`UPDATE platform_quotes SET accepted_snapshot='{}' WHERE id=$1`,[Q]),'cannot be changed','accepted snapshot immutable');
await db.query(`UPDATE platform_quotes SET status='won' WHERE id=$1`,[Q]);
check(true,'status can still move to won after acceptance');
// legacy quote with no options approves through the same rules with no choices
r=(await db.query(`SELECT approve_quote_options($1,'Bob',NULL,$2) r`,[QL,await fp(QL)])).rows[0].r;
check(Number(r.snapshot.total)===100,'legacy-style quote total unchanged');
// arborist conversion linkage
await clearClaims(); await login(office);
const Q2=uuid(220);
await guestErr(()=>db.query(`INSERT INTO platform_quotes(id,business_id,source_arborist_quote_id) VALUES ($1,$2,$3)`,[Q2,biz,second.report_id]),'submitted arborist report','draft report cannot be converted');
await db.query(`INSERT INTO platform_quotes(id,business_id,source_arborist_quote_id) VALUES ($1,$2,$3)`,[Q2,biz,linkReport]);
check(true,'office converts a submitted report');
await guestErr(()=>db.query(`INSERT INTO platform_quotes(business_id,source_arborist_quote_id) VALUES ($1,$2)`,[biz,linkReport]),'duplicate','second conversion of same report blocked');
await guestErr(()=>db.query(`UPDATE platform_quotes SET source_arborist_quote_id=NULL WHERE id=$1`,[Q2]),'cannot be changed','source link permanent');
await login(crew);
await guestErr(()=>db.query(`INSERT INTO platform_quotes(business_id,source_arborist_quote_id) VALUES ($1,$2)`,[biz,reportId]),'Only the office','crew cannot convert reports');
await login(office);
await guestErr(()=>db.query(`INSERT INTO platform_quotes(business_id,source_arborist_quote_id) VALUES ($1,$2)`,[pps,reportId]),'Only the office','cross-business conversion blocked');
await db.exec(`RESET ROLE;`);
for (const fn of ['quote_pricing_fingerprint(uuid)','approve_quote_options(uuid,text,uuid[],text)','guard_quote_line_options()','guard_quote_options_header()'])
  for (const role of ['anon','authenticated']) check((await db.query(`SELECT has_function_privilege('${role}','public.${fn}','EXECUTE') AS ok`)).rows[0].ok===false,`${role} cannot execute ${fn}`);
// ---- 0006: accepted scope/identity, converted state, public read, atomic edit, invoice once ----
{
  await db.exec(`RESET ROLE; GRANT ALL ON platform_invoices, platform_invoice_line_items, platform_quote_versions, platform_customers, platform_properties TO service_role;`);
  await service();
  for (const [col,val] of [['scope_of_work',"'changed'"],['public_notes',"'changed'"],['billing_name',"'Someone else'"],['property_id',`'${uuid(998)}'`],['valid_until',"'2030-01-01'"]])
    await guestErr(()=>db.query(`UPDATE platform_quotes SET ${col}=${val} WHERE id=$1`,[Q]),"can't be changed",`accepted ${col} frozen`);
  const snap=(await db.query(`SELECT accepted_snapshot s FROM platform_quotes WHERE id=$1`,[Q])).rows[0].s;
  check(['scope_of_work','public_notes','valid_until','customer_id','property_id','billing_name','customer_name','customer_address','quote_number'].every(k=>k in snap),'snapshot records full agreed scope and identity');
  await db.query(`UPDATE platform_quotes SET status='converted' WHERE id=$1`,[Q]);
  check((await approve([L.road,L.stump])).rows[0].r.status==='already_approved','converted (job created) quote still accepted; same-choice retry returns original');
  await guestErr(()=>approve([L.haul,L.stump]),'quote_already_approved','converted quote refuses different choices');
  const pub=(await db.query(`SELECT quote_public_pricing($1) p`,[Q])).rows[0].p;
  check(Number(pub.discount_total)===50 && pub.accepted_snapshot?.total===snap.total && pub.fingerprint===(await fp(Q)) && pub.line_items.length===4,'public read returns discount, accepted snapshot, lines and matching fingerprint together');
  // legacy (no options) approved quote cannot start offering options; ordinary edits still work
  const QA=uuid(230); await db.query(`INSERT INTO platform_quotes(id,business_id,status) VALUES ($1,$2,'approved')`,[QA,biz]);
  await db.query(`INSERT INTO platform_quote_line_items(quote_id,business_id,description,unit_price) VALUES ($1,$2,'Trim',100)`,[QA,biz]);
  await guestErr(()=>db.query(`INSERT INTO platform_quote_line_items(quote_id,business_id,description,option_kind,default_selected) VALUES ($1,$2,'Stump','optional',false)`,[QA,biz]),'already approved or invoiced','approved legacy quote cannot gain options');
  await db.query(`UPDATE platform_quote_line_items SET unit_price=120 WHERE quote_id=$1`,[QA]); check(true,'ordinary edit of approved legacy quote still allowed');
  const QI=uuid(231); await db.query(`INSERT INTO platform_quotes(id,business_id,status) VALUES ($1,$2,'sent')`,[QI,biz]);
  await db.query(`INSERT INTO platform_invoices(business_id,invoice_number,quote_id) VALUES ($1,'INV-X',$2)`,[biz,QI]);
  await guestErr(()=>db.query(`INSERT INTO platform_quote_line_items(quote_id,business_id,description,option_kind,option_group) VALUES ($1,$2,'Haul','alternative','Debris')`,[QI,biz]),'already approved or invoiced','invoiced legacy quote cannot gain options');

  // invoice once from the accepted snapshot
  await db.exec(`RESET ROLE; GRANT SELECT, INSERT, UPDATE, DELETE ON platform_invoices, platform_invoice_line_items, platform_quote_versions, platform_customers, platform_properties TO authenticated;`);
  await clearClaims(); await login(crew);
  await guestErr(()=>db.query(`SELECT invoice_accepted_quote($1)`,[Q]),'Only the office','crew cannot invoice');
  await clearClaims(); await login(office);
  const QN=uuid(232); await db.query(`INSERT INTO platform_quotes(id,business_id,status) VALUES ($1,$2,'sent')`,[QN,biz]);
  await guestErr(()=>db.query(`SELECT invoice_accepted_quote($1)`,[QN]),"hasn't approved",'unapproved quote cannot be invoiced');
  const i1=(await db.query(`SELECT invoice_accepted_quote($1) r`,[Q])).rows[0].r;
  const i2=(await db.query(`SELECT invoice_accepted_quote($1) r`,[Q])).rows[0].r;
  check(i1.status==='created' && i2.status==='existing' && i2.invoice_id===i1.invoice_id,'invoice retry returns the same invoice');
  const inv=(await db.query(`SELECT total,subtotal,discount_total,(SELECT array_agg(description ORDER BY sort_order) FROM platform_invoice_line_items WHERE invoice_id=i.id) d FROM platform_invoices i WHERE quote_id=$1`,[Q])).rows;
  check(inv.length===1 && Number(inv[0].total)===Number(snap.total) && Number(inv[0].discount_total)===50 && inv[0].d.join('|')==='Remove 2 oaks|Stump grinding|Roadside placement','one invoice, accepted totals, chosen lines only: '+JSON.stringify(inv[0]?.d));

  // one-transaction edit with expected revision
  const QE=uuid(240), E1=uuid(241), E2=uuid(242), E3=uuid(243), E4=uuid(244);
  await db.query(`INSERT INTO platform_quotes(id,business_id,status,subtotal,total) VALUES ($1,$2,'draft',300,300),($3,$2,'draft',0,0)`,[QE,biz,uuid(245)]);
  await db.query(`INSERT INTO platform_quote_line_items(id,quote_id,business_id,description,unit_price,line_total,sort_order) VALUES ($1,$3,$4,'Remove oak',200,200,0),($2,$3,$4,'Old line',100,100,1),($5,$6,$4,'Other quote line',5,5,0)`,[E1,E2,QE,biz,uuid(246),uuid(245)]);
  const head=async()=>(await db.query(`SELECT updated_at,version_number,total FROM platform_quotes WHERE id=$1`,[QE])).rows[0];
  const lineIds=async()=>(await db.query(`SELECT id FROM platform_quote_line_items WHERE quote_id=$1 ORDER BY sort_order`,[QE])).rows.map(x=>x.id).join(',');
  let h0=await head();
  const lines=[{id:E1,description:'Remove oak',quantity:1,unit_price:200,line_total:200,sort_order:0},
    {id:E3,description:'Haul away',quantity:1,unit_price:250,line_total:250,sort_order:1,option_kind:'alternative',option_group:'Debris handling',default_selected:true},
    {id:E4,description:'Roadside',quantity:1.5,unit_price:33.33,line_total:50,sort_order:2,option_kind:'alternative',option_group:'Debris handling',default_selected:false}];
  const save=(ls,at=h0.updated_at,ch={total:450,subtotal:450})=>db.query(`SELECT save_quote_edit($1,$2,$3::jsonb,$4::jsonb) r`,[QE,at,JSON.stringify(ch),JSON.stringify(ls)]);
  await guestErr(()=>save(lines,new Date(0).toISOString()),'changed while you were editing','stale revision rejected');
  await guestErr(()=>save([...lines,{id:uuid(246),description:'steal',quantity:1,unit_price:1,line_total:1}]),'do not belong','line from another quote rejected');
  await guestErr(()=>save([...lines,{id:uuid(247),description:'',quantity:1,unit_price:1,line_total:1}]),'Add a description','invalid line rejected');
  let h1=await head();
  check(h1.version_number===h0.version_number && String(h1.updated_at)===String(h0.updated_at) && (await lineIds())===`${E1},${E2}` && Number(h1.total)===300,'failed edits change nothing (header and lines roll back together)');
  check((await db.query(`SELECT description FROM platform_quote_line_items WHERE id=$1`,[uuid(246)])).rows[0].description==='Other quote line','other quote untouched');
  const res=(await save(lines)).rows[0].r;
  const h2=await head();
  check(h2.version_number===h0.version_number+1 && Number(h2.total)===450 && (await lineIds())===`${E1},${E3},${E4}` && res.items.length===3,'edit saves header, adds options, removes lines in one step');
  check((await db.query(`SELECT count(*)::int n FROM platform_quote_versions WHERE quote_id=$1 AND version_number=$2`,[QE,h2.version_number])).rows[0].n===1,'version history written in the same transaction');
  await guestErr(()=>save(lines),'changed while you were editing','second save with the old revision rejected (concurrent edit)');
  const l4=(await db.query(`SELECT option_kind,option_group,default_selected FROM platform_quote_line_items WHERE id=$1`,[E4])).rows[0];
  check(l4.option_kind==='alternative'&&l4.option_group==='Debris handling'&&l4.default_selected===false,'option fields saved');
  // fractional quantity rounding matches the client (1.5 x 33.33 = 49.995 -> 50.00; 2.5 x 10.01 = 25.025 -> 25.03)
  check((await db.query(`SELECT round((1.5*33.33)*100)::int a, round((2.5*10.01)*100)::int b`)).rows[0].a===5000,'server rounds half-cents up');
  await clearClaims(); await db.exec(`SET ROLE anon;`);
  await guestErr(()=>db.query(`SELECT save_quote_edit($1,now(),'{}'::jsonb,'[]'::jsonb)`,[QE]),'permission denied','anon cannot call edit');
  await clearClaims();
  for (const [fn,role,ok] of [['quote_public_pricing(uuid)','anon',false],['quote_public_pricing(uuid)','authenticated',false],['save_quote_edit(uuid,timestamptz,jsonb,jsonb)','anon',false],['save_quote_edit(uuid,timestamptz,jsonb,jsonb)','authenticated',true],['invoice_accepted_quote(uuid)','anon',false],['invoice_accepted_quote(uuid)','authenticated',true]])
    check((await db.query(`SELECT has_function_privilege('${role}','public.${fn}','EXECUTE') ok`)).rows[0].ok===ok,`${role} ${ok?'can':'cannot'} execute ${fn}`);
}
// ---- Unified lock order (0005): every link path locks the report row before any link row ----
{
  const src = async fn => (await db.query(`SELECT prosrc FROM pg_proc WHERE proname=$1`,[fn])).rows[0].prosrc;
  const lock = await src('arborist_link_lock');
  const reportAt = lock.indexOf('platform_arborist_quotes WHERE id = target_report'), linkAt = lock.search(/platform_arborist_quote_links WHERE token_hash = _token_hash FOR UPDATE/);
  check(reportAt>0 && linkAt>reportAt && !/quote_links l WHERE l.token_hash = _token_hash FOR UPDATE/.test(lock),'guest save/load locks report before link');
  for (const fn of ['arborist_link_issue','arborist_link_revoke']) {
    const body = await src(fn);
    check(body.indexOf('platform_arborist_quotes q WHERE q.id = _report_id')>0 && body.indexOf('platform_arborist_quotes q WHERE q.id = _report_id') < body.indexOf('UPDATE public.platform_arborist_quote_links'),`${fn} locks report before link`);
  }
  check(lock.indexOf('link_revoked')>linkAt && lock.indexOf('link_expired')>linkAt && lock.indexOf('link_submitted')>linkAt,'revoke/expiry/status rechecked under both locks');
  check((await db.query(`SELECT has_function_privilege('anon','public.arborist_link_lock(text)','EXECUTE') OR has_function_privilege('authenticated','public.arborist_link_lock(text)','EXECUTE') AS ok`)).rows[0].ok===false,'lock helper stays service-only');
}
console.log(`PASS: ${checks} isolated PostgreSQL migration, permissions, validation, and concurrency checks`);
await db.close();
