import { motion } from "framer-motion";
import { Phone, MessageSquare, Star, CheckCircle, AlertTriangle, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const areas = ["Pensacola", "Gulf Breeze", "Navarre", "Fort Walton Beach", "Destin", "30A", "Perdido Key", "Milton", "Niceville", "Crestview"];

const TreeTrimmingRemoval = () => {
  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Tree Trimming & Removal – Gulf Coast Palms",
            description: "Professional tree trimming and removal for oak trees, pine trees, crape myrtles, and more across the Florida Emerald Coast.",
            provider: {
              "@type": "LocalBusiness",
              name: "Gulf Coast Palms",
              telephone: "(850) 910-1290",
              url: "https://gulfcoastpalmcleaning.com",
            },
            areaServed: areas.map((a) => ({ "@type": "City", name: a + ", FL" })),
            serviceType: ["Tree Trimming", "Tree Removal", "Oak Tree Trimming", "Pine Tree Removal", "Crape Myrtle Trimming"],
          }),
        }}
      />

      {/* Hero */}
      <section className="bg-palm-dark section-padding text-center">
        <div className="container mx-auto">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
            Tree Services
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
            Tree Trimming & Removal
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-body text-lg text-palm-sand/70 max-w-2xl mx-auto mb-8">
            Professional trimming and safe removal for oak trees, pine trees, crape myrtles, and other common trees across Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, Destin, and the Emerald Coast.
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
              Expert Tree Care for Florida's Gulf Coast
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="font-body text-muted-foreground leading-relaxed mb-4">
              Gulf Coast Palms isn't just about palms — we provide professional tree trimming and removal for all the common tree species found across Northwest Florida. Whether you have overgrown oak branches threatening your roof, pine trees that need thinning, or crape myrtles that need seasonal pruning, our licensed and insured crew handles it safely and efficiently.
            </motion.p>
            <motion.p variants={fadeUp} custom={2} className="font-body text-muted-foreground leading-relaxed mb-4">
              We serve homeowners, property managers, and commercial properties from Pensacola to Destin and everywhere in between. Every job includes complete debris cleanup and haul-away so your property is left spotless.
            </motion.p>
            <motion.p variants={fadeUp} custom={3} className="font-body text-muted-foreground leading-relaxed">
              Proper tree trimming is about more than aesthetics — it improves safety, promotes healthy growth, reduces storm damage risk, and increases your property's curb appeal and value.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Trees We Service */}
      <section className="section-padding bg-palm-dark">
        <div className="container mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
              Species We Work With
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl md:text-5xl font-bold text-primary-foreground">
              Common Trees We Trim & Remove
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "Oak Trees", desc: "Crown thinning, deadwood removal, branch clearance from structures, and safe removal of storm-damaged oaks. Live oaks are one of the most common trees on the Emerald Coast." },
              { name: "Pine Trees", desc: "Pine tree thinning, hazard limb removal, and full pine removal including stump grinding. Overgrown pines are a leading cause of storm damage in Northwest Florida." },
              { name: "Crape Myrtles", desc: "Proper seasonal pruning that promotes healthy blooming without topping. We avoid 'crape murder' — the harmful practice of cutting crape myrtles back to stubs." },
              { name: "Magnolia Trees", desc: "Selective pruning to maintain shape and remove low-hanging branches. Magnolias are beloved across the Gulf Coast and deserve expert care." },
              { name: "Cypress Trees", desc: "Shaping, deadwood removal, and controlled trimming for bald and Leyland cypress trees common in coastal Florida landscapes." },
              { name: "Other Hardwoods", desc: "We handle a wide range of hardwood and ornamental trees. Contact us with a photo for a quick assessment and free estimate." },
            ].map((tree, i) => (
              <motion.div key={tree.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="p-6 rounded-xl border border-palm-green/20 bg-palm-dark">
                <h3 className="font-display text-xl font-bold text-primary-foreground mb-3">{tree.name}</h3>
                <p className="font-body text-palm-sand/70 text-sm leading-relaxed">{tree.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Offered */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
              Our Tree Trimming & Removal Services
            </motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              "Crown thinning & deadwood removal",
              "Hazard branch removal near structures",
              "Full tree removal with stump grinding",
              "Storm damage cleanup & emergency removal",
              "Canopy reduction & shaping",
              "Seasonal pruning for ornamental trees",
              "Lot clearing for construction or landscaping",
              "Complete debris cleanup & haul-away",
            ].map((item, i) => (
              <motion.div key={item} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="font-body text-foreground font-medium">{item}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* When to Call */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
              Signs Your Trees Need Attention
            </motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              "Dead or hanging branches over your home or driveway",
              "Branches touching power lines or structures",
              "Overgrown canopy blocking sunlight or airflow",
              "Leaning trees after storms or heavy rain",
              "Visible trunk damage, splits, or fungal growth",
              "Trees that haven't been trimmed in 2+ years",
            ].map((sign, i) => (
              <motion.div key={sign} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-palm-gold shrink-0 mt-0.5" />
                <p className="font-body text-foreground font-medium">{sign}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="section-padding bg-background">
        <div className="container mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
              Service Areas
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              Tree Trimming & Removal Across the Emerald Coast
            </motion.h2>
            <motion.div variants={fadeUp} custom={2} className="flex flex-wrap justify-center gap-3 mb-6">
              {areas.map((area) => (
                <span key={area} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-secondary text-secondary-foreground font-body font-medium text-sm">
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
            <Link to="/services/palm-tree-trimming" className="font-body text-sm text-primary hover:underline">Palm Tree Trimming</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/services/landscaping-services" className="font-body text-sm text-primary hover:underline">Landscaping Services</Link>
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
          <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">Get a Free Tree Trimming Estimate</h2>
          <p className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">Text us a photo of your trees for a fast, free estimate. We serve the entire Emerald Coast.</p>
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

export default TreeTrimmingRemoval;
