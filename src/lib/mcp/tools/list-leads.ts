import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { dbError, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_leads",
  title: "List leads",
  description:
    "List recent leads (newest first), optionally filtered by lead status or business. Returns name, phone, email, service requested, status and created date.",
  inputSchema: {
    business_id: z.string().uuid().optional().describe("Limit to one business (see list_businesses)."),
    lead_status: z.string().optional().describe("Filter by lead status, e.g. new, contacted, quoted, won, lost."),
    limit: z.number().int().optional().describe("Max leads to return, 1-100. Default 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ business_id, lead_status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const take = Math.min(Math.max(limit ?? 20, 1), 100);
    let query = supabase
      .from("platform_leads")
      .select(
        "id, business_id, inquiry_name, inquiry_phone, inquiry_email, requested_service, lead_status, lead_source, urgency_level, message, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(take);
    if (business_id) query = query.eq("business_id", business_id);
    if (lead_status) query = query.eq("lead_status", lead_status);
    const { data, error } = await query;
    if (error) return dbError(error.message);
    return jsonResult({ count: data?.length ?? 0, leads: data ?? [] });
  },
});