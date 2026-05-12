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
const PlatformReconciliation = lazy(() => import("@/pages/platform/PlatformReconciliation"));
const PlatformDocs = lazy(() => import("@/pages/platform/PlatformDocs"));
const PlatformRelease = lazy(() => import("@/pages/platform/PlatformRelease"));
const PlatformQAChecklist = lazy(() => import("@/pages/platform/PlatformQAChecklist"));
const PlatformOfflineQueue = lazy(() => import("@/pages/platform/PlatformOfflineQueue"));

export const PlatformRoutes = () => (
  <>
    <Route path="/platform/login" element={<PlatformLogin />} />
    <Route path="/platform" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformDashboard /></RoleRoute>} />
    <Route path="/platform/leads" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformLeads /></RoleRoute>} />
    <Route path="/platform/customers" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformCustomers /></RoleRoute>} />
    <Route path="/platform/quotes" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformQuotes /></RoleRoute>} />
    <Route path="/platform/quote-display" element={<PlatformQuoteDisplay />} />
    <Route path="/platform/quote-display/:shortcode/:quoteId" element={<PlatformQuoteDisplay />} />
    <Route path="/platform/jobs" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformJobs /></RoleRoute>} />
    <Route path="/platform/schedule" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformSchedule /></RoleRoute>} />
    <Route path="/platform/invoices" element={<RoleRoute allow={["owner","office_manager"]}><PlatformInvoices /></RoleRoute>} />
    <Route path="/platform/payments" element={<RoleRoute allow={["owner","office_manager"]}><PlatformPayments /></RoleRoute>} />
    <Route path="/platform/analytics" element={<RoleRoute allow={["owner"]} redirectTo="/platform"><PlatformAnalytics /></RoleRoute>} />
    <Route path="/platform/communications" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformComms /></RoleRoute>} />
    <Route path="/platform/tasks" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformTasks /></RoleRoute>} />
    <Route path="/platform/settings" element={<RoleRoute allow={["owner","office_manager"]}><PlatformSettings /></RoleRoute>} />
    <Route path="/platform/team" element={<RoleRoute allow={["owner"]} redirectTo="/platform"><PlatformTeam /></RoleRoute>} />
    <Route path="/platform/crew" element={<RoleRoute allow={["owner", "manager", "crew"]}><PlatformCrew /></RoleRoute>} />
    <Route path="/platform/documents/:category" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformDocuments /></RoleRoute>} />
    <Route path="/platform/job-checklists" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformJobChecklists /></RoleRoute>} />
    <Route path="/platform/job-pricing" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformJobPricing /></RoleRoute>} />
    <Route path="/platform/change-password" element={<PlatformChangePassword />} />
    <Route path="/platform/finance" element={<RoleRoute allow={["owner"]} redirectTo="/platform"><PlatformFinance /></RoleRoute>} />
    <Route path="/platform/finance/:section" element={<RoleRoute allow={["owner"]} redirectTo="/platform"><PlatformFinance /></RoleRoute>} />
    <Route path="/platform/backend-health" element={<RoleRoute allow={["owner"]} redirectTo="/platform"><PlatformBackendHealth /></RoleRoute>} />
    <Route path="/platform/reconciliation" element={<RoleRoute allow={["owner"]} redirectTo="/platform"><PlatformReconciliation /></RoleRoute>} />
    <Route path="/platform/docs" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformDocs /></RoleRoute>} />
    <Route path="/platform/release" element={<RoleRoute allow={["owner"]} redirectTo="/platform"><PlatformRelease /></RoleRoute>} />
    <Route path="/platform/qa-checklist" element={<RoleRoute allow={["owner"]} redirectTo="/platform"><PlatformQAChecklist /></RoleRoute>} />
    <Route path="/platform/offline-queue" element={<RoleRoute allow={["owner"]} redirectTo="/platform"><PlatformOfflineQueue /></RoleRoute>} />

    {/* Full-page creation editors */}
    <Route path="/platform/jobs/new" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformJobNew /></RoleRoute>} />
    <Route path="/platform/customers/new" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformCustomerNew /></RoleRoute>} />
    <Route path="/platform/leads/new" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformLeadNew /></RoleRoute>} />
    <Route path="/platform/quotes/new" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformQuoteNew /></RoleRoute>} />
    <Route path="/platform/invoices/new" element={<RoleRoute allow={["owner","office_manager"]}><PlatformInvoiceNew /></RoleRoute>} />
  </>
);