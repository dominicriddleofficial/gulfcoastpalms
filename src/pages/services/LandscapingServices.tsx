import { motion } from "framer-motion";
import { Phone, MessageSquare, CheckCircle, Leaf, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { BreadcrumbJsonLd } from "@/components/JsonLd";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const areas = ["Pensacola", "Gulf Breeze", "Navarre", "Fort Walton Beach", "Destin", "30A", "Perdido Key", "Milton", "Niceville", "Crestview"];

const services = [
  {
    title: "Hedge Trimming",
    desc: "Professional hedge trimming and shaping for residential and commercial properties. We keep your hedges clean, uniform, and healthy — whether it's a small front yard or a large HOA community with hundreds of linear feet of hedgerows.",
    keywords: "Boxwood, ligustrum, viburnum, holly, and other common Gulf Coast hedging plants.",
  },
  {
    title: "Mulch Installation",
    desc: "Fresh mulch transforms your landscape beds instantly. We install premium hardwood mulch, cypress mulch, and pine bark mulch at competitive rates. Mulch helps retain soil moisture, suppresses weeds, and gives your beds a clean, finished look.",
    keywords: "Hardwood mulch, cypress mulch, pine bark, rubber mulch, and colored mulch options.",
  },
  {
    title: "Pine Straw Installation",
    desc: "Pine straw is a cost-effective, natural ground cover that's perfect for Florida landscapes. We deliver and install premium long-needle pine straw that stays in place, suppresses weeds, and adds a warm, natural look to your landscape beds.",
    keywords: "Long-needle pine straw delivery and professional installation.",
  },
  {
    title: "Sod Installation",
    desc: "Whether you need to patch bare spots or install a brand-new lawn, we handle sod installation from start to finish. We work with St. Augustine, Zoysia, Bermuda, and other varieties suited for the Gulf Coast climate.",
    keywords: "St. Augustine, Zoysia, Bermuda, Bahia — lawn installation and repair.",
  },
  {
    title: "Bed Cleanups",
    desc: "Overgrown landscape beds drag down your curb appeal. Our bed cleanup service removes weeds, dead plants, and debris — then refreshes with new mulch or pine straw. Perfect for seasonal cleanups, move-in/move-out preparation, or property management turnovers.",
    keywords: "Weed removal, debris cleanup, bed edging, and seasonal refreshes.",
  },
];

const LandscapingServices = () => {
  return (
    <Layout>
      <SEOHead
        title="Landscaping Services NW Florida — Mulch, Sod, Hedges | Gulf Coast Palms"
        description="Hedge trimming, mulch, pine straw, sod install & bed cleanups across Pensacola, Navarre, Destin & the Emerald Coast. Free estimate — call (850) 910-1290."
        canonicalUrl="/services/landscaping-services"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://gulfcoastpalmservices.com/" },
          { name: "Services", url: "https://gulfcoastpalmservices.com/services" },
          { name: "Landscaping Services", url: "https://gulfcoastpalmservices.com/services/landscaping-services" },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Landscaping Services – Gulf Coast Palms",
            description: "Professional hedge trimming, mulch installation, pine straw, sod installation, and bed cleanup services across the Florida Emerald Coast.",
            provider: {
              "@type": "LocalBusiness",
              name: "Gulf Coast Palms",
              telephone: "(850) 910-1290",
              url: "https://gulfcoastpalmcleaning.com",
            },
            areaServed: areas.map((a) => ({ "@type": "City", name: a + ", FL" })),
            serviceType: ["Hedge Trimming", "Mulch Installation", "Pine Straw Installation", "Sod Installation", "Bed Cleanup"],
          }),
        }}
      />

      {/* Hero */}
      <section className="bg-palm-dark section-padding text-center">
        <div className="container mx-auto">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
            Landscaping Services
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
            Professional Landscaping Services
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-body text-lg text-palm-sand/70 max-w-2xl mx-auto mb-8">
            Hedge trimming, mulch, pine straw, sod installation, and bed cleanups across Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, Destin, and the entire Emerald Coast.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="sms:8509101290" className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-body font-bold text-lg hover:bg-palm-light transition-colors shadow-lg">
              <MessageSquare className="w-5 h-5" /> Get a Free Estimate
            </a>
            <a href="tel:8509101290" className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl border-2 border-primary-foreground/30 text-primary-foreground font-body font-semibold text-lg hover:bg-primary-foreground/10 transition-colors">
              <Phone className="w-5 h-5" /> (850) 910-1290
            </a>
          </motion.div>
        </div>
      </section>

      {/* Intro */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              More Than Just Palms — Full Landscaping Support
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="font-body text-muted-foreground leading-relaxed mb-4">
              While palm trees are our specialty, Gulf Coast Palms also provides a range of professional landscaping services to keep your entire property looking its best. From hedge trimming and bed cleanups to mulch installation and sod, we handle the work that makes the biggest visual impact on your curb appeal.
            </motion.p>
            <motion.p variants={fadeUp} custom={2} className="font-body text-muted-foreground leading-relaxed">
              We serve residential homeowners, HOA communities, apartment complexes, commercial properties, and waterfront estates across the Emerald Coast. Our goal is simple: deliver quality work, clean up thoroughly, and leave your property looking better than we found it.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Services Detail */}
      <section className="section-padding bg-palm-dark">
        <div className="container mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
              What We Offer
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl md:text-5xl font-bold text-primary-foreground">
              Our Landscaping Services
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, i) => (
              <motion.div key={service.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="p-6 md:p-8 rounded-2xl border border-palm-green/20 bg-palm-dark">
                <div className="flex items-center gap-3 mb-4">
                  <Leaf className="w-6 h-6 text-palm-gold shrink-0" />
                  <h3 className="font-display text-2xl font-bold text-primary-foreground">{service.title}</h3>
                </div>
                <p className="font-body text-palm-sand/70 leading-relaxed mb-3">{service.desc}</p>
                <p className="font-body text-palm-sand/50 text-sm italic">{service.keywords}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
              Why Property Owners Choose Gulf Coast Palms for Landscaping
            </motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              "Licensed and insured professionals",
              "Clean job sites — we haul away all debris",
              "Reliable scheduling for recurring services",
              "Experienced with large HOA and commercial properties",
              "Competitive pricing with no hidden fees",
              "One company for palms, trees, and landscaping",
            ].map((point, i) => (
              <motion.div key={point} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="font-body text-foreground font-medium">{point}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
              Service Areas
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              Landscaping Services Across the Emerald Coast
            </motion.h2>
            <motion.div variants={fadeUp} custom={2} className="flex flex-wrap justify-center gap-3 mb-6">
              {areas.map((area) => (
                <span key={area} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-background text-foreground font-body font-medium text-sm">
                  <MapPin className="w-3.5 h-3.5" /> {area}, FL
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Internal Links */}
      <section className="py-8 bg-background border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/services/tree-trimming-removal" className="font-body text-sm text-primary hover:underline">Tree Trimming & Removal</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/services/palm-tree-trimming" className="font-body text-sm text-primary hover:underline">Palm Tree Trimming</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/palm-tree-cost" className="font-body text-sm text-primary hover:underline">Palm Tree Cost</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/services" className="font-body text-sm text-primary hover:underline">All Services</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary text-center">
        <div className="container mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">Get a Free Landscaping Estimate</h2>
          <p className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">Text us a photo of your property for a fast, free estimate on any landscaping service.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="sms:8509101290" className="inline-flex items-center justify-center gap-3 px-10 py-5 rounded-xl bg-primary-foreground text-primary font-body font-bold text-xl hover:scale-105 transition-transform shadow-xl">
              <MessageSquare className="w-6 h-6" /> Text Us for a Free Quote
            </a>
            <a href="tel:8509101290" className="inline-flex items-center justify-center gap-3 px-8 py-5 rounded-xl border-2 border-primary-foreground text-primary-foreground font-body font-bold text-lg hover:bg-primary-foreground/10 transition-colors">
              <Phone className="w-5 h-5" /> (850) 910-1290
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default LandscapingServices;
