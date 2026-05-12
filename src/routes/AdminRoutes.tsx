import { lazy } from "react";
import { Route } from "react-router-dom";

const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminHome = lazy(() => import("@/pages/admin/AdminHome"));
const AdminLeads = lazy(() => import("@/pages/admin/AdminLeads"));
const AdminClients = lazy(() => import("@/pages/admin/AdminClients"));
const AdminJobs = lazy(() => import("@/pages/admin/AdminJobs"));
const AdminEmployees = lazy(() => import("@/pages/admin/AdminEmployees"));
const AdminReviews = lazy(() => import("@/pages/admin/AdminReviews"));
const AdminLeaderboards = lazy(() => import("@/pages/admin/AdminLeaderboards"));
const AdminUploads = lazy(() => import("@/pages/admin/AdminUploads"));
const AdminApplicants = lazy(() => import("@/pages/admin/AdminApplicants"));
const AdminSOPAcknowledgments = lazy(() => import("@/pages/admin/AdminSOPAcknowledgments"));
const AdminPerformance = lazy(() => import("@/pages/admin/AdminPerformance"));
const AdminCrews = lazy(() => import("@/pages/admin/AdminCrews"));
const AdminRecurring = lazy(() => import("@/pages/admin/AdminRecurring"));
const AdminJobIssues = lazy(() => import("@/pages/admin/AdminJobIssues"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminErrors = lazy(() => import("@/pages/admin/AdminErrors"));

export const AdminRoutes = () => (
  <>
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin" element={<AdminHome />} />
    <Route path="/admin/leads" element={<AdminLeads />} />
    <Route path="/admin/clients" element={<AdminClients />} />
    <Route path="/admin/jobs" element={<AdminJobs />} />
    <Route path="/admin/employees" element={<AdminEmployees />} />
    <Route path="/admin/reviews" element={<AdminReviews />} />
    <Route path="/admin/leaderboards" element={<AdminLeaderboards />} />
    <Route path="/admin/uploads" element={<AdminUploads />} />
    <Route path="/admin/applicants" element={<AdminApplicants />} />
    <Route path="/admin/sop-acknowledgments" element={<AdminSOPAcknowledgments />} />
    <Route path="/admin/performance" element={<AdminPerformance />} />
    <Route path="/admin/crews" element={<AdminCrews />} />
    <Route path="/admin/recurring" element={<AdminRecurring />} />
    <Route path="/admin/job-issues" element={<AdminJobIssues />} />
    <Route path="/admin/settings" element={<AdminSettings />} />
    <Route path="/admin/errors" element={<AdminErrors />} />
  </>
);