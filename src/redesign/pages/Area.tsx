/**
 * Rebuilt city page. Every word, FAQ, price range and piece of search markup comes
 * from the same city data the current page uses (src/data/locations.ts).
 *
 * Two deliberate differences from the current page:
 *  - Photos are captioned with the city each one was actually recorded in. The
 *    current pages label the same photos as being in every city.
 *  - The "page last updated" line is gone. It always printed the current month.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { BreadcrumbJsonLd, FAQPageJsonLd, ServiceJsonLd } from "@/components/JsonLd";
import { locations, type LocationData } from "@/data/locations";
import { publicMarketing } from "@/data/publicMarketing";
import { GOOGLE_BUSINESS_URL, aggregateRating } from "@/data/reviews";
import { treeServiceLinks } from "@/data/services";
import { GCP_BUSINESS } from "@/lib/business-info";
import Layout from "../chrome/Layout";
import Missing from "./Missing";
import Faq from "../components/Faq";
import PageHero from "../components/PageHero";
import Photo from "../components/Photo";
import { Where } from "../components/ProjectViewer";
import QuoteBand from "../components/QuoteBand";
import { nearbyProjects } from "../data/projects";
import { QuoteLink } from "../lib/actions";
import { ArrowRightIcon, CheckIcon, StarIcon } from "../lib/icons";

const BASE_URL = GCP_BUSINESS.url;

/** Same in-text service links as the current city page, except that a link now covers the whole word ("storm preparedness"). */
const SERVICE_LINKS: { match: RegExp; href: string }[] = [
  { match: /diamond[\s-]?cut(ting)?/gi, href: "/services/palm-diamond-cutting" },
  { match: /trunk[\s-]?skinning/gi, href: "/services/palm-tree-trunk-skinning" },
  { match: /palm[\s-]?installations?/gi, href: "/services/palm-tree-installation" },
  { match: /palm[\s-]?removals?/gi, href: "/services/palm-tree-removal" },
  { match: /(hurricane|storm)[\s-]?prep(aration|aredness)?\b/gi, href: "/emergency-palm-service" },
  { match: /maintenance[\s-]?plans?/gi, href: "/palm-tree-maintenance-plans" },
];

