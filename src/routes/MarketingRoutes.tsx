import { lazy } from "react";
import { Route } from "react-router-dom";
import { page } from "@/redesign/routes";

// Lazy so the homepage subtree (HeroSection, GoogleReviews, VideoTestimonials,
// FAQ, framer-motion, etc.) is code-split out of the entry chunk that every
// /platform cold start has to parse.
const Index = lazy(() => import("@/pages/Index"));
const CinematicHomePreview = lazy(() => import("@/pages/preview/CinematicHome"));

const Services = lazy(() => import("@/pages/Services"));
const Pensacola = lazy(() => import("@/pages/locations/Pensacola"));
const GulfBreeze = lazy(() => import("@/pages/locations/GulfBreeze"));
const Navarre = lazy(() => import("@/pages/locations/Navarre"));
const FortWaltonBeach = lazy(() => import("@/pages/locations/FortWaltonBeach"));
const Destin = lazy(() => import("@/pages/locations/Destin"));
const ThirtyA = lazy(() => import("@/pages/locations/ThirtyA"));
const PerdidoKey = lazy(() => import("@/pages/locations/PerdidoKey"));
const Niceville = lazy(() => import("@/pages/locations/Niceville"));
const MaryEsther = lazy(() => import("@/pages/locations/MaryEsther"));
const SantaRosaBeach = lazy(() => import("@/pages/locations/SantaRosaBeach"));
const Pace = lazy(() => import("@/pages/locations/Pace"));
const Milton = lazy(() => import("@/pages/locations/Milton"));
const Crestview = lazy(() => import("@/pages/locations/Crestview"));
const Perdido = lazy(() => import("@/pages/locations/Perdido"));

const About = lazy(() => import("@/pages/About"));
const Jobs = lazy(() => import("@/pages/Jobs"));
const ServiceAreas = lazy(() => import("@/pages/ServiceAreas"));
const PalmTreeTypes = lazy(() => import("@/pages/PalmTreeTypes"));
const PalmTypePage = lazy(() => import("@/pages/PalmTypePage"));
const BuyPalmTrees = lazy(() => import("@/pages/BuyPalmTrees"));
const PalmCareGuides = lazy(() => import("@/pages/PalmCareGuides"));
const PalmGuidePage = lazy(() => import("@/pages/PalmGuidePage"));
const PalmTreeCost = lazy(() => import("@/pages/PalmTreeCost"));
const HoaCommercialMaintenance = lazy(() => import("@/pages/HoaCommercialMaintenance"));
const Commercial = lazy(() => import("@/pages/Commercial"));
const HurricanePalmPreparation = lazy(() => import("@/pages/HurricanePalmPreparation"));
const EmergencyPalmService = lazy(() => import("@/pages/EmergencyPalmService"));
const HolidayLighting = lazy(() => import("@/pages/HolidayLighting"));
const GalleryPage = lazy(() => import("@/pages/Gallery"));
const PalmTreeMaintenancePlans = lazy(() => import("@/pages/PalmTreeMaintenancePlans"));
const Quote = lazy(() => import("@/pages/Quote"));

const LearnHub = lazy(() => import("@/pages/learn/LearnHub"));
const LearnArticle = lazy(() => import("@/pages/learn/LearnArticle"));

const PalmTreeTrimming = lazy(() => import("@/pages/services/PalmTreeTrimming"));
const PalmTreeInstallation = lazy(() => import("@/pages/services/PalmTreeInstallation"));
const PalmTreeRemoval = lazy(() => import("@/pages/services/PalmTreeRemoval"));
const PalmDiamondCutting = lazy(() => import("@/pages/services/PalmDiamondCutting"));
const PalmTreeTrunkSkinning = lazy(() => import("@/pages/services/PalmTreeTrunkSkinning"));
const TreeService = lazy(() => import("@/pages/services/TreeService"));
const TreeTrimmingRemoval = lazy(() => import("@/pages/services/TreeTrimmingRemoval"));
const LandscapingServices = lazy(() => import("@/pages/services/LandscapingServices"));

const GulfCoastPalmsCareers = lazy(() => import("@/pages/careers/GulfCoastPalms"));
const TeamLeaderCareers = lazy(() => import("@/pages/careers/TeamLeader"));
const GroundsmanCareers = lazy(() => import("@/pages/careers/Groundsman"));
const SalesOperationsCareers = lazy(() => import("@/pages/careers/SalesOperations"));
const CareersThankYou = lazy(() => import("@/pages/careers/CareersThankYou"));
const PalmTreeTrimmerCareers = lazy(() => import("@/pages/careers/PalmTreeTrimmer"));

const SOPTeamLeader = lazy(() => import("@/pages/employee/SOPTeamLeader"));
const SOPGroundsman = lazy(() => import("@/pages/employee/SOPGroundsman"));
const SOPSalesOperations = lazy(() => import("@/pages/employee/SOPSalesOperations"));

/**
 * Marketing & content routes (homepage, services, locations, learn,
 * careers, employee SOPs). These pages currently each render their own
 * `<Layout>` wrapper; a future pass can move them under a shared
 * `<MarketingLayout>` route.
 *
 * Routes wrapped in `page()` have a rebuilt version in src/redesign. It is used only
 * while the redesign is showing (today: the hidden /preview/redesign address).
 */
