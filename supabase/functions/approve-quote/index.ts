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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "request_changes") {
      // Change request flow
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

    return new Response(JSON.stringify({ success: true, status: "approved" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
