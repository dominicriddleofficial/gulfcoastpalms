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
import RoleRoute from "@/components/platform/RoleRoute";
import { CreateSheetsProvider } from "@/components/platform/CreateSheetsProvider";

// Eagerly loaded: only the homepage (highest traffic landing page)
import Index from "./pages/Index";

// Location & service pages — lazy loaded (users land on Index first)
const Services = lazy(() => import("./pages/Services"));
const Pensacola = lazy(() => import("./pages/locations/Pensacola"));
const GulfBreeze = lazy(() => import("./pages/locations/GulfBreeze"));
const Navarre = lazy(() => import("./pages/locations/Navarre"));
const FortWaltonBeach = lazy(() => import("./pages/locations/FortWaltonBeach"));
const Destin = lazy(() => import("./pages/locations/Destin"));
const ThirtyA = lazy(() => import("./pages/locations/ThirtyA"));
const PerdidoKey = lazy(() => import("./pages/locations/PerdidoKey"));
const Niceville = lazy(() => import("./pages/locations/Niceville"));
const MaryEsther = lazy(() => import("./pages/locations/MaryEsther"));
const SantaRosaBeach = lazy(() => import("./pages/locations/SantaRosaBeach"));
const Pace = lazy(() => import("./pages/locations/Pace"));
const Milton = lazy(() => import("./pages/locations/Milton"));

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
const HolidayLighting = lazy(() => import("./pages/HolidayLighting"));
const GalleryPage = lazy(() => import("./pages/Gallery"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const Referral = lazy(() => import("./pages/Referral"));

// Learn — lazy
const LearnHub = lazy(() => import("./pages/learn/LearnHub"));
const LearnArticle = lazy(() => import("./pages/learn/LearnArticle"));
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

// Platform — lazy
const PlatformLogin = lazy(() => import("./pages/platform/PlatformLogin"));
const PlatformDashboard = lazy(() => import("./pages/platform/PlatformDashboard"));
const PlatformLeads = lazy(() => import("./pages/platform/PlatformLeads"));
const PlatformCustomers = lazy(() => import("./pages/platform/PlatformCustomers"));
const PlatformQuotes = lazy(() => import("./pages/platform/PlatformQuotes"));
const PlatformQuoteDisplay = lazy(() => import("./pages/platform/PlatformQuoteDisplay"));
const PlatformJobs = lazy(() => import("./pages/platform/PlatformJobs"));
const PlatformSchedule = lazy(() => import("./pages/platform/PlatformSchedule"));
const PlatformInvoices = lazy(() => import("./pages/platform/PlatformInvoices"));
const PlatformPayments = lazy(() => import("./pages/platform/PlatformPayments"));
const PlatformAnalytics = lazy(() => import("./pages/platform/PlatformAnalytics"));
const PlatformComms = lazy(() => import("./pages/platform/PlatformComms"));
const PlatformTasks = lazy(() => import("./pages/platform/PlatformTasks"));
const PlatformSettings = lazy(() => import("./pages/platform/PlatformSettings"));
const PlatformCrew = lazy(() => import("./pages/platform/PlatformCrew"));
const PlatformTeam = lazy(() => import("./pages/platform/PlatformTeam"));
const PlatformDocuments = lazy(() => import("./pages/platform/PlatformDocuments"));
const PlatformJobChecklists = lazy(() => import("./pages/platform/PlatformJobChecklists"));
const PlatformJobPricing = lazy(() => import("./pages/platform/PlatformJobPricing"));
const PlatformChangePassword = lazy(() => import("./pages/platform/PlatformChangePassword"));
const PlatformFinance = lazy(() => import("./pages/platform/PlatformFinance"));
const PlatformJobNew = lazy(() => import("./pages/platform/PlatformJobNew"));
const PlatformCustomerNew = lazy(() => import("./pages/platform/PlatformCustomerNew"));
const PlatformLeadNew = lazy(() => import("./pages/platform/PlatformLeadNew"));
const PlatformInvoiceNew = lazy(() => import("./pages/platform/PlatformInvoiceNew"));
const PlatformQuoteNew = lazy(() => import("./pages/platform/PlatformQuoteNew"));
const PlatformBackendHealth = lazy(() => import("./pages/platform/PlatformBackendHealth"));


// Payment pages — lazy
const PalmTreeMaintenancePlans = lazy(() => import("./pages/PalmTreeMaintenancePlans"));
const PayInvoice = lazy(() => import("./pages/pay/PayInvoice"));
const PaymentSuccess = lazy(() => import("./pages/pay/PaymentSuccess"));
const TapToPayLanding = lazy(() => import("./pages/app/TapToPayLanding"));
const ViewQuote = lazy(() => import("./pages/quote/ViewQuote"));
const CustomerPortal = lazy(() => import("./pages/portal/CustomerPortal"));
const Quote = lazy(() => import("./pages/Quote"));

const RouteTracker = () => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  useEffect(() => {
    const path = location.pathname;
    let manifestHref = "/manifest.json";
    let appleTitle = "Gulf Coast Palms";
    let themeColor = "#1a5c38";
    if (path.startsWith("/platform")) {
      manifestHref = "/platform-manifest.json";
      appleTitle = "Field Ops";
      themeColor = "#1B5E20";
    }
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (link && link.getAttribute("href") !== manifestHref) {
      link.setAttribute("href", manifestHref);
    }
    const apple = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (apple && apple.getAttribute("content") !== appleTitle) {
      apple.setAttribute("content", appleTitle);
    }
    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (theme && theme.getAttribute("content") !== themeColor) {
      theme.setAttribute("content", themeColor);
    }
  }, [location.pathname]);
  return null;
};

// Tuned for "stale-while-revalidate" feel:
// - Cached data stays fresh for 5 minutes → instant tab/workspace switches
// - Kept in memory for 30 minutes → coming back to a screen never shows a spinner
// - No refetch on window focus / mount when fresh → no surprise reloads
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

// Lightweight fallback used while a lazy route chunk is loading.
// Platform routes show a thin progress bar instead of a full-page spinner so
// the layout shell appears instantly and the tab feels native.
function PlatformRouteFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-0.5 w-full bg-primary/20 overflow-hidden">
        <div className="h-full w-1/3 bg-primary animate-[loading_1s_ease-in-out_infinite]" />
      </div>
      <style>{`@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
    </div>
  );
}

function RouteSuspenseFallback() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/platform")) return <PlatformRouteFallback />;
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BusinessProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <CreateSheetsProvider>
                <RouteTracker />
                <Suspense fallback={<RouteSuspenseFallback />}>
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
                  <Route path="/palm-tree-trimming-niceville-fl" element={<Niceville />} />
                  <Route path="/palm-tree-trimming-mary-esther-fl" element={<MaryEsther />} />
                  <Route path="/palm-tree-trimming-santa-rosa-beach-fl" element={<SantaRosaBeach />} />
                  <Route path="/palm-tree-trimming-pace-fl" element={<Pace />} />
                  <Route path="/palm-tree-trimming-milton-fl" element={<Milton />} />

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
                  <Route path="/holiday-lighting" element={<HolidayLighting />} />
                  <Route path="/gallery" element={<GalleryPage />} />
                  <Route path="/palm-trees/types" element={<PalmTreeTypes />} />
                  <Route path="/palm-trees/buy" element={<BuyPalmTrees />} />
                  <Route path="/palm-trees/guides" element={<PalmCareGuides />} />
                  <Route path="/palm-trees/guides/:slug" element={<PalmGuidePage />} />
                  <Route path="/palm-trees/:slug" element={<PalmTypePage />} />
                  <Route path="/thank-you" element={<ThankYou />} />
                  <Route path="/referral" element={<Referral />} />
                  <Route path="/learn" element={<LearnHub />} />
                  <Route path="/learn/:slug" element={<LearnArticle />} />
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

                  {/* Platform */}
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
                  <Route path="/platform/crew" element={<RoleRoute allow={["owner","manager","crew"]}><PlatformCrew /></RoleRoute>} />
                  <Route path="/platform/documents/:category" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformDocuments /></RoleRoute>} />
                  <Route path="/platform/job-checklists" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformJobChecklists /></RoleRoute>} />
                  <Route path="/platform/job-pricing" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformJobPricing /></RoleRoute>} />
                  <Route path="/platform/change-password" element={<PlatformChangePassword />} />
                  <Route path="/platform/finance" element={<RoleRoute allow={["owner"]} redirectTo="/platform"><PlatformFinance /></RoleRoute>} />
                  <Route path="/platform/finance/:section" element={<RoleRoute allow={["owner"]} redirectTo="/platform"><PlatformFinance /></RoleRoute>} />
                  <Route path="/platform/backend-health" element={<RoleRoute allow={["owner"]} redirectTo="/platform"><PlatformBackendHealth /></RoleRoute>} />

                  {/* Platform — full-page creation editors */}
                  <Route path="/platform/jobs/new" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformJobNew /></RoleRoute>} />
                  <Route path="/platform/customers/new" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformCustomerNew /></RoleRoute>} />
                  <Route path="/platform/leads/new" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformLeadNew /></RoleRoute>} />
                  <Route path="/platform/quotes/new" element={<RoleRoute allow={["owner","office_manager","manager"]}><PlatformQuoteNew /></RoleRoute>} />
                  <Route path="/platform/invoices/new" element={<RoleRoute allow={["owner","office_manager"]}><PlatformInvoiceNew /></RoleRoute>} />
                  

                  {/* Payment & Quote public pages */}
                  <Route path="/pay/:shortcode/:invoiceId" element={<PayInvoice />} />
                  <Route path="/pay/:shortcode/success" element={<PaymentSuccess />} />
                  <Route path="/quote" element={<Quote />} />
                  <Route path="/quote/:shortcode/:quoteId" element={<ViewQuote />} />
                  <Route path="/portal" element={<CustomerPortal />} />
                  <Route path="/app/tap-to-pay" element={<TapToPayLanding />} />

                  <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </CreateSheetsProvider>
            </BrowserRouter>
          </ErrorBoundary>
        </BusinessProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
