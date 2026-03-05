import { motion } from "framer-motion";
import { Phone, MessageSquare, TreePine, Ruler, DollarSign } from "lucide-react";
import Layout from "@/components/Layout";
import { palmTypes } from "@/data/palmTypes";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const BuyPalmTrees = () => {
  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Buy Palm Trees – Emerald Coast Florida",
        description: "Purchase and install palm trees for your Florida property. Professional installation included.",
        brand: { "@type": "Brand", name: "Gulf Coast Palms" },
      })}} />

      {/* Hero */}
      <section className="section-padding bg-palm-dark">
        <div className="container mx-auto text-center">
          <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="font-body text-palm-gold font-semibold uppercase tracking-[0.2em] text-sm mb-4">
            Palm Tree Sales & Installation
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-6">
            Buy Palm Trees –{" "}
            <span className="text-gradient-primary">Emerald Coast Florida</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-body text-lg text-palm-sand/80 max-w-2xl mx-auto">
            Gulf Coast Palms sources, delivers, and professionally installs palm trees throughout the Emerald Coast. Every installation includes planting, bracing, and aftercare guidance.
          </motion.p>
        </div>
      </section>

      {/* Palm Cards */}
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
                className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col"
              >
                <div className="p-4">
                  <div className="w-full aspect-[4/3] rounded-xl bg-secondary flex items-center justify-center">
                    <TreePine className="w-16 h-16 text-primary/40" />
                  </div>
                </div>
                <div className="px-6 pb-6 flex flex-col flex-1">
                  <h2 className="font-display text-xl font-bold text-foreground mb-1">{palm.name}</h2>
                  <p className="font-body text-xs text-muted-foreground italic mb-3">{palm.scientificName}</p>
                  <p className="font-body text-sm text-muted-foreground mb-4 flex-1">{palm.shortDescription}</p>
                  
                  <div className="flex items-center gap-4 mb-4 text-sm font-body">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Ruler className="w-4 h-4 text-primary" />
                      {palm.height.split(" with")[0].split(" tall")[0]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-5 p-3 rounded-lg bg-secondary">
                    <DollarSign className="w-5 h-5 text-palm-gold" />
                    <div>
                      <p className="font-body text-xs text-muted-foreground">Typical Installed Price</p>
                      <p className="font-display text-sm font-bold text-foreground">{palm.priceRange.split(" (")[0]}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href="tel:8509101290"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-body font-semibold text-sm hover:bg-palm-light transition-colors"
                    >
                      <Phone className="w-4 h-4" /> Call
                    </a>
                    <a
                      href="sms:8509101290"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-primary text-primary font-body font-semibold text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" /> Text
                    </a>
                  </div>

                  <Link to={`/palm-trees/${palm.slug}`} className="mt-3 text-center font-body text-xs text-primary hover:underline">
                    Learn more about {palm.name} →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="section-padding bg-palm-dark">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold text-primary-foreground mb-6">How Buying & Installation Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {[
              { step: "1", title: "Choose Your Palms", desc: "Browse our selection or call for personalized recommendations based on your property." },
              { step: "2", title: "Free On-Site Quote", desc: "We visit your property, assess the site, and provide a detailed installation quote." },
              { step: "3", title: "Professional Install", desc: "We handle delivery, planting, bracing, and provide aftercare guidance for long-term success." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                  <span className="font-display text-xl font-bold text-palm-light">{s.step}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-primary-foreground mb-2">{s.title}</h3>
                <p className="font-body text-sm text-palm-sand/70">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary">
        <div className="container mx-auto text-center">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
            Ready to Transform Your Landscape?
          </h2>
          <p className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Call or text for a free palm installation quote. We serve the entire Emerald Coast.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8509101290" className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-primary-foreground text-primary font-body font-bold text-lg hover:scale-105 transition-transform shadow-xl">
              <Phone className="w-5 h-5" /> (850) 910-1290
            </a>
            <a href="sms:8509101290" className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl border-2 border-primary-foreground text-primary-foreground font-body font-bold text-lg hover:bg-primary-foreground/10 transition-colors">
              <MessageSquare className="w-5 h-5" /> Text Us
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default BuyPalmTrees;
