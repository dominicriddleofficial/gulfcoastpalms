// Isolated PGlite check of website_analytics_summary. No production connection is used.
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
CREATE ROLE authenticated; CREATE ROLE anon;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth, public TO authenticated, anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.businesses (id uuid PRIMARY KEY, shortcode text, timezone text);
CREATE TABLE public.owners (user_id uuid, business_id uuid);
CREATE FUNCTION public.has_business_access(u uuid, b uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT EXISTS (SELECT 1 FROM public.owners WHERE user_id=u AND business_id=b) $$;
CREATE FUNCTION public.is_workspace_owner(u uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT EXISTS (SELECT 1 FROM public.owners WHERE user_id=u) $$;
CREATE FUNCTION public.has_role(u uuid, r public.app_role) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
CREATE TABLE public.analytics_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_name text, page_path text, page_url text, referrer text, business_type text, source_component text,
 utm_source text, utm_medium text, utm_campaign text, utm_term text, utm_content text, device_type text, user_agent text, visitor_id text, session_id text, user_id uuid, customer_id uuid, lead_id uuid, quote_id uuid, invoice_id uuid, properties jsonb DEFAULT '{}', ip_hash text, created_at timestamptz DEFAULT now());
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
INSERT INTO public.businesses VALUES ('00000000-0000-0000-0000-000000000001','GCP','America/Chicago'),('00000000-0000-0000-0000-000000000002','PPS','America/Chicago');
INSERT INTO public.owners VALUES ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-000000000002');
`);
await db.exec(await fs.readFile(new URL('../drizzle/migrations/0010_website_analytics_summary.sql', import.meta.url), 'utf8'));
const GCP = '00000000-0000-0000-0000-000000000001', PPS = '00000000-0000-0000-0000-000000000002';
const site = 'https://gulfcoastpalmservices.com';
const T = "timestamptz '2026-10-15 12:00:00+00'";
const ins = (ev, path, sess, vis, secs, extra = {}) => `('${ev}','${path}','${extra.url ?? site + path}','${sess}','${vis}', ${T} + interval '${secs} seconds', '${extra.bt ?? 'GCP'}', ${extra.ref ? `'${extra.ref}'` : 'NULL'}, ${extra.utm ? `'${extra.utm}'` : 'NULL'}, '${extra.ua ?? 'Mozilla'}', '${JSON.stringify(extra.props ?? {})}'::jsonb, '${extra.dev ?? 'mobile'}')`;
const rows = [
  // Session A: page view, one real call tap that arrived as 3 legacy rows, form start + one successful submit (+ legacy alias).
  ins('page_view', '/services/palm-tree-trimming', 'A', 'v1', 0, { ref: 'https://www.google.com', utm: 'google' }),
  ins('call_now_click', '/services/palm-tree-trimming', 'A', 'v1', 10),
  ins('call_tap', '/services/palm-tree-trimming', 'A', 'v1', 10),
  ins('sticky_bar_call_click', '/services/palm-tree-trimming', 'A', 'v1', 11),
  ins('quote_request_started', '/quote', 'A', 'v1', 60),
  ins('lead_form_submit', '/quote', 'A', 'v1', 120),
  ins('quote_request_completed', '/quote', 'A', 'v1', 121),
  // Session B: text tap only, new canonical name.
  ins('page_view', '/', 'B', 'v2', 0),
  ins('text_tap', '/', 'B', 'v2', 5, { props: { placement: 'header' } }),
  // Session C: started a form, failed submit (nothing recorded).
  ins('page_view', '/quote', 'C', 'v3', 0, { dev: 'desktop' }),
  ins('lead_form_start', '/quote', 'C', 'v3', 20),
  // Private pages, preview, bot and PPS-tagged app traffic must be ignored.
  ins('page_view', '/platform/analytics', 'P', 'vp', 0, { bt: 'platform' }),
  ins('page_view', '/pay/abc', 'P2', 'vp2', 0),
  ins('page_view', '/quote/abc-123', 'P3', 'vp3', 0),
  ins('page_view', '/arborist-link', 'P4', 'vp4', 0),
  ins('page_view', '/', 'L', 'vl', 0, { url: 'http://localhost:8080/' }),
  ins('page_view', '/', 'PR', 'vpr', 0, { url: 'https://id-preview--x.lovable.app/' }),
  ins('page_view', '/', 'BOT', 'vbot', 0, { ua: 'Googlebot/2.1' }),
  // Prior period (previous 30 days): one visitor only.
  `('page_view','/','${site}/','Z','vz', ${T} - interval '20 days','GCP',NULL,NULL,'Mozilla','{}'::jsonb,'mobile')`,
];
await db.exec(`INSERT INTO public.analytics_events (event_name,page_path,page_url,session_id,visitor_id,created_at,business_type,referrer,utm_source,user_agent,properties,device_type) VALUES ${rows.join(',')}`);
// 1500 extra page views from distinct sessions, to prove there is no 1000-row cap.
await db.exec(`INSERT INTO public.analytics_events (event_name,page_path,page_url,session_id,visitor_id,created_at,business_type,user_agent)
 SELECT 'page_view','/about','${site}/about','bulk'||g,'bv'||g, ${T} + (g || ' seconds')::interval,'GCP','Mozilla' FROM generate_series(1,1500) g`);

let checks = 0; const check = (v, m) => { assert.ok(v, m); checks++; };
const run = async (biz, user) => {
  await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${user}',false);`);
  const r = await db.query(`SELECT public.website_analytics_summary($1, timestamptz '2026-10-01 00:00+00', timestamptz '2026-10-31 00:00+00') AS s`, [biz]);
  return r.rows[0].s;
};
const s = await run(GCP, '00000000-0000-0000-0000-0000000000aa');
const c = s.current;
check(c.sessions === 1503, `only real public visits counted (got ${c.sessions})`);
check(c.page_views === 1503, `page views not capped at 1000 (got ${c.page_views})`);
check(c.call_taps === 1, `one real call tap counted once across 3 legacy rows (got ${c.call_taps})`);
check(c.text_taps === 1, 'text tap counted');
check(c.form_submits === 1, `one successful submit despite alias rows (got ${c.form_submits})`);
check(c.form_start_sessions === 2, 'form starts by visit');
check(s.funnel.started === 2 && s.funnel.started_and_submitted === 1, 'completion uses the same visits that started');
check(s.prior.visitors === 1, 'previous equal period counted separately');
check(s.coverage.duplicate_rows_removed >= 3, 'duplicates reported');
check(!s.pages.some((p) => /platform|pay|quote\//.test(p.path)), 'no private pages in top pages');
check(s.sources.some((x) => x.source.startsWith('google')), 'utm source kept');
check(s.buttons.some((b) => b.kind === 'text' && b.placement === 'header'), 'button placement kept');
check(s.buttons.some((b) => b.kind === 'call' && b.placement === 'unknown'), 'legacy rows without placement show as unknown');
const p = await run(PPS, '00000000-0000-0000-0000-0000000000aa');
check((p.current.sessions ?? 0) === 0 && p.coverage.hosts.length === 0, 'PPS does not see GCP website totals');
let denied = false; try { await run(GCP, '00000000-0000-0000-0000-0000000000bb'); } catch { denied = true; }
check(denied, 'non-owner is refused');
denied = false;
try { await db.exec(`RESET ROLE; SET ROLE anon;`); await db.query(`SELECT public.website_analytics_summary($1, now() - interval '1 day', now())`, [GCP]); } catch { denied = true; }
check(denied, 'signed-out visitors cannot run it');
console.log(`website analytics checks passed: ${checks}`);
