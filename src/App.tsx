import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import GulfCoastPalmsCareers from "./pages/careers/GulfCoastPalms";
import TeamLeaderCareers from "./pages/careers/TeamLeader";
import GroundsmanCareers from "./pages/careers/Groundsman";
import SalesOperationsCareers from "./pages/careers/SalesOperations";
import CareersThankYou from "./pages/careers/CareersThankYou";
import SOPTeamLeader from "./pages/employee/SOPTeamLeader";
import SOPGroundsman from "./pages/employee/SOPGroundsman";
import NotFound from "./pages/NotFound";
// Service pages
import PalmTreeTrimming from "./pages/services/PalmTreeTrimming";
import PalmTreeInstallation from "./pages/services/PalmTreeInstallation";
import PalmTreeRemoval from "./pages/services/PalmTreeRemoval";
import PalmDiamondCutting from "./pages/services/PalmDiamondCutting";
import PalmTreeTrunkSkinning from "./pages/services/PalmTreeTrunkSkinning";
import TreeTrimmingRemoval from "./pages/services/TreeTrimmingRemoval";
import LandscapingServices from "./pages/services/LandscapingServices";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          {/* Hidden pages */}
          <Route path="/careers/gulf-coast-palms" element={<GulfCoastPalmsCareers />} />
          <Route path="/careers/thank-you" element={<CareersThankYou />} />
          <Route path="/employee/gulf-coast-palms/sop/team-leader" element={<SOPTeamLeader />} />
          <Route path="/employee/gulf-coast-palms/sop/groundsman" element={<SOPGroundsman />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
