import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const JOBBER_AUTH_URL = "https://api.getjobber.com/api/oauth/authorize";
const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function getTokenExpiryIso(tokenData: { access_token?: string; expires_in?: number | string }) {
  const expiresInSeconds = Number(tokenData.expires_in);

  if (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) {
    return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  }

  if (tokenData.access_token) {
    try {
      const [, payload = ""] = tokenData.access_token.split(".");
      const padded = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
      const decoded = JSON.parse(atob(padded));
      const exp = Number(decoded?.exp);

      if (Number.isFinite(exp) && exp > 0) {
        return new Date(exp * 1000).toISOString();
      }
    } catch (error) {
      console.error("Failed to decode Jobber access token expiry:", error);
    }
  }

  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

function buildTokenRequestBody(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const CLIENT_ID = Deno.env.get("JOBBER_CLIENT_ID");
  const CLIENT_SECRET = Deno.env.get("JOBBER_CLIENT_SECRET");

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return jsonResponse({ error: "Jobber credentials not configured" }, 500);
  }

  // Step 1: Redirect user to Jobber's OAuth consent screen
  if (action === "authorize") {
    const redirectUri = url.searchParams.get("redirect_uri");
    if (!redirectUri) {
      return jsonResponse({ error: "redirect_uri is required" }, 400);
    }

    const authUrl = new URL(JOBBER_AUTH_URL);
    authUrl.searchParams.set("client_id", CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");

    return jsonResponse({ url: authUrl.toString() });
  }

  // Step 2: Exchange authorization code for tokens
  if (action === "callback") {
    const code = url.searchParams.get("code");
    const redirectUri = url.searchParams.get("redirect_uri");

    if (!code || !redirectUri) {
      return jsonResponse({ error: "code and redirect_uri are required" }, 400);
    }

    // Exchange code for tokens
    const tokenRes = await fetch(JOBBER_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: buildTokenRequestBody({
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
      return jsonResponse({ error: "Token exchange failed", details: tokenBody }, 400);
    }

    let tokenData: { access_token?: string; refresh_token?: string; expires_in?: number | string; scope?: string | null };

    try {
      tokenData = JSON.parse(tokenBody);
    } catch (error) {
      console.error("Jobber token response was not valid JSON:", tokenBody, error);
      return jsonResponse({ error: "Token exchange returned an invalid response" }, 502);
    }

    if (!tokenData.access_token || !tokenData.refresh_token) {
      console.error("Jobber token response missing required tokens:", tokenData);
      return jsonResponse({ error: "Token exchange returned incomplete credentials" }, 502);
    }

    // Store tokens in database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upsert: delete old tokens, insert new one
    await supabase.from("jobber_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const expiresAt = getTokenExpiryIso(tokenData);

    const { error: insertError } = await supabase.from("jobber_tokens").insert({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      scope: tokenData.scope || null,
    });

    if (insertError) {
      console.error("Failed to store tokens:", insertError);
      return jsonResponse({ error: "Failed to store tokens" }, 500);
    }

    return jsonResponse({ success: true, expires_at: expiresAt });
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
      return jsonResponse({ connected: false });
    }

    const isExpired = new Date(tokens.expires_at) < new Date();
    return jsonResponse({
      connected: true,
      expired: isExpired,
      expires_at: tokens.expires_at,
      updated_at: tokens.updated_at,
    });
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
      return jsonResponse({ error: "No tokens found" }, 404);
    }

    const refreshRes = await fetch(JOBBER_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: buildTokenRequestBody({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
      }),
    });

    const refreshBody = await refreshRes.text();

    if (!refreshRes.ok) {
      console.error("Jobber refresh failed:", refreshBody);
      return jsonResponse({ error: "Token refresh failed", details: refreshBody }, 400);
    }

    let refreshData: { access_token?: string; refresh_token?: string; expires_in?: number | string };

    try {
      refreshData = JSON.parse(refreshBody);
    } catch (error) {
      console.error("Jobber refresh response was not valid JSON:", refreshBody, error);
      return jsonResponse({ error: "Token refresh returned an invalid response" }, 502);
    }

    if (!refreshData.access_token || !refreshData.refresh_token) {
      console.error("Jobber refresh response missing required tokens:", refreshData);
      return jsonResponse({ error: "Token refresh returned incomplete credentials" }, 502);
    }

    const expiresAt = getTokenExpiryIso(refreshData);

    await supabase
      .from("jobber_tokens")
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_at: expiresAt,
      })
      .eq("id", tokens.id);

    return jsonResponse({ success: true, expires_at: expiresAt });
  }

  return jsonResponse({ error: "Unknown action. Use: authorize, callback, status, refresh" }, 400);
});
