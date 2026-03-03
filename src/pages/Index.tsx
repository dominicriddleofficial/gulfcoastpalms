import { motion } from "framer-motion";
import { Phone, Star, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import heroImage from "@/assets/hero-palms.jpg";
import ServicesPreview from "@/components/home/ServicesPreview";
import Testimonials from "@/components/home/Testimonials";
import FAQ from "@/components/home/FAQ";

const areas = ["Pensacola", "Gulf Breeze", "Navarre", "Fort Walton Beach", "Destin"];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const Index = () => {
  return (
    <Layout>
      {/* JSON-LD for Local Business SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "Gulf Coast Palms",
            description: "Professional palm tree trimming, diamond cutting, trunk skinning, installations and removals serving Navarre, Fort Walton Beach, Destin, Pensacola, Gulf Breeze, Milton, Niceville, Crestview, 30A, and Perdido Key, Florida.",
            telephone: "(850) 910-1290",
            url: "https://gulfcoastpalmcleaning.com",
            areaServed: areas.map((a) => ({ "@type": "City", name: a + ", FL" })),
            serviceType: ["Palm Trimming", "Diamond Cutting", "Trunk Skinning", "Palm Tree Installation", "Palm Tree Removal"],
          }),
        }}
      />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Beautiful manicured palm trees along Florida Gulf Coast waterfront property"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-palm-dark/70 via-palm-dark/50 to-palm-dark/80" />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-body text-palm-gold font-semibold uppercase tracking-[0.2em] text-sm mb-4"
          >
            Palm Tree Trimming & Professional Palm Services from Pensacola to Destin
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-primary-foreground leading-tight mb-6"
          >
            Resort-Quality Palm Care{" "}
            <span className="text-gradient-primary">for Florida's Emerald Coast</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-body text-lg md:text-xl text-palm-sand/80 max-w-2xl mx-auto mb-10"
          >
            Everyone's trusted specialists in palm tree trimming, diamond cutting, and professional palm care — serving Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, Destin, and surrounding coastal communities.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a
              href="tel:8509101290"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-body font-bold text-lg hover:bg-palm-light transition-all shadow-lg shadow-primary/30 whitespace-nowrap"
            >
              <Phone className="w-5 h-5 shrink-0" />
              <span className="flex flex-col sm:flex-row sm:gap-2 items-center leading-tight">
                <span>Call for a Free Quote</span>
                <span>(850) 910-1290</span>
              </span>
            </a>
            <Link
              to="/services"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl border-2 border-primary-foreground/30 text-primary-foreground font-body font-semibold text-lg hover:bg-primary-foreground/10 transition-all"
            >
              View Our Services
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding bg-palm-dark">
        <div className="container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
              Why Choose Us
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-4xl md:text-5xl font-bold text-primary-foreground">
              Why Homeowners & Property Managers Choose Gulf Coast Palms
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              "500+ Palm Jobs Completed in 2025 Alone",
              "5-Star Rated Across the Emerald Coast",
              "Licensed & Insured Professionals",
              "Specialists in Diamond Cutting & Coastal Palm Care",
              "Experienced with Large Properties Featuring 100+ Palm Trees",
              "Trusted by HOAs, Property Managers & Waterfront Estates",
            ].map((point, i) => (
              <motion.div
                key={point}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="flex items-start gap-3 p-5 rounded-xl border border-palm-green/20 bg-palm-dark"
              >
                <Star className="w-5 h-5 text-palm-gold shrink-0 mt-0.5" />
                <p className="font-body text-primary-foreground font-medium">{point}</p>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="font-body text-palm-sand/80 max-w-3xl mx-auto text-center leading-relaxed"
          >
            We don't just trim palms — we specialize in them. Our team maintains large-scale properties with 100+ palms and understands proper cutting techniques that protect long-term palm health. We frequently correct damage caused by improper trimming from other companies, ensuring cleaner cuts, stronger crowns, and healthier trees built to withstand Florida storms.
          </motion.p>
        </div>
      </section>

      <ServicesPreview />


      {/* Service Areas SEO Section */}
      <section className="section-padding bg-background">
        <div className="container mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
              Service Areas
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Service Areas
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="font-body text-muted-foreground max-w-2xl mx-auto mb-8">
              We proudly provide palm tree trimming and professional palm services throughout:
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-wrap justify-center gap-3 mb-6">
              {areas.map((area) => (
                <span key={area} className="px-6 py-3 rounded-full bg-secondary text-secondary-foreground font-body font-medium">
                  {area}, FL
                </span>
              ))}
            </motion.div>
            <motion.p variants={fadeUp} custom={4} className="font-body text-muted-foreground">
              And surrounding Emerald Coast communities.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <Testimonials />

      <FAQ />

      {/* CTA Section */}
      <section className="section-padding bg-primary">
        <div className="container mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              Get a Free Quote Today
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Call or text us for a free estimate on any palm tree service. Fast response guaranteed.
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

export default Index;
