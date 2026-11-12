import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import StickyContactBar from "@/components/StickyContactBar";
import CinematicHeader from "@/components/cinematic/CinematicHeader";
import CinematicHero from "@/components/cinematic/CinematicHero";
import "@/components/cinematic/cinematic.css";
import TrustBadges from "@/components/home/TrustBadges";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import ServicesPreview from "@/components/home/ServicesPreview";
import ServiceAreasSection from "@/components/home/ServiceAreasSection";
import GalleryPreview from "@/components/home/GalleryPreview";
import ServiceAreaMap from "@/components/home/ServiceAreaMap";
import GoogleReviews from "@/components/home/GoogleReviews";
import VideoTestimonials from "@/components/home/VideoTestimonials";
import FAQ from "@/components/home/FAQ";
import CTASection from "@/components/home/CTASection";
import { CINEMATIC_PREVIEW_PATH } from "@/data/cinematicHero";

/** Hidden, noindex preview of a cinematic homepage. The live "/" is unchanged. */
const CinematicHome = () => (
  <div className="cine-page min-h-screen flex flex-col overflow-x-clip">
    <SEOHead title="Cinematic homepage preview | Gulf Coast Palms" description="Internal preview." canonicalUrl={CINEMATIC_PREVIEW_PATH} noIndex />
    <CinematicHeader />
    <main className="cine-main flex-1 overflow-x-clip">
      <CinematicHero />
      <ServicesPreview />
      <TrustBadges />
      <WhyChooseUs />
      <ServiceAreasSection />
      <GalleryPreview />
      <ServiceAreaMap />
      <GoogleReviews />
      <VideoTestimonials />
      <FAQ />
      <CTASection />
    </main>
    <Footer />
    {/* Scoped wrapper adds safe-area padding for this preview only; the shared bar is unchanged. */}
    <div className="cine-contact"><StickyContactBar /></div>
  </div>
);

export default CinematicHome;
