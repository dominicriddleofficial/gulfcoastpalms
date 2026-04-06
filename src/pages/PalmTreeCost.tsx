import { motion } from "framer-motion";
import { Phone, MessageSquare, DollarSign, TreePine, Ruler, MapPin, Scissors, Truck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const trimmingFactors = [
  { icon: TreePine, label: "Palm tree type" },
  { icon: Ruler, label: "Palm tree height" },
  { icon: Scissors, label: "Years since last trim" },
  { icon: TreePine, label: "How bushy or overgrown the palm is" },
  { icon: DollarSign, label: "Number of palms being serviced" },
  { icon: MapPin, label: "Property access and surroundings" },
  { icon: MapPin, label: "Location of the palm on the property" },
];

const PalmTreeCost = () => {
  return (
    <Layout>
      <SEOHead title="How Much Does Palm Tree Trimming Cost in Florida? | Gulf Coast Palms" description="Get a breakdown of palm tree trimming, removal, and installation costs in Florida. Factors that affect pricing and how to get a free estimate." canonicalUrl="/palm-tree-cost" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [{
          "@type": "Question",
          name: "How much does palm tree trimming cost?",
          acceptedAnswer: { "@type": "Answer", text: "Palm tree trimming cost varies based on palm type, height, condition, number of palms, and property access. Contact Gulf Coast Palms for a free quote." }
        }]
      })}} />

      {/* Hero */}
      <section className="bg-palm-dark section-padding text-center">
        <div className="container mx-auto">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
            Pricing Guide
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
            Palm Tree Cost
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-body text-lg text-palm-sand/70 max-w-2xl mx-auto">
            Honest pricing information for palm tree trimming, diamond cutting, trunk skinning, installation, and removal across the Emerald Coast.
          </motion.p>
        </div>
      </section>

      {/* Trimming Cost Factors */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Palm Tree Trimming Cost
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="font-body text-muted-foreground leading-relaxed mb-4 text-base md:text-lg">
              Every palm tree is different, and pricing reflects the unique characteristics of each job. We don't believe in one-size-fits-all pricing — instead, we evaluate your specific palms and provide an honest, transparent quote.
            </motion.p>
            <motion.p variants={fadeUp} custom={2} className="font-body text-muted-foreground leading-relaxed mb-8 text-base md:text-lg">
              The cost of palm tree trimming varies based on several key factors:
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {trimmingFactors.map((factor, i) => (
              <motion.div key={factor.label} variants={fadeUp} custom={i} className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-sm border border-border">
                <factor.icon className="w-5 h-5 text-primary shrink-0" />
                <span className="font-body text-foreground font-medium">{factor.label}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-body text-muted-foreground leading-relaxed mb-4">
            Properties with more palms often benefit from volume pricing. Whether you have 3 palms or 300, we'll provide a competitive quote that reflects the scope of the job.
          </motion.p>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="font-body text-muted-foreground leading-relaxed">
            The fastest way to get an accurate price? <strong className="text-foreground">Text us a photo of your palms</strong> — we'll respond with an estimate quickly.
          </motion.p>
        </div>
      </section>

      {/* Diamond Cutting & Trunk Skinning */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              Diamond Cutting & Trunk Skinning Cost
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="font-body text-muted-foreground leading-relaxed mb-4 text-base md:text-lg">
              <Link to="/services/palm-diamond-cutting" className="text-primary hover:underline font-semibold">Palm Diamond Cutting</Link> and <Link to="/services/palm-tree-trunk-skinning" className="text-primary hover:underline font-semibold">Palm Trunk Skinning</Link> are priced <strong className="text-foreground">per foot of trunk height</strong> being cleaned.
            </motion.p>
            <motion.p variants={fadeUp} custom={2} className="font-body text-muted-foreground leading-relaxed mb-4">
              This pricing model ensures you only pay for the work being done. A 10-foot trunk costs less than a 30-foot trunk — simple and fair.
            </motion.p>
            <motion.p variants={fadeUp} custom={3} className="font-body text-muted-foreground leading-relaxed">
              Both services are often combined with <Link to="/services/palm-tree-trimming" className="text-primary hover:underline">palm tree trimming</Link> for a complete palm makeover at a bundled rate.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Removal Cost */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              Palm Tree Removal Cost
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="font-body text-muted-foreground leading-relaxed mb-6 text-base md:text-lg">
              <Link to="/services/palm-tree-removal" className="text-primary hover:underline font-semibold">Palm tree removal</Link> pricing depends on multiple factors unique to each job:
            </motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {[
              { icon: Ruler, label: "Palm height" },
              { icon: TreePine, label: "Palm type" },
              { icon: MapPin, label: "Access to the tree" },
              { icon: MapPin, label: "Structures or obstacles around the palm" },
              { icon: DollarSign, label: "Overall scope of the job" },
            ].map((f, i) => (
              <motion.div key={f.label} variants={fadeUp} custom={i} className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-sm border border-border">
                <f.icon className="w-5 h-5 text-primary shrink-0" />
                <span className="font-body text-foreground font-medium">{f.label}</span>
              </motion.div>
            ))}
          </motion.div>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-body text-muted-foreground leading-relaxed">
            Removals near power lines, buildings, or in tight spaces require extra care and specialized equipment. Every removal includes complete debris cleanup and haul-away.
          </motion.p>
        </div>
      </section>

      {/* Installation Cost */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              Palm Tree Installation Cost
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="font-body text-muted-foreground leading-relaxed mb-6 text-base md:text-lg">
              <Link to="/services/palm-tree-installation" className="text-primary hover:underline font-semibold">Palm tree installation</Link> pricing depends on:
            </motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {[
              { icon: TreePine, label: "Type of palm selected" },
              { icon: Ruler, label: "Palm height" },
              { icon: Truck, label: "Delivery distance" },
              { icon: MapPin, label: "Installation access" },
            ].map((f, i) => (
              <motion.div key={f.label} variants={fadeUp} custom={i} className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-sm border border-border">
                <f.icon className="w-5 h-5 text-primary shrink-0" />
                <span className="font-body text-foreground font-medium">{f.label}</span>
              </motion.div>
            ))}
          </motion.div>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-body text-muted-foreground leading-relaxed mb-4">
            Every installation includes professional planting, root ball securing, initial watering, and soil conditioning. Browse our available palms on the <Link to="/palm-trees/buy" className="text-primary hover:underline font-semibold">Buy Palm Trees</Link> page.
          </motion.p>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="font-body text-muted-foreground leading-relaxed">
            All installations include a <strong className="text-foreground">1-year establishment warranty</strong>.
          </motion.p>
        </div>
      </section>

      {/* Related Links */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <h3 className="font-display text-2xl font-bold text-foreground mb-6 text-center">
            Explore Our Services
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { label: "Palm Tree Trimming", to: "/services/palm-tree-trimming" },
              { label: "Palm Tree Installation", to: "/services/palm-tree-installation" },
              { label: "Palm Diamond Cutting", to: "/services/palm-diamond-cutting" },
              { label: "Buy Palm Trees", to: "/palm-trees/buy" },
              { label: "Palm Tree Types", to: "/palm-trees/types" },
            ].map((link) => (
              <Link key={link.to} to={link.to} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-card border border-border font-body font-medium text-foreground hover:border-primary hover:text-primary transition-colors shadow-sm">
                {link.label} <ArrowRight className="w-4 h-4" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary text-center">
        <div className="container mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            Get an Instant Quote
          </h2>
          <p className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            The fastest way to get a price? Text us a photo of your palm trees and we'll respond with an estimate.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="sms:8509101290"
              className="inline-flex items-center justify-center gap-3 px-10 py-5 rounded-xl bg-primary-foreground text-primary font-body font-bold text-xl hover:scale-105 transition-transform shadow-xl"
            >
              <MessageSquare className="w-6 h-6" />
              Text Us a Photo for Instant Quote
            </a>
            <a
              href="tel:8509101290"
              className="inline-flex items-center justify-center gap-3 px-8 py-5 rounded-xl border-2 border-primary-foreground text-primary-foreground font-body font-bold text-lg hover:bg-primary-foreground/10 transition-colors"
            >
              <Phone className="w-5 h-5" />
              (850) 910-1290
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default PalmTreeCost;
