import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, MessageSquare, ArrowLeft, BookOpen } from "lucide-react";
import Layout from "@/components/Layout";
import { palmGuides } from "@/data/palmGuides";
import NotFound from "./NotFound";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

const PalmGuidePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const guide = palmGuides.find((g) => g.slug === slug);

  if (!guide) return <NotFound />;

  const otherGuides = palmGuides.filter((g) => g.slug !== slug);

  const renderContent = (block: string) => {
    if (block.startsWith("## ")) {
      return <h2 className="font-display text-2xl font-bold text-foreground mt-10 mb-4">{block.replace("## ", "")}</h2>;
    }
    if (block.startsWith("**") && block.includes(":**")) {
      const [boldPart, ...rest] = block.split(":**");
      return (
        <p className="font-body text-muted-foreground leading-relaxed mb-3">
          <strong className="text-foreground">{boldPart.replace(/\*\*/g, "")}:</strong> {rest.join(":**")}
        </p>
      );
    }
    if (block.match(/^\d+\.\s/)) {
      return <p className="font-body text-muted-foreground leading-relaxed mb-2 pl-4">{block}</p>;
    }
    return <p className="font-body text-muted-foreground leading-relaxed mb-4">{block}</p>;
  };

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: guide.title,
        description: guide.metaDescription,
        datePublished: guide.publishDate,
        author: { "@type": "Organization", name: "Gulf Coast Palms" },
      })}} />

      <section className="section-padding bg-palm-dark">
        <div className="container mx-auto max-w-4xl">
          <Link to="/palm-trees/guides" className="inline-flex items-center gap-2 font-body text-palm-sand/70 hover:text-palm-light transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> All Guides
          </Link>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-body text-palm-gold text-sm mb-3">
            {guide.publishDate}
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
            {guide.title}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-body text-lg text-palm-sand/80">
            {guide.excerpt}
          </motion.p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-3xl">
          <motion.article initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {guide.content.map((block, i) => (
              <motion.div key={i} variants={fadeUp} custom={Math.min(i, 3)}>
                {renderContent(block)}
              </motion.div>
            ))}
          </motion.article>

          {/* CTA Box */}
          <div className="mt-12 p-8 rounded-2xl bg-secondary border border-border text-center">
            <h3 className="font-display text-2xl font-bold text-foreground mb-3">
              Contact Gulf Coast Palms
            </h3>
            <p className="font-body text-muted-foreground mb-6">
              For professional palm trimming or installation throughout the Emerald Coast.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="tel:8509101290" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-body font-bold hover:bg-palm-light transition-colors">
                <Phone className="w-5 h-5" /> (850) 910-1290
              </a>
              <a href="sms:8509101290" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-primary text-primary font-body font-bold hover:bg-primary hover:text-primary-foreground transition-colors">
                <MessageSquare className="w-5 h-5" /> Text Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* More Articles */}
      {otherGuides.length > 0 && (
        <section className="section-padding bg-secondary/50">
          <div className="container mx-auto max-w-4xl">
            <h2 className="font-display text-2xl font-bold text-foreground mb-6 text-center">More Palm Care Guides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherGuides.map((g) => (
                <Link key={g.slug} to={`/palm-trees/guides/${g.slug}`} className="block p-5 rounded-xl border border-border bg-card hover:shadow-lg transition-all group">
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">{g.title}</h3>
                      <p className="font-body text-xs text-muted-foreground mt-1">{g.excerpt.substring(0, 80)}...</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
};

export default PalmGuidePage;