export const MarketingRoutes = () => (
  <>
    <Route path="/" element={page("/", <Index />)} />
    <Route path="/preview/cinematic-home" element={<CinematicHomePreview />} />
    <Route path="/services" element={page("/services", <Services />)} />
    <Route path="/services/palm-tree-trimming" element={page("/services/palm-tree-trimming", <PalmTreeTrimming />)} />
    <Route path="/services/palm-tree-installation" element={page("/services/palm-tree-installation", <PalmTreeInstallation />)} />
    <Route path="/services/palm-tree-removal" element={page("/services/palm-tree-removal", <PalmTreeRemoval />)} />
    <Route path="/services/palm-diamond-cutting" element={page("/services/palm-diamond-cutting", <PalmDiamondCutting />)} />
    <Route path="/services/palm-tree-trunk-skinning" element={page("/services/palm-tree-trunk-skinning", <PalmTreeTrunkSkinning />)} />
    <Route path="/services/tree-removal" element={page("/services/tree-removal", <TreeService slug="tree-removal" />)} />
    <Route path="/services/tree-trimming" element={page("/services/tree-trimming", <TreeService slug="tree-trimming" />)} />
    <Route path="/services/storm-damage-cleanup" element={page("/services/storm-damage-cleanup", <TreeService slug="storm-damage-cleanup" />)} />
    <Route path="/services/tree-trimming-removal" element={page("/services/tree-trimming-removal", <TreeTrimmingRemoval />)} />
    <Route path="/services/landscaping-services" element={<LandscapingServices />} />

    <Route path="/palm-tree-trimming-pensacola-fl" element={page("/palm-tree-trimming-pensacola-fl", <Pensacola />)} />
    <Route path="/palm-tree-trimming-gulf-breeze-fl" element={page("/palm-tree-trimming-gulf-breeze-fl", <GulfBreeze />)} />
    <Route path="/palm-tree-trimming-navarre-fl" element={page("/palm-tree-trimming-navarre-fl", <Navarre />)} />
    <Route path="/palm-tree-trimming-fort-walton-beach-fl" element={page("/palm-tree-trimming-fort-walton-beach-fl", <FortWaltonBeach />)} />
    <Route path="/palm-tree-trimming-destin-fl" element={page("/palm-tree-trimming-destin-fl", <Destin />)} />
    <Route path="/palm-tree-trimming-30a-fl" element={page("/palm-tree-trimming-30a-fl", <ThirtyA />)} />
    <Route path="/palm-tree-trimming-perdido-key-fl" element={page("/palm-tree-trimming-perdido-key-fl", <PerdidoKey />)} />
    <Route path="/palm-tree-trimming-perdido-fl" element={page("/palm-tree-trimming-perdido-fl", <Perdido />)} />
    <Route path="/palm-tree-trimming-niceville-fl" element={page("/palm-tree-trimming-niceville-fl", <Niceville />)} />
    <Route path="/palm-tree-trimming-mary-esther-fl" element={page("/palm-tree-trimming-mary-esther-fl", <MaryEsther />)} />
    <Route path="/palm-tree-trimming-santa-rosa-beach-fl" element={page("/palm-tree-trimming-santa-rosa-beach-fl", <SantaRosaBeach />)} />
    <Route path="/palm-tree-trimming-pace-fl" element={page("/palm-tree-trimming-pace-fl", <Pace />)} />
    <Route path="/palm-tree-trimming-milton-fl" element={page("/palm-tree-trimming-milton-fl", <Milton />)} />
    <Route path="/palm-tree-trimming-crestview-fl" element={page("/palm-tree-trimming-crestview-fl", <Crestview />)} />

    <Route path="/about" element={<About />} />
    <Route path="/jobs" element={page("/jobs", <Jobs />)} />
    <Route path="/service-areas" element={page("/service-areas", <ServiceAreas />)} />
    <Route path="/palm-tree-cost" element={<PalmTreeCost />} />
    <Route path="/hoa-commercial-palm-maintenance" element={<HoaCommercialMaintenance />} />
    <Route path="/commercial" element={<Commercial />} />
    <Route path="/commercial-palm-tree-services" element={<Commercial />} />
    <Route path="/hurricane-palm-preparation" element={<HurricanePalmPreparation />} />
    <Route path="/emergency-palm-service" element={<EmergencyPalmService />} />
    <Route path="/holiday-lighting" element={<HolidayLighting />} />
    <Route path="/gallery" element={page("/gallery", <GalleryPage />)} />
    <Route path="/palm-trees/types" element={<PalmTreeTypes />} />
    <Route path="/palm-trees/buy" element={<BuyPalmTrees />} />
    <Route path="/palm-trees/guides" element={<PalmCareGuides />} />
    <Route path="/palm-trees/guides/:slug" element={<PalmGuidePage />} />
    <Route path="/palm-trees/:slug" element={<PalmTypePage />} />
    <Route path="/learn" element={<LearnHub />} />
    <Route path="/learn/:slug" element={<LearnArticle />} />
    <Route path="/palm-tree-maintenance-plans" element={<PalmTreeMaintenancePlans />} />
    <Route path="/quote" element={page("/quote", <Quote />)} />

    <Route path="/careers/gulf-coast-palms" element={<GulfCoastPalmsCareers />} />
    <Route path="/careers/gulf-coast-palms/team-leader" element={<TeamLeaderCareers />} />
    <Route path="/careers/gulf-coast-palms/groundsman" element={<GroundsmanCareers />} />
    <Route path="/careers/gulf-coast-palms/sales-operations" element={<SalesOperationsCareers />} />
    <Route path="/careers/palm-tree-trimmer" element={<PalmTreeTrimmerCareers />} />
    <Route path="/careers/thank-you" element={<CareersThankYou />} />

    <Route path="/employee/gulf-coast-palms/sop/team-leader" element={<SOPTeamLeader />} />
    <Route path="/employee/gulf-coast-palms/sop/groundsman" element={<SOPGroundsman />} />
    <Route path="/employee/gulf-coast-palms/sop/sales-operations" element={<SOPSalesOperations />} />
  </>
);