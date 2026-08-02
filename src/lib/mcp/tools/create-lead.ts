import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { dbError, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_lead",
  title: "Create lead",
  description:
    "Create a new lead for a business. Provide business_id from list_businesses; if omitted and the user can access exactly one business, that one is used.",
  inputSchema: {
    inquiry_name: z.string().trim().min(1).describe("Contact name."),
    business_id: z.string().uuid().optional().describe("Target business id."),
    inquiry_phone: z.string().trim().optional().describe("Contact phone number."),
    inquiry_email: z.string().trim().optional().describe("Contact email address."),
    requested_service: z.string().trim().optional().describe("Service the lead asked about."),
    message: z.string().trim().optional().describe("Notes or the customer's message."),
    lead_source: z.string().trim().optional().describe("Where the lead came from. Defaults to 'mcp'."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    let businessId = input.business_id;
    if (!businessId) {
      const { data: businesses, error: bizError } = await supabase.from("businesses").select("id").limit(2);
      if (bizError) return dbError(bizError.message);
      if (!businesses || businesses.length !== 1) {
        return dbError("business_id is required. Call list_businesses and pass the correct id.");
      }
      businessId = businesses[0].id;
    }

    const { data, error } = await supabase
      .from("platform_leads")
      .insert({
        business_id: businessId,
        inquiry_name: input.inquiry_name,
        inquiry_phone: input.inquiry_phone ?? null,
        inquiry_email: input.inquiry_email ?? null,
        requested_service: input.requested_service ?? null,
        message: input.message ?? null,
        lead_source: input.lead_source ?? "mcp",
      })
      .select("id, business_id, inquiry_name, lead_status, created_at")
      .single();
    if (error) return dbError(error.message);
    return jsonResult({ lead: data });
  },
});