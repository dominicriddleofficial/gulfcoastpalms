import { motion } from "framer-motion";
import { Phone, MessageSquare, ArrowRight, TreePine } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { palmTypes } from "@/data/palmTypes";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const PalmTreeTypes = () => {
  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Palm Tree Types – Emerald Coast Florida",
        description: "Learn about the most popular palm tree species for Florida's Emerald Coast including care guides, trimming recommendations, and installation tips.",
      })}} />

      {/* Hero */}
      <section className="section-padding bg-palm-dark">
        <div className="container mx-auto text-center">
          <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="font-body text-palm-gold font-semibold uppercase tracking-[0.2em] text-sm mb-4">
            Palm Tree Education
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-6">
            Palm Tree Types for{" "}
            <span className="text-gradient-primary">Florida's Gulf Coast</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-body text-lg text-palm-sand/80 max-w-2xl mx-auto">
            Explore the most popular palm species for the Emerald Coast. Learn about growth habits, maintenance needs, and which palms are best for your property.
          </motion.p>
        </div>
      </section>

      {/* Palm Grid */}
      <section className="section-padding bg-background">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {palmTypes.map((palm, i) => (
              <motion.div
                key={palm.slug}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <Link
                  to={`/palm-trees/${palm.slug}`}
                  className="block rounded-2xl border border-border bg-card hover:shadow-xl transition-all duration-300 overflow-hidden group h-full"
                >
                  <div className="p-4">
                    <div className="w-full aspect-[4/3] rounded-xl bg-secondary flex items-center justify-center mb-4">
                      <TreePine className="w-16 h-16 text-primary/40" />
                    </div>
                  </div>
                  <div className="px-6 pb-6">
                    <h2 className="font-display text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {palm.name}
                    </h2>
                    <p className="font-body text-xs text-muted-foreground italic mb-3">{palm.scientificName}</p>
                    <p className="font-body text-sm text-muted-foreground mb-4">{palm.shortDescription}</p>
                    <div className="flex items-center gap-2 text-primary font-body font-semibold text-sm">
                      Learn More <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary">
        <div className="container mx-auto text-center">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
            Need Help Choosing the Right Palm?
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Call or text Gulf Coast Palms for expert species recommendations, installation, and maintenance.
          </motion.p>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2} className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8509101290" className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-primary-foreground text-primary font-body font-bold text-lg hover:scale-105 transition-transform shadow-xl">
              <Phone className="w-5 h-5" /> (850) 910-1290
            </a>
            <a href="sms:8509101290" className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl border-2 border-primary-foreground text-primary-foreground font-body font-bold text-lg hover:bg-primary-foreground/10 transition-colors">
              <MessageSquare className="w-5 h-5" /> Text Us
            </a>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default PalmTreeTypes;
