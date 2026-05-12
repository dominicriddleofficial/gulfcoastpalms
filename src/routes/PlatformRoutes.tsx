import { lazy } from "react";
import { Route } from "react-router-dom";
import RoleRoute from "@/components/platform/RoleRoute";

const PlatformLogin = lazy(() => import("@/pages/platform/PlatformLogin"));
const PlatformDashboard = lazy(() => import("@/pages/platform/PlatformDashboard"));
const PlatformLeads = lazy(() => import("@/pages/platform/PlatformLeads"));
const PlatformCustomers = lazy(() => import("@/pages/platform/PlatformCustomers"));
const PlatformQuotes = lazy(() => import("@/pages/platform/PlatformQuotes"));
const PlatformQuoteDisplay = lazy(() => import("@/pages/platform/PlatformQuoteDisplay"));
const PlatformJobs = lazy(() => import("@/pages/platform/PlatformJobs"));
const PlatformSchedule = lazy(() => import("@/pages/platform/PlatformSchedule"));
const PlatformInvoices = lazy(() => import("@/pages/platform/PlatformInvoices"));
const PlatformPayments = lazy(() => import("@/pages/platform/PlatformPayments"));
const PlatformAnalytics = lazy(() => import("@/pages/platform/PlatformAnalytics"));
const PlatformComms = lazy(() => import("@/pages/platform/PlatformComms"));
const PlatformTasks = lazy(() => import("@/pages/platform/PlatformTasks"));
const PlatformSettings = lazy(() => import("@/pages/platform/PlatformSettings"));
const PlatformCrew = lazy(() => import("@/pages/platform/PlatformCrew"));
const PlatformTeam = lazy(() => import("@/pages/platform/PlatformTeam"));
const PlatformDocuments = lazy(() => import("@/pages/platform/PlatformDocuments"));
const PlatformJobChecklists = lazy(() => import("@/pages/platform/PlatformJobChecklists"));
const PlatformJobPricing = lazy(() => import("@/pages/platform/PlatformJobPricing"));
const PlatformChangePassword = lazy(() => import("@/pages/platform/PlatformChangePassword"));
const PlatformFinance = lazy(() => import("@/pages/platform/PlatformFinance"));
const PlatformJobNew = lazy(() => import("@/pages/platform/PlatformJobNew"));
const PlatformCustomerNew = lazy(() => import("@/pages/platform/PlatformCustomerNew"));
const PlatformLeadNew = lazy(() => import("@/pages/platform/PlatformLeadNew"));
const PlatformInvoiceNew = lazy(() => import("@/pages/platform/PlatformInvoiceNew"));
const PlatformQuoteNew = lazy(() => import("@/pages/platform/PlatformQuoteNew"));
const PlatformBackendHealth = lazy(() => import("@/pages/platform/PlatformBackendHealth"));

const M = ["owner", "office_manager", "manager"] as const;
const O = ["owner", "office_manager"] as const;
const OWNER = ["owner"] as const;

export const PlatformRoutes = () => (
  <>
    <Route path="/platform/login" element={<PlatformLogin />} />
    <Route path="/platform" element={<RoleRoute allow={[...M]}><PlatformDashboard /></RoleRoute>} />
    <Route path="/platform/leads" element={<RoleRoute allow={[...M]}><PlatformLeads /></RoleRoute>} />
    <Route path="/platform/customers" element={<RoleRoute allow={[...M]}><PlatformCustomers /></RoleRoute>} />
    <Route path="/platform/quotes" element={<RoleRoute allow={[...M]}><PlatformQuotes /></RoleRoute>} />
    <Route path="/platform/quote-display" element={<PlatformQuoteDisplay />} />
    <Route path="/platform/quote-display/:shortcode/:quoteId" element={<PlatformQuoteDisplay />} />
    <Route path="/platform/jobs" element={<RoleRoute allow={[...M]}><PlatformJobs /></RoleRoute>} />
    <Route path="/platform/schedule" element={<RoleRoute allow={[...M]}><PlatformSchedule /></RoleRoute>} />
    <Route path="/platform/invoices" element={<RoleRoute allow={[...O]}><PlatformInvoices /></RoleRoute>} />
    <Route path="/platform/payments" element={<RoleRoute allow={[...O]}><PlatformPayments /></RoleRoute>} />
    <Route path="/platform/analytics" element={<RoleRoute allow={[...OWNER]} redirectTo="/platform"><PlatformAnalytics /></RoleRoute>} />
    <Route path="/platform/communications" element={<RoleRoute allow={[...M]}><PlatformComms /></RoleRoute>} />
    <Route path="/platform/tasks" element={<RoleRoute allow={[...M]}><PlatformTasks /></RoleRoute>} />
    <Route path="/platform/settings" element={<RoleRoute allow={[...O]}><PlatformSettings /></RoleRoute>} />
    <Route path="/platform/team" element={<RoleRoute allow={[...OWNER]} redirectTo="/platform"><PlatformTeam /></RoleRoute>} />
    <Route path="/platform/crew" element={<RoleRoute allow={["owner", "manager", "crew"]}><PlatformCrew /></RoleRoute>} />
    <Route path="/platform/documents/:category" element={<RoleRoute allow={[...M]}><PlatformDocuments /></RoleRoute>} />
    <Route path="/platform/job-checklists" element={<RoleRoute allow={[...M]}><PlatformJobChecklists /></RoleRoute>} />
    <Route path="/platform/job-pricing" element={<RoleRoute allow={[...M]}><PlatformJobPricing /></RoleRoute>} />
    <Route path="/platform/change-password" element={<PlatformChangePassword />} />
    <Route path="/platform/finance" element={<RoleRoute allow={[...OWNER]} redirectTo="/platform"><PlatformFinance /></RoleRoute>} />
    <Route path="/platform/finance/:section" element={<RoleRoute allow={[...OWNER]} redirectTo="/platform"><PlatformFinance /></RoleRoute>} />
    <Route path="/platform/backend-health" element={<RoleRoute allow={[...OWNER]} redirectTo="/platform"><PlatformBackendHealth /></RoleRoute>} />

    {/* Full-page creation editors */}
    <Route path="/platform/jobs/new" element={<RoleRoute allow={[...M]}><PlatformJobNew /></RoleRoute>} />
    <Route path="/platform/customers/new" element={<RoleRoute allow={[...M]}><PlatformCustomerNew /></RoleRoute>} />
    <Route path="/platform/leads/new" element={<RoleRoute allow={[...M]}><PlatformLeadNew /></RoleRoute>} />
    <Route path="/platform/quotes/new" element={<RoleRoute allow={[...M]}><PlatformQuoteNew /></RoleRoute>} />
    <Route path="/platform/invoices/new" element={<RoleRoute allow={[...O]}><PlatformInvoiceNew /></RoleRoute>} />
  </>
);