import { motion } from "framer-motion";
import { Phone, MapPin, TreePalm, Heart, Users } from "lucide-react";
import Layout from "@/components/Layout";
import heroImage from "@/assets/hero-palms.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const areas = ["Navarre", "Fort Walton Beach", "Destin", "Pensacola", "Gulf Breeze", "Milton", "Niceville", "Crestview", "30A", "Perdido Key"];

const About = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Gulf Coast palm trees" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-palm-dark/80" />
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3"
          >
            About Us
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4"
          >
            Gulf Coast Palms
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-body text-lg text-palm-sand/80 max-w-2xl mx-auto"
          >
            Your trusted local experts for all palm tree services along Florida's Emerald Coast.
          </motion.p>
        </div>
      </section>

      {/* Story */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-3xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">
              Our Story
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="font-body text-muted-foreground leading-relaxed mb-6">
              Gulf Coast Palms was founded with a simple mission: to provide the highest quality palm tree care on Florida's Gulf Coast. With over 500 palm jobs completed in the summer of 2025 alone, we've earned the trust of homeowners, property managers, and businesses across the panhandle.
            </motion.p>
            <motion.p variants={fadeUp} custom={2} className="font-body text-muted-foreground leading-relaxed mb-6">
              Our team brings years of hands-on experience in palm trimming, diamond cutting, trunk skinning, and professional palm installations and removals. We treat every property like it's our own — with care, precision, and respect.
            </motion.p>
            <motion.p variants={fadeUp} custom={3} className="font-body text-muted-foreground leading-relaxed">
              From residential homes to large commercial properties, we deliver consistent 5-star quality that keeps our customers coming back season after season. We're fully insured and committed to your complete satisfaction.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-palm-dark">
        <div className="container mx-auto">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-12 text-center"
          >
            What Sets Us Apart
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: TreePalm, title: "Expert Knowledge", desc: "Deep understanding of palm species native to the Florida panhandle and the best care techniques for our coastal climate." },
              { icon: Heart, title: "Passion for Palms", desc: "We genuinely love what we do. Every cut, every trim, and every install is done with pride and craftsmanship." },
              { icon: Users, title: "Community Focused", desc: "Proud to serve our neighbors across Northwest Florida — from Navarre to Perdido Key and everywhere in between." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="text-center p-8 rounded-2xl border border-palm-green/20"
              >
                <item.icon className="w-12 h-12 mx-auto text-palm-gold mb-4" />
                <h3 className="font-display text-xl font-bold text-primary-foreground mb-3">{item.title}</h3>
                <p className="font-body text-palm-sand/70">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="section-padding bg-background">
        <div className="container mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              Service Areas
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="font-body text-muted-foreground mb-8 max-w-xl mx-auto">
              Proudly serving communities across Northwest Florida's beautiful Gulf Coast.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="flex flex-wrap justify-center gap-3 mb-12">
              {areas.map((area) => (
                <span key={area} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-secondary text-secondary-foreground font-body font-medium">
                  <MapPin className="w-4 h-4 text-primary" />
                  {area}, FL
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary text-center">
        <div className="container mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            Let's Talk About Your Palms
          </h2>
          <p className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Call or text us for a free quote. We'd love to help you make your property stand out.
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

export default About;
