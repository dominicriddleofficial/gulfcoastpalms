import { motion } from "framer-motion";
import { Phone, MessageSquare, Check, Building2, TreePalm, ShieldCheck, Calendar, ArrowRight } from "lucide-react";
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

const whyChooseUs = [
  "Experienced maintaining properties with 50–100+ palm trees",
  "Specialists in proper diamond cutting and coastal palm care",
  "Reliable scheduling for HOAs and property managers",
  "Licensed and insured professionals",
  "Clean job sites and professional debris removal",
];

const maintenancePrograms = [
  { title: "Scheduled Palm Trimming", desc: "Regular trimming on a schedule that fits your property's needs and budget." },
  { title: "Storm Preparation Trimming", desc: "Pre-hurricane season trimming to reduce wind resistance and flying debris risk." },
  { title: "Dead Frond Removal", desc: "Ongoing removal of brown and dying fronds to maintain a clean, professional look." },
  { title: "Safety Inspections", desc: "Routine inspections to identify diseased, damaged, or structurally compromised palms." },
  { title: "Aesthetic Maintenance", desc: "Diamond cutting, trunk skinning, and crown shaping for resort-quality presentation." },
];

const propertyTypes = [
  "HOA communities",
  "Condominium complexes",
  "Resorts & hotels",
  "Apartment communities",
  "Waterfront estates",
  "Commercial shopping centers",
];

const maintenanceBenefits = [
  "Maintain and increase property value",
  "Reduce storm damage risk during hurricane season",
  "Keep properties looking resort-quality year round",
];

const HoaCommercialMaintenance = () => {
  return (
    <Layout>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "HOA & Commercial Palm Tree Maintenance",
            description: "Professional palm tree maintenance programs for HOAs, resorts, and commercial properties across the Florida Emerald Coast.",
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

      {/* Hero */}
      <section className="bg-palm-dark section-padding text-center">
        <div className="container mx-auto">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
            Commercial Services
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
            Palm Tree Maintenance for HOAs, Resorts & Commercial Properties
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-body text-lg text-palm-sand/70 max-w-3xl mx-auto mb-8">
            Professional palm trimming and maintenance programs for large properties across Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, Destin, 30A, and Perdido Key.
          </motion.p>
          <motion.a
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            href="tel:8509101290"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-primary text-primary-foreground font-body font-bold text-xl hover:scale-105 transition-transform shadow-xl"
          >
            <Phone className="w-6 h-6" /> Schedule Property Assessment
          </motion.a>
        </div>
      </section>

      {/* Why Property Managers Choose Us */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
            Why Property Managers Choose Gulf Coast Palms
          </motion.h2>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {whyChooseUs.map((item, i) => (
              <motion.div key={item} variants={fadeUp} custom={i} className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-sm border border-border">
                <Check className="w-5 h-5 text-primary shrink-0" />
                <span className="font-body text-foreground">{item}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Maintenance Programs */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto max-w-4xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
            Recurring Maintenance Programs
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="font-body text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            Our maintenance programs are designed to keep your palms healthy, safe, and looking their best — all year round.
          </motion.p>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-4">
            {maintenancePrograms.map((prog, i) => (
              <motion.div key={prog.title} variants={fadeUp} custom={i} className="bg-card rounded-xl p-6 shadow-sm border border-border">
                <h3 className="font-display text-lg font-bold text-foreground mb-1">{prog.title}</h3>
                <p className="font-body text-muted-foreground text-sm leading-relaxed">{prog.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10 bg-card rounded-2xl p-8 shadow-lg border-2 border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-7 h-7 text-primary" />
              <h3 className="font-display text-xl font-bold text-foreground">How Maintenance Programs Help Your Property</h3>
            </div>
            <div className="space-y-3">
              {maintenanceBenefits.map((b, i) => (
                <motion.div key={b} variants={fadeUp} custom={i} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  <span className="font-body text-foreground">{b}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Properties We Work With */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
            Properties We Work With
          </motion.h2>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {propertyTypes.map((type, i) => (
              <motion.div key={type} variants={fadeUp} custom={i} className="flex items-center gap-3 bg-card rounded-xl p-5 shadow-sm border border-border">
                <Building2 className="w-5 h-5 text-primary shrink-0" />
                <span className="font-body font-medium text-foreground">{type}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Large Property Experience */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-card rounded-2xl p-8 md:p-12 shadow-lg border border-border">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="w-8 h-8 text-primary" />
              <motion.h2 variants={fadeUp} custom={0} className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Large Property Experience
              </motion.h2>
            </div>
            <motion.p variants={fadeUp} custom={1} className="font-body text-muted-foreground leading-relaxed mb-4">
              Gulf Coast Palms frequently maintains properties with dozens or even hundreds of palm trees. We understand the logistics of large-scale trimming operations — from efficient crew scheduling to minimize disruption, to coordinating access across multi-building communities.
            </motion.p>
            <motion.p variants={fadeUp} custom={2} className="font-body text-muted-foreground leading-relaxed mb-4">
              Whether your property has 50 Sabal palms or 200+ palms of mixed species, we deliver consistent quality across every tree. Our team understands that HOA boards and property managers need reliability, professionalism, and documented results — and that's exactly what we provide.
            </motion.p>
            <motion.p variants={fadeUp} custom={3} className="font-body text-muted-foreground leading-relaxed">
              We serve commercial and HOA properties throughout the Emerald Coast, including Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, Destin, 30A, and Perdido Key.
            </motion.p>
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
              { label: "Palm Diamond Cutting", to: "/services/palm-diamond-cutting" },
              { label: "Palm Tree Cost", to: "/palm-tree-cost" },
              { label: "Hurricane Palm Preparation", to: "/hurricane-palm-preparation" },
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
            Request a Property Maintenance Consultation
          </h2>
          <p className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Contact us to schedule an on-site property assessment. We'll evaluate your palms and build a custom maintenance program for your property.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8509101290" className="inline-flex items-center justify-center gap-3 px-10 py-5 rounded-xl bg-primary-foreground text-primary font-body font-bold text-xl hover:scale-105 transition-transform shadow-xl">
              <Phone className="w-6 h-6" /> (850) 910-1290
            </a>
            <a href="sms:8509101290" className="inline-flex items-center justify-center gap-3 px-8 py-5 rounded-xl border-2 border-primary-foreground text-primary-foreground font-body font-bold text-lg hover:bg-primary-foreground/10 transition-colors">
              <MessageSquare className="w-5 h-5" /> Text Us for a Quote
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HoaCommercialMaintenance;
