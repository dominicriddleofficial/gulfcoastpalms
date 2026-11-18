/**
 * Service areas index. Same heading, intro and city links as the current page, with
 * the cities listed in order from west to east and the crew's home base marked.
 *
 * The animated map from the current page is left out here: it repeats this same list
 * of cities as a drawing, and the list is quicker to use on a phone.
 */
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { locations } from "@/data/locations";
import { publicMarketing } from "@/data/publicMarketing";
import { treeServiceLinks } from "@/data/services";
import Layout from "../chrome/Layout";
import PageHero from "../components/PageHero";
import QuoteBand from "../components/QuoteBand";
import { coastAreas } from "../data/nav";
import { ArrowRightIcon } from "../lib/icons";

const firstSentence = (text: string) => {
  const cut = text.indexOf(". ");
  return cut === -1 ? text : text.slice(0, cut + 1);
};

/** Where the crews set out from; matches "Based in Navarre" on the homepage. */
const HOME_BASE = "Navarre";

export default function Areas() {
  return (
    <Layout>
      <SEOHead
        title="Tree Services & Palm Care Service Areas | Gulf Coast Palms"
        description="Tree trimming, removal, storm cleanup and palm care across Navarre, Gulf Breeze, Pensacola, Fort Walton Beach, Destin, 30A and Perdido Key."
        canonicalUrl="/service-areas"
      />
      <PageHero crumbs={[{ label: "Service areas" }]} title={publicMarketing.areasHeading} lead={publicMarketing.areasText} placement="service_areas" />

      <section className="rd-section" aria-labelledby="rd-areas-list">
        <div className="rd-wrap">
          <h2 id="rd-areas-list" className="rd-h2 rd-svc__head">Perdido Key to 30A, west to east</h2>
          <ol className="rd-svc rd-svc--line">
            {coastAreas.map((area) => {
              const loc = locations.find((l) => `/${l.slug}` === area.to);
              const base = area.city === HOME_BASE;
              return (
                <li key={area.to} data-base={base || undefined}>
                  <Link to={area.to} className="rd-svc__item rd-svc__item--text">
                    <span className="rd-svc__body">
                      <b className="rd-h3">Palm Tree Trimming in {area.city}</b>
                      {base && <em className="rd-svc__base">Home base</em>}
                      {loc && <span>{firstSentence(loc.introParagraphs[0])}</span>}
                    </span>
                    <ArrowRightIcon size={22} />
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="rd-section rd-section--tight rd-coal" aria-labelledby="rd-areas-trees">
        <div className="rd-wrap rd-split">
          <div className="rd-stack">
            <h2 id="rd-areas-trees" className="rd-h2">{publicMarketing.treeAreaHeading}</h2>
            <p className="rd-copy rd-muted">{publicMarketing.treeAreaText}</p>
          </div>
          <ul className="rd-rows" aria-label="General tree services">
            {treeServiceLinks.map((link) => (
              <li key={link.to}><Link to={link.to}><b>{link.label}</b><ArrowRightIcon size={20} /></Link></li>
            ))}
          </ul>
        </div>
      </section>

      <QuoteBand
        heading="Don't See Your Area? We Probably Cover It."
        text="Call or text for a free quote anywhere along Florida's Gulf Coast."
        placement="service_areas_bottom"
      />
    </Layout>
  );
}
