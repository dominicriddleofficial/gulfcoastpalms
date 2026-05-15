import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { invoice_id, shortcode } = body;

    // Validate invoice_id is a valid UUID
    if (!invoice_id || typeof invoice_id !== "string" || !UUID_RE.test(invoice_id)) {
      return new Response(JSON.stringify({ error: true, message: "Invalid invoice ID format", code: "VALIDATION_ERROR" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Require shortcode for public access — return 404 to avoid revealing existence
    if (!shortcode || typeof shortcode !== "string" || shortcode.length > 50) {
      return new Response(JSON.stringify({ error: true, message: "Invoice not found", code: "NOT_FOUND" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabaseAdmin
      .from("platform_invoices")
      .select("id, invoice_number, total, balance_due, status, deposit_required, deposit_amount, deposit_paid, business_id, customer_id, property_id, job_id, issue_date, due_date, subtotal, tax_total, tax_rate, public_notes, service_address_line1, service_address_line2, service_city, service_state, service_zip, service_formatted_address, platform_customers(display_name, email, phone), platform_properties(address_1, address_2, city, state, zip), businesses(shortcode, public_brand_name, support_phone, support_email, website_url, logo_url)")
      .eq("id", invoice_id)
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: true, message: "Invoice not found", code: "NOT_FOUND" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // If shortcode was provided, verify it matches the invoice's business
    const invoiceShortcode = (data as any).businesses?.shortcode || "";
    if (!invoiceShortcode || shortcode.toLowerCase() !== invoiceShortcode.toLowerCase()) {
      // Don't reveal that the invoice exists — just return not found
      try {
        const supabaseLog = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        await supabaseLog.from("audit_logs").insert({
          event_name: "public_invoice_access_denied",
          entity_type: "invoice",
          entity_id: invoice_id,
          action_type: "deny",
          context_json: { reason: "shortcode_mismatch", shortcode_provided: shortcode },
          ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
          user_agent: req.headers.get("user-agent") || null,
        });
      } catch { /* best-effort */ }
      return new Response(JSON.stringify({ error: true, message: "Invoice not found", code: "NOT_FOUND" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Fetch line items
    const { data: lineItems } = await supabaseAdmin
      .from("platform_invoice_line_items")
      .select("description, quantity, unit_price, line_total")
      .eq("invoice_id", invoice_id)
      .order("sort_order", { ascending: true });

    const cust = (data as any).platform_customers;
    const prop = (data as any).platform_properties;
    const biz = (data as any).businesses;

    // Resolve address with priority:
    // 1) snapshot fields stored on the invoice
    // 2) linked property (platform_properties)
    // 3) linked job's property/free-text address
    let addr: { line1: string | null; line2: string | null; city: string | null; state: string | null; zip: string | null; formatted: string | null } = {
      line1: (data as any).service_address_line1 || null,
      line2: (data as any).service_address_line2 || null,
      city: (data as any).service_city || null,
      state: (data as any).service_state || null,
      zip: (data as any).service_zip || null,
      formatted: (data as any).service_formatted_address || null,
    };
    if (!addr.line1 && !addr.city && prop) {
      addr = {
        line1: prop.address_1 || null,
        line2: prop.address_2 || null,
        city: prop.city || null,
        state: prop.state || null,
        zip: prop.zip || null,
        formatted: null,
      };
    }
    if (!addr.line1 && !addr.city && (data as any).job_id) {
      // Fallback: pull from linked native job's property, then jobber_jobs free text.
      const jobId = (data as any).job_id as string;
      const { data: pj } = await supabaseAdmin
        .from("platform_jobs")
        .select("platform_properties(address_1, address_2, city, state, zip)")
        .eq("id", jobId)
        .maybeSingle();
      const pjp = (pj as any)?.platform_properties;
      if (pjp && (pjp.address_1 || pjp.city)) {
        addr = {
          line1: pjp.address_1 || null,
          line2: pjp.address_2 || null,
          city: pjp.city || null,
          state: pjp.state || null,
          zip: pjp.zip || null,
          formatted: null,
        };
      } else {
        const { data: jj } = await supabaseAdmin
          .from("jobber_jobs")
          .select("property_address, jobber_properties(street1, street2, city, state, zip, formatted_address)")
          .eq("id", jobId)
          .maybeSingle();
        const jjp = (jj as any)?.jobber_properties;
        if (jjp && (jjp.street1 || jjp.city)) {
          addr = {
            line1: jjp.street1 || null,
            line2: jjp.street2 || null,
            city: jjp.city || null,
            state: jjp.state || null,
            zip: jjp.zip || null,
            formatted: jjp.formatted_address || null,
          };
        } else if ((jj as any)?.property_address) {
          addr.line1 = (jj as any).property_address;
        }
      }
    }

    const customerAddress =
      addr.formatted ||
      [addr.line1, addr.line2, [addr.city, addr.state, addr.zip].filter(Boolean).join(", ")]
        .filter(Boolean)
        .join(", ") ||
      null;

    // Return only safe public-facing fields — no internal notes, cost margins, or employee data
    return new Response(JSON.stringify({
      id: data.id,
      invoice_number: data.invoice_number,
      total: data.total,
      balance_due: data.balance_due,
      status: data.status,
      deposit_required: data.deposit_required,
      deposit_amount: data.deposit_amount,
      deposit_paid: data.deposit_paid,
      issue_date: data.issue_date,
      due_date: data.due_date,
      subtotal: data.subtotal,
      tax_total: data.tax_total,
      tax_rate: data.tax_rate,
      public_notes: data.public_notes,
      line_items: lineItems || [],
      customer_name: cust?.display_name || "Customer",
      customer_email: cust?.email || null,
      customer_phone: cust?.phone || null,
      customer_address: customerAddress,
      customer_address_lines: addr,
      business_name: biz?.public_brand_name || "",
      business_phone: biz?.support_phone || null,
      business_email: biz?.support_email || null,
      business_website: biz?.website_url || null,
      logo_url: biz?.logo_url || null,
      shortcode: invoiceShortcode,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: true, message: "Invalid request", code: "VALIDATION_ERROR" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
