import { motion } from "framer-motion";
import { Phone, MessageSquare, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { servicesData } from "@/data/services";
import palmTrimming from "@/assets/palm-trimming.jpg";
import diamondCutting from "@/assets/diamond-cutting.jpg";
import trunkSkinning from "@/assets/trunk-skinning.jpg";
import palmInstall from "@/assets/palm-install.jpg";

const serviceImages: Record<string, string> = {
  "palm-tree-trimming": palmTrimming,
  "palm-diamond-cutting": diamondCutting,
  "palm-tree-trunk-skinning": trunkSkinning,
  "palm-tree-installation": palmInstall,
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const Services = () => {
  return (
    <Layout>
      <SEOHead title="Palm Tree Services — Trimming, Removal, Installation | Gulf Coast Palms" description="Full-service palm care across NW Florida. Trimming, diamond cutting, trunk skinning, installation, removal, and hurricane prep. Free estimates." canonicalUrl="/services" />
      <section className="bg-palm-dark section-padding text-center">
        <div className="container mx-auto">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
            Our Services
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
            Professional Palm Tree Services
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-body text-lg text-palm-sand/70 max-w-2xl mx-auto">
            From palm tree trimming and diamond cutting to installation and safe removals — we specialize exclusively in palm trees across the Emerald Coast.
          </motion.p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {servicesData.map((service, i) => (
              <motion.div key={service.slug} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} custom={i}>
                <Link to={`/services/${service.slug}`} className="group block rounded-2xl overflow-hidden bg-card shadow-lg hover:shadow-xl transition-shadow h-full">
                  {serviceImages[service.slug] ? (
                    <div className="relative h-48 overflow-hidden">
                      <img src={serviceImages[service.slug]} alt={`${service.title} service by Gulf Coast Palms on the Emerald Coast Florida`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" width={800} height={600} />
                    </div>
                  ) : (
                    <div className="h-48 bg-secondary flex items-center justify-center">
                      <span className="font-display text-3xl text-primary/30">🌴</span>
                    </div>
                  )}
                  <div className="p-6">
                    <h2 className="font-display text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{service.title}</h2>
                    <p className="font-body text-muted-foreground text-sm leading-relaxed mb-4">{service.introParagraphs[0].slice(0, 150)}…</p>
                    <span className="inline-flex items-center gap-1 text-primary font-body font-semibold text-sm">Learn More <ArrowRight className="w-4 h-4" /></span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-primary text-center">
        <div className="container mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">Get an Instant Quote</h2>
          <p className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">Text us a photo of your palm trees for a fast, free estimate.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="sms:8509101290&body=Hi%20Gulf%20Coast%20Palms!%20I%27d%20like%20a%20quote%20%E2%80%94%20here%27s%20a%20photo%20of%20my%20palms%3A" className="inline-flex items-center justify-center gap-3 px-10 py-5 rounded-xl bg-primary-foreground text-primary font-body font-bold text-xl hover:scale-105 transition-transform shadow-xl">
              <MessageSquare className="w-6 h-6" /> Text Us a Photo for Instant Quote
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

export default Services;
