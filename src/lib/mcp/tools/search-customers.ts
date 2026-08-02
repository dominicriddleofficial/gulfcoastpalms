import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { dbError, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_customers",
  title: "Search customers",
  description:
    "Search customers by name, company, phone or email. Returns contact details plus yearly-trimming and check-preference flags.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Name, company, phone or email fragment to search for."),
    business_id: z.string().uuid().optional().describe("Limit to one business (see list_businesses)."),
    limit: z.number().int().optional().describe("Max customers to return, 1-50. Default 15."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, business_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const take = Math.min(Math.max(limit ?? 15, 1), 50);
    const term = query.replace(/[%,()]/g, " ").trim();
    if (!term) return dbError("Provide a searchable term.");

    let request = supabase
      .from("platform_customers")
      .select(
        "id, business_id, display_name, company_name, phone, email, customer_status, yearly_trimming, prefers_check, created_at",
      )
      .or(
        [
          `display_name.ilike.%${term}%`,
          `company_name.ilike.%${term}%`,
          `phone.ilike.%${term}%`,
          `email.ilike.%${term}%`,
        ].join(","),
      )
      .order("display_name")
      .limit(take);
    if (business_id) request = request.eq("business_id", business_id);

    const { data, error } = await request;
    if (error) return dbError(error.message);
    return jsonResult({ count: data?.length ?? 0, customers: data ?? [] });
  },
});