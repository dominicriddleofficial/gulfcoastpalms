import { motion } from "framer-motion";
import { MapPin, ArrowRight, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { locations } from "@/data/locations";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const ServiceAreas = () => {
  return (
    <Layout>
      <SEOHead
        title="Palm Tree Service Areas | Gulf Coast Palms NW Florida"
        description="Gulf Coast Palms serves Navarre, Gulf Breeze, Pensacola, Fort Walton Beach, Destin, 30A, Perdido Key, and all of NW Florida. View our full service coverage area."
        canonicalUrl="/service-areas"
      />
      <section className="py-20 md:py-28 bg-palm-dark">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible">
            <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
              Service Areas
            </motion.p>
            <motion.h1 variants={fadeUp} custom={1} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              Palm Tree Trimming Across the Emerald Coast
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="font-body text-lg text-palm-sand/80 max-w-2xl mx-auto">
              Gulf Coast Palms proudly provides professional palm tree trimming, diamond cutting, and expert palm care throughout Northwest Florida's Gulf Coast communities.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((loc, i) => (
              <motion.div
                key={loc.slug}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i % 6}
              >
                <Link
                  to={`/${loc.slug}`}
                  className="group block p-6 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-lg transition-all"
                >
                  <div className="aspect-[16/9] rounded-xl overflow-hidden mb-4">
                    <img
                      src={loc.images[0].src}
                      alt={loc.images[0].alt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-body text-sm text-muted-foreground uppercase tracking-wider">
                      {loc.city}, {loc.state}
                    </span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    Palm Tree Trimming in {loc.city}
                  </h2>
                  <p className="font-body text-muted-foreground text-sm line-clamp-2 mb-4">
                    {loc.introParagraphs[0]}
                  </p>
                  <span className="inline-flex items-center gap-1 font-body text-primary font-semibold text-sm">
                    Learn More <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary">
        <div className="container mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
              Don't See Your Area? We Probably Cover It.
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Call or text for a free quote anywhere along Florida's Gulf Coast.
            </motion.p>
            <motion.a
              variants={fadeUp}
              custom={2}
              href="tel:8509101290"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-primary-foreground text-primary font-body font-bold text-xl hover:scale-105 transition-transform shadow-xl"
            >
              <Phone className="w-6 h-6" />
              (850) 910-1290
            </motion.a>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default ServiceAreas;
