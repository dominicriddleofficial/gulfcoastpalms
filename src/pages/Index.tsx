import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { LocalBusinessJsonLd } from "@/components/JsonLd";
import HeroSection from "@/components/home/HeroSection";
import TrustBadges from "@/components/home/TrustBadges";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import ServicesPreview from "@/components/home/ServicesPreview";
import BeforeAfterGallery from "@/components/home/BeforeAfterGallery";
import ServiceAreasSection from "@/components/home/ServiceAreasSection";
import GalleryPreview from "@/components/home/GalleryPreview";
import GoogleReviews from "@/components/home/GoogleReviews";
import VideoTestimonials from "@/components/home/VideoTestimonials";
import FAQ from "@/components/home/FAQ";
import CTASection from "@/components/home/CTASection";
const Index = () => {
  return (
    <Layout>
      <SEOHead
        title="Gulf Coast Palms | Palm Tree Trimming & Removal — NW Florida"
        description="Gulf Coast Palms is Northwest Florida's palm tree specialist. Expert trimming, removal, and hurricane prep across Navarre, Pensacola, Destin, and the Emerald Coast."
        canonicalUrl="/"
      />

      {/* JSON-LD for Local Business SEO */}
      <LocalBusinessJsonLd />

      <HeroSection />
      <TrustBadges />
      <WhyChooseUs />
      <ServicesPreview />
      <BeforeAfterGallery />
      <ServiceAreasSection />
      <GalleryPreview />
      <GoogleReviews />
      <VideoTestimonials />
      {/* TODO: Update SEOHead description to mention video testimonials once real videos are added */}
      <FAQ />
      <CTASection />
    </Layout>
  );
};

export default Index;
