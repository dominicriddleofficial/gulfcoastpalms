import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, MessageSquare, ArrowLeft, TreePine, Ruler, Sun, Snowflake, Wrench, Scissors, Shovel } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { palmTypes } from "@/data/palmTypes";
import NotFound from "./NotFound";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const PalmTypePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const palm = palmTypes.find((p) => p.slug === slug);

  if (!palm) return <NotFound />;

  const otherPalms = palmTypes.filter((p) => p.slug !== slug);

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `${palm.name} – Care Guide & Information`,
        description: palm.heroDescription,
      })}} />

      {/* Hero */}
      <section className="section-padding bg-palm-dark">
        <div className="container mx-auto">
          <Link to="/palm-trees/types" className="inline-flex items-center gap-2 font-body text-palm-sand/70 hover:text-palm-light transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> All Palm Types
          </Link>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-body text-palm-gold font-semibold uppercase tracking-[0.2em] text-sm mb-3">
            {palm.scientificName}
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
            {palm.name}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-body text-lg text-palm-sand/80 max-w-3xl">
            {palm.heroDescription}
          </motion.p>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="bg-background border-b border-border">
        <div className="container mx-auto py-8 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Ruler, label: "Mature Height", value: palm.height.split(" with")[0] },
              { icon: Sun, label: "Growth Rate", value: palm.growthRate.split(" —")[0] },
              { icon: Snowflake, label: "Cold Hardiness", value: palm.coldHardiness.split(" (")[0] },
              { icon: TreePine, label: "Price Range", value: palm.priceRange.split(" (")[0] },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="text-center">
                <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="font-display text-sm font-bold text-foreground">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold text-foreground mb-6">
              About the {palm.name}
            </motion.h2>
            {palm.description.map((para, i) => (
              <motion.p key={i} variants={fadeUp} custom={i + 1} className="font-body text-muted-foreground leading-relaxed mb-4">
                {para}
              </motion.p>
            ))}
          </motion.div>

          {/* Where it grows */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-12">
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
              <Sun className="w-6 h-6 text-palm-gold" /> Where It Grows Best
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="font-body text-muted-foreground leading-relaxed">
              {palm.bestRegions}
            </motion.p>
          </motion.div>

          {/* Maintenance */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-12">
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
              <Wrench className="w-6 h-6 text-primary" /> Maintenance Requirements
            </motion.h2>
            <ul className="space-y-3">
              {palm.maintenance.map((item, i) => (
                <motion.li key={i} variants={fadeUp} custom={i + 1} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex items-start gap-3 font-body text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Trimming */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-12">
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
              <Scissors className="w-6 h-6 text-primary" /> Trimming Recommendations
            </motion.h2>
            <ul className="space-y-3">
              {palm.trimmingRecommendations.map((item, i) => (
                <motion.li key={i} variants={fadeUp} custom={i + 1} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex items-start gap-3 font-body text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-palm-gold shrink-0 mt-2" />
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Installation */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-12">
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
              <Shovel className="w-6 h-6 text-primary" /> Installation Overview
            </motion.h2>
            <ul className="space-y-3">
              {palm.installationOverview.map((item, i) => (
                <motion.li key={i} variants={fadeUp} custom={i + 1} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex items-start gap-3 font-body text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Internal Links */}
          <div className="mt-12 p-6 rounded-2xl bg-secondary border border-border">
            <h3 className="font-display text-lg font-bold text-foreground mb-4">Related Services</h3>
            <div className="flex flex-wrap gap-3">
              <Link to="/services/palm-tree-installation" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-card border border-border font-body text-sm text-foreground hover:text-primary hover:border-primary transition-colors">
                Palm Tree Installation →
              </Link>
              <Link to="/services/palm-tree-trimming" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-card border border-border font-body text-sm text-foreground hover:text-primary hover:border-primary transition-colors">
                Palm Tree Trimming →
              </Link>
              <Link to="/palm-trees/buy" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-card border border-border font-body text-sm text-foreground hover:text-primary hover:border-primary transition-colors">
                Buy Palm Trees →
              </Link>
              <Link to="/palm-tree-cost" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-card border border-border font-body text-sm text-foreground hover:text-primary hover:border-primary transition-colors">
                Palm Tree Cost →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Other Palms */}
      <section className="section-padding bg-secondary/50">
        <div className="container mx-auto">
          <h2 className="font-display text-2xl font-bold text-foreground mb-6 text-center">Explore Other Palm Types</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {otherPalms.map((p) => (
              <Link key={p.slug} to={`/palm-trees/${p.slug}`} className="block p-4 rounded-xl border border-border bg-card hover:shadow-lg transition-all text-center group overflow-hidden">
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-secondary mb-2">
                  <img src={p.image} alt={p.imageAlt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
                <p className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">{p.name}</p>
                <p className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">{p.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary">
        <div className="container mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Ready for Professional {palm.name} Care?
          </h2>
          <p className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Call or text Gulf Coast Palms for installation, trimming, or maintenance.
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

export default PalmTypePage;