/** Link the first mention of each service in a paragraph to that service's page. */
function withLinks(text: string): ReactNode {
  const found: { start: number; end: number; href: string; label: string }[] = [];
  for (const { match, href } of SERVICE_LINKS) {
    match.lastIndex = 0;
    const m = match.exec(text);
    if (m) found.push({ start: m.index, end: m.index + m[0].length, href, label: m[0] });
  }
  if (found.length === 0) return text;
  found.sort((a, b) => a.start - b.start);
  const kept = found.filter((m, i) => i === 0 || m.start >= found[i - 1].end);
  const out: ReactNode[] = [];
  let cursor = 0;
  kept.forEach((m, i) => {
    if (m.start > cursor) out.push(text.slice(cursor, m.start));
    out.push(<Link key={i} to={m.href}>{m.label}</Link>);
    cursor = m.end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

/** Navarre and Navarre Beach count as the same town, as do the other beach communities. */
const sameTown = (a: string, b: string) => a.replace(" Beach", "") === b.replace(" Beach", "");

export default function Area({ slug }: { slug: string }) {
  const location = locations.find((l) => l.slug === slug);
  if (!location) return <Missing />;
  return <AreaPage location={location} />;
}

function AreaPage({ location }: { location: LocationData }) {
  const canonicalUrl = `/${location.slug}`;
  const place = `${location.city}, ${location.state}`;
  const nearby = location.nearbyLinks.flatMap((s) => locations.find((l) => l.slug === s) ?? []);
  const work = nearbyProjects(location.city);
  const lead = work[0];
  const allLocal = work.every((p) => p.city !== undefined && sameTown(p.city, location.city));
  const placement = `location_${location.slug.replace("palm-tree-trimming-", "").replace(/-fl$/, "")}`;

  return (
    <Layout>
      <SEOHead title={location.metaTitle} description={location.metaDescription} canonicalUrl={canonicalUrl} />
      <ServiceJsonLd
        service={{
          name: `Palm Tree Trimming in ${location.city}, ${location.state}`,
          description: location.metaDescription,
          areaServed: location.neighborhoods ?? `${location.city}, ${location.state}`,
          url: `${BASE_URL}${canonicalUrl}`,
        }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: BASE_URL },
          { name: "Services", url: `${BASE_URL}/services` },
          { name: "Palm Tree Trimming", url: `${BASE_URL}/services/palm-tree-trimming` },
          { name: `${location.city}, ${location.state}`, url: `${BASE_URL}${canonicalUrl}` },
        ]}
      />
      {location.faqs && location.faqs.length > 0 && <FAQPageJsonLd questions={location.faqs} />}

      <PageHero
        crumbs={[{ label: "Service areas", to: "/service-areas" }, { label: place }]}
        title={location.h1}
        lead={location.subheading}
        photo={lead ? { src: lead.photo, alt: lead.alt, focus: lead.focus, caption: `${lead.title}, ${lead.city}` } : undefined}
        service="Palm Tree Trimming"
        area={place}
        placement={placement}
      >
        <ul className="rd-facts">
          <li>
            <a className="rd-link" href={GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer">
              <StarIcon size={15} /> {aggregateRating.score.toFixed(1)} from {aggregateRating.count} Google reviews
            </a>
          </li>
          <li>Licensed &amp; Insured</li>
          <li>Same-Day Estimates</li>
          <li>Locally Owned &amp; Operated</li>
        </ul>
      </PageHero>

      <section className="rd-section">
        <div className="rd-wrap rd-service__intro">
          <div className="rd-prose">
            {location.introParagraphs.map((p) => <p key={p}>{withLinks(p)}</p>)}
            {location.highlight && <blockquote className="rd-pull">{location.highlight}</blockquote>}
          </div>
          <aside className="rd-scope" aria-labelledby="rd-area-services">
            <h2 id="rd-area-services" className="rd-h3">Services in {location.city} Include</h2>
            <ul className="rd-checks">
              {location.services.map((s) => <li key={s}><CheckIcon size={18} />{s}</li>)}
            </ul>
            <Link to="/services/palm-tree-trimming" className="rd-kind__more">Palm tree trimming and care<ArrowRightIcon size={18} /></Link>
          </aside>
        </div>
      </section>

      <section className="rd-section rd-section--tight rd-coal" aria-labelledby="rd-area-trees">
        <div className="rd-wrap rd-split">
          <div className="rd-stack">
            <h2 id="rd-area-trees" className="rd-h2">{publicMarketing.treeAreaHeading}</h2>
            <p className="rd-copy rd-muted">{publicMarketing.treeAreaText}</p>
          </div>
          <ul className="rd-rows" aria-label="General tree services">
            {treeServiceLinks.map((link) => (
              <li key={link.to}><Link to={link.to}><b>{link.label}</b><ArrowRightIcon size={20} /></Link></li>
            ))}
          </ul>
        </div>
      </section>

      {work.length > 0 && (
        <section className="rd-section" aria-labelledby="rd-area-work">
          <div className="rd-wrap">
            <div className="rd-work__intro">
              <h2 id="rd-area-work" className="rd-h2">{allLocal ? `Our work in ${location.city}` : `Our work near ${location.city}`}</h2>
              <Link to="/jobs" className="rd-link">See all projects</Link>
            </div>
            <ul className="rd-shots">
              {work.map((p) => (
                <li key={p.id}>
                  <figure>
                    <div className="rd-shots__frame"><Photo src={p.photo} alt={p.alt} focus={p.focus} sizes="(min-width: 900px) 30vw, 92vw" /></div>
                    {/* Each job names its own city (linked when it is another city's) and goes to the service it shows. */}
                    <figcaption>
                      <b>{p.title}</b>
                      <span>{p.city && sameTown(p.city, location.city) ? `${p.city}, FL` : p.city ? <Where city={p.city} /> : null}</span>
                      <Link to={p.service.to} className="rd-shots__more">{p.service.label}<ArrowRightIcon size={16} /></Link>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {location.pricingTiers && location.pricingTiers.length > 0 && (
        <section className="rd-section rd-paper-2" aria-labelledby="rd-area-pricing">
          <div className="rd-wrap rd-split">
            <div className="rd-stack">
              <h2 id="rd-area-pricing" className="rd-h2">{location.city} Palm Care Pricing</h2>
              {location.pricingNote && <p className="rd-small rd-muted">{location.pricingNote}</p>}
              <QuoteLink placement={`${placement}_pricing`} service="Palm Tree Trimming" area={place} className="rd-btn rd-btn--go" />
            </div>
            <table className="rd-prices">
              <thead><tr><th scope="col">Service</th><th scope="col">Price</th><th scope="col">Best for</th></tr></thead>
              <tbody>
                {location.pricingTiers.map((tier) => (
                  <tr key={tier.name}><th scope="row">{tier.name}</th><td className="rd-prices__amt">{tier.price}</td><td>{tier.bestFor}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {location.testimonial?.sourceUrl && (
        <section className="rd-section rd-section--tight rd-dark">
          <figure className="rd-wrap rd-quote">
            <p className="rd-proof__stars" aria-label={`${location.testimonial.rating ?? 5} out of 5 stars`}>
              {Array.from({ length: location.testimonial.rating ?? 5 }).map((_, i) => <StarIcon key={i} size={20} />)}
            </p>
            <blockquote>“{location.testimonial.quote}”</blockquote>
            <figcaption>
              {location.testimonial.author},{" "}
              <a className="rd-link" href={location.testimonial.sourceUrl} target="_blank" rel="noopener noreferrer">read original review</a>
            </figcaption>
          </figure>
        </section>
      )}

      <section className="rd-section" aria-labelledby="rd-area-why">
        <div className="rd-wrap rd-split">
          <h2 id="rd-area-why" className="rd-h2">{location.whyChooseTitle}</h2>
          <div className="rd-stack">
            <ul className="rd-checks rd-checks--ink">
              {location.whyChoosePoints.map((point) => <li key={point}><CheckIcon size={18} />{point}</li>)}
            </ul>
            <p className="rd-copy rd-muted">{location.whyChooseClosing}</p>
          </div>
        </div>
      </section>

      {location.faqs && location.faqs.length > 0 && (
        <section className="rd-section rd-paper-2" aria-labelledby="rd-area-faq">
          <div className="rd-wrap rd-split">
            <div className="rd-stack">
              <h2 id="rd-area-faq" className="rd-h2">Frequently Asked Questions</h2>
              <p className="rd-copy rd-muted">{location.city} Palm Care FAQs</p>
            </div>
            <Faq items={location.faqs} />
          </div>
        </section>
      )}

      <section className="rd-section rd-section--tight">
        <div className="rd-wrap rd-pair">
          <div className="rd-stack">
            <h2 className="rd-h3 rd-h3--big">Protect Your {location.city} Palms Year-Round</h2>
            <p className="rd-copy rd-muted">Scheduled trimming, health checks, and hurricane prep — all handled for you.</p>
            <Link to="/palm-tree-maintenance-plans" className="rd-btn rd-btn--ink">View Maintenance Plans</Link>
          </div>
          {nearby.length > 0 && (
            <div className="rd-stack">
              <h2 className="rd-h3 rd-h3--big">We Also Serve These Communities</h2>
              <ul className="rd-rows" aria-label="Nearby service areas">
                {nearby.map((loc) => (
                  <li key={loc.slug}><Link to={`/${loc.slug}`}><b>{loc.city}, {loc.state}</b><ArrowRightIcon size={20} /></Link></li>
                ))}
                <li><Link to="/service-areas"><b>View All Service Areas</b><ArrowRightIcon size={20} /></Link></li>
              </ul>
            </div>
          )}
        </div>
      </section>

      <QuoteBand
        heading={location.ctaHeading}
        text={location.ctaSubtext ?? location.ctaText}
        service="Palm Tree Trimming"
        area={place}
        placement={`${placement}_bottom`}
        textLabel={location.ctaPrimaryLabel ?? "Text a photo"}
      />
    </Layout>
  );
}
