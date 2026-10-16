import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
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
        title="Gulf Coast Palms | Tree Services & Palm Care on the Emerald Coast"
        description="Tree trimming, tree removal, storm cleanup and palm care across Navarre, Pensacola, Destin and the Emerald Coast. Free quotes — (850) 910-1290."
        canonicalUrl="/"
      />

      <HeroSection />
      <ServicesPreview />
      <TrustBadges />
      <WhyChooseUs />
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
