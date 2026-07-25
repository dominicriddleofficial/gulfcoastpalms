import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { dbError, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_unpaid_invoices",
  title: "List unpaid invoices",
  description:
    "List invoices that are not paid or voided, oldest issue date first, with balance due, payment method and due date.",
  inputSchema: {
    business_id: z.string().uuid().optional().describe("Limit to one business (see list_businesses)."),
    limit: z.number().int().optional().describe("Max invoices to return, 1-100. Default 25."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ business_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const take = Math.min(Math.max(limit ?? 25, 1), 100);

    let query = supabase
      .from("platform_invoices")
      .select(
        "id, business_id, invoice_number, billing_name, status, payment_method, total, amount_paid, balance_due, issue_date, due_date, sent_at",
      )
      .is("deleted_at", null)
      .is("paid_at", null)
      .is("voided_at", null)
      .order("issue_date", { ascending: true, nullsFirst: false })
      .limit(take);
    if (business_id) query = query.eq("business_id", business_id);

    const { data, error } = await query;
    if (error) return dbError(error.message);
    const outstanding = (data ?? []).reduce((sum, row) => sum + Number(row.balance_due ?? row.total ?? 0), 0);
    return jsonResult({ count: data?.length ?? 0, total_outstanding: outstanding, invoices: data ?? [] });
  },
});