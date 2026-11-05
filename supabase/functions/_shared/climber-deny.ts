import { createClient } from "npm:@supabase/supabase-js@2";

/** No privileged operations until verified caller restriction has been checked.
 * No token/anonymous/service callers retain the endpoint's existing auth gate.
 */
export async function denyClimberRequest(req: Request, headers: Record<string, string>): Promise<Response | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!token || token === serviceKey) return null;
  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey, { auth: { persistSession: false } });
  const { data, error } = await db.auth.getUser(token);
  // Invalid/anon credentials remain subject to the endpoint's original policy.
  if (error || !data.user) return null;
  const restriction = await db.rpc("is_restricted_climber", { _user_id: data.user.id });
  if (restriction.error || restriction.data !== false) return new Response(JSON.stringify({ error: "This account can access Arborist Quotes only." }), { status: 403, headers: { ...headers, "Content-Type": "application/json" } });
  return null;
}