/**
 * Build-time static body copy for the public marketing routes.
 *
 * Purpose: the site is a client-rendered Vite SPA, so the raw HTML that
 * non-JS crawlers receive contained only the <head>. This module returns
 * the *existing* marketing copy for each public route (sourced from the
 * same data modules the React pages render from, so the words are
 * identical) and `scripts/prerender-meta.mjs` injects it into the
 * per-route static HTML at build time.
 *
 * Rules:
 *  - Marketing copy only. Never anything fetched from the backend and
 *    never anything user-specific.
 *  - Only paths present in `src/seo/routes.data.mjs` are generated, so
 *    /platform/* (and every other app route) is structurally excluded.
 *  - Wording here must stay verbatim identical to what the page renders.
 */

import { servicesData } from "@/data/services";
import { locations } from "@/data/locations";
import { palmTypes } from "@/data/palmTypes";
import { palmGuides } from "@/data/palmGuides";
import { articles } from "@/data/learnArticles";
import { homeFaqs } from "@/data/homeFaq";

export interface StaticBlock {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
}

export interface StaticPageContent {
  h1: string;
  subheading?: string;
  blocks: StaticBlock[];
}

function faqBlocks(faqs?: { q: string; a: string }[]): StaticBlock[] {
  if (!faqs || faqs.length === 0) return [];
  return [
    { heading: "Frequently Asked Questions" },
    ...faqs.map((f) => ({ heading: f.q, paragraphs: [f.a] })),
  ];
}

