/**
 * Central contact info — re-exports from the canonical business-info
 * module so legacy imports continue to work while new code can pull
 * directly from `@/lib/business-info`.
 */
import { GCP_BUSINESS, TEL_HREF, SMS_HREF } from "@/lib/business-info";

export const PHONE_NUMBER = GCP_BUSINESS.phoneDigits;
export const PHONE_NUMBER_DISPLAY = GCP_BUSINESS.phoneDisplay;
export const PHONE_NUMBER_TEL = TEL_HREF;
export const SMS_NUMBER = SMS_HREF;
