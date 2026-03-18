import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
const OWNER_PHONE = "+18509101290";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    const { name, phone, email, service, location, message } = await req.json();

    // Get Twilio phone numbers to find a FROM number
    const numbersRes = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json`, {
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
      },
    });
    const numbersData = await numbersRes.json();
    if (!numbersRes.ok) {
      throw new Error(`Failed to get phone numbers [${numbersRes.status}]: ${JSON.stringify(numbersData)}`);
    }

    const fromNumber = numbersData?.incoming_phone_numbers?.[0]?.phone_number;
    if (!fromNumber) throw new Error("No Twilio phone number found");

    const body = `🌴 NEW LEAD\nName: ${name}\nPhone: ${phone || "N/A"}\nEmail: ${email || "N/A"}\nService: ${service || "N/A"}\nLocation: ${location || "N/A"}\nMessage: ${message || "N/A"}`;

    const smsRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: OWNER_PHONE, From: fromNumber, Body: body }),
    });

    const smsData = await smsRes.json();
    if (!smsRes.ok) {
      throw new Error(`Twilio SMS error [${smsRes.status}]: ${JSON.stringify(smsData)}`);
    }

    return new Response(JSON.stringify({ success: true, sid: smsData.sid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("notify-lead error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
