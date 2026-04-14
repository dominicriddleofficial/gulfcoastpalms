import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LeadSchema = z.object({
  business_shortcode: z.string().min(1).max(20),
  api_key: z.string().min(1),
  inquiry_name: z.string().min(1).max(200),
  inquiry_phone: z.string().max(30).optional().default(""),
  inquiry_email: z.string().max(255).optional().default(""),
  requested_service: z.string().max(200).optional().default(""),
  requested_service_category: z.string().max(200).optional().default(""),
  message: z.string().max(2000).optional().default(""),
  source_name: z.string().max(200).optional().default("website"),
  website_origin: z.string().max(500).optional().default(""),
  urgency_level: z.enum(["low", "normal", "high", "emergency"]).optional().default("normal"),
  utm_source: z.string().max(200).optional().default(""),
  utm_medium: z.string().max(200).optional().default(""),
  utm_campaign: z.string().max(200).optional().default(""),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = LeadSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lead = parsed.data;

    // Verify API key
    const expectedKey = Deno.env.get("EXTERNAL_LEAD_API_KEY");
    if (!expectedKey || lead.api_key !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Look up business by shortcode
    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("id")
      .eq("shortcode", lead.business_shortcode)
      .single();

    if (bizErr || !biz) {
      return new Response(
        JSON.stringify({ error: "Business not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate by phone within last 10 minutes
    if (lead.inquiry_phone) {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: dupes } = await supabase
        .from("platform_leads")
        .select("id")
        .eq("business_id", biz.id)
        .eq("inquiry_phone", lead.inquiry_phone)
        .gte("created_at", tenMinAgo)
        .limit(1);

      if (dupes && dupes.length > 0) {
        return new Response(
          JSON.stringify({ success: true, id: dupes[0].id, duplicate: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Insert into platform_leads
    const { data: newLead, error: insertErr } = await supabase
      .from("platform_leads")
      .insert({
        business_id: biz.id,
        inquiry_name: lead.inquiry_name,
        inquiry_phone: lead.inquiry_phone || null,
        inquiry_email: lead.inquiry_email || null,
        requested_service: lead.requested_service || null,
        requested_service_category: lead.requested_service_category || null,
        message: lead.message || null,
        source_name: lead.source_name || "external_website",
        website_origin: lead.website_origin || null,
        urgency_level: lead.urgency_level,
        lead_status: "new",
        utm_source: lead.utm_source || null,
        utm_medium: lead.utm_medium || null,
        utm_campaign: lead.utm_campaign || null,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to save lead" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: newLead.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Unhandled error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
