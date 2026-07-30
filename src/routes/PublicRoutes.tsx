import { lazy } from "react";
import { Route } from "react-router-dom";
import ReviewTextHarness from "@/pages/__dev/ReviewTextHarness";

const ThankYou = lazy(() => import("@/pages/ThankYou"));
const Referral = lazy(() => import("@/pages/Referral"));
const Payments = lazy(() => import("@/pages/Payments"));
const TextConsent = lazy(() => import("@/pages/TextConsent"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * Misc public utility/legal routes that are not part of the marketing
 * funnel and not part of the platform/portal.
 */
export const PublicRoutes = () => (
  <>
    <Route path="/__dev/review-text" element={<ReviewTextHarness />} />
    <Route path="/thank-you" element={<ThankYou />} />
    <Route path="/referral" element={<Referral />} />
    <Route path="/payments" element={<Payments />} />
    <Route path="/text-consent" element={<TextConsent />} />
    <Route path="/terms-of-service" element={<TermsOfService />} />
    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
    <Route path="*" element={<NotFound />} />
  </>
);