import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

type Quote = Tables<"platform_quotes">;
type QuoteLine = Tables<"platform_quote_line_items">;

export interface QuoteEditData {
  quote: Quote;
  items: QuoteLine[];
  customer: Pick<Tables<"platform_customers">, "id" | "display_name" | "email" | "phone"> | null;
}

export type QuoteChanges = Pick<TablesUpdate<"platform_quotes">,
  "billing_name" | "subtotal" | "discount_total" | "tax_rate" | "tax_total" | "total" |
  "deposit_required_flag" | "deposit_type" | "deposit_value" | "deposit_amount_calculated" |
  "valid_until" | "scope_of_work" | "internal_notes" | "public_notes">;

export type EditedQuoteLine = Omit<QuoteLine, "created_at"> & { created_at?: string };

/** Update the same quote and retain its public link, status and relationships.
 * Stable line IDs make a retry safe; failed writes restore the previous lines.
 * No customer notifications are sent by this operation.
 */
export async function saveEditedQuote(
  original: QuoteEditData,
  changes: QuoteChanges,
  items: EditedQuoteLine[],
  userId: string,
): Promise<QuoteEditData & { historyWarning?: string }> {
  const { quote } = original;
  if (!userId) throw new Error("Sign in before saving the quote.");
  if (!items.length || items.some(item => !item.description.trim() ||
    !Number.isFinite(item.quantity) || item.quantity <= 0 ||
    !Number.isFinite(item.unit_price) || item.unit_price < 0 ||
    !Number.isFinite(item.line_total) || item.line_total < 0)) {
    throw new Error("Add a description, a quantity greater than zero, and a valid price for each line.");
  }
  if (items.some(item => item.quote_id !== quote.id || item.business_id !== quote.business_id)) {
    throw new Error("The line items do not belong to this quote.");
  }

  const { data: current, error: readError } = await supabase.from("platform_quotes")
    .select("*").eq("id", quote.id).eq("business_id", quote.business_id).single();
  if (readError || !current) throw new Error(readError?.message || "Quote could not be loaded.");
  if (current.is_read_only || current.deleted_at) throw new Error("This quote cannot be edited.");
  if (current.updated_at !== quote.updated_at) {
    throw new Error("This quote changed while you were editing. Reopen it to load the latest version.");
  }

  const originalIds = new Set(original.items.map(item => item.id));
  const keptIds = new Set(items.map(item => item.id));
  const removedIds = original.items.filter(item => !keptIds.has(item.id)).map(item => item.id);
  const addedIds = items.filter(item => !originalIds.has(item.id)).map(item => item.id);
  const originalCreatedAt = new Map(original.items.map(item => [item.id, item.created_at]));
  const createdAt = new Date().toISOString();
  // Bulk upserts treat a missing key as NULL when another row includes it.
  // Keep existing creation dates and supply one for every newly added line.
  const linesToSave: QuoteLine[] = items.map(item => ({
    ...item,
    created_at: originalCreatedAt.get(item.id) ?? item.created_at ?? createdAt,
  }));
  let savedQuote: Quote | null = null;
  let savedItems: QuoteLine[] = [];
  let headerAttempted = false;

  try {
    // Upsert first: never delete every line before attempting to save replacements.
    const { data: written, error: lineError } = await supabase.from("platform_quote_line_items")
      .upsert(linesToSave, { onConflict: "id" }).select("*");
    if (lineError || written?.length !== items.length) {
      throw new Error(lineError?.message || "Could not confirm all line items saved.");
    }
    savedItems = written;
    if (removedIds.length) {
      const { data: removed, error: deleteError } = await supabase.from("platform_quote_line_items")
        .delete().eq("quote_id", quote.id).eq("business_id", quote.business_id)
        .in("id", removedIds).select("id");
      if (deleteError || removed?.length !== removedIds.length) {
        throw new Error(deleteError?.message || "Could not remove the selected line items.");
      }
    }

    // Deliberately omit status, number, customer/property/lead IDs and approval fields.
    headerAttempted = true;
    const { data: updated, error: updateError } = await supabase.from("platform_quotes")
      .update({ ...changes, version_number: (current.version_number ?? 1) + 1, last_modified_by_user_id: userId })
      .eq("id", quote.id).eq("business_id", quote.business_id).eq("updated_at", current.updated_at)
      .eq("is_read_only", false).select("*").single();
    if (updateError || !updated) throw new Error(updateError?.message || "Could not confirm the quote saved.");
    savedQuote = updated;
  } catch (error) {
    // A dropped response does not prove the UPDATE failed. Read it back before
    // restoring lines, otherwise a successful save could acquire old line totals.
    if (headerAttempted) {
      let observed: Quote | null = null;
      try {
        const { data, error: verifyError } = await supabase.from("platform_quotes")
          .select("*").eq("id", quote.id).eq("business_id", quote.business_id).single();
        if (verifyError || !data) throw verifyError || new Error("Verification failed");
        observed = data;
      } catch {
        throw new Error("Could not confirm whether the changes saved. Reopen the quote to check its latest version before editing again.");
      }
      if (observed.version_number !== current.version_number) {
        const matchesChanges = Object.entries(changes).every(([key, value]) => observed[key as keyof Quote] === value);
        if (observed.version_number === (current.version_number ?? 1) + 1 &&
          observed.last_modified_by_user_id === userId && matchesChanges) {
          savedQuote = observed;
        } else {
          throw new Error("Another update was saved while you were editing. Reopen the quote to check its latest version.");
        }
      }
    }
    if (!savedQuote) {
      // Keep the old quote and its original lines consistent if any write fails.
      // If recovery itself fails, report that explicitly rather than claiming success.
      try {
        if (original.items.length) {
          const { data, error: restoreError } = await supabase.from("platform_quote_line_items")
            .upsert(original.items, { onConflict: "id" }).select("id");
          if (restoreError || data?.length !== original.items.length) throw restoreError || new Error("Restore failed");
        }
        if (addedIds.length) {
          const { error: cleanupError } = await supabase.from("platform_quote_line_items")
            .delete().eq("quote_id", quote.id).eq("business_id", quote.business_id).in("id", addedIds);
          if (cleanupError) throw cleanupError;
        }
      } catch {
        throw new Error("Saving was interrupted and the previous line items could not be restored. Keep this editor open and retry saving.");
      }
      throw error;
    }
  }

  if (!savedQuote) throw new Error("Could not confirm the quote saved.");

  let historyWarning: string | undefined;
  try {
    const { error } = await supabase.from("platform_quote_versions").insert({
      business_id: quote.business_id, quote_id: quote.id,
      version_number: savedQuote.version_number ?? 1, created_by_user_id: userId,
      snapshot_json: JSON.parse(JSON.stringify({ quote: savedQuote, line_items: savedItems })),
    });
    if (error) historyWarning = "Quote updated, but the version history could not be saved.";
  } catch {
    historyWarning = "Quote updated, but the version history could not be saved.";
  }
  return { quote: savedQuote, items: savedItems, customer: original.customer, historyWarning };
}
