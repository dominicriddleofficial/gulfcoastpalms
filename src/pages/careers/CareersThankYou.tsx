import { Link } from "react-router-dom";
import { CheckCircle, ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";

const CareersThankYou = () => {
  return (
    <Layout>
      <SEOHead
        title="Application Received | Gulf Coast Palms Careers"
        description="Thank you for applying to Gulf Coast Palms. We review every application and will be in touch if your experience is a match for our team."
        canonicalUrl="/careers/thank-you"
        noIndex
      />
      <section className="section-padding min-h-[60vh] flex items-center">
        <div className="container mx-auto text-center max-w-2xl">
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-20 h-20 text-primary" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Thanks for Applying
          </h1>
          <p className="font-body text-lg text-muted-foreground mb-8">
            We received your application. If your background looks like a fit, we'll be in touch soon.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-border text-foreground font-body font-semibold hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default CareersThankYou;
