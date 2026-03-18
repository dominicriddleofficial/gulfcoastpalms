import { supabase } from "@/integrations/supabase/client";

export interface LeadData {
  name: string;
  phone?: string;
  email?: string;
  source?: string;
  service?: string;
  location?: string;
  message?: string;
  sqft?: number;
}

export async function submitLead(data: LeadData): Promise<{ success: boolean; error?: string }> {
  try {
    // Insert lead into database
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        source: data.source || "website",
        service: data.service || null,
        location: data.location || null,
        message: data.message || null,
        sqft: data.sqft || null,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    // Enroll in post-lead drip sequence
    const nextSend = new Date();
    nextSend.setMinutes(nextSend.getMinutes() + 5); // First email in 5 min
    await supabase.from("email_drip_enrollments").insert({
      lead_id: lead.id,
      sequence_type: "post_lead",
      current_step: 0,
      next_send_at: nextSend.toISOString(),
      status: "active",
    });

    // Fire SMS notification (non-blocking)
    supabase.functions.invoke("notify-lead", {
      body: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        service: data.service,
        location: data.location,
        message: data.message,
      },
    }).catch(console.error);

    return { success: true };
  } catch (err: unknown) {
    console.error("Lead submission error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to submit" };
  }
}
