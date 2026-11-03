import { trackEvent, captureUtmFromUrl } from "@/lib/analytics";
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

/** Ad tags for this visit, shared with website analytics (same visit scope; never throws). */
function visitUtm(): Record<string, string | undefined> {
  try { return { ...captureUtmFromUrl() }; } catch { return {}; }
}

function detectLeadSource(sourcePage: string | undefined, utm: Record<string, string | undefined>): string {
  try {
    const utmSource = utm.utm_source || "";
    const utmMedium = utm.utm_medium || "";
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

function buildPageContext(utm: Record<string, string | undefined>): Record<string, string | null> {
  try {
    return {
      website_origin: window.location.origin,
      landing_page_url: window.location.href,
      referrer_url: document.referrer || null,
      utm_source: utm.utm_source ?? null,
      utm_medium: utm.utm_medium ?? null,
      utm_campaign: utm.utm_campaign ?? null,
      utm_content: utm.utm_content ?? null,
      utm_term: utm.utm_term ?? null,
    };
  } catch { return {}; }
}

// Record this visit's ad tags on load (same store analytics uses).
if (typeof window !== "undefined") visitUtm();

export async function submitLead(data: LeadData): Promise<{ success: boolean; error?: string }> {
  try {
    // Honeypot anti-spam: silently succeed if filled
    if (data.website && data.website.trim().length > 0) {
      if (import.meta.env.DEV) console.warn("[spam blocked] honeypot triggered");
      return { success: true };
    }
    // Autofill can finish quickly. Preserve the form and allow a retry;
    // never report a saved lead when no request has reached the server.
    if (data.formRenderTime && Date.now() - data.formRenderTime < 2000) {
      if (import.meta.env.DEV) console.warn("[spam blocked] form submitted too fast");
      return { success: false, error: "Please wait a moment, then submit again. Your request has not been sent yet." };
    }

    // Validate and sanitize input
    const parsed = leadFormSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Invalid form data";
      return { success: false, error: firstError };
    }
    const clean = parsed.data;

    // Optional context: any failure here must never stop a valid lead from being sent.
    const utm = typeof window !== "undefined" ? visitUtm() : {};
    const leadSource = typeof window !== "undefined" ? detectLeadSource(clean.source, utm) : "Direct / Unknown";
    const pageContext = typeof window !== "undefined" ? buildPageContext(utm) : {};

    // All DB writes + dedupe + SMS run server-side in the submit-lead edge
    // function (service role). Anon can't SELECT the lead tables under RLS,
    // so any direct .select() from the browser 401s and blocks the submit.
    const { data: result, error: fnErr } = await invokeEdge<{
      success: boolean;
      error?: string;
      id?: string;
      duplicate?: boolean;
      too_fast?: boolean;
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

    if (result?.too_fast) {
      return { success: false, error: "Please wait a moment, then submit again. Your request has not been sent yet." };
    }
    if (fnErr || !result?.success) {
      const msg = result?.error || fnErr?.message || "Failed to submit";
      return { success: false, error: msg };
    }

    // Track conversion in GA4
    // One event per successful save; a server-side duplicate isn't a new request. The id is random, not personal data.
    if (!result.duplicate) try { trackEvent("lead_form_submit", {
      submission_id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      form_source: data.source || "website",
      service: data.service,
      lead_source: leadSource,
    }); } catch { /* tracking is optional */ }

    return { success: true };
  } catch (err: unknown) {
    console.error("Lead submission error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to submit" };
  }
}
