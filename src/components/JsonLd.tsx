import { Helmet } from "react-helmet-async";
import { GCP_BUSINESS } from "@/lib/business-info";
import { localBusinessSchema } from "@/seo/businessSchema";

/**
 * Reusable JSON-LD components. Render these inside any page to emit
 * structured-data <script> tags via react-helmet-async.
 *
 * All payloads are typed loosely as Record<string, unknown> because
 * schema.org structures vary widely; consumers pass plain JSON shapes.
 */

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

/** Low-level: emit any JSON-LD payload */
export const JsonLd = ({ data }: JsonLdProps) => (
  <Helmet>
    <script type="application/ld+json">{JSON.stringify(data).replace(/</g, "\\u003c")}</script>
  </Helmet>
);

// ---------- LocalBusiness ----------

export const LocalBusinessJsonLd = () => <JsonLd data={localBusinessSchema()} />;

// ---------- Service ----------

interface ServiceJsonLdProps {
  service: {
    name: string;
    description: string;
    serviceType?: string;
    areaServed?: string | string[];
    url?: string;
  };
}

export const ServiceJsonLd = ({ service }: ServiceJsonLdProps) => (
  <JsonLd
    data={{
      "@context": "https://schema.org",
      "@type": "Service",
      name: service.name,
      description: service.description,
      serviceType: service.serviceType ?? service.name,
      areaServed: service.areaServed ?? GCP_BUSINESS.areaServed,
      url: service.url,
      provider: {
        "@type": "HomeAndConstructionBusiness",
        "@id": `${GCP_BUSINESS.url}/#business`,
        name: GCP_BUSINESS.name,
        telephone: GCP_BUSINESS.phone,
        url: GCP_BUSINESS.url,
      },
    }}
  />
);

// ---------- FAQPage ----------

interface FAQPageJsonLdProps {
  questions: { q: string; a: string }[];
}

export const FAQPageJsonLd = ({ questions }: FAQPageJsonLdProps) => (
  <JsonLd
    data={{
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: questions.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    }}
  />
);

// ---------- BreadcrumbList ----------

interface BreadcrumbJsonLdProps {
  items: { name: string; url: string }[];
}

export const BreadcrumbJsonLd = ({ items }: BreadcrumbJsonLdProps) => (
  <JsonLd
    data={{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        item: item.url,
      })),
    }}
  />
);

// ---------- Article ----------

interface ArticleJsonLdProps {
  article: {
    headline: string;
    description?: string;
    image?: string;
    datePublished?: string;
    dateModified?: string;
    author?: string;
    url?: string;
  };
}

export const ArticleJsonLd = ({ article }: ArticleJsonLdProps) => (
  <JsonLd
    data={{
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.headline,
      description: article.description,
      image: article.image ?? GCP_BUSINESS.ogImage,
      datePublished: article.datePublished,
      dateModified: article.dateModified ?? article.datePublished,
      author: {
        "@type": "Organization",
        name: article.author ?? GCP_BUSINESS.name,
      },
      publisher: {
        "@type": "Organization",
        name: GCP_BUSINESS.name,
        logo: { "@type": "ImageObject", url: GCP_BUSINESS.logo },
      },
      mainEntityOfPage: article.url,
    }}
  />
);