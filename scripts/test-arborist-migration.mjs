// Run with a separately installed @electric-sql/pglite. No production connection is used.
// PGLITE_MODULE may point to an absolute installed module URL.
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth, storage TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
CREATE TABLE public.workspaces (id uuid PRIMARY KEY, owner_user_id uuid);
CREATE TABLE public.businesses (id uuid PRIMARY KEY, workspace_id uuid, shortcode text);
CREATE TABLE public.user_business_access (user_id uuid, business_id uuid, role_name text, active_status text);
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
await db.exec(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;`);
// Live bucket is created with the storage tool, so the isolated fixture seeds it here.
await db.exec(`INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('arborist-quote-photos','arborist-quote-photos',false,10485760,ARRAY['image/jpeg']);`);
for (const file of ['0000_arborist_quotes.sql','0001_arborist_revoke_anon.sql','0002_arborist_quote_links.sql'])
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
check((await db.query(`SELECT arborist_link_resolve($1) AS r`,[h('d')])).rows[0].r.state==='expired','expired link rejected');
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
check((await db.query(`SELECT * FROM platform_arborist_quote_links`)).rows.length===4,'staff can see link status');
await denied(()=>db.query(`SELECT token_hash FROM platform_arborist_quote_links`),'staff cannot read token hashes');
await login(crew);
check((await db.query(`SELECT * FROM platform_arborist_quote_links`)).rows.length===0,'crew cannot see links');
await db.exec(`RESET ROLE;`);
for (const fn of ['arborist_user_can_review(uuid,uuid)','arborist_link_lock(text)','arborist_link_issue(uuid,uuid,text,uuid,text,text,text)','arborist_link_revoke(uuid,uuid)','arborist_link_resolve(text)','arborist_link_save(text,integer,jsonb,text)','arborist_link_photo_target(text,uuid,uuid)']) {
  for (const role of ['anon','authenticated','public']) check((await db.query(`SELECT has_function_privilege('${role}','public.${fn}','EXECUTE') AS ok`)).rows[0].ok===false,`${role} cannot execute ${fn}`);
  check((await db.query(`SELECT has_function_privilege('service_role','public.${fn}','EXECUTE') AS ok`)).rows[0].ok===true,`service_role executes ${fn}`);
}
check((await db.query(`SELECT has_table_privilege('anon','public.platform_arborist_quote_links','SELECT') AS ok`)).rows[0].ok===false,'anon has no link table access');
check((await db.query(`SELECT has_function_privilege('authenticated','public.validate_arborist_quote()','EXECUTE') AS ok`)).rows[0].ok===false,'trigger fn not callable');
console.log(`PASS: ${checks} isolated PostgreSQL migration, permissions, validation, and concurrency checks`);
await db.close();
