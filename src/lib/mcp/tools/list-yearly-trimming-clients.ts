import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { dbError, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_yearly_trimming_clients",
  title: "List yearly trimming clients",
  description:
    "List customers flagged as yearly trimming (recurring annual) clients, newest additions first, with how they were flagged.",
  inputSchema: {
    business_id: z.string().uuid().optional().describe("Limit to one business (see list_businesses)."),
    limit: z.number().int().optional().describe("Max customers to return, 1-200. Default 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ business_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const take = Math.min(Math.max(limit ?? 50, 1), 200);

    let query = supabase
      .from("platform_customers")
      .select(
        "id, business_id, display_name, phone, email, yearly_trimming_source, yearly_trimming_added_at, customer_status",
      )
      .eq("yearly_trimming", true)
      .order("yearly_trimming_added_at", { ascending: false, nullsFirst: false })
      .limit(take);
    if (business_id) query = query.eq("business_id", business_id);

    const { data, error } = await query;
    if (error) return dbError(error.message);
    return jsonResult({ count: data?.length ?? 0, customers: data ?? [] });
  },
});