/** Routes whose copy lives inline in the page component rather than a data module. */
const literalContent: Record<string, StaticPageContent> = {
  "/": {
    h1: "Resort-Quality Palm Care for Florida's Emerald Coast",
    subheading:
      "Palm-tree specialists with 500+ properties served across the Emerald Coast. Same-day estimates. No generalist crews.",
    blocks: [
      { paragraphs: ["Serving Perdido Key to 30A"] },
      {
        heading: "Professional Palm Tree Services",
        paragraphs: [
          "From palm tree trimming and diamond cutting to installation and safe removals — we specialize exclusively in palm trees across the Emerald Coast.",
        ],
        list: servicesData.map((s) => s.title),
      },
      {
        heading: "Palm Tree Service Areas",
        list: locations.map((l) => `Palm tree trimming in ${l.city}, ${l.state}`),
      },
      {
        heading: "Frequently Asked Questions",
        paragraphs: [
          "Everything you need to know about our palm tree services across the Gulf Coast.",
          ...homeFaqs.flatMap((f) => [f.q, f.a]),
        ],
      },
    ],
  },
  "/services": {
    h1: "Professional Palm Tree Services",
    subheading:
      "From palm tree trimming and diamond cutting to installation and safe removals — we specialize exclusively in palm trees across the Emerald Coast.",
    blocks: servicesData.map((s) => ({
      heading: s.title,
      paragraphs: [s.introParagraphs[0]],
    })),
  },
  "/about": {
    h1: "About Gulf Coast Palms",
    subheading:
      "Your trusted local experts for all palm tree services along Florida's Emerald Coast.",
    blocks: [],
  },
  "/service-areas": {
    h1: "Palm Tree Trimming Across the Emerald Coast",
    subheading:
      "Gulf Coast Palms proudly provides professional palm tree trimming, diamond cutting, and expert palm care throughout Northwest Florida's Gulf Coast communities.",
    blocks: [
      {
        heading: "Communities We Serve",
        list: locations.map((l) => `${l.city}, ${l.state}`),
      },
    ],
  },
  "/gallery": {
    h1: "Before & After Gallery",
    subheading:
      "Tap or hover to toggle between before and after. Real results from Gulf Coast properties.",
    blocks: [],
  },
  "/quote": {
    h1: "Get a Free Quote",
    subheading:
      "Tell us about your palms — we typically respond within 15 minutes during business hours.",
    blocks: [],
  },
  "/jobs": {
    h1: "Jobs Completed",
    subheading:
      "Browse our recent work across the Emerald Coast. Every property gets the same professional care and attention to detail.",
    blocks: [],
  },
  "/referral": {
    h1: "Refer a Friend, Both Get Rewarded",
    subheading:
      "Share Gulf Coast Palms with your neighbors and earn $50 off your next service — for each referral that becomes a customer.",
    blocks: [],
  },
  "/payments": {
    h1: "Payments & Invoicing",
    subheading: "Simple, transparent payment options for all Gulf Coast Palms services.",
    blocks: [],
  },
  "/commercial": {
    h1: "Palm & Tree Care for Property Portfolios",
    subheading:
      "One crew for every address in your portfolio. Gulf Coast Palms partners with property managers, HOAs, and commercial owners across Northwest Florida — with volume pricing, photo documentation, and priority hurricane response.",
    blocks: [],
  },
  "/commercial-palm-tree-services": {
    h1: "Palm & Tree Care for Property Portfolios",
    subheading:
      "One crew for every address in your portfolio. Gulf Coast Palms partners with property managers, HOAs, and commercial owners across Northwest Florida — with volume pricing, photo documentation, and priority hurricane response.",
    blocks: [],
  },
  "/hoa-commercial-palm-maintenance": {
    h1: "Palm Tree Maintenance for HOAs, Resorts & Commercial Properties",
    subheading:
      "Professional palm trimming and maintenance programs for large properties across Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, Destin, 30A, and Perdido Key.",
    blocks: [],
  },
  "/hurricane-palm-preparation": {
    h1: "Hurricane Preparation for Palm Trees",
    subheading:
      "Protect your property and reduce storm damage with proper palm trimming and preparation across the Emerald Coast.",
    blocks: [],
  },
  "/emergency-palm-service": {
    h1: "Storm Damage? We Respond Fast Across NW Florida",
    subheading:
      "Leaning palms, downed fronds, root instability — we assess, document, and resolve palm emergencies quickly and safely.",
    blocks: [],
  },
  "/holiday-lighting": {
    h1: "Professional Holiday Lighting for NW Florida Homes & Properties",
    subheading:
      "Installation, takedown, and storage handled completely by us. You enjoy the holidays — we handle the lights.",
    blocks: [],
  },
  "/palm-tree-cost": {
    h1: "Palm Tree Cost",
    subheading:
      "Honest pricing information for palm tree trimming, diamond cutting, trunk skinning, installation, and removal across the Emerald Coast.",
    blocks: [],
  },
  "/palm-tree-maintenance-plans": {
    h1: "Keep Your Palms Healthy Year-Round",
    subheading:
      "Set it and forget it — Gulf Coast Palms handles your scheduled palm maintenance so you never have to think about it.",
    blocks: [],
  },
  "/palm-trees/types": {
    h1: "Palm Tree Types for Florida's Gulf Coast",
    subheading:
      "Explore the most popular palm species for the Emerald Coast. Learn about growth habits, maintenance needs, and which palms are best for your property.",
    blocks: palmTypes.map((p) => ({
      heading: p.name,
      paragraphs: [p.shortDescription],
    })),
  },
  "/palm-trees/buy": {
    h1: "Palm Trees — Sourced, Delivered & Installed",
    subheading:
      "One call. We handle everything — sourcing, delivery, professional planting, and bracing. No nursery runs. No separate install crew. Done in a single visit.",
    blocks: palmTypes.map((p) => ({
      heading: p.name,
      paragraphs: [p.shortDescription, p.priceRange],
    })),
  },
  "/palm-trees/guides": {
    h1: "Palm Care Guides",
    subheading:
      "Professional tips, cost guides, and expert advice on palm tree trimming and maintenance from Gulf Coast Palms.",
    blocks: palmGuides.map((g) => ({ heading: g.title, paragraphs: [g.excerpt] })),
  },
  "/learn": {
    h1: "Your Palm Tree Resource Center",
    subheading:
      "Expert advice for NW Florida homeowners — from trimming schedules and disease identification to hurricane prep and cost guides.",
    blocks: articles.map((a) => ({
      heading: a.title,
      paragraphs: [a.metaDescription],
    })),
  },
  "/careers/gulf-coast-palms": {
    h1: "Join the Gulf Coast Palms Team",
    subheading:
      "Work with a fast-growing local palm tree trimming company that values speed, quality, safety, and professionalism.",
    blocks: [],
  },
  "/careers/palm-tree-trimmer": {
    h1: "Palm Tree Trimmer / Team Lead",
    subheading: "25% of every job you run.",
    blocks: [
      {
        paragraphs: [
          "Run your own jobs for the #1 rated palm crew on the Emerald Coast. 25% of every job you run — your speed and skill set your pay.",
        ],
      },
    ],
  },
  "/terms-of-service": {
    h1: "Terms of Service",
    subheading: "Last updated: April 5, 2026",
    blocks: [],
  },
  "/privacy-policy": {
    h1: "Privacy Policy",
    subheading: "Last updated: April 5, 2026",
    blocks: [],
  },
  "/text-consent": {
    h1: "Text Message Consent",
    subheading:
      "Opt in to receive text messages from Gulf Coast Palms regarding your service requests, quotes, and updates.",
    blocks: [],
  },
  "/thank-you": {
    h1: "Thank You!",
    subheading:
      "We've received your request and will get back to you shortly. Our team typically responds within 15 minutes during business hours.",
    blocks: [],
  },
  "/services/tree-trimming-removal": {
    h1: "Tree Trimming & Removal — NW Florida",
    subheading:
      "Expert trimming and safe removal for oaks, pines, crape myrtles, and more. Licensed, insured, and serving the entire Emerald Coast.",
    blocks: [],
  },
  "/services/landscaping-services": {
    h1: "Professional Landscaping Services",
    subheading:
      "Hedge trimming, mulch, pine straw, sod installation, and bed cleanups across Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, Destin, and the entire Emerald Coast.",
    blocks: [],
  },
};

