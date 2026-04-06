import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/analytics";
import Index from "./pages/Index";
import Services from "./pages/Services";
import About from "./pages/About";
import Jobs from "./pages/Jobs";
import ServiceAreas from "./pages/ServiceAreas";
import Pensacola from "./pages/locations/Pensacola";
import GulfBreeze from "./pages/locations/GulfBreeze";
import Navarre from "./pages/locations/Navarre";
import FortWaltonBeach from "./pages/locations/FortWaltonBeach";
import Destin from "./pages/locations/Destin";
import ThirtyA from "./pages/locations/ThirtyA";
import PerdidoKey from "./pages/locations/PerdidoKey";
import PalmTreeTypes from "./pages/PalmTreeTypes";
import PalmTypePage from "./pages/PalmTypePage";
import BuyPalmTrees from "./pages/BuyPalmTrees";
import PalmCareGuides from "./pages/PalmCareGuides";
import PalmGuidePage from "./pages/PalmGuidePage";
import PalmTreeCost from "./pages/PalmTreeCost";
import HoaCommercialMaintenance from "./pages/HoaCommercialMaintenance";
import HurricanePalmPreparation from "./pages/HurricanePalmPreparation";
import ThankYou from "./pages/ThankYou";
import Referral from "./pages/Referral";
import Payments from "./pages/Payments";
import TextConsent from "./pages/TextConsent";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminHome from "./pages/admin/AdminHome";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminClients from "./pages/admin/AdminClients";
import AdminJobs from "./pages/admin/AdminJobs";
import AdminEmployees from "./pages/admin/AdminEmployees";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminLeaderboards from "./pages/admin/AdminLeaderboards";
import AdminUploads from "./pages/admin/AdminUploads";
import AdminApplicants from "./pages/admin/AdminApplicants";
import AdminSOPAcknowledgments from "./pages/admin/AdminSOPAcknowledgments";
import AdminPerformance from "./pages/admin/AdminPerformance";
import AdminCrews from "./pages/admin/AdminCrews";
import AdminRecurring from "./pages/admin/AdminRecurring";
import AdminJobIssues from "./pages/admin/AdminJobIssues";
import AdminSettings from "./pages/admin/AdminSettings";
import GulfCoastPalmsCareers from "./pages/careers/GulfCoastPalms";
import TeamLeaderCareers from "./pages/careers/TeamLeader";
import GroundsmanCareers from "./pages/careers/Groundsman";
import SalesOperationsCareers from "./pages/careers/SalesOperations";
import CareersThankYou from "./pages/careers/CareersThankYou";
import SOPTeamLeader from "./pages/employee/SOPTeamLeader";
import SOPGroundsman from "./pages/employee/SOPGroundsman";
import SOPSalesOperations from "./pages/employee/SOPSalesOperations";
import NotFound from "./pages/NotFound";
// Ops dashboard
import OpsLogin from "./pages/ops/OpsLogin";
import OpsDashboard from "./pages/ops/OpsDashboard";
import OpsToday from "./pages/ops/OpsToday";
import OpsWeek from "./pages/ops/OpsWeek";
import OpsJobDetail from "./pages/ops/OpsJobDetail";
import OpsCrew from "./pages/ops/OpsCrew";
import OpsSettings from "./pages/ops/OpsSettings";
import OpsSchedule from "./pages/ops/OpsSchedule";
// Platform (multi-business)
import PlatformLogin from "./pages/platform/PlatformLogin";
import PlatformDashboard from "./pages/platform/PlatformDashboard";
import PlatformModule from "./pages/platform/PlatformModule";
import PlatformLeads from "./pages/platform/PlatformLeads";
import PlatformCustomers from "./pages/platform/PlatformCustomers";
// Service pages
import PalmTreeTrimming from "./pages/services/PalmTreeTrimming";
import PalmTreeInstallation from "./pages/services/PalmTreeInstallation";
import PalmTreeRemoval from "./pages/services/PalmTreeRemoval";
import PalmDiamondCutting from "./pages/services/PalmDiamondCutting";
import PalmTreeTrunkSkinning from "./pages/services/PalmTreeTrunkSkinning";
import TreeTrimmingRemoval from "./pages/services/TreeTrimmingRemoval";
import LandscapingServices from "./pages/services/LandscapingServices";

