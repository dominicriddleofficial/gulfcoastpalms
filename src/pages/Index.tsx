import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { LocalBusinessJsonLd } from "@/components/JsonLd";
import HeroSection from "@/components/home/HeroSection";
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
const Index = () => {
  return (
    <Layout>
      <SEOHead
        title="Gulf Coast Palms | Palm Tree Services in Navarre, FL"
        description="Professional palm tree trimming, removal, and hurricane prep across Navarre, Gulf Breeze, and Pensacola. Free quotes — call (850) 910-1290."
        canonicalUrl="/"
      />

      {/* JSON-LD for Local Business SEO */}
      <LocalBusinessJsonLd />

      <HeroSection />
      <TrustBadges />
      <WhyChooseUs />
      <ServicesPreview />
      <ServiceAreasSection />
      <GalleryPreview />
      <ServiceAreaMap />
      <GoogleReviews />
      <VideoTestimonials />
      {/* TODO: Update SEOHead description to mention video testimonials once real videos are added */}
      <FAQ />
      <CTASection />
    </Layout>
  );
};

export default Index;
