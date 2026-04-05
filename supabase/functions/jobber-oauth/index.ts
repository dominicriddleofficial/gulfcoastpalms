import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const JOBBER_AUTH_URL = "https://api.getjobber.com/api/oauth/authorize";
const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const CLIENT_ID = Deno.env.get("JOBBER_CLIENT_ID");
  const CLIENT_SECRET = Deno.env.get("JOBBER_CLIENT_SECRET");

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return new Response(
      JSON.stringify({ error: "Jobber credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Step 1: Redirect user to Jobber's OAuth consent screen
  if (action === "authorize") {
    const redirectUri = url.searchParams.get("redirect_uri");
    if (!redirectUri) {
      return new Response(
        JSON.stringify({ error: "redirect_uri is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authUrl = new URL(JOBBER_AUTH_URL);
    authUrl.searchParams.set("client_id", CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");

    return new Response(JSON.stringify({ url: authUrl.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Step 2: Exchange authorization code for tokens
  if (action === "callback") {
    const code = url.searchParams.get("code");
    const redirectUri = url.searchParams.get("redirect_uri");

    if (!code || !redirectUri) {
      return new Response(
        JSON.stringify({ error: "code and redirect_uri are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange code for tokens
    const tokenRes = await fetch(JOBBER_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenBody = await tokenRes.text();

    if (!tokenRes.ok) {
      console.error("Jobber token exchange failed:", tokenBody);
      return new Response(
        JSON.stringify({ error: "Token exchange failed", details: tokenBody }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = JSON.parse(tokenBody);

    // Store tokens in database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upsert: delete old tokens, insert new one
    await supabase.from("jobber_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const { error: insertError } = await supabase.from("jobber_tokens").insert({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      scope: tokenData.scope || null,
    });

    if (insertError) {
      console.error("Failed to store tokens:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store tokens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, expires_at: expiresAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Step 3: Check connection status
  if (action === "status") {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tokens } = await supabase
      .from("jobber_tokens")
      .select("expires_at, updated_at")
      .limit(1)
      .maybeSingle();

    if (!tokens) {
      return new Response(
        JSON.stringify({ connected: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isExpired = new Date(tokens.expires_at) < new Date();
    return new Response(
      JSON.stringify({
        connected: true,
        expired: isExpired,
        expires_at: tokens.expires_at,
        updated_at: tokens.updated_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Step 4: Refresh token
  if (action === "refresh") {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tokens } = await supabase
      .from("jobber_tokens")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!tokens) {
      return new Response(
        JSON.stringify({ error: "No tokens found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const refreshRes = await fetch(JOBBER_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
      }),
    });

    const refreshBody = await refreshRes.text();

    if (!refreshRes.ok) {
      console.error("Jobber refresh failed:", refreshBody);
      return new Response(
        JSON.stringify({ error: "Token refresh failed", details: refreshBody }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const refreshData = JSON.parse(refreshBody);
    const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();

    await supabase
      .from("jobber_tokens")
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_at: expiresAt,
      })
      .eq("id", tokens.id);

    return new Response(
      JSON.stringify({ success: true, expires_at: expiresAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ error: "Unknown action. Use: authorize, callback, status, refresh" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
