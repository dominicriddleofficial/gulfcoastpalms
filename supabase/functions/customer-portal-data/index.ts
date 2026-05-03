import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token, action } = await req.json();
    if (!token || typeof token !== "string" || token.length < 16) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 400, headers: JSON_HEADERS });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const tokenHash = await sha256(token);

    const { data: tokenRow } = await supabase
      .from("customer_portal_tokens")
      .select("id, email, expires_at, consumed_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!tokenRow || new Date(tokenRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Link expired or invalid" }), { status: 401, headers: JSON_HEADERS });
    }
    // Mark consumed (one-time, but allow re-fetch within session = mark used_at, allow until expiry)
    if (!tokenRow.consumed_at) {
      await supabase.from("customer_portal_tokens").update({ consumed_at: new Date().toISOString(), used_at: new Date().toISOString() }).eq("id", tokenRow.id);
    }

    // Find all customer records for this email (could be in multiple businesses)
    const { data: customers } = await supabase
      .from("platform_customers")
      .select("id, display_name, email, phone, business_id")
      .ilike("email", tokenRow.email);

    if (!customers || customers.length === 0) {
      return new Response(JSON.stringify({ error: "No account found" }), { status: 404, headers: JSON_HEADERS });
    }

    const customerIds = customers.map(c => c.id);
    const businessIds = Array.from(new Set(customers.map(c => c.business_id)));

    const [quotesRes, invoicesRes, paymentsRes, jobsRes, businessesRes] = await Promise.all([
      supabase.from("platform_quotes")
        .select("id, quote_number, status, total, valid_until, sent_at, accepted_at, created_at, business_id, customer_id")
        .in("customer_id", customerIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("platform_invoices")
        .select("id, invoice_number, status, total, balance_due, amount_paid, issue_date, due_date, paid_at, business_id, customer_id")
        .in("customer_id", customerIds)
        .is("deleted_at", null)
        .order("issue_date", { ascending: false })
        .limit(100),
      supabase.from("platform_payments")
        .select("id, payment_number, amount, method, status, payment_date, invoice_id, is_refund, business_id")
        .in("customer_id", customerIds)
        .order("payment_date", { ascending: false })
        .limit(100),
      supabase.from("platform_jobs")
        .select("id, job_number, title, status, scheduled_start, scheduled_end, total, business_id, customer_id")
        .in("customer_id", customerIds)
        .is("deleted_at", null)
        .in("status", ["scheduled", "draft", "in_progress", "on_the_way", "arrived", "completed"])
        .order("scheduled_start", { ascending: true, nullsFirst: false })
        .limit(100),
      supabase.from("businesses")
        .select("id, public_brand_name, shortcode, support_email, support_phone, logo_url")
        .in("id", businessIds),
    ]);

    return new Response(JSON.stringify({
      customer: { email: tokenRow.email, name: customers[0].display_name, phone: customers[0].phone },
      businesses: businessesRes.data || [],
      quotes: quotesRes.data || [],
      invoices: invoicesRes.data || [],
      payments: paymentsRes.data || [],
      jobs: jobsRes.data || [],
    }), { headers: JSON_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: JSON_HEADERS });
  }
});