export function buildStaticContent(): Record<string, StaticPageContent> {
  const out: Record<string, StaticPageContent> = { ...literalContent };

  // Service detail pages
  for (const s of servicesData) {
    out[`/services/${s.slug}`] = {
      h1: s.title,
      subheading: s.heroSubheading,
      blocks: [
        { paragraphs: s.introParagraphs },
        { heading: "Benefits", list: s.benefits },
        { heading: s.secondaryHeading, paragraphs: s.secondaryContent },
        ...(s.procesSteps
          ? [
              { heading: "Our Process" },
              ...s.procesSteps.map((p) => ({
                heading: p.step,
                paragraphs: [p.description],
              })),
            ]
          : []),
        ...(s.bundleSection
          ? [{ heading: s.bundleSection.heading, paragraphs: s.bundleSection.content }]
          : []),
        ...(s.warrantySection
          ? [{ heading: s.warrantySection.heading, paragraphs: s.warrantySection.content }]
          : []),
        ...faqBlocks(s.faqs),
        { heading: s.ctaHeading, paragraphs: [s.ctaText] },
      ],
    };
  }

  // City / location pages
  for (const l of locations) {
    out[`/${l.slug}`] = {
      h1: l.h1,
      subheading: l.subheading,
      blocks: [
        { paragraphs: l.introParagraphs },
        ...(l.highlight ? [{ paragraphs: [l.highlight] }] : []),
        { heading: `Our Services in ${l.city}`, list: l.services },
        {
          heading: l.whyChooseTitle,
          list: l.whyChoosePoints,
          paragraphs: [l.whyChooseClosing],
        },
        ...(l.pricingTiers
          ? [
              {
                heading: `Palm Trimming Pricing in ${l.city}`,
                list: l.pricingTiers.map(
                  (t) => `${t.name} — ${t.price} — ${t.bestFor}`,
                ),
                paragraphs: l.pricingNote ? [l.pricingNote] : undefined,
              },
            ]
          : []),
        ...(l.neighborhoods
          ? [{ heading: `Neighborhoods We Serve in ${l.city}`, list: l.neighborhoods }]
          : []),
        ...faqBlocks(l.faqs),
        { heading: l.ctaHeading, paragraphs: [l.ctaText] },
      ],
    };
  }

  // Palm species pages
  for (const p of palmTypes) {
    out[`/palm-trees/${p.slug}`] = {
      h1: p.name,
      subheading: p.heroDescription,
      blocks: [
        { paragraphs: [p.scientificName, ...p.description] },
        {
          heading: "At a Glance",
          list: [
            `Height: ${p.height}`,
            `Growth rate: ${p.growthRate}`,
            `Best regions: ${p.bestRegions}`,
            `Cold hardiness: ${p.coldHardiness}`,
            `Price range: ${p.priceRange}`,
          ],
        },
        { heading: "Maintenance", list: p.maintenance },
        { heading: "Trimming Recommendations", list: p.trimmingRecommendations },
        { heading: "Installation Overview", paragraphs: p.installationOverview },
      ],
    };
  }

  // Palm care guides
  for (const g of palmGuides) {
    out[`/palm-trees/guides/${g.slug}`] = {
      h1: g.title,
      subheading: g.excerpt,
      blocks: [{ paragraphs: g.content }],
    };
  }

  // Learn articles
  for (const a of articles) {
    out[`/learn/${a.slug}`] = {
      h1: a.title,
      blocks: a.sections.map((s) => ({
        heading: s.heading,
        paragraphs: s.paragraphs,
      })),
    };
  }

  return out;
}