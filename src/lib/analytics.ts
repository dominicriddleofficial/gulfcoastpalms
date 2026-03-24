// GA4 Analytics helper — fires gtag events for conversion tracking

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type ConversionEvent =
  | "lead_form_submit"
  | "chat_lead_captured"
  | "referral_submit"
  | "job_application_submit"
  | "sop_signed"
  | "call_now_click"
  | "text_us_click"
  | "cta_click";

interface EventParams {
  source?: string;
  service?: string;
  location?: string;
  position?: string;
  sop_type?: string;
  cta_text?: string;
  page_path?: string;
  [key: string]: string | number | boolean | undefined;
}

export function trackEvent(event: ConversionEvent, params?: EventParams) {
  if (typeof window.gtag === "function") {
    window.gtag("event", event, {
      ...params,
      page_path: params?.page_path || window.location.pathname,
    });
  }
}

export function trackPageView(path?: string) {
  if (typeof window.gtag === "function") {
    window.gtag("event", "page_view", {
      page_path: path || window.location.pathname,
      page_location: window.location.href,
    });
  }
}
