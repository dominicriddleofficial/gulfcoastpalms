import { motion } from "framer-motion";
import { Phone, MessageSquare, Check, AlertTriangle, Wind, MapPin, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const hazards = [
  "Flying debris from loose or dead fronds",
  "Broken fronds damaging roofs, vehicles, and structures",
  "Falling seed pods becoming projectiles",
  "Safety hazards for residents, guests, and pedestrians",
];

const properTrimming = [
  { title: "Remove Dead or Weak Fronds", desc: "Eliminating brown, dying, or loosely attached fronds prevents them from becoming airborne in high winds." },
  { title: "Reduce Wind Resistance", desc: "Strategic trimming allows wind to pass through the crown rather than catching it like a sail." },
  { title: "Avoid Over-Trimming", desc: "Removing too many live fronds weakens the palm and makes it more vulnerable — not less. We never \"hurricane cut\" palms." },
  { title: "Maintain Structural Health", desc: "Proper trimming preserves the palm's natural strength and energy reserves heading into storm season." },
];

const warningSignsList = [
  "Large dead fronds hanging from the crown",
  "Heavy, overgrown crowns catching wind",
  "Palms growing close to structures, power lines, or pools",
  "Palms that haven't been trimmed in over a year",
  "Loose seed pods or flower stalks still attached",
];

const serviceAreas = [
  "Pensacola",
  "Gulf Breeze",
  "Navarre",
  "Fort Walton Beach",
  "Destin",
  "30A",
  "Perdido Key",
];

const HurricanePalmPreparation = () => {
  return (
    <Layout>
      <SEOHead title="Hurricane Palm Tree Preparation Navarre & NW Florida | Gulf Coast Palms" description="Prepare your palms for hurricane season. Professional pre-storm trimming, hazard assessment, and emergency response across NW Florida." canonicalUrl="/hurricane-palm-preparation" />
      {/* JSON-LD: Service */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Hurricane Palm Preparation & Storm Trimming",
            description: "Protect your property with proper palm tree trimming and hurricane preparation across the Emerald Coast, Florida.",
            provider: {
              "@type": "LocalBusiness",
              name: "Gulf Coast Palms",
              telephone: "+18509101290",
              areaServed: [
                "Pensacola, FL", "Gulf Breeze, FL", "Navarre, FL",
                "Fort Walton Beach, FL", "Destin, FL", "30A, FL", "Perdido Key, FL",
              ],
            },
          }),
        }}
      />

      {/* JSON-LD: HowTo */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "How to Prepare Your Palm Trees for Hurricane Season in NW Florida",
            description: "Step-by-step guide to protecting your palm trees before a hurricane hits the NW Florida coast.",
            totalTime: "PT2H",
            step: [
              {
                "@type": "HowToStep",
                name: "Schedule a Pre-Hurricane Trimming",
                text: "Have your palms professionally trimmed 4-6 weeks before hurricane season. Removing dead fronds and excess growth reduces wind resistance and the risk of fronds becoming projectiles.",
                position: 1,
              },
              {
                "@type": "HowToStep",
                name: "Inspect for Disease or Weakness",
                text: "Have a professional assess each palm for signs of Ganoderma rot, Fusarium wilt, or structural weakness. A compromised palm is far more likely to fail in high winds.",
                position: 2,
              },
              {
                "@type": "HowToStep",
                name: "Secure Young or Newly Planted Palms",
                text: "Palms planted within the last 2-3 years have shallower root systems. Stake them before storm season to prevent uprooting.",
                position: 3,
              },
              {
                "@type": "HowToStep",
                name: "Document Your Palms Before Storm Season",
                text: "Photograph your palms before hurricane season starts. If a storm damages them, this documentation supports your homeowner insurance claim.",
                position: 4,
              },
              {
                "@type": "HowToStep",
                name: "Know Your Emergency Service Options",
                text: "Have a trusted palm service's contact saved before a storm. Emergency trimming and storm damage assessment are in high demand after a hurricane — book early.",
                position: 5,
              },
            ],
          }),
        }}
      />

      {/* Hero */}
      <section className="bg-palm-dark section-padding text-center">
        <div className="container mx-auto">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
            Storm Season Services
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
            Hurricane Preparation for Palm Trees
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-body text-lg text-palm-sand/70 max-w-3xl mx-auto mb-8">
            Protect your property and reduce storm damage with proper palm trimming and preparation across the Emerald Coast.
          </motion.p>
          <motion.a
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            href="tel:8509101290"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-primary text-primary-foreground font-body font-bold text-xl hover:scale-105 transition-transform shadow-xl"
          >
            <Phone className="w-6 h-6" /> Schedule Storm Preparation Service
          </motion.a>
        </div>
      </section>

      {/* Why It Matters */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
            Why Palm Preparation Matters Before Hurricanes
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="font-body text-muted-foreground text-center max-w-2xl mx-auto mb-8">
            Florida's Emerald Coast faces powerful coastal storms and high winds every hurricane season. Untrimmed or poorly trimmed palms create serious risks, including:
          </motion.p>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hazards.map((item, i) => (
              <motion.div key={item} variants={fadeUp} custom={i} className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-sm border border-border">
                <AlertTriangle className="w-5 h-5 text-accent shrink-0" />
                <span className="font-body text-foreground">{item}</span>
              </motion.div>
            ))}
          </motion.div>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={5} className="font-body text-muted-foreground leading-relaxed mt-8 text-center max-w-2xl mx-auto">
            Proactive storm preparation trimming is one of the most effective steps property owners can take to reduce wind damage, protect structures, and keep residents safe during hurricane season.
          </motion.p>
        </div>
      </section>

      {/* Proper Hurricane Trimming */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto max-w-4xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
            Proper Hurricane Palm Trimming
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="font-body text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            There's a right way and a wrong way to prepare palms for storms. Improper trimming — especially aggressive "hurricane cuts" — can actually weaken palms and increase storm damage risk.
          </motion.p>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-4">
            {properTrimming.map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} custom={i} className="bg-card rounded-xl p-6 shadow-sm border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Wind className="w-5 h-5 text-primary shrink-0" />
                  <h3 className="font-display text-lg font-bold text-foreground">{item.title}</h3>
                </div>
                <p className="font-body text-muted-foreground text-sm leading-relaxed pl-8">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Warning Signs */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
            Signs Your Palms Need Storm Preparation
          </motion.h2>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-card rounded-2xl p-8 shadow-lg border-2 border-accent/30">
            <div className="space-y-4">
              {warningSignsList.map((sign, i) => (
                <motion.div key={sign} variants={fadeUp} custom={i} className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-accent shrink-0" />
                  <span className="font-body text-foreground">{sign}</span>
                </motion.div>
              ))}
            </div>
            <motion.p variants={fadeUp} custom={6} className="font-body text-muted-foreground leading-relaxed mt-6">
              If any of these signs apply to your palms, contact Gulf Coast Palms before storm season. Early preparation is always safer and more affordable than emergency cleanup after a hurricane.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto max-w-4xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
            Hurricane Prep Service Areas
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="font-body text-muted-foreground text-center max-w-2xl mx-auto mb-8">
            We provide hurricane palm preparation services across the entire Emerald Coast of Florida.
          </motion.p>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {serviceAreas.map((area, i) => (
              <motion.div key={area} variants={fadeUp} custom={i} className="flex items-center gap-2 bg-card rounded-xl p-4 shadow-sm border border-border">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="font-body font-medium text-foreground text-sm">{area}, FL</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Related Links */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <h3 className="font-display text-2xl font-bold text-foreground mb-6 text-center">Related Services</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { label: "Palm Tree Trimming", to: "/services/palm-tree-trimming" },
              { label: "Palm Tree Cost", to: "/palm-tree-cost" },
              { label: "HOA & Commercial Maintenance", to: "/hoa-commercial-palm-maintenance" },
              { label: "Service Areas", to: "/service-areas" },
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
            Prepare Your Palms Before Storm Season
          </h2>
          <p className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Don't wait for a hurricane warning. Schedule your palm trimming now and protect your property, your family, and your investment.
          </p>
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

export default HurricanePalmPreparation;
