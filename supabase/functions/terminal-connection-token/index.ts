import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  console.log(`[TERMINAL-CONNECTION-TOKEN] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Validate auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Authorization required");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) throw new Error("Invalid authorization");

    const { business_id, location_id } = await req.json();
    if (!business_id) throw new Error("business_id is required");

    // Verify business access
    const { data: hasAccess } = await supabaseAdmin.rpc("has_business_access", {
      _user_id: user.id,
      _business_id: business_id,
    });
    if (!hasAccess) throw new Error("Access denied to this business");

    log("Creating connection token", { business_id, user_id: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Create a connection token for Stripe Terminal
    const connectionToken = await stripe.terminal.connectionTokens.create({
      ...(location_id ? { location: location_id } : {}),
    });

    // Log the session
    await supabaseAdmin.from("terminal_sessions").insert({
      business_id,
      user_id: user.id,
      location_id: location_id || null,
      device_type: "tap_to_pay_iphone",
      connection_token_id: connectionToken.secret?.slice(0, 20) + "...",
      status: "active",
      last_active_at: new Date().toISOString(),
    });

    log("Connection token created successfully");

    return new Response(JSON.stringify({ secret: connectionToken.secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    log("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
