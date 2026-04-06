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
  | "cta_click"
  | "maintenance_plan_inquiry"
  | "phone_click"
  | "chat_widget_open"
  | "emergency_page_view"
  | "lead_conversion"
  | "drip_optin";

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
  [key: string]: string | number | boolean | undefined;
}

export function trackEvent(event: ConversionEvent | string, params?: EventParams) {
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
