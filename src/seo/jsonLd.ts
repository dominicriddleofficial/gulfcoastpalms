/**
 * Build-time JSON-LD for the public marketing routes.
 *
 * The site is a client-rendered SPA, so schema injected by react-helmet-async
 * is invisible to AI crawlers (GPTBot, ClaudeBot, PerplexityBot,
 * Google-Extended) which do not execute JavaScript. This module returns the
 * schema payloads per route and `scripts/prerender-meta.mjs` writes them into
 * the static per-route HTML at build time, before any JS runs.
 *
 * Rules:
 *  - Facts only. Ratings/counts come from GCP_BUSINESS.aggregateRating, which
 *    mirrors the real Google Business Profile numbers. Never inflate them.
 *  - FAQPage answers mirror the visible copy word for word (same data modules
 *    the React pages render from).
 *  - Only routes listed in `src/seo/routes.data.mjs` are emitted, so
 *    /platform/*, /admin/*, /portal/* and the 404 route get nothing.
 */

import { GCP_BUSINESS } from "@/lib/business-info";
import { servicesData } from "@/data/services";
import { locations } from "@/data/locations";
import { homeFaqs } from "@/data/homeFaq";

const SITE = GCP_BUSINESS.url;

type Json = Record<string, unknown>;

/** Opening hours as currently advertised: Mon–Sat work, storm calls 7 days. */
const OPENING_HOURS = [
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    opens: "07:00",
    closes: "18:00",
  },
];

export function localBusinessSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
    "@id": `${SITE}/#business`,
    name: GCP_BUSINESS.name,
    legalName: GCP_BUSINESS.legalName,
    description:
      "Palm tree trimming, diamond cutting, trunk skinning, installation, removal and hurricane preparation across Northwest Florida's Emerald Coast.",
    telephone: GCP_BUSINESS.phone,
    email: GCP_BUSINESS.email,
    url: SITE,
    logo: GCP_BUSINESS.logo,
    image: GCP_BUSINESS.ogImage,
    priceRange: GCP_BUSINESS.priceRange,
    address: { "@type": "PostalAddress", ...GCP_BUSINESS.address },
    geo: {
      "@type": "GeoCoordinates",
      latitude: GCP_BUSINESS.geo.latitude,
      longitude: GCP_BUSINESS.geo.longitude,
    },
    areaServed: GCP_BUSINESS.areaServed.map((a) => ({
      "@type": "City",
      name: a,
      containedInPlace: { "@type": "State", name: "Florida" },
    })),
    openingHoursSpecification: OPENING_HOURS,
    sameAs: [...GCP_BUSINESS.sameAs],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: GCP_BUSINESS.aggregateRating.ratingValue,
      reviewCount: GCP_BUSINESS.aggregateRating.reviewCount,
      bestRating: "5",
      worstRating: "1",
    },
    serviceType: servicesData.map((s) => s.title),
  };
}

function providerRef(): Json {
  return {
    "@type": "LocalBusiness",
    "@id": `${SITE}/#business`,
    name: GCP_BUSINESS.name,
    telephone: GCP_BUSINESS.phone,
    url: SITE,
  };
}

function serviceSchema(opts: {
  name: string;
  description: string;
  url: string;
  areaServed: Json | Json[] | string[];
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    serviceType: opts.name,
    description: opts.description,
    url: opts.url,
    provider: providerRef(),
    areaServed: opts.areaServed,
  };
}

function faqSchema(questions: { q: string; a: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

const SEGMENT_LABELS: Record<string, string> = {
  services: "Services",
  "palm-trees": "Palm Trees",
  learn: "Learn",
  careers: "Careers",
  guides: "Guides",
  types: "Palm Tree Types",
  buy: "Buy Palm Trees",
};

function titleize(segment: string): string {
  return (
    SEGMENT_LABELS[segment] ??
    segment
      .split("-")
      .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
      .join(" ")
  );
}

/** Breadcrumbs for nested pages only (2+ path segments). */
function breadcrumbSchema(routePath: string, title: string): Json | null {
  const segments = routePath.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
  if (segments.length < 2) return null;
  const items: Json[] = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
  ];
  let acc = "";
  segments.forEach((seg, i) => {
    acc += `/${seg}`;
    const last = i === segments.length - 1;
    items.push({
      "@type": "ListItem",
      position: i + 2,
      name: last ? title : titleize(seg),
      item: `${SITE}${acc}`,
    });
  });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

/**
 * Route path -> ordered list of JSON-LD payloads.
 * `titles` maps route path to its <title>, used for the breadcrumb leaf name.
 */
export function buildRouteJsonLd(
  titles: Record<string, string> = {},
): Record<string, Json[]> {
  const out: Record<string, Json[]> = {};

  const add = (routePath: string, payload: Json | null) => {
    if (!payload) return;
    (out[routePath] ||= []).push(payload);
  };

  // Site-wide LocalBusiness is added per-route by the prerender script for
  // every known route, so seed nothing here; page-specific schema follows.

  // Homepage FAQ (mirrors src/components/home/FAQ.tsx)
  add("/", faqSchema(homeFaqs));

  // Service pages
  for (const s of servicesData) {
    const routePath = `/services/${s.slug}`;
    add(
      routePath,
      serviceSchema({
        name: s.title,
        description: s.metaDescription,
        url: `${SITE}${routePath}`,
        areaServed: GCP_BUSINESS.areaServed.map((a) => ({
          "@type": "City",
          name: a,
        })),
      }),
    );
    if (s.faqs && s.faqs.length) add(routePath, faqSchema(s.faqs));
  }

  // City pages
  for (const l of locations) {
    const routePath = `/${l.slug}`;
    add(
      routePath,
      serviceSchema({
        name: `Palm Tree Trimming in ${l.city}, ${l.state}`,
        description: l.metaDescription,
        url: `${SITE}${routePath}`,
        areaServed: [
          {
            "@type": "City",
            name: l.city,
            containedInPlace: { "@type": "State", name: "Florida" },
            ...(l.geo
              ? {
                  geo: {
                    "@type": "GeoCoordinates",
                    latitude: l.geo.latitude,
                    longitude: l.geo.longitude,
                  },
                }
              : {}),
          },
        ],
      }),
    );
    if (l.faqs && l.faqs.length) add(routePath, faqSchema(l.faqs));
  }

  // Breadcrumbs on nested routes
  for (const routePath of Object.keys(titles)) {
    add(routePath, breadcrumbSchema(routePath, titles[routePath]));
  }

  return out;
}

/**
 * Trust facts, as real static text, for every public page. Wording mirrors
 * what the footer and hero badge already render in the browser.
 */
export function trustFactsText(): string[] {
  const { ratingValue, reviewCount } = GCP_BUSINESS.aggregateRating;
  return [
    `Gulf Coast Palms — call or text ${GCP_BUSINESS.phoneDisplay} for a free quote.`,
    `We hold a ${ratingValue} rating from ${reviewCount} five-star Google reviews and are fully licensed and insured, with general liability insurance and workers' compensation coverage on every job.`,
    `Serving the entire Emerald Coast: ${GCP_BUSINESS.areaServed.join(", ")}.`,
  ];
}
