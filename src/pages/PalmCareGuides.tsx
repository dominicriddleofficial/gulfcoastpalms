import { motion } from "framer-motion";
import { Phone, ArrowRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { palmGuides } from "@/data/palmGuides";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const PalmCareGuides = () => {
  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "Palm Care Guides – Gulf Coast Palms",
        description: "Expert palm tree care guides, trimming tips, and maintenance advice for Florida homeowners.",
      })}} />

      <section className="section-padding bg-palm-dark">
        <div className="container mx-auto text-center">
          <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="font-body text-palm-gold font-semibold uppercase tracking-[0.2em] text-sm mb-4">
            Expert Knowledge
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-6">
            Palm Care{" "}
            <span className="text-gradient-primary">Guides</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-body text-lg text-palm-sand/80 max-w-2xl mx-auto">
            Professional tips, cost guides, and expert advice on palm tree trimming and maintenance from Gulf Coast Palms.
          </motion.p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-6">
            {palmGuides.map((guide, i) => (
              <motion.div
                key={guide.slug}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <Link
                  to={`/palm-trees/guides/${guide.slug}`}
                  className="block rounded-2xl border border-border bg-card p-6 md:p-8 hover:shadow-xl transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-body text-xs text-muted-foreground mb-1">{guide.publishDate}</p>
                      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                        {guide.title}
                      </h2>
                      <p className="font-body text-muted-foreground mb-3">{guide.excerpt}</p>
                      <span className="inline-flex items-center gap-2 text-primary font-body font-semibold text-sm">
                        Read Article <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary">
        <div className="container mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Need Professional Palm Care?
          </h2>
          <p className="font-body text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Contact Gulf Coast Palms for professional palm trimming or installation throughout the Emerald Coast.
          </p>
          <a href="tel:8509101290" className="inline-flex items-center justify-center gap-3 px-10 py-5 rounded-xl bg-primary-foreground text-primary font-body font-bold text-xl hover:scale-105 transition-transform shadow-xl">
            <Phone className="w-6 h-6" /> (850) 910-1290
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default PalmCareGuides;
