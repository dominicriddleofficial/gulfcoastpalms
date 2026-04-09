import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Send SMS via SimpleTexting API.
 * Requires SIMPLETEXTING_API_KEY secret to be configured.
 * Owner must add their API key in the backend secrets.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SIMPLETEXTING_API_KEY = Deno.env.get("SIMPLETEXTING_API_KEY");
    if (!SIMPLETEXTING_API_KEY) {
      console.error("SIMPLETEXTING_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "SMS service not configured. Add SIMPLETEXTING_API_KEY in backend secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, message } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "to and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhone = to.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-sms] Sending SMS to ${cleanPhone}: ${message.substring(0, 50)}...`);

    const response = await fetch("https://api-app2.simpletexting.com/v2/api/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SIMPLETEXTING_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contactPhone: cleanPhone,
        mode: "SINGLE_SMS",
        text: message,
      }),
    });

    const resultText = await response.text();
    let result: Record<string, unknown> = {};
    try { result = JSON.parse(resultText); } catch { result = { raw: resultText }; }

    if (!response.ok) {
      console.error(`[send-sms] SimpleTexting error (${response.status}):`, resultText);

      // Log to error_logs
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase.from("error_logs").insert({
          error_message: `SMS send failed to ${cleanPhone}: ${response.status}`,
          error_stack: resultText,
          page_url: "/edge/send-sms",
        });
      } catch {}

      return new Response(
        JSON.stringify({ success: false, error: `SimpleTexting error (${response.status}): ${resultText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-sms] SMS sent successfully to ${cleanPhone}`);
    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-sms] Exception:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
