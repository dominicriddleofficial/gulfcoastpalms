import { motion } from "framer-motion";
import { Phone, Star, CheckCircle, MapPin, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { ServiceJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";
import { GCP_BUSINESS, TEL_HREF, SMS_HREF } from "@/lib/business-info";
import { LocationData, locations } from "@/data/locations";

const BASE_URL = GCP_BUSINESS.url;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

interface Props {
  location: LocationData;
}

const LocationPage = ({ location }: Props) => {
  const nearbyLocations = location.nearbyLinks
    .map((slug) => locations.find((l) => l.slug === slug))
    .filter(Boolean) as LocationData[];

  const canonicalUrl = `/${location.slug}`;

  return (
    <Layout>
      <SEOHead
        title={location.metaTitle}
        description={location.metaDescription}
        canonicalUrl={canonicalUrl}
      />

      <ServiceJsonLd
        service={{
          name: `Palm Tree Trimming in ${location.city}, ${location.state}`,
          description: location.metaDescription,
          areaServed: `${location.city}, ${location.state}`,
          url: `${BASE_URL}${canonicalUrl}`,
        }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: BASE_URL },
          { name: "Service Areas", url: `${BASE_URL}/service-areas` },
          { name: `${location.city} Palm Tree Trimming`, url: `${BASE_URL}${canonicalUrl}` },
        ]}
      />

      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-palm-dark">
        <div className="absolute inset-0">
          <img
            src={location.images[0].src}
            alt={location.images[0].alt}
            className="w-full h-full object-cover opacity-30"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-palm-dark/80 via-palm-dark/70 to-palm-dark" />
        </div>

        <div className="relative z-10 container mx-auto px-4">
          <motion.div initial="hidden" animate="visible" className="max-w-4xl">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-palm-gold/40 bg-palm-gold/10 font-body text-palm-gold text-xs font-bold uppercase tracking-[0.15em] mb-6">
              <MapPin className="w-3.5 h-3.5" />
              {location.city}, {location.state}
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-tight mb-4">
              {location.h1}
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="font-body text-lg md:text-xl text-palm-sand/80 max-w-3xl mb-8">
              {location.subheading}
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4">
              <a
                href={TEL_HREF}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-body font-bold text-lg hover:bg-palm-light transition-all shadow-lg shadow-primary/30"
              >
                <Phone className="w-5 h-5" />
                Call {GCP_BUSINESS.phoneDisplay}
              </a>
              <a
                href={SMS_HREF}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl border-2 border-primary-foreground/30 text-primary-foreground font-body font-semibold text-lg hover:bg-primary-foreground/10 transition-all"
              >
                Text for Free Quote
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Intro Content */}
      <section className="section-padding bg-background">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
                {location.introParagraphs.map((p, i) => (
                  <motion.p key={i} variants={fadeUp} custom={i} className="font-body text-muted-foreground leading-relaxed mb-6 text-lg">
                    {p}
                  </motion.p>
                ))}
              </motion.div>

              {location.highlight && (
                <motion.blockquote initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="border-l-4 border-primary pl-6 py-4 my-8 bg-secondary/50 rounded-r-lg">
                  <p className="font-body text-foreground font-semibold text-lg italic">{location.highlight}</p>
                </motion.blockquote>
              )}
            </div>

            <div className="space-y-4">
              <img src={location.images[1].src} alt={location.images[1].alt} className="w-full rounded-xl shadow-lg object-cover aspect-[4/3]" loading="lazy" width={400} height={300} />
              <img src={location.images[2].src} alt={location.images[2].alt} className="w-full rounded-xl shadow-lg object-cover aspect-[4/3]" loading="lazy" width={400} height={300} />
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section-padding bg-palm-dark">
        <div className="container mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">Our Services</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl md:text-5xl font-bold text-primary-foreground">Services in {location.city} Include</motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {location.services.map((service, i) => (
              <motion.div key={service} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="flex items-center gap-3 p-5 rounded-xl border border-palm-green/20 bg-palm-dark">
                <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                <span className="font-body text-primary-foreground font-medium">{service}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding bg-background">
        <div className="container mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">Why Choose Us</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl md:text-5xl font-bold text-foreground">{location.whyChooseTitle}</motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mb-10">
            {location.whyChoosePoints.map((point, i) => (
              <motion.div key={point} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="flex items-start gap-3 p-5 rounded-xl border border-border bg-card">
                <Star className="w-5 h-5 text-palm-gold shrink-0 mt-0.5" />
                <p className="font-body text-foreground font-medium">{point}</p>
              </motion.div>
            ))}
          </div>

          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-body text-muted-foreground max-w-3xl mx-auto text-center leading-relaxed text-lg">
            {location.whyChooseClosing}
          </motion.p>
        </div>
      </section>

      {/* Maintenance CTA */}
      <section className="section-padding bg-secondary/50">
        <div className="container mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h3 variants={fadeUp} custom={0} className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
              Protect Your {location.city} Palms Year-Round
            </motion.h3>
            <motion.p variants={fadeUp} custom={1} className="font-body text-muted-foreground mb-6 max-w-xl mx-auto">
              Scheduled trimming, health checks, and hurricane prep — all handled for you.
            </motion.p>
            <motion.div variants={fadeUp} custom={2}>
              <Link to="/palm-tree-maintenance-plans" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-body font-semibold hover:bg-primary/90 transition-colors">
                View Maintenance Plans <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Nearby Service Areas */}
      {nearbyLocations.length > 0 && (
        <section className="section-padding bg-secondary/30">
          <div className="container mx-auto text-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">Nearby Service Areas</motion.p>
              <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">We Also Serve These Communities</motion.h2>
              <motion.div variants={fadeUp} custom={2} className="flex flex-wrap justify-center gap-3">
                {nearbyLocations.map((loc) => (
                  <Link key={loc.slug} to={`/${loc.slug}`} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-card border border-border text-foreground font-body font-medium hover:border-primary hover:text-primary transition-colors">
                    {loc.city}, {loc.state} <ArrowRight className="w-4 h-4" />
                  </Link>
                ))}
                <Link to="/service-areas" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-body font-semibold hover:bg-palm-light transition-colors">
                  View All Service Areas <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section-padding bg-primary">
        <div className="container mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-4">{location.ctaHeading}</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">{location.ctaText}</motion.p>
            <motion.a variants={fadeUp} custom={2} href={TEL_HREF} className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-primary-foreground text-primary font-body font-bold text-xl hover:scale-105 transition-transform shadow-xl">
              <Phone className="w-6 h-6" /> {GCP_BUSINESS.phoneDisplay}
            </motion.a>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default LocationPage;
