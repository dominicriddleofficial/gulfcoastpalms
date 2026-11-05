import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const schema = z.object({ action: z.enum(["list", "grant", "revoke"]), business_id: z.string().uuid(),
  email: z.string().email().optional(), display_name: z.string().min(1).max(120).optional(),
  password: z.string().min(12).max(128).optional(), user_id: z.string().uuid().optional() }).strict();
const headers = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const token = req.headers.get("Authorization");
    if (!token?.startsWith("Bearer ")) return json({ error: "Sign in again." }, 401);
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: token } } });
    const { data: identity, error: authError } = await userClient.auth.getUser();
    if (authError || !identity.user) return json({ error: "Sign in again." }, 401);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Check the account details." }, 400);
    const b = parsed.data;
    const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
    const { data: allowed, error: gateError } = await db.rpc("arborist_user_can_review", { _user_id: identity.user.id, _business_id: b.business_id });
    if (gateError || !allowed) return json({ error: "Only authorized GCP office staff can manage climbers." }, 403);
    if (b.action === "list") {
      const { data, error } = await db.from("arborist_climber_access").select("user_id,active,created_at").eq("business_id", b.business_id);
      if (error) throw error;
      const ids = (data ?? []).map(r => r.user_id);
      const profiles = ids.length ? await db.from("platform_user_profiles").select("user_id,email,display_name").in("user_id", ids) : { data: [], error: null };
      if (profiles.error) throw profiles.error;
      return json({ accounts: (data ?? []).map(r => ({ ...r, ...profiles.data?.find(p => p.user_id === r.user_id) })) });
    }
    if (b.action === "revoke") {
      if (!b.user_id) return json({ error: "Select a climber account." }, 400);
      const { data, error } = await db.from("arborist_climber_access").update({ active: false, granted_by: identity.user.id }).eq("business_id", b.business_id).eq("user_id", b.user_id).select("user_id").single();
      if (error || !data) return json({ error: "Access could not be disabled." }, 409);
      return json({ ok: true });
    }
    if (!b.email) return json({ error: "Enter the climber's email." }, 400);
    const email = b.email.trim().toLowerCase();
    // Exact email only; never return the account directory to the caller.
    let target: { id: string } | undefined;
    for (let page = 1; ; page++) {
      const users = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (users.error) throw users.error;
      target = users.data.users.find(u => u.email?.toLowerCase() === email);
      if (target || users.data.users.length < 1000) break;
    }
    let created = false;
    if (!target) {
      if (!b.password || !b.display_name) return json({ error: "New account: enter a name and initial password (12+ characters). No invitation is sent." }, 400);
      const user = await db.auth.admin.createUser({ email, password: b.password, email_confirm: true, ban_duration: "876000h", user_metadata: { display_name: b.display_name } });
      if (user.error || !user.data.user) return json({ error: user.error?.message ?? "Account could not be created." }, 400);
      target = user.data.user; created = true;
    }
    // Database trigger serializes grants and refuses existing broad staff/owner roles.
    const grant = await db.from("arborist_climber_access").upsert({ user_id: target.id, business_id: b.business_id, active: true, granted_by: identity.user.id }, { onConflict: "user_id" }).select("user_id").single();
    if (grant.error) {
      if (created) await db.auth.admin.deleteUser(target.id);
      return json({ error: grant.error.message }, 409);
    }
    if (created) {
      const activate = await db.auth.admin.updateUserById(target.id, { ban_duration: "none" });
      if (activate.error) return json({ error: "The restricted account was saved but remains disabled. Contact the office to retry activation." }, 409);
    }
    return json({ ok: true, user_id: target.id, created, email });
  } catch { return json({ error: "Could not manage climber access. Retry without changing existing staff permissions." }, 500); }
});