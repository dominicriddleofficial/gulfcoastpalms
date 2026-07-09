import { trackEvent } from "@/lib/analytics";
import { leadFormSchema } from "@/lib/validation";
import { invokeEdge } from "@/lib/invoke-edge";

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

    const pageContext = typeof window !== "undefined"
      ? {
          website_origin: window.location.origin,
          landing_page_url: window.location.href,
          referrer_url: document.referrer || null,
          utm_source: sessionStorage.getItem("utm_source"),
          utm_medium: sessionStorage.getItem("utm_medium"),
          utm_campaign: sessionStorage.getItem("utm_campaign"),
          utm_content: sessionStorage.getItem("utm_content"),
          utm_term: sessionStorage.getItem("utm_term"),
        }
      : {};

    // All DB writes + dedupe + SMS run server-side in the submit-lead edge
    // function (service role). Anon can't SELECT the lead tables under RLS,
    // so any direct .select() from the browser 401s and blocks the submit.
    const { data: result, error: fnErr } = await invokeEdge<{
      success: boolean;
      error?: string;
      id?: string;
      duplicate?: boolean;
    }>("submit-lead", {
      name: clean.name,
      phone: clean.phone,
      email: clean.email,
      source: clean.source || "website",
      service: clean.service,
      location: clean.location,
      message: clean.message,
      sqft: clean.sqft,
      lead_source: leadSource,
      page_context: pageContext,
    });

    if (fnErr || !result?.success) {
      const msg = result?.error || fnErr?.message || "Failed to submit";
      return { success: false, error: msg };
    }

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
