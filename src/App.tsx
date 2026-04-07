import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { trackPageView } from "@/lib/analytics";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingSpinner from "@/components/LoadingSpinner";

// Eagerly loaded: high-traffic public pages
import Index from "./pages/Index";
import Services from "./pages/Services";
import Pensacola from "./pages/locations/Pensacola";
import GulfBreeze from "./pages/locations/GulfBreeze";
import Navarre from "./pages/locations/Navarre";
import FortWaltonBeach from "./pages/locations/FortWaltonBeach";
import Destin from "./pages/locations/Destin";
import ThirtyA from "./pages/locations/ThirtyA";
import PerdidoKey from "./pages/locations/PerdidoKey";

// Lazy loaded: public secondary pages
const About = lazy(() => import("./pages/About"));
const Jobs = lazy(() => import("./pages/Jobs"));
const ServiceAreas = lazy(() => import("./pages/ServiceAreas"));
const PalmTreeTypes = lazy(() => import("./pages/PalmTreeTypes"));
const PalmTypePage = lazy(() => import("./pages/PalmTypePage"));
const BuyPalmTrees = lazy(() => import("./pages/BuyPalmTrees"));
const PalmCareGuides = lazy(() => import("./pages/PalmCareGuides"));
const PalmGuidePage = lazy(() => import("./pages/PalmGuidePage"));
const PalmTreeCost = lazy(() => import("./pages/PalmTreeCost"));
const HoaCommercialMaintenance = lazy(() => import("./pages/HoaCommercialMaintenance"));
const HurricanePalmPreparation = lazy(() => import("./pages/HurricanePalmPreparation"));
const EmergencyPalmService = lazy(() => import("./pages/EmergencyPalmService"));
const GalleryPage = lazy(() => import("./pages/Gallery"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const Referral = lazy(() => import("./pages/Referral"));
const Payments = lazy(() => import("./pages/Payments"));
const TextConsent = lazy(() => import("./pages/TextConsent"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Service pages — lazy
const PalmTreeTrimming = lazy(() => import("./pages/services/PalmTreeTrimming"));
const PalmTreeInstallation = lazy(() => import("./pages/services/PalmTreeInstallation"));
const PalmTreeRemoval = lazy(() => import("./pages/services/PalmTreeRemoval"));
const PalmDiamondCutting = lazy(() => import("./pages/services/PalmDiamondCutting"));
const PalmTreeTrunkSkinning = lazy(() => import("./pages/services/PalmTreeTrunkSkinning"));
const TreeTrimmingRemoval = lazy(() => import("./pages/services/TreeTrimmingRemoval"));
const LandscapingServices = lazy(() => import("./pages/services/LandscapingServices"));

// Admin — lazy
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminHome = lazy(() => import("./pages/admin/AdminHome"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads"));
const AdminClients = lazy(() => import("./pages/admin/AdminClients"));
const AdminJobs = lazy(() => import("./pages/admin/AdminJobs"));
const AdminEmployees = lazy(() => import("./pages/admin/AdminEmployees"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminLeaderboards = lazy(() => import("./pages/admin/AdminLeaderboards"));
const AdminUploads = lazy(() => import("./pages/admin/AdminUploads"));
const AdminApplicants = lazy(() => import("./pages/admin/AdminApplicants"));
const AdminSOPAcknowledgments = lazy(() => import("./pages/admin/AdminSOPAcknowledgments"));
const AdminPerformance = lazy(() => import("./pages/admin/AdminPerformance"));
const AdminCrews = lazy(() => import("./pages/admin/AdminCrews"));
const AdminRecurring = lazy(() => import("./pages/admin/AdminRecurring"));
const AdminJobIssues = lazy(() => import("./pages/admin/AdminJobIssues"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminErrors = lazy(() => import("./pages/admin/AdminErrors"));

// Careers — lazy
const GulfCoastPalmsCareers = lazy(() => import("./pages/careers/GulfCoastPalms"));
const TeamLeaderCareers = lazy(() => import("./pages/careers/TeamLeader"));
const GroundsmanCareers = lazy(() => import("./pages/careers/Groundsman"));
const SalesOperationsCareers = lazy(() => import("./pages/careers/SalesOperations"));
const CareersThankYou = lazy(() => import("./pages/careers/CareersThankYou"));

// Employee SOPs — lazy
const SOPTeamLeader = lazy(() => import("./pages/employee/SOPTeamLeader"));
const SOPGroundsman = lazy(() => import("./pages/employee/SOPGroundsman"));
const SOPSalesOperations = lazy(() => import("./pages/employee/SOPSalesOperations"));

// Ops — lazy
const OpsLogin = lazy(() => import("./pages/ops/OpsLogin"));
const OpsDashboard = lazy(() => import("./pages/ops/OpsDashboard"));
const OpsToday = lazy(() => import("./pages/ops/OpsToday"));
const OpsWeek = lazy(() => import("./pages/ops/OpsWeek"));
const OpsJobDetail = lazy(() => import("./pages/ops/OpsJobDetail"));
const OpsCrew = lazy(() => import("./pages/ops/OpsCrew"));
const OpsSettings = lazy(() => import("./pages/ops/OpsSettings"));
const OpsSchedule = lazy(() => import("./pages/ops/OpsSchedule"));

// Platform — lazy
const PlatformLogin = lazy(() => import("./pages/platform/PlatformLogin"));
const PlatformDashboard = lazy(() => import("./pages/platform/PlatformDashboard"));
const PlatformLeads = lazy(() => import("./pages/platform/PlatformLeads"));
const PlatformCustomers = lazy(() => import("./pages/platform/PlatformCustomers"));
const PlatformQuotes = lazy(() => import("./pages/platform/PlatformQuotes"));
const PlatformJobs = lazy(() => import("./pages/platform/PlatformJobs"));
const PlatformSchedule = lazy(() => import("./pages/platform/PlatformSchedule"));
const PlatformInvoices = lazy(() => import("./pages/platform/PlatformInvoices"));
const PlatformPayments = lazy(() => import("./pages/platform/PlatformPayments"));
const PlatformAnalytics = lazy(() => import("./pages/platform/PlatformAnalytics"));
const PlatformComms = lazy(() => import("./pages/platform/PlatformComms"));
const PlatformTasks = lazy(() => import("./pages/platform/PlatformTasks"));
const PlatformSettings = lazy(() => import("./pages/platform/PlatformSettings"));

// Payment pages — lazy
const PalmTreeMaintenancePlans = lazy(() => import("./pages/PalmTreeMaintenancePlans"));
const PayInvoice = lazy(() => import("./pages/pay/PayInvoice"));
const PaymentSuccess = lazy(() => import("./pages/pay/PaymentSuccess"));
const TapToPayLanding = lazy(() => import("./pages/app/TapToPayLanding"));
const ViewQuote = lazy(() => import("./pages/quote/ViewQuote"));
const TapToPayLanding = lazy(() => import("./pages/app/TapToPayLanding"));

const RouteTracker = () => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BusinessProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <RouteTracker />
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  {/* Eagerly loaded public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/palm-tree-trimming-pensacola-fl" element={<Pensacola />} />
                  <Route path="/palm-tree-trimming-gulf-breeze-fl" element={<GulfBreeze />} />
                  <Route path="/palm-tree-trimming-navarre-fl" element={<Navarre />} />
                  <Route path="/palm-tree-trimming-fort-walton-beach-fl" element={<FortWaltonBeach />} />
                  <Route path="/palm-tree-trimming-destin-fl" element={<Destin />} />
                  <Route path="/palm-tree-trimming-30a-fl" element={<ThirtyA />} />
                  <Route path="/palm-tree-trimming-perdido-key-fl" element={<PerdidoKey />} />

                  {/* Lazy public pages */}
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
                  <Route path="/emergency-palm-service" element={<EmergencyPalmService />} />
                  <Route path="/gallery" element={<GalleryPage />} />
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
                  <Route path="/palm-tree-maintenance-plans" element={<PalmTreeMaintenancePlans />} />

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
                  <Route path="/admin/errors" element={<AdminErrors />} />

                  {/* Careers */}
                  <Route path="/careers/gulf-coast-palms" element={<GulfCoastPalmsCareers />} />
                  <Route path="/careers/gulf-coast-palms/team-leader" element={<TeamLeaderCareers />} />
                  <Route path="/careers/gulf-coast-palms/groundsman" element={<GroundsmanCareers />} />
                  <Route path="/careers/gulf-coast-palms/sales-operations" element={<SalesOperationsCareers />} />
                  <Route path="/careers/thank-you" element={<CareersThankYou />} />

                  {/* Employee SOPs */}
                  <Route path="/employee/gulf-coast-palms/sop/team-leader" element={<SOPTeamLeader />} />
                  <Route path="/employee/gulf-coast-palms/sop/groundsman" element={<SOPGroundsman />} />
                  <Route path="/employee/gulf-coast-palms/sop/sales-operations" element={<SOPSalesOperations />} />

                  {/* Ops */}
                  <Route path="/ops/login" element={<OpsLogin />} />
                  <Route path="/ops" element={<OpsDashboard />} />
                  <Route path="/ops/today" element={<OpsToday />} />
                  <Route path="/ops/week" element={<OpsWeek />} />
                  <Route path="/ops/job/:jobId" element={<OpsJobDetail />} />
                  <Route path="/ops/crew" element={<OpsCrew />} />
                  <Route path="/ops/schedule" element={<OpsSchedule />} />
                  <Route path="/ops/settings" element={<OpsSettings />} />

                  {/* Platform */}
                  <Route path="/platform/login" element={<PlatformLogin />} />
                  <Route path="/platform" element={<PlatformDashboard />} />
                  <Route path="/platform/leads" element={<PlatformLeads />} />
                  <Route path="/platform/customers" element={<PlatformCustomers />} />
                  <Route path="/platform/quotes" element={<PlatformQuotes />} />
                  <Route path="/platform/jobs" element={<PlatformJobs />} />
                  <Route path="/platform/schedule" element={<PlatformSchedule />} />
                  <Route path="/platform/invoices" element={<PlatformInvoices />} />
                  <Route path="/platform/payments" element={<PlatformPayments />} />
                  <Route path="/platform/analytics" element={<PlatformAnalytics />} />
                  <Route path="/platform/communications" element={<PlatformComms />} />
                  <Route path="/platform/tasks" element={<PlatformTasks />} />
                  <Route path="/platform/settings" element={<PlatformSettings />} />

                  {/* Payment pages */}
                  <Route path="/pay/:shortcode/:invoiceId" element={<PayInvoice />} />
                  <Route path="/pay/:shortcode/success" element={<PaymentSuccess />} />
                  <Route path="/app/tap-to-pay" element={<TapToPayLanding />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </BusinessProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
