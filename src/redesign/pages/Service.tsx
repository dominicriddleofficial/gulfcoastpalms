/**
 * Rebuilt service page. All wording, FAQs and search markup come from the same
 * service data the current page uses (src/data/services.ts), so titles, descriptions,
 * headings and structured data are unchanged. What is new is the layout and the
 * photos of the actual work.
 */
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { BreadcrumbJsonLd, FAQPageJsonLd, ServiceJsonLd } from "@/components/JsonLd";
import { servicesData } from "@/data/services";
import { GCP_BUSINESS } from "@/lib/business-info";
import Layout from "../chrome/Layout";
import Missing from "./Missing";
import Faq from "../components/Faq";
import PageHero from "../components/PageHero";
import Photo from "../components/Photo";
import ProjectViewer from "../components/ProjectViewer";
import QuoteBand from "../components/QuoteBand";
import { projects } from "../data/projects";
import { serviceMedia } from "../data/serviceMedia";
import { ArrowRightIcon, CheckIcon } from "../lib/icons";

const BASE_URL = GCP_BUSINESS.url;

export default function Service({ slug }: { slug: string }) {
  const service = servicesData.find((s) => s.slug === slug);
  if (!service) return <Missing />;
  const media = serviceMedia[slug];
  const canonicalUrl = `/services/${service.slug}`;
  // The viewer is for browsing several jobs. One job would only repeat the photo this page opens with.
  const matching = media ? projects.filter((p) => !p.small && media.projects.includes(p.service.label)) : [];
  const related = matching.length > 1 ? matching : [];
  const hub = media?.route === "tree"
    ? { label: "Tree Services", to: "/services/tree-trimming-removal" }
    : { label: "Palm Services", to: "/services" };

  return (
    <Layout>
      <SEOHead title={service.metaTitle} description={service.metaDescription} canonicalUrl={canonicalUrl} />
      <ServiceJsonLd
        service={{
          name: service.title,
          description: service.metaDescription,
          serviceType: service.title,
          areaServed: "NW Florida",
          url: `${BASE_URL}${canonicalUrl}`,
        }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: BASE_URL },
          { name: "Services", url: `${BASE_URL}/services` },
          { name: service.title, url: `${BASE_URL}${canonicalUrl}` },
        ]}
      />
      {service.faqs && service.faqs.length > 0 && <FAQPageJsonLd questions={service.faqs} />}

      <PageHero
        crumbs={[{ label: "Services", to: "/services" }, ...(hub.to !== canonicalUrl && hub.to !== "/services" ? [hub] : []), { label: service.title }]}
        title={service.title}
        lead={service.heroSubheading}
        photo={media ? { src: media.hero.photo, alt: media.hero.alt, caption: media.hero.caption, focus: media.hero.focus, small: media.hero.small } : undefined}
        service={service.title}
        placement={`service_${service.slug}`}
        tone={media?.route === "tree" ? "coal" : "green"}
      />

      {media && media.details.length > 0 && (
        <section className="rd-section rd-section--tight rd-coal" aria-label={`${service.title} up close`}>
          <div className={`rd-wrap rd-closeups rd-closeups--${media.details.length}`}>
            {media.details.map((shot) => (
              <figure key={shot.caption} className={shot.small ? "rd-print rd-closeups__print" : "rd-closeups__shot"}>
                <Photo src={shot.photo} alt={shot.alt} focus={shot.focus} sizes={shot.small ? "(min-width: 900px) 32rem, 92vw" : "(min-width: 900px) 46vw, 100vw"} />
                <figcaption>{shot.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="rd-section">
        <div className="rd-wrap rd-service__intro">
          <div className="rd-prose">
            {service.introParagraphs.map((p) => <p key={p}>{p}</p>)}
          </div>
          <aside className="rd-scope" aria-labelledby="rd-scope-title">
            <h2 id="rd-scope-title" className="rd-h3">{service.scopeHeading ?? "What's Included"}</h2>
            <ul className="rd-checks">
              {service.benefits.map((b) => <li key={b}><CheckIcon size={18} />{b}</li>)}
            </ul>
          </aside>
        </div>
      </section>

      {service.procesSteps && (
        <section className="rd-section rd-paper-2" aria-labelledby="rd-steps-title">
          <div className="rd-wrap rd-split">
            <h2 id="rd-steps-title" className="rd-h2">Our Installation Process</h2>
            <ol className="rd-steps">
              {service.procesSteps.map((step) => (
                <li key={step.step}>
                  <h3 className="rd-h3">{step.step}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {(service.bundleSection || service.warrantySection) && (
        <section className="rd-section">
          <div className="rd-wrap rd-pair">
            {[service.warrantySection, service.bundleSection].map((block) => block && (
              <div key={block.heading} className="rd-prose">
                <h2 className="rd-h3 rd-h3--big">{block.heading}</h2>
                {block.content.map((p) => <p key={p}>{p}</p>)}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={`rd-section ${service.procesSteps ? "" : "rd-paper-2"}`}>
        <div className="rd-wrap rd-split">
          <h2 className="rd-h2">{service.secondaryHeading}</h2>
          <div className="rd-prose">
            {service.secondaryContent.map((p) => <p key={p}>{p}</p>)}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="rd-work rd-section rd-coal" aria-labelledby="rd-work-title">
          <div className="rd-wrap">
            <div className="rd-work__intro">
              <h2 id="rd-work-title" className="rd-h2">Completed projects</h2>
              <Link to="/jobs" className="rd-link">See all projects</Link>
            </div>
            <ProjectViewer projects={related} placement={`service_${service.slug}_projects`} />
          </div>
        </section>
      )}

      {service.faqs && service.faqs.length > 0 && (
        <section className="rd-section" aria-labelledby="rd-faq-title">
          <div className="rd-wrap rd-split">
            <h2 id="rd-faq-title" className="rd-h2">{service.title}: common questions</h2>
            <Faq items={service.faqs} />
          </div>
        </section>
      )}

      {service.relatedLinks.length > 0 && (
        <section className="rd-section rd-section--tight rd-paper-2" aria-labelledby="rd-related-title">
          <div className="rd-wrap rd-split">
            <h2 id="rd-related-title" className="rd-h3 rd-h3--big">Related Services</h2>
            <ul className="rd-rows">
              {service.relatedLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to}><b>{link.label}</b><ArrowRightIcon size={20} /></Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <QuoteBand heading={service.ctaHeading} text={service.ctaText} service={service.title} placement={`service_${service.slug}_bottom`} />
    </Layout>
  );
}
