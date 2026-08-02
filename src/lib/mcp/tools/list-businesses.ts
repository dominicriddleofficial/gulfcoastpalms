import { defineTool } from "@lovable.dev/mcp-js";
import { dbError, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_businesses",
  title: "List businesses",
  description:
    "List the businesses (tenants) the signed-in user can access, with their ids. Use an id as business_id for other tools.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("businesses")
      .select("id, name, public_brand_name, shortcode")
      .order("name");
    if (error) return dbError(error.message);
    return jsonResult({ businesses: data ?? [] });
  },
});