import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { leadFormSchema, sanitizeText } from "@/lib/validation";

export interface LeadData {
  name: string;
  phone?: string;
  email?: string;
  source?: string;
  service?: string;
  location?: string;
  message?: string;
  sqft?: number;
  /** Honeypot field — must be empty. If filled, treat as spam. */
  website?: string;
  /** Time (ms) the form was rendered. Submissions <2s are likely bots. */
  formRenderTime?: number;
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
    // Honeypot anti-spam: silently succeed if filled
    if (data.website && data.website.trim().length > 0) {
      if (import.meta.env.DEV) console.warn("[spam blocked] honeypot triggered");
      return { success: true };
    }
    // Render-time anti-spam: reject submissions in under 2s
    if (data.formRenderTime && Date.now() - data.formRenderTime < 2000) {
      if (import.meta.env.DEV) console.warn("[spam blocked] form submitted too fast");
      return { success: true };
    }

    // Validate and sanitize input
    const parsed = leadFormSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Invalid form data";
      return { success: false, error: firstError };
    }
    const clean = parsed.data;

    const leadSource = detectLeadSource(clean.source);

    // Insert lead into database
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        name: clean.name,
        phone: clean.phone || null,
        email: clean.email || null,
        source: clean.source || "website",
        service: clean.service || null,
        location: clean.location || null,
        message: clean.message || null,
        sqft: clean.sqft || null,
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
