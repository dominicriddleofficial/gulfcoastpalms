import { Link } from "react-router-dom";
import { CheckCircle, Phone, ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";

const ThankYou = () => {
  return (
    <Layout>
      <SEOHead
        title="Thank You | Gulf Coast Palms"
        description="Thank you for contacting Gulf Coast Palms. A member of our team will be in touch shortly to discuss your palm tree service needs."
        canonicalUrl="/thank-you"
        noIndex
      />
      <section className="section-padding min-h-[60vh] flex items-center">
        <div className="container mx-auto text-center max-w-2xl">
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-20 h-20 text-primary" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Thank You!
          </h1>
          <p className="font-body text-lg text-muted-foreground mb-8">
            We've received your request and will get back to you shortly. Our team typically responds within 15 minutes during business hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:8509101290"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-body font-semibold hover:bg-primary/90 transition-colors"
            >
              <Phone className="w-5 h-5" />
              Call Now: (850) 910-1290
            </a>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-border text-foreground font-body font-semibold hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ThankYou;
