import { motion } from "framer-motion";
import { Phone, Check, ArrowRight, Shield, Package } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import type { ServiceData } from "@/data/services";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

interface ServicePageProps {
  service: ServiceData;
}

const ServicePage = ({ service }: ServicePageProps) => {
  return (
    <Layout>
      <SEOHead
        title={service.metaTitle}
        description={service.metaDescription}
        canonicalUrl={`/services/${service.slug}`}
      />
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: service.title,
            description: service.metaDescription,
            provider: {
              "@type": "LocalBusiness",
              name: "Gulf Coast Palms",
              telephone: "+18509101290",
              areaServed: "Emerald Coast, Florida",
            },
          }),
        }}
      />

      {/* Hero */}
      <section className="bg-palm-dark section-padding text-center">
        <div className="container mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3"
          >
            Our Services
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4"
          >
            {service.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-body text-lg text-palm-sand/70 max-w-2xl mx-auto"
          >
            {service.heroSubheading}
          </motion.p>
        </div>
      </section>

      {/* Intro */}
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {service.introParagraphs.map((p, i) => (
              <motion.p
                key={i}
                variants={fadeUp}
                custom={i}
                className="font-body text-muted-foreground leading-relaxed mb-6 text-base md:text-lg"
              >
                {p}
              </motion.p>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto max-w-4xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 text-center"
          >
            What's Included
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {service.benefits.map((b, i) => (
              <motion.div
                key={b}
                variants={fadeUp}
                custom={i}
                className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-sm"
              >
                <Check className="w-5 h-5 text-primary shrink-0" />
                <span className="font-body text-foreground">{b}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Installation Process (if applicable) */}
      {service.procesSteps && (
        <section className="section-padding bg-background">
          <div className="container mx-auto max-w-4xl">
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
              className="font-display text-3xl md:text-4xl font-bold text-foreground mb-10 text-center"
            >
              Our Installation Process
            </motion.h2>
            <div className="space-y-6">
              {service.procesSteps.map((step, i) => (
                <motion.div
                  key={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                  className="flex gap-5 items-start"
                >
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-lg shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-foreground mb-1">{step.step}</h3>
                    <p className="font-body text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Maintenance Bundle (if applicable) */}
      {service.bundleSection && (
        <section className="section-padding bg-secondary">
          <div className="container mx-auto max-w-4xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="bg-card rounded-2xl p-8 md:p-12 shadow-lg border border-border"
            >
              <div className="flex items-center gap-3 mb-6">
                <Package className="w-8 h-8 text-primary" />
                <motion.h2 variants={fadeUp} custom={0} className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  {service.bundleSection.heading}
                </motion.h2>
              </div>
              {service.bundleSection.content.map((p, i) => (
                <motion.p key={i} variants={fadeUp} custom={i + 1} className="font-body text-muted-foreground leading-relaxed mb-4 last:mb-0">
                  {p}
                </motion.p>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Warranty (if applicable) */}
      {service.warrantySection && (
        <section className="section-padding bg-background">
          <div className="container mx-auto max-w-4xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="bg-card rounded-2xl p-8 md:p-12 shadow-lg border-2 border-primary/20"
            >
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-8 h-8 text-primary" />
                <motion.h2 variants={fadeUp} custom={0} className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  {service.warrantySection.heading}
                </motion.h2>
              </div>
              {service.warrantySection.content.map((p, i) => (
                <motion.p key={i} variants={fadeUp} custom={i + 1} className="font-body text-muted-foreground leading-relaxed mb-4 last:mb-0">
                  {p}
                </motion.p>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Secondary Content */}
      <section className={`section-padding ${service.procesSteps ? "bg-secondary" : "bg-background"}`}>
        <div className="container mx-auto max-w-4xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6"
          >
            {service.secondaryHeading}
          </motion.h2>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {service.secondaryContent.map((p, i) => (
              <motion.p key={i} variants={fadeUp} custom={i + 1} className="font-body text-muted-foreground leading-relaxed mb-6">
                {p}
              </motion.p>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Related Links */}
      {service.relatedLinks.length > 0 && (
        <section className="section-padding bg-secondary">
          <div className="container mx-auto max-w-4xl">
            <h3 className="font-display text-2xl font-bold text-foreground mb-6 text-center">
              Related Services
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              {service.relatedLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-card border border-border font-body font-medium text-foreground hover:border-primary hover:text-primary transition-colors shadow-sm"
                >
                  {link.label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section-padding bg-primary text-center">
        <div className="container mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            {service.ctaHeading}
          </h2>
          <p className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            {service.ctaText}
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

export default ServicePage;
