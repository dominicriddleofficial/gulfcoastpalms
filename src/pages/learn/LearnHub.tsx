import { motion } from "framer-motion";
import { BookOpen, ArrowRight, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import { GCP_BUSINESS } from "@/lib/business-info";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const guides = [
  {
    slug: "how-often-trim-palm-trees-florida",
    title: "How Often Should You Trim Palm Trees in Florida?",
    excerpt: "Learn the recommended trimming frequency by palm species, signs it's time to trim, and why over-trimming can be dangerous.",
  },
  {
    slug: "palm-tree-turning-brown-florida",
    title: "Why Is My Palm Tree Turning Brown? Florida Guide",
    excerpt: "Understand the difference between normal frond browning and serious problems like lethal yellowing, nutrient deficiency, and root rot.",
  },
  {
    slug: "palm-tree-hurricane-prep-florida",
    title: "How to Prepare Your Palm Trees for Hurricane Season",
    excerpt: "Expert advice on pre-storm trimming, what to leave alone, timing your prep work, and what to do after a hurricane hits.",
  },
  {
    slug: "how-to-tell-if-palm-tree-is-dead",
    title: "How to Tell If a Palm Tree Is Dead or Dying",
    excerpt: "Check the crown, frond color, trunk firmness, and root condition to determine if your palm can be saved or needs removal.",
  },
  {
    slug: "palm-tree-trimming-cost-florida",
    title: "How Much Does Palm Tree Trimming Cost in Florida? (2026)",
    excerpt: "Real price ranges by palm height and type, factors that affect cost, and what's included in professional service.",
  },
];

const LearnHub = () => (
  <Layout>
    <SEOHead
      title="Palm Tree Care Guides & Resources | Gulf Coast Palms NW Florida"
      description="Expert palm tree care guides for NW Florida homeowners. Learn when to trim, how to identify problems, hurricane prep tips, and more from Gulf Coast Palms."
      canonicalUrl="/learn"
    />
    <BreadcrumbJsonLd
      items={[
        { name: "Home", url: GCP_BUSINESS.url },
        { name: "Learn", url: `${GCP_BUSINESS.url}/learn` },
      ]}
    />

    <section className="py-20 md:py-28 bg-palm-dark">
      <div className="container mx-auto px-4 text-center">
        <motion.div initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-palm-gold/40 bg-palm-gold/10 font-body text-palm-gold text-xs font-bold uppercase tracking-[0.15em] mb-4">
            <BookOpen className="w-4 h-4" /> Resource Center
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
            Your Palm Tree Resource Center
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="font-body text-lg text-palm-sand/80 max-w-2xl mx-auto">
            Expert advice for NW Florida homeowners — from trimming schedules and disease identification to hurricane prep and cost guides.
          </motion.p>
        </motion.div>
      </div>
    </section>

    <section className="section-padding bg-background">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guides.map((guide, i) => (
            <motion.div
              key={guide.slug}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i % 6}
            >
              <Link
                to={`/learn/${guide.slug}`}
                className="group block p-6 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-lg transition-all h-full"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-display text-lg font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {guide.title}
                </h2>
                <p className="font-body text-muted-foreground text-sm mb-4">
                  {guide.excerpt}
                </p>
                <span className="inline-flex items-center gap-1 font-body text-primary font-semibold text-sm">
                  Read Guide <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <section className="section-padding bg-primary">
      <div className="container mx-auto text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
          Got Questions? Our Experts Are One Text Away
        </h2>
        <p className="font-body text-primary-foreground/80 mb-8 max-w-xl mx-auto">
          Text us a photo of your palms for a free assessment and personalized care recommendation.
        </p>
        <a href="tel:8509101290" className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-primary-foreground text-primary font-body font-bold text-xl hover:scale-105 transition-transform shadow-xl">
          <Phone className="w-6 h-6" /> (850) 910-1290
        </a>
      </div>
    </section>
  </Layout>
);

export default LearnHub;