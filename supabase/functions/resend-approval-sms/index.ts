import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { quote_id } = await req.json();
    if (!quote_id || typeof quote_id !== "string") {
      return new Response(JSON.stringify({ error: "quote_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is an authenticated platform user with access to this business
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: quote } = await supabase
      .from("platform_quotes")
      .select("quote_number, total, customer_id, business_id")
      .eq("id", quote_id)
      .single();

    if (!quote) {
      return new Response(JSON.stringify({ error: "Quote not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: hasAccess } = await supabase.rpc("has_business_access", {
      _user_id: userData.user.id,
      _business_id: quote.business_id,
    });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let customerName = "Customer";
    if (quote.customer_id) {
      const { data: cust } = await supabase
        .from("platform_customers").select("display_name")
        .eq("id", quote.customer_id).single();
      if (cust) customerName = cust.display_name;
    }

    const ownerPhone = "8509101290";
    const adminOrigin = req.headers.get("origin") || "https://gulfcoastpalmservices.com";
    const adminQuoteUrl = `${adminOrigin}/platform/quotes`;
    const totalStr = quote.total
      ? `$${Number(quote.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : "$0.00";
    const smsMsg = `Quote approved: ${quote.quote_number} — ${customerName} — ${totalStr}. View: ${adminQuoteUrl}`;

    console.log(`[resend-approval-sms] sending for ${quote.quote_number} by user ${userData.user.id}`);
    const smsResp = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
      body: JSON.stringify({ to: ownerPhone, message: smsMsg }),
    });
    const respText = await smsResp.text().catch(() => "");
    if (!smsResp.ok) {
      console.error(`[resend-approval-sms] failed (${smsResp.status}): ${respText.substring(0, 300)}`);
      return new Response(JSON.stringify({ error: "SMS send failed", detail: respText.substring(0, 300) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`[resend-approval-sms] success`);

    await supabase
      .from("platform_quotes")
      .update({ approval_sms_sent: true, approval_sms_sent_at: new Date().toISOString() })
      .eq("id", quote_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[resend-approval-sms] exception:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
