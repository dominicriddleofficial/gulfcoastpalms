import { motion } from "framer-motion";
import { Phone, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { servicesData } from "@/data/services";
import palmTrimming from "@/assets/palm-trimming.jpg";
import diamondCutting from "@/assets/diamond-cutting.jpg";
import trunkSkinning from "@/assets/trunk-skinning.jpg";
import palmInstall from "@/assets/palm-install.jpg";

const serviceImages: Record<string, string> = {
  "palm-tree-trimming": palmTrimming,
  "diamond-cutting": diamondCutting,
  "trunk-skinning": trunkSkinning,
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
      {/* Hero */}
      <section className="bg-palm-dark section-padding text-center">
        <div className="container mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3"
          >
            Our Services
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4"
          >
            Professional Palm & Property Services
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-body text-lg text-palm-sand/70 max-w-2xl mx-auto"
          >
            From palm tree trimming and diamond cutting to storm cleanup, hedge work, and pressure washing — we keep your property looking its best across the Emerald Coast.
          </motion.p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section-padding bg-background">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {servicesData.map((service, i) => (
              <motion.div
                key={service.slug}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
              >
                <Link
                  to={`/services/${service.slug}`}
                  className="group block rounded-2xl overflow-hidden bg-card shadow-lg hover:shadow-xl transition-shadow h-full"
                >
                  {serviceImages[service.slug] ? (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={serviceImages[service.slug]}
                        alt={`${service.title} service by Gulf Coast Palms`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-secondary flex items-center justify-center">
                      <span className="font-display text-3xl text-primary/30">🌴</span>
                    </div>
                  )}
                  <div className="p-6">
                    <h2 className="font-display text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {service.title}
                    </h2>
                    <p className="font-body text-muted-foreground text-sm leading-relaxed mb-4">
                      {service.introParagraphs[0].slice(0, 150)}…
                    </p>
                    <span className="inline-flex items-center gap-1 text-primary font-body font-semibold text-sm">
                      Learn More <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary text-center">
        <div className="container mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            Ready to Transform Your Property?
          </h2>
          <p className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Call or text us today for a free, no-obligation quote.
          </p>
          <a
            href="tel:8509101290"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-primary-foreground text-primary font-body font-bold text-xl hover:scale-105 transition-transform shadow-xl"
          >
            <Phone className="w-6 h-6" />
            (850) 910-1290
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default Services;
