import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
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

function detectLeadSource(sourcePage?: string): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source") || sessionStorage.getItem("utm_source") || "";
    const utmMedium = params.get("utm_medium") || sessionStorage.getItem("utm_medium") || "";
    const page = sourcePage || window.location.pathname;

    if (utmSource === "google" && utmMedium === "cpc") return "Google Ads";
    if (utmSource === "facebook" || utmSource === "instagram") return "Facebook/Instagram Ads";
    if (utmSource === "google" && utmMedium === "organic") return "Google Organic";
    if (page?.includes("cost-calculator") || page?.includes("palm-tree-cost")) return "Cost Calculator";
    if (page?.includes("holiday-lighting")) return "Holiday Lighting Page";
    if (page?.includes("emergency")) return "Emergency Page";
    if (page?.includes("hoa") || page?.includes("commercial")) return "HOA/Commercial Page";
    if (document?.referrer?.includes("google")) return "Google Organic";
    if (document?.referrer?.includes("facebook")) return "Facebook Organic";
    return "Direct / Unknown";
  } catch {
    return "Direct / Unknown";
  }
}

// Store UTM params on page load
function storeUtmParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    keys.forEach(k => {
      const v = params.get(k);
      if (v) sessionStorage.setItem(k, v);
    });
  } catch {}
}

// Auto-store on import
storeUtmParams();

export async function submitLead(data: LeadData): Promise<{ success: boolean; error?: string }> {
  try {
    const leadSource = detectLeadSource(data.source);

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
        lead_source: leadSource,
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

    // Track conversion in GA4
    trackEvent("lead_form_submit", {
      source: data.source || "website",
      service: data.service,
      location: data.location,
      lead_source: leadSource,
    });

    return { success: true };
  } catch (err: unknown) {
    console.error("Lead submission error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to submit" };
  }
}
