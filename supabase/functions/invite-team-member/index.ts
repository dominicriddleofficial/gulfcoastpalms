import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InviteBody {
  email: string;
  display_name: string;
  temp_password: string;
  role: "owner" | "office_manager";
  business_ids: string[];
}

function bad(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") return bad(405, "Method not allowed");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON) return bad(500, "Server not configured");

  // Auth: verify caller is a workspace owner
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return bad(401, "Unauthorized");
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return bad(401, "Unauthorized");
  const callerId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: isOwner } = await admin.rpc("is_workspace_owner", {
    _user_id: callerId,
  });
  if (!isOwner) return bad(403, "Only workspace owners can invite team members");

  let body: InviteBody;
  try {
    body = await req.json();
  } catch {
    return bad(400, "Invalid JSON");
  }

  const email = (body.email || "").trim().toLowerCase();
  const display_name = (body.display_name || "").trim();
  const temp_password = body.temp_password || "";
  const role = body.role;
  const business_ids = Array.isArray(body.business_ids) ? body.business_ids : [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad(400, "Valid email required");
  if (display_name.length < 1 || display_name.length > 120) return bad(400, "Name required");
  if (temp_password.length < 8) return bad(400, "Temp password must be at least 8 characters");
  if (role !== "owner" && role !== "office_manager") return bad(400, "Invalid role");
  if (business_ids.length === 0) return bad(400, "Select at least one workspace");

  // Verify caller actually owns the businesses they're granting access to
  const { data: ownedBiz } = await admin
    .from("businesses")
    .select("id, workspace_id, workspaces!inner(owner_user_id)")
    .in("id", business_ids);
  const ownedIds = new Set(
    (ownedBiz || [])
      .filter((b: { workspaces: { owner_user_id: string } | null }) =>
        b.workspaces?.owner_user_id === callerId,
      )
      .map((b: { id: string }) => b.id),
  );
  for (const id of business_ids) {
    if (!ownedIds.has(id)) return bad(403, "You don't own one of the selected workspaces");
  }

  // Create the auth user with confirmed email and temp password
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: temp_password,
    email_confirm: true,
    user_metadata: {
      display_name,
      must_change_password: true,
    },
  });

  if (createErr || !created?.user) {
    return bad(400, createErr?.message || "Could not create user");
  }
  const newUserId = created.user.id;

  // Ensure profile reflects the flag (trigger should set it, but be explicit)
  await admin.from("platform_user_profiles").upsert(
    {
      user_id: newUserId,
      email,
      display_name,
      must_change_password: true,
    },
    { onConflict: "user_id" },
  );

  // Permission map by role
  const isElevated = role === "owner" || role === "office_manager";
  const accessRows = business_ids.map((biz) => ({
    user_id: newUserId,
    business_id: biz,
    role_name: role === "owner" ? "owner" : "office_manager",
    active_status: "active",
    can_view_all_business_data: true,
    can_manage_leads: true,
    can_manage_quotes: true,
    can_manage_jobs: true,
    can_manage_schedule: true,
    can_manage_invoices: isElevated,
    can_manage_payments: isElevated,
    can_manage_communications: true,
    can_manage_settings: role === "owner",
    can_export_data: isElevated,
    can_view_financials: isElevated,
    can_manage_users: role === "owner",
    can_delete_records: role === "owner",
  }));

  const { error: accessErr } = await admin
    .from("user_business_access")
    .upsert(accessRows, { onConflict: "user_id,business_id" });

  if (accessErr) {
    return bad(500, `User created but access grant failed: ${accessErr.message}`);
  }

  return new Response(
    JSON.stringify({ ok: true, user_id: newUserId, email }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});