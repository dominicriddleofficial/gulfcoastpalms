import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { quote_id, action, approved_by, change_notes } = body;

    if (!quote_id || typeof quote_id !== "string") {
      return new Response(JSON.stringify({ error: "quote_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch quote details for SMS
    const { data: quote } = await supabase
      .from("platform_quotes")
      .select("quote_number, total, customer_id, business_id")
      .eq("id", quote_id)
      .single();

    let customerName = "Customer";
    if (quote?.customer_id) {
      const { data: cust } = await supabase
        .from("platform_customers")
        .select("display_name")
        .eq("id", quote.customer_id)
        .single();
      if (cust) customerName = cust.display_name;
    }

    const ownerPhone = "8509101290";

    if (action === "request_changes") {
      if (!change_notes || typeof change_notes !== "string" || change_notes.trim().length === 0) {
        return new Response(JSON.stringify({ error: "change_notes required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { error } = await supabase
        .from("platform_quotes")
        .update({
          status: "changes_requested",
          change_request_notes: change_notes.trim(),
          change_requested_at: new Date().toISOString(),
        })
        .eq("id", quote_id);

      if (error) {
        return new Response(JSON.stringify({ error: "Failed to submit change request" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Send SMS to owner about change request
      try {
        const smsMsg = `${customerName} requested changes on ${quote?.quote_number || "a quote"}. Check the platform.`;
        await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
          body: JSON.stringify({ to: ownerPhone, message: smsMsg }),
        });
      } catch { /* SMS is best-effort */ }

      return new Response(JSON.stringify({ success: true, status: "changes_requested" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Approve flow
    if (!approved_by || typeof approved_by !== "string" || approved_by.trim().length === 0) {
      return new Response(JSON.stringify({ error: "approved_by name required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error } = await supabase
      .from("platform_quotes")
      .update({
        status: "approved",
        approved_by: approved_by.trim(),
        approved_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      })
      .eq("id", quote_id);

    if (error) {
      return new Response(JSON.stringify({ error: "Failed to approve quote" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Send SMS to owner about approval
    try {
      const total = quote?.total ? `$${Number(quote.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "";
      const smsMsg = `Quote approved! ${customerName} approved ${quote?.quote_number || "a quote"}${total ? ` for ${total}` : ""}. Convert to invoice in the platform.`;
      await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
        body: JSON.stringify({ to: ownerPhone, message: smsMsg }),
      });
    } catch { /* SMS is best-effort */ }

    return new Response(JSON.stringify({ success: true, status: "approved" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
