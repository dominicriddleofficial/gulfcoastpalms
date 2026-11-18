/**
 * Services index: the two routes again, this time with every service listed, each
 * with the first lines of its own page. Same heading, intro and page title as today.
 */
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { publicMarketing } from "@/data/publicMarketing";
import { servicesData } from "@/data/services";
import Layout from "../chrome/Layout";
import PageHero from "../components/PageHero";
import Photo from "../components/Photo";
import QuoteBand from "../components/QuoteBand";
import { serviceMedia } from "../data/serviceMedia";
import { ArrowRightIcon } from "../lib/icons";

const firstSentence = (text: string) => {
  const cut = text.indexOf(". ");
  return cut === -1 ? text : text.slice(0, cut + 1);
};

/**
 * Tree work has one photo on file, so it is shown once beside the heading instead of
 * being repeated on every row. Each palm service has its own photo.
 */
const GROUPS = [
  { id: "tree", title: "Tree Services", items: servicesData.filter((s) => !s.slug.startsWith("palm")), print: serviceMedia["tree-removal"]?.hero },
  { id: "palm", title: "Palm Services", items: servicesData.filter((s) => s.slug.startsWith("palm")), print: undefined },
];

export default function Services() {
  return (
    <Layout>
      <SEOHead
        title="Tree Services & Palm Care | Gulf Coast Palms | Emerald Coast FL"
        description="Tree removal, tree trimming, storm cleanup and palm care including trimming, installation and diamond cutting across the Emerald Coast. Free quotes."
        canonicalUrl="/services"
      />
      <PageHero crumbs={[{ label: "Services" }]} title={publicMarketing.servicesHeading} lead={publicMarketing.servicesText} placement="services" />

      {GROUPS.map((group) => (
        <section key={group.id} className={`rd-section ${group.id === "palm" ? "rd-paper-2" : ""}`} aria-labelledby={`rd-services-${group.id}`}>
          <div className="rd-wrap rd-split">
            <div className="rd-svcg">
              <h2 id={`rd-services-${group.id}`} className="rd-h2">{group.title}</h2>
              {group.print && (
                <figure className="rd-print rd-svcg__print">
                  <Photo src={group.print.photo} alt={group.print.alt} sizes="(min-width: 900px) 26rem, 92vw" />
                  <figcaption>{group.print.caption}</figcaption>
                </figure>
              )}
            </div>
            <ul className="rd-svc">
              {group.items.map((service) => {
                const shot = group.print ? undefined : serviceMedia[service.slug]?.hero;
                return (
                  <li key={service.slug}>
                    <Link to={`/services/${service.slug}`} className={`rd-svc__item${shot ? "" : " rd-svc__item--text"}`}>
                      {shot && (
                        <span className="rd-svc__thumb">
                          <Photo src={shot.photo} alt="" focus={shot.focus} sizes="(min-width: 700px) 11rem, 30vw" />
                        </span>
                      )}
                      <span className="rd-svc__body">
                        <b className="rd-h3">{service.title}</b>
                        <span>{firstSentence(service.introParagraphs[0])}</span>
                      </span>
                      <ArrowRightIcon size={22} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ))}

      <section className="rd-section rd-section--tight">
        <div className="rd-wrap rd-split">
          <h2 className="rd-h3 rd-h3--big">Also from Gulf Coast Palms</h2>
          <ul className="rd-rows">
            {[
              { label: "Landscaping Services", to: "/services/landscaping-services" },
              { label: "Commercial & Property Managers", to: "/commercial" },
              { label: "HOA & Commercial Maintenance", to: "/hoa-commercial-palm-maintenance" },
              { label: "Maintenance Plans", to: "/palm-tree-maintenance-plans" },
              { label: "Hurricane Palm Preparation", to: "/hurricane-palm-preparation" },
              { label: "Buy Palm Trees", to: "/palm-trees/buy" },
            ].map((link) => (
              <li key={link.to}><Link to={link.to}><b>{link.label}</b><ArrowRightIcon size={20} /></Link></li>
            ))}
          </ul>
        </div>
      </section>

      <QuoteBand text="Tell us about your trees or palms for a property-specific estimate." placement="services_bottom" />
    </Layout>
  );
}
