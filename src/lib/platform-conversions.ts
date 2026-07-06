import { supabase } from "@/integrations/supabase/client";
import type { PlatformLead } from "@/hooks/usePlatformLeads";
import type { PlatformQuote } from "@/hooks/usePlatformQuotes";
import { todayLocalKey } from "@/lib/localDate";

/**
 * Convert a lead into a platform_customer, update lead status to "won",
 * and return the new customer ID.
 */
export async function convertLeadToCustomer(lead: PlatformLead): Promise<{ customerId: string; error?: string }> {
  // Split name into first/last
  const parts = lead.inquiry_name.trim().split(/\s+/);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";

  // Check for existing customer with same phone/email
  if (lead.inquiry_phone || lead.inquiry_email) {
    const { data: dupes } = await supabase.rpc("find_duplicate_customers", {
      _business_id: lead.business_id,
      _phone: lead.inquiry_phone || null,
      _email: lead.inquiry_email || null,
    });
    if (dupes && dupes.length > 0) {
      // Link to existing customer, just update lead status
      await supabase.from("platform_leads").update({ lead_status: "won" }).eq("id", lead.id);
      return { customerId: dupes[0].id };
    }
  }

  // Create new customer
  const { data: newCustomer, error: insertErr } = await supabase
    .from("platform_customers")
    .insert({
      business_id: lead.business_id,
      display_name: lead.inquiry_name,
      first_name: firstName,
      last_name: lastName,
      phone: lead.inquiry_phone,
      email: lead.inquiry_email,
      source: lead.source_name || "lead_conversion",
      referral_source: lead.utm_source || null,
      internal_notes: lead.message || null,
    })
    .select("id")
    .single();

  if (insertErr || !newCustomer) {
    return { customerId: "", error: insertErr?.message || "Failed to create customer" };
  }

  // Update lead status to won
  await supabase.from("platform_leads").update({ lead_status: "won" }).eq("id", lead.id);

  return { customerId: newCustomer.id };
}

/**
 * Convert an accepted quote into a platform_job with auto-numbering,
 * update quote status to "archived", and return the new job.
 */
export async function convertQuoteToJob(quote: PlatformQuote): Promise<{ jobId: string; jobNumber: string; error?: string }> {
  // Generate job number
  let jobNumber: string;
  try {
    const { data, error } = await supabase.rpc("generate_next_number", {
      _business_id: quote.business_id,
      _record_type: "job",
    });
    if (error) throw error;
    jobNumber = data as string;
  } catch (e: any) {
    return { jobId: "", jobNumber: "", error: "Failed to generate job number: " + e.message };
  }

  // Create job
  const { data: newJob, error: jobErr } = await supabase
    .from("platform_jobs")
    .insert({
      business_id: quote.business_id,
      job_number: jobNumber,
      customer_id: quote.customer_id,
      property_id: quote.property_id,
      lead_id: quote.lead_id,
      quote_id: quote.id,
      title: `Job from ${quote.quote_number}`,
      description: quote.public_notes || quote.internal_notes || null,
      status: "scheduled",
      subtotal: quote.subtotal,
      tax_total: quote.tax_total,
      total: quote.total,
      deposit_collected: quote.deposit_required_flag ? quote.deposit_amount_calculated : 0,
    })
    .select("id, job_number")
    .single();

  if (jobErr || !newJob) {
    return { jobId: "", jobNumber: "", error: jobErr?.message || "Failed to create job" };
  }

  // Copy quote line items into a visit (first visit)
  await supabase.from("platform_job_visits").insert({
    business_id: quote.business_id,
    job_id: newJob.id,
    visit_number: 1,
    title: `Visit 1 - ${quote.quote_number}`,
    status: "scheduled",
    scheduled_date: todayLocalKey(),
  });

  // Update quote status
  await supabase.from("platform_quotes").update({ status: "archived" }).eq("id", quote.id);

  return { jobId: newJob.id, jobNumber: newJob.job_number };
}
