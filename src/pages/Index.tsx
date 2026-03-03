import { motion } from "framer-motion";
import { Phone, Star, Shield, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import heroImage from "@/assets/hero-palms.jpg";
import ServicesPreview from "@/components/home/ServicesPreview";
import Testimonials from "@/components/home/Testimonials";
import FAQ from "@/components/home/FAQ";

const stats = [
  { number: "500+", label: "Jobs Completed — Summer 2025 Alone" },
  { number: "5★", label: "Average Rating" },
  { number: "100%", label: "Satisfaction Guarantee" },
];

const areas = ["Navarre", "Fort Walton Beach", "Destin", "Pensacola", "Gulf Breeze", "Milton", "Niceville", "Crestview", "30A", "Perdido Key"];

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
            Palm Tree Trimming & Professional Services in Navarre, Destin, Gulf Breeze & Neighboring Areas
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-primary-foreground leading-tight mb-6"
          >
            Your Palms,{" "}
            <span className="text-gradient-primary">Perfected</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-body text-lg md:text-xl text-palm-sand/80 max-w-2xl mx-auto mb-10"
          >
            Your go-to experts for palm trimming, diamond cutting, trunk skinning, and installations.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a
              href="tel:8509101290"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-body font-bold text-lg hover:bg-palm-light transition-all shadow-lg shadow-primary/30"
            >
              <Phone className="w-5 h-5" />
              (850) 910-1290
            </a>
            <Link
              to="/services"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl border-2 border-primary-foreground/30 text-primary-foreground font-body font-semibold text-lg hover:bg-primary-foreground/10 transition-all"
            >
              View Services
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-primary">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-3xl md:text-4xl font-bold text-primary-foreground">
                  {stat.number}
                </p>
                <p className="font-body text-sm text-primary-foreground/70 mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ServicesPreview />

      {/* Why Choose Us */}
      <section className="section-padding bg-palm-dark">
        <div className="container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
              Why Gulf Coast Palms
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-4xl md:text-5xl font-bold text-primary-foreground">
              Trusted by Homeowners Across the Gulf Coast
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Star, title: "5-Star Quality", desc: "Hundreds of satisfied customers across the Florida panhandle." },
              { icon: Shield, title: "Fully Insured", desc: "Licensed and insured for your peace of mind on every job." },
              { icon: Clock, title: "Fast & Reliable", desc: "Quick turnaround with flexible scheduling to fit your needs." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="text-center p-8 rounded-2xl border border-palm-green/20 bg-palm-dark"
              >
                <item.icon className="w-12 h-12 mx-auto text-palm-gold mb-4" />
                <h3 className="font-display text-xl font-bold text-primary-foreground mb-3">{item.title}</h3>
                <p className="font-body text-palm-sand/70">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas SEO Section */}
      <section className="section-padding bg-background">
        <div className="container mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.p variants={fadeUp} custom={0} className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
              Service Areas
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-4xl md:text-5xl font-bold text-foreground mb-8">
              Serving Florida's Emerald Coast
            </motion.h2>
            <motion.div variants={fadeUp} custom={2} className="flex flex-wrap justify-center gap-3">
              {areas.map((area) => (
                <span key={area} className="px-6 py-3 rounded-full bg-secondary text-secondary-foreground font-body font-medium">
                  {area}, FL
                </span>
              ))}
            </motion.div>
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
