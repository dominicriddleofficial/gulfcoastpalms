// Conversion analytics: fires GA4 events AND writes to our owner-only
// `analytics_events` table via the public `track-event` edge function.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type ConversionEvent =
  | "page_view"
  | "hero_cta_click"
  | "quote_request_started"
  | "quote_request_step_completed"
  | "quote_request_photo_added"
  | "quote_request_submitted"
  | "quote_request_abandoned"
  | "call_now_click"
  | "text_us_click"
  | "sticky_bar_call_click"
  | "sticky_bar_text_click"
  | "chat_opened"
  | "chat_message_sent"
  | "chat_lead_captured"
  | "mobile_menu_opened"
  | "mobile_menu_link_clicked"
  | "service_page_cta_click"
  | "location_page_cta_click"
  | "quote_viewed"
  | "quote_approved"
  | "invoice_viewed"
  | "invoice_paid"
  | "payment_failed"
  // legacy aliases still emitted across the codebase
  | "lead_form_submit"
  | "lead_form_start"
  | "referral_submit"
  | "job_application_submit"
  | "sop_signed"
  | "cta_click"
  | "maintenance_plan_inquiry"
  | "phone_click"
  | "chat_widget_open"
  | "emergency_page_view"
  | "lead_conversion"
  | "drip_optin"
  | "quote_request_completed";

interface EventParams {
  source?: string;
  service?: string;
  location?: string;
  position?: string;
  sop_type?: string;
  cta_text?: string;
  page_path?: string;
  form_source?: string;
  plan_type?: string;
  click_location?: string;
  sequence?: string;
  value?: number;
  business_type?: string;
  customer_id?: string;
  lead_id?: string;
  quote_id?: string;
  invoice_id?: string;
  [key: string]: string | number | boolean | undefined;
}

const VISITOR_KEY = "ga_visitor_id";
const SESSION_KEY = "ga_session_id";
const UTM_KEY = "ga_utm";
const SESSION_TTL_MS = 30 * 60_000;

const RESERVED_PARAM_KEYS = new Set([
  "source", "page_path", "business_type",
  "customer_id", "lead_id", "quote_id", "invoice_id",
]);

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeStorage(): Storage | null {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; }
}
function safeSession(): Storage | null {
  try { return typeof sessionStorage !== "undefined" ? sessionStorage : null; } catch { return null; }
}

export function getVisitorId(): string {
  const ls = safeStorage();
  if (!ls) return "anon";
  let id = ls.getItem(VISITOR_KEY);
  if (!id) { id = uid(); try { ls.setItem(VISITOR_KEY, id); } catch { /* ignore */ } }
  return id;
}

export function getSessionId(): string {
  const ss = safeSession();
  if (!ss) return "anon-session";
  const raw = ss.getItem(SESSION_KEY);
  const now = Date.now();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { id: string; last: number };
      if (now - parsed.last < SESSION_TTL_MS) {
        parsed.last = now;
        ss.setItem(SESSION_KEY, JSON.stringify(parsed));
        return parsed.id;
      }
    } catch { /* fall through */ }
  }
  const id = uid();
  try { ss.setItem(SESSION_KEY, JSON.stringify({ id, last: now })); } catch { /* ignore */ }
  return id;
}

export function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth || 0;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

interface UtmBag {
  utm_source?: string; utm_medium?: string; utm_campaign?: string;
  utm_term?: string; utm_content?: string;
}

export function captureUtmFromUrl(): UtmBag {
  if (typeof window === "undefined") return {};
  const ss = safeSession();
  const cached = ss?.getItem(UTM_KEY);
  if (cached) { try { return JSON.parse(cached) as UtmBag; } catch { /* ignore */ } }
  const url = new URL(window.location.href);
  const bag: UtmBag = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const) {
    const v = url.searchParams.get(k);
    if (v) bag[k] = v.slice(0, 120);
  }
  if (Object.keys(bag).length && ss) {
    try { ss.setItem(UTM_KEY, JSON.stringify(bag)); } catch { /* ignore */ }
  }
  return bag;
}

function detectBusinessType(path: string): string {
  if (path.startsWith("/prestige") || path.includes("prestige-property")) return "PPS";
  if (path.startsWith("/platform") || path.startsWith("/admin")) return "platform";
  return "GCP";
}

// Dedup: never send the exact same (event,page,session) twice within 1500ms.
const lastSent = new Map<string, number>();
function shouldSend(event: string, page: string, session: string): boolean {
  const key = `${event}|${page}|${session}`;
  const now = Date.now();
  const prev = lastSent.get(key);
  if (prev && now - prev < 1500) return false;
  lastSent.set(key, now);
  if (lastSent.size > 200) {
    for (const k of Array.from(lastSent.keys()).slice(0, 100)) lastSent.delete(k);
  }
  return true;
}

const SUPA_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) || "";
const SUPA_ANON = (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) || "";

function postEvent(payload: Record<string, unknown>) {
  if (!SUPA_URL || !SUPA_ANON) return;
  const url = `${SUPA_URL}/functions/v1/track-event`;
  try {
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    if ("sendBeacon" in navigator && payload.event_name === "page_view") {
      // beacon doesn't support headers; fall back to fetch keepalive so anon key flows
    }
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPA_ANON,
        "Authorization": `Bearer ${SUPA_ANON}`,
      },
      body: blob,
      keepalive: true,
    }).catch(() => { /* fire-and-forget */ });
  } catch { /* swallow */ }
}

export function trackEvent(event: ConversionEvent | string, params?: EventParams) {
  if (typeof window.gtag === "function") {
    window.gtag("event", event, {
      ...params,
      page_path: params?.page_path || window.location.pathname,
    });
  }
  if (typeof window === "undefined") return;

  const path = params?.page_path || window.location.pathname;
  const session = getSessionId();
  if (!shouldSend(event, path, session)) return;

  const utm = captureUtmFromUrl();
  const properties: Record<string, unknown> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v == null) continue;
      if (RESERVED_PARAM_KEYS.has(k)) continue;
      properties[k] = v;
    }
  }

  postEvent({
    event_name: event,
    page_path: path,
    page_url: window.location.href,
    referrer: document.referrer || null,
    business_type: params?.business_type || detectBusinessType(path),
    source_component: params?.source || null,
    device_type: getDeviceType(),
    visitor_id: getVisitorId(),
    session_id: session,
    customer_id: params?.customer_id || null,
    lead_id: params?.lead_id || null,
    quote_id: params?.quote_id || null,
    invoice_id: params?.invoice_id || null,
    ...utm,
    properties,
  });
}

export function trackPageView(path?: string) {
  const finalPath = path || (typeof window !== "undefined" ? window.location.pathname : "/");
  if (typeof window.gtag === "function") {
    window.gtag("event", "page_view", {
      page_path: finalPath,
      page_location: window.location.href,
    });
  }
  trackEvent("page_view", { page_path: finalPath });
}

// Predefined event helpers
export const trackMaintenancePlanInquiry = (planType: string) =>
  trackEvent("maintenance_plan_inquiry", {
    plan_type: planType,
    value: planType === "quarterly" ? 3 : planType === "semi-annual" ? 2 : 1,
  });

export const trackPhoneClick = (location: string) =>
  trackEvent("phone_click", { click_location: location });

export const trackChatOpen = () =>
  trackEvent("chat_widget_open");

export const trackEmergencyPageView = () =>
  trackEvent("emergency_page_view");
