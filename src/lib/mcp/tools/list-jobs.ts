import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { dbError, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_jobs",
  title: "List jobs",
  description:
    "List jobs scheduled in a date range (defaults to the next 7 days), optionally filtered by status or business. Returns job number, title, status, schedule and total.",
  inputSchema: {
    business_id: z.string().uuid().optional().describe("Limit to one business (see list_businesses)."),
    status: z.string().optional().describe("Filter by job status, e.g. scheduled, in_progress, completed."),
    from_date: z.string().optional().describe("Start date, YYYY-MM-DD. Defaults to today."),
    to_date: z.string().optional().describe("End date, YYYY-MM-DD. Defaults to 7 days after the start date."),
    limit: z.number().int().optional().describe("Max jobs to return, 1-100. Default 25."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ business_id, status, from_date, to_date, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const take = Math.min(Math.max(limit ?? 25, 1), 100);

    const start = from_date ? new Date(`${from_date}T00:00:00Z`) : new Date();
    if (Number.isNaN(start.getTime())) return dbError("from_date must be a valid YYYY-MM-DD date.");
    const end = to_date
      ? new Date(`${to_date}T23:59:59Z`)
      : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(end.getTime())) return dbError("to_date must be a valid YYYY-MM-DD date.");

    let query = supabase
      .from("platform_jobs")
      .select(
        "id, business_id, job_number, title, status, job_type, scheduled_start, scheduled_end, total, customer_id, description",
      )
      .is("deleted_at", null)
      .gte("scheduled_start", start.toISOString())
      .lte("scheduled_start", end.toISOString())
      .order("scheduled_start", { ascending: true })
      .limit(take);
    if (business_id) query = query.eq("business_id", business_id);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return dbError(error.message);
    return jsonResult({
      range: { from: start.toISOString(), to: end.toISOString() },
      count: data?.length ?? 0,
      jobs: data ?? [],
    });
  },
});