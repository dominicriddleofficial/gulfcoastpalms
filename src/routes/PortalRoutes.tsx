import { lazy } from "react";
import { Route } from "react-router-dom";

const PayInvoice = lazy(() => import("@/pages/pay/PayInvoice"));
const PaymentSuccess = lazy(() => import("@/pages/pay/PaymentSuccess"));
const ViewQuote = lazy(() => import("@/pages/quote/ViewQuote"));
const CustomerPortal = lazy(() => import("@/pages/portal/CustomerPortal"));
const TapToPayLanding = lazy(() => import("@/pages/app/TapToPayLanding"));

/**
 * Customer-facing public portal routes: invoice payment, quote viewing,
 * customer portal, and the tap-to-pay app landing page.
 */
export const PortalRoutes = () => (
  <>
    <Route path="/pay/:shortcode/:invoiceId" element={<PayInvoice />} />
    <Route path="/pay/:shortcode/success" element={<PaymentSuccess />} />
    <Route path="/quote/:shortcode/:quoteId" element={<ViewQuote />} />
    <Route path="/portal" element={<CustomerPortal />} />
    <Route path="/app/tap-to-pay" element={<TapToPayLanding />} />
  </>
);