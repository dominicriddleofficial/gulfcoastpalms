// Single-report guest links for internal GCP arborist quotes.
// Staff actions (issue/revoke) require a signed-in owner/office JWT; guest actions
// require the link token, which is hashed and checked by service-only database functions
// on every read, save, upload and photo view. Tokens are never logged.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { TOKEN_PATTERN, UUID_PATTERN, cleanText, decodeJpeg, guestReport, hashToken, mapDbError, newToken, reportPhotoPaths, type ReportRow } from "./logic.ts";

const BUCKET = "arborist-quote-photos";
const headers = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const admin = () => createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
const fail = (error: { message?: string } | null) => { const m = mapDbError(error?.message ?? ""); return json(m.body, m.status); };

async function staffUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: auth } } });
  const { data, error } = await client.auth.getClaims(auth.slice(7));
  const sub = data?.claims?.sub;
  return error || typeof sub !== "string" || !UUID_PATTERN.test(sub) ? null : sub;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  if (!body || typeof body !== "object") return json({ error: "Invalid request" }, 400);
  const action = body.action;
  const db = admin();

  try {
    if (action === "issue" || action === "revoke") {
      const userId = await staffUserId(req);
      if (!userId) return json({ error: "Sign in again to manage quote links." }, 401);
      const reportId = body.report_id == null ? null : String(body.report_id);
      if (reportId !== null && !UUID_PATTERN.test(reportId)) return json({ error: "Invalid report" }, 400);
      if (action === "revoke") {
        if (!reportId) return json({ error: "Invalid report" }, 400);
        const { data, error } = await db.rpc("arborist_link_revoke", { _user_id: userId, _report_id: reportId });
        return error ? fail(error) : json({ disabled: data });
      }
      const businessId = String(body.business_id ?? "");
      if (!UUID_PATTERN.test(businessId)) return json({ error: "Invalid business" }, 400);
      const token = newToken();
      const { data, error } = await db.rpc("arborist_link_issue", {
        _user_id: userId, _business_id: businessId, _token_hash: await hashToken(token), _report_id: reportId,
        _customer_name: cleanText(body.customer_name, 300), _property_address: cleanText(body.property_address, 1000), _arborist_name: cleanText(body.arborist_name, 300),
      });
      if (error) return fail(error);
      const row = Array.isArray(data) ? data[0] : data;
      return json({ token, report_id: row?.report_id, expires_at: row?.expires_at });
    }

    const token = typeof body.token === "string" ? body.token : "";
    if (!TOKEN_PATTERN.test(token)) return json({ state: "invalid" }, 410);
    const tokenHash = await hashToken(token);

    if (action === "load") {
      const { data, error } = await db.rpc("arborist_link_resolve", { _token_hash: tokenHash });
      if (error) return fail(error);
      const result = data as { state: string; expires_at?: string; report?: ReportRow };
      if (result.state !== "ok" || !result.report) return json({ state: result.state }, 410);
      return json({ state: "ok", expires_at: result.expires_at, report: guestReport(result.report) });
    }
    if (action === "save") {
      const status = body.status === "submitted" ? "submitted" : body.status === "draft" ? "draft" : null;
      const version = Number(body.version);
      const fields = body.fields as Record<string, unknown> | undefined;
      if (!status || !Number.isInteger(version) || !fields || typeof fields !== "object") return json({ error: "Invalid request" }, 400);
      const whitelisted = {
        customer_name: cleanText(fields.customer_name, 300), property_address: cleanText(fields.property_address, 1000),
        visit_date: typeof fields.visit_date === "string" ? fields.visit_date : "", arborist_name: cleanText(fields.arborist_name, 300),
        general_notes: cleanText(fields.general_notes, 10000), trees: Array.isArray(fields.trees) ? fields.trees : null,
      };
      const { data, error } = await db.rpc("arborist_link_save", { _token_hash: tokenHash, _expected_version: version, _fields: whitelisted, _status: status });
      return error ? fail(error) : json({ report: guestReport(data as ReportRow) });
    }
    if (action === "upload") {
      const treeId = String(body.tree_id ?? ""), photoId = String(body.photo_id ?? "");
      if (!UUID_PATTERN.test(treeId) || !UUID_PATTERN.test(photoId)) return json({ error: "Invalid photo" }, 400);
      const bytes = decodeJpeg(body.data);
      if (!bytes) return json({ error: "Photos must be JPEG images under 8 MB." }, 400);
      const { data: path, error } = await db.rpc("arborist_link_photo_target", { _token_hash: tokenHash, _tree_id: treeId, _photo_id: photoId });
      if (error || typeof path !== "string") return fail(error);
      const upload = await db.storage.from(BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false });
      // A retried upload of the same photo key is treated as done; objects are never replaced.
      if (upload.error && !/already exists|duplicate/i.test(upload.error.message)) return json({ error: "Photo upload failed. Your notes are saved as a draft; try again." }, 502);
      return json({ path });
    }
    if (action === "sign") {
      const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === "string").slice(0, 100) : [];
      const { data, error } = await db.rpc("arborist_link_resolve", { _token_hash: tokenHash });
      if (error) return fail(error);
      const result = data as { state: string; report?: ReportRow };
      if (result.state !== "ok" || !result.report) return json({ state: result.state }, 410);
      const allowed = reportPhotoPaths(result.report.trees);
      const safe = paths.filter(p => allowed.has(p));
      if (!safe.length) return json({ urls: [] });
      const signed = await db.storage.from(BUCKET).createSignedUrls(safe, 600);
      if (signed.error) return json({ error: "Photos could not be loaded." }, 502);
      return json({ urls: (signed.data ?? []).map(item => ({ path: item.path, signedUrl: item.signedUrl })) });
    }
    return json({ error: "Unknown action" }, 400);
  } catch {
    return json({ error: "Something went wrong. Try again." }, 500);
  }
});