const RouteTracker = () => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteTracker />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/palm-tree-trimming" element={<PalmTreeTrimming />} />
          <Route path="/services/palm-tree-installation" element={<PalmTreeInstallation />} />
          <Route path="/services/palm-tree-removal" element={<PalmTreeRemoval />} />
          <Route path="/services/palm-diamond-cutting" element={<PalmDiamondCutting />} />
          <Route path="/services/palm-tree-trunk-skinning" element={<PalmTreeTrunkSkinning />} />
          <Route path="/services/tree-trimming-removal" element={<TreeTrimmingRemoval />} />
          <Route path="/services/landscaping-services" element={<LandscapingServices />} />
          <Route path="/about" element={<About />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/service-areas" element={<ServiceAreas />} />
          <Route path="/palm-tree-cost" element={<PalmTreeCost />} />
          <Route path="/hoa-commercial-palm-maintenance" element={<HoaCommercialMaintenance />} />
          <Route path="/hurricane-palm-preparation" element={<HurricanePalmPreparation />} />
          <Route path="/palm-tree-trimming-pensacola-fl" element={<Pensacola />} />
          <Route path="/palm-tree-trimming-gulf-breeze-fl" element={<GulfBreeze />} />
          <Route path="/palm-tree-trimming-navarre-fl" element={<Navarre />} />
          <Route path="/palm-tree-trimming-fort-walton-beach-fl" element={<FortWaltonBeach />} />
          <Route path="/palm-tree-trimming-destin-fl" element={<Destin />} />
          <Route path="/palm-tree-trimming-30a-fl" element={<ThirtyA />} />
          <Route path="/palm-tree-trimming-perdido-key-fl" element={<PerdidoKey />} />
          <Route path="/palm-trees/types" element={<PalmTreeTypes />} />
          <Route path="/palm-trees/buy" element={<BuyPalmTrees />} />
          <Route path="/palm-trees/guides" element={<PalmCareGuides />} />
          <Route path="/palm-trees/guides/:slug" element={<PalmGuidePage />} />
          <Route path="/palm-trees/:slug" element={<PalmTypePage />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/referral" element={<Referral />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/text-consent" element={<TextConsent />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          {/* Admin */}
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
          {/* Hidden pages */}
          <Route path="/careers/gulf-coast-palms" element={<GulfCoastPalmsCareers />} />
          <Route path="/careers/gulf-coast-palms/team-leader" element={<TeamLeaderCareers />} />
          <Route path="/careers/gulf-coast-palms/groundsman" element={<GroundsmanCareers />} />
          <Route path="/careers/gulf-coast-palms/sales-operations" element={<SalesOperationsCareers />} />
          <Route path="/careers/thank-you" element={<CareersThankYou />} />
          <Route path="/employee/gulf-coast-palms/sop/team-leader" element={<SOPTeamLeader />} />
          <Route path="/employee/gulf-coast-palms/sop/groundsman" element={<SOPGroundsman />} />
          <Route path="/employee/gulf-coast-palms/sop/sales-operations" element={<SOPSalesOperations />} />
          {/* Ops Dashboard */}
          <Route path="/ops/login" element={<OpsLogin />} />
          <Route path="/ops" element={<OpsDashboard />} />
          <Route path="/ops/today" element={<OpsToday />} />
          <Route path="/ops/week" element={<OpsWeek />} />
          <Route path="/ops/job/:jobId" element={<OpsJobDetail />} />
          <Route path="/ops/crew" element={<OpsCrew />} />
          <Route path="/ops/schedule" element={<OpsSchedule />} />
          <Route path="/ops/settings" element={<OpsSettings />} />
          {/* Platform (multi-business) */}
          <Route path="/platform/login" element={<PlatformLogin />} />
          <Route path="/platform" element={<PlatformDashboard />} />
          <Route path="/platform/leads" element={<PlatformLeads />} />
          <Route path="/platform/customers" element={<PlatformCustomers />} />
          <Route path="/platform/quotes" element={<PlatformModule />} />
          <Route path="/platform/jobs" element={<PlatformModule />} />
          <Route path="/platform/schedule" element={<PlatformModule />} />
          <Route path="/platform/invoices" element={<PlatformModule />} />
          <Route path="/platform/payments" element={<PlatformModule />} />
          <Route path="/platform/analytics" element={<PlatformModule />} />
          <Route path="/platform/communications" element={<PlatformModule />} />
          <Route path="/platform/tasks" element={<PlatformModule />} />
          <Route path="/platform/settings" element={<PlatformModule />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
