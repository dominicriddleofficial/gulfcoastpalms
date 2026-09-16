import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Phone, MessageSquare } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import NotFound from "@/pages/NotFound";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";
import { GCP_BUSINESS } from "@/lib/business-info";

import { articles } from "@/data/learnArticles";


const LearnArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = articles.find((a) => a.slug === slug);

  if (!article) return <NotFound />;

  return (
    <Layout>
      <SEOHead
        title={article.metaTitle}
        description={article.metaDescription}
        canonicalUrl={`/learn/${article.slug}`}
      />

      <ArticleJsonLd article={{ headline: article.title, description: article.metaDescription, url: `${GCP_BUSINESS.url}/learn/${article.slug}` }} />
      <BreadcrumbJsonLd items={[{ name: "Home", url: `${GCP_BUSINESS.url}/` }, { name: "Palm care guides", url: `${GCP_BUSINESS.url}/learn` }, { name: article.title, url: `${GCP_BUSINESS.url}/learn/${article.slug}` }]} />

      <section className="py-16 md:py-24 bg-palm-dark">
        <div className="container mx-auto px-4">
          <Link to="/learn" className="inline-flex items-center gap-2 font-body text-palm-sand/60 hover:text-palm-sand text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Guides
          </Link>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-3xl md:text-5xl font-bold text-primary-foreground max-w-3xl"
          >
            {article.title}
          </motion.h1>
        </div>
      </section>

      <article className="section-padding bg-background">
        <div className="container mx-auto max-w-3xl">
          <div className="prose prose-lg max-w-none">
            {article.sections.map((section, i) => (
              <div key={i} className="mb-8">
                {section.heading && (
                  <h2 className="font-display text-2xl font-bold text-foreground mt-10 mb-4">{section.heading}</h2>
                )}
                {section.paragraphs.map((p, j) => (
                  <p key={j} className="font-body text-muted-foreground leading-relaxed mb-4">{p}</p>
                ))}
              </div>
            ))}
          </div>

          <nav aria-label="Related palm services and guides" className="mt-10 border-t border-border pt-8">
            <h2 className="font-display text-2xl font-bold mb-4">Related Palm Services & Guides</h2>
            <ul className="space-y-3 font-body text-primary">
              <li><Link className="underline" to="/services/palm-tree-trimming">Professional palm tree trimming</Link></li>
              <li><Link className="underline" to="/services/palm-tree-removal">Palm tree removal</Link></li>
              <li><Link className="underline" to="/palm-tree-cost">Palm tree service costs</Link></li>
              {articles.filter((other) => other.slug !== article.slug).map((other) => (
                <li key={other.slug}><Link className="underline" to={`/learn/${other.slug}`}>{other.title}</Link></li>
              ))}
            </ul>
          </nav>

          {/* Lead CTA */}
          <div className="mt-16 p-8 rounded-2xl bg-primary/5 border border-primary/20 text-center">
            <h3 className="font-display text-2xl font-bold text-foreground mb-3">Need Professional Palm Care?</h3>
            <p className="font-body text-muted-foreground mb-6 max-w-lg mx-auto">
              Text us a photo of your palms for a free assessment and quote. Our team serves the entire Emerald Coast.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="sms:8509101290&body=Hi%20Gulf%20Coast%20Palms!%20I%27d%20like%20a%20quote%20%E2%80%94%20here%27s%20a%20photo%20of%20my%20palms%3A" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-body font-bold hover:bg-palm-light transition-colors">
                <MessageSquare className="w-5 h-5" /> Text Us a Photo
              </a>
              <a href="tel:8509101290" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-primary text-primary font-body font-bold hover:bg-primary hover:text-primary-foreground transition-colors">
                <Phone className="w-5 h-5" /> (850) 910-1290
              </a>
            </div>
            {article.slug === "palm-tree-trimming-cost-florida" && (
              <p className="font-body text-sm text-muted-foreground mt-6">
                Prefer instant pricing?{" "}
                <Link to="/palm-tree-cost" className="text-primary hover:underline font-semibold">
                  Get your palm-trimming quote →
                </Link>
              </p>
            )}
          </div>
        </div>
      </article>
    </Layout>
  );
};

export default LearnArticle;