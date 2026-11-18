import SEOHead from "@/components/SEOHead";
import { FAQPageJsonLd } from "@/components/JsonLd";
import { homeFaqs } from "@/data/homeFaq";
import Layout, { SeasonStrip } from "../chrome/Layout";
import Faq from "../components/Faq";
import QuoteBand from "../components/QuoteBand";
import Areas from "../home/Areas";
import Commercial from "../home/Commercial";
import Hero from "../home/Hero";
import Proof from "../home/Proof";
import Routes from "../home/Routes";
import TreeWork from "../home/TreeWork";
import Work from "../home/Work";
import { useHomeMotion } from "../lib/motion";

/**
 * Redesigned homepage. The page title, description and the FAQ search markup are the
 * ones the current homepage publishes; only the layout around them is new.
 */
export default function Home() {
  useHomeMotion();
  return (
    <Layout season={false} over>
      <SEOHead
        title="Gulf Coast Palms | Tree Services & Palm Care on the Emerald Coast"
        description="Tree trimming, tree removal, storm cleanup and palm care across Navarre, Pensacola, Destin and the Emerald Coast. Free quotes — (850) 910-1290."
        canonicalUrl="/"
      />
      <FAQPageJsonLd questions={homeFaqs} />
      <Hero />
      {/* Nothing sits between the opening and the next section: its glow runs straight on. */}
      <Routes />
      <SeasonStrip where="below" />
      <Work />
      <TreeWork />
      <Proof />
      <Commercial />
      <Areas />
      <section className="rd-section rd-paper-2" aria-labelledby="rd-faq-title">
        <div className="rd-wrap rd-split" data-rv="">
          <div className="rd-stack rd-rise">
            <h2 id="rd-faq-title" className="rd-h2">Common questions</h2>
            <p className="rd-copy rd-muted">Questions about tree services and palm care across the Gulf Coast.</p>
          </div>
          <Faq items={homeFaqs} limit={7} />
        </div>
      </section>
      <QuoteBand placement="bottom_cta" />
    </Layout>
  );
}
