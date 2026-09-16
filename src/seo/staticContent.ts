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
import { trustFactsText } from "@/seo/jsonLd";

export { buildRouteJsonLd, localBusinessSchema, trustFactsText } from "@/seo/jsonLd";

export interface StaticBlock {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
  links?: { label: string; href: string }[];
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
    h1: "Palm Tree Trimming & Care for Florida's Emerald Coast",
    subheading:
      "Palm-tree specialists with 500+ properties served across the Emerald Coast. Same-day estimates. No generalist crews.",
    blocks: [
      { paragraphs: ["Serving Perdido Key to 30A"] },
      {
        heading: "Professional Palm Tree Services",
        paragraphs: [
          "From palm tree trimming and diamond cutting to installation and safe removals — we specialize exclusively in palm trees across the Emerald Coast.",
        ],
        links: servicesData.map((s) => ({ label: s.title, href: `/services/${s.slug}` })),
      },
      {
        heading: "Palm Tree Service Areas",
        links: locations.map((l) => ({ label: `Palm tree trimming in ${l.city}, ${l.state}`, href: `/${l.slug}` })),
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
      links: [{ label: s.title, href: `/services/${s.slug}` }],
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
        links: locations.map((l) => ({ label: `${l.city}, ${l.state}`, href: `/${l.slug}` })),
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
      links: [{ label: p.name, href: `/palm-trees/${p.slug}` }],
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
    blocks: palmGuides.map((g) => ({ heading: g.title, paragraphs: [g.excerpt], links: [{ label: g.title, href: `/palm-trees/guides/${g.slug}` }] })),
  },
  "/learn": {
    h1: "Your Palm Tree Resource Center",
    subheading:
      "Expert advice for NW Florida homeowners — from trimming schedules and disease identification to hurricane prep and cost guides.",
    blocks: articles.map((a) => ({
      heading: a.title,
      paragraphs: [a.metaDescription],
      links: [{ label: a.title, href: `/learn/${a.slug}` }],
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

/** Existing landing-page copy, kept aligned with the corresponding React pages. */
const landingContent: Record<string, StaticPageContent> = {
  "/commercial": {
    "h1": "Palm & Tree Care for Property Portfolios",
    "blocks": [
      {
        "heading": "Who We Work With"
      },
      {
        "paragraphs": [
          "If you manage more than one property, you get a dedicated point of contact and simplified billing."
        ]
      },
      {
        "heading": "Why Property Managers Choose Gulf Coast Palms"
      },
      {
        "heading": "Services We Deliver at Scale"
      },
      {
        "heading": "Request Portfolio Pricing"
      },
      {
        "paragraphs": [
          "Send us the property list and we'll come back with a per-visit rate and a proposed schedule — usually within one business day."
        ]
      }
    ],
    "subheading": "One crew for every address in your portfolio. Gulf Coast Palms partners with property managers, HOAs, and commercial owners across Northwest Florida — with volume pricing, photo documentation, and priority hurricane response."
  },
  "/palm-tree-cost": {
    "h1": "Palm Tree Cost",
    "blocks": [
      {
        "heading": "Palm Tree Trimming Cost"
      },
      {
        "paragraphs": [
          "Every palm tree is different, and pricing reflects the unique characteristics of each job. We don't believe in one-size-fits-all pricing — instead, we evaluate your specific palms and provide an honest, transparent quote."
        ]
      },
      {
        "paragraphs": [
          "The cost of palm tree trimming varies based on several key factors:"
        ]
      },
      {
        "paragraphs": [
          "Properties with more palms often benefit from volume pricing. Whether you have 3 palms or 300, we'll provide a competitive quote that reflects the scope of the job."
        ]
      },
      {
        "paragraphs": [
          "The fastest way to get an accurate price? Text us a photo of your palms — we'll respond with an estimate quickly."
        ]
      },
      {
        "heading": "Diamond Cutting & Trunk Skinning Cost"
      },
      {
        "paragraphs": [
          "Palm Diamond Cutting and Palm Trunk Skinning are priced per foot of trunk height being cleaned."
        ]
      },
      {
        "paragraphs": [
          "This pricing model ensures you only pay for the work being done. A 10-foot trunk costs less than a 30-foot trunk — simple and fair."
        ]
      },
      {
        "paragraphs": [
          "Both services are often combined with palm tree trimming for a complete palm makeover at a bundled rate."
        ]
      },
      {
        "heading": "Palm Tree Removal Cost"
      },
      {
        "paragraphs": [
          "Palm tree removal pricing depends on multiple factors unique to each job:"
        ]
      },
      {
        "paragraphs": [
          "Removals near power lines, buildings, or in tight spaces require extra care and specialized equipment. Every removal includes complete debris cleanup and haul-away."
        ]
      },
      {
        "heading": "Palm Tree Installation Cost"
      },
      {
        "paragraphs": [
          "Palm tree installation pricing depends on:"
        ]
      },
      {
        "paragraphs": [
          "Every installation includes professional planting, root ball securing, initial watering, and soil conditioning. Browse our available palms on the Buy Palm Trees page."
        ]
      },
      {
        "paragraphs": [
          "All installations include a 1-year establishment warranty."
        ]
      },
      {
        "paragraphs": [
          "Want the full breakdown by height & species? Read the full 2026 Florida palm-trimming cost guide →"
        ]
      },
      {
        "heading": "Get an Instant Quote"
      },
      {
        "paragraphs": [
          "The fastest way to get a price? Text us a photo of your palm trees and we'll respond with an estimate."
        ]
      }
    ],
    "subheading": "Honest pricing information for palm tree trimming, diamond cutting, trunk skinning, installation, and removal across the Emerald Coast."
  },
  "/palm-tree-maintenance-plans": {
    "h1": "Keep Your Palms Healthy Year-Round",
    "blocks": [
      {
        "heading": "Why a Maintenance Plan?"
      },
      {
        "heading": "Plan Options"
      },
      {
        "paragraphs": [
          "Custom quote"
        ]
      },
      {
        "heading": "What's Included in Every Plan"
      },
      {
        "heading": "Frequently Asked Questions"
      },
      {
        "heading": "Start My Maintenance Plan"
      }
    ],
    "subheading": "Set it and forget it — Gulf Coast Palms handles your scheduled palm maintenance so you never have to think about it."
  },
  "/hoa-commercial-palm-maintenance": {
    "h1": "Palm Tree Maintenance for HOAs, Resorts & Commercial Properties",
    "blocks": [
      {
        "heading": "Why Property Managers Choose Gulf Coast Palms"
      },
      {
        "heading": "Recurring Maintenance Programs"
      },
      {
        "paragraphs": [
          "Our maintenance programs are designed to keep your palms healthy, safe, and looking their best — all year round."
        ]
      },
      {
        "heading": "Properties We Work With"
      },
      {
        "heading": "Large Property Experience"
      },
      {
        "paragraphs": [
          "Gulf Coast Palms frequently maintains properties with dozens or even hundreds of palm trees. We understand the logistics of large-scale trimming operations — from efficient crew scheduling to minimize disruption, to coordinating access across multi-building communities."
        ]
      },
      {
        "paragraphs": [
          "Whether your property has 50 Sabal palms or 200+ palms of mixed species, we deliver consistent quality across every tree. Our team understands that HOA boards and property managers need reliability, professionalism, and documented results — and that's exactly what we provide."
        ]
      },
      {
        "paragraphs": [
          "We serve commercial and HOA properties throughout the Emerald Coast, including Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, Destin, 30A, and Perdido Key."
        ]
      },
      {
        "heading": "Request a Property Maintenance Consultation"
      },
      {
        "paragraphs": [
          "Contact us to schedule an on-site property assessment. We'll evaluate your palms and build a custom maintenance program for your property."
        ]
      }
    ],
    "subheading": "Professional palm trimming and maintenance programs for large properties across Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, Destin, 30A, and Perdido Key."
  },
  "/hurricane-palm-preparation": {
    "h1": "Hurricane Preparation for Palm Trees",
    "blocks": [
      {
        "heading": "Why Palm Preparation Matters Before Hurricanes"
      },
      {
        "paragraphs": [
          "Florida's Emerald Coast faces powerful coastal storms and high winds every hurricane season. Untrimmed or poorly trimmed palms create serious risks, including:"
        ]
      },
      {
        "paragraphs": [
          "Proactive storm preparation trimming is one of the most effective steps property owners can take to reduce wind damage, protect structures, and keep residents safe during hurricane season."
        ]
      },
      {
        "heading": "Proper Hurricane Palm Trimming"
      },
      {
        "paragraphs": [
          "There's a right way and a wrong way to prepare palms for storms. Improper trimming — especially aggressive \"hurricane cuts\" — can actually weaken palms and increase storm damage risk."
        ]
      },
      {
        "heading": "Signs Your Palms Need Storm Preparation"
      },
      {
        "paragraphs": [
          "If any of these signs apply to your palms, contact Gulf Coast Palms before storm season. Early preparation is always safer and more affordable than emergency cleanup after a hurricane."
        ]
      },
      {
        "heading": "Hurricane Prep Service Areas"
      },
      {
        "paragraphs": [
          "We provide hurricane palm preparation services across the entire Emerald Coast of Florida."
        ]
      },
      {
        "heading": "Prepare Your Palms Before Storm Season"
      },
      {
        "paragraphs": [
          "Don't wait for a hurricane warning. Schedule your palm trimming now and protect your property, your family, and your investment."
        ]
      }
    ],
    "subheading": "Protect your property and reduce storm damage with proper palm trimming and preparation across the Emerald Coast."
  },
  "/emergency-palm-service": {
    "h1": "Storm Damage? We Respond Fast Across NW Florida",
    "blocks": [
      {
        "heading": "What Qualifies as a Palm Emergency?"
      },
      {
        "heading": "Insurance Claim Documentation"
      },
      {
        "paragraphs": [
          "Filing an insurance claim for storm-damaged palms? Gulf Coast Palms can help. We provide detailed photo documentation, written damage assessments, and professional reports to support your homeowner's insurance claim."
        ]
      },
      {
        "paragraphs": [
          "Our team photographs all damage, documents the condition and species of each affected palm, and provides a written assessment with cost estimates. This documentation has helped dozens of Gulf Coast homeowners successfully file claims and get reimbursed for emergency tree work."
        ]
      },
      {
        "heading": "Report a Palm Emergency"
      },
      {
        "paragraphs": [
          "Fill out the form and we'll call you back as soon as possible."
        ]
      },
      {
        "paragraphs": [
          "Our team will call you as soon as possible. For immediate help, call (850) 910-1290."
        ]
      },
      {
        "heading": "What Happens Next"
      }
    ],
    "subheading": "Leaning palms, downed fronds, root instability — we assess, document, and resolve palm emergencies quickly and safely."
  },
  "/holiday-lighting": {
    "h1": "Professional Holiday Lighting for NW Florida Homes & Properties",
    "blocks": [
      {
        "heading": "Why Professional Holiday Lighting?"
      },
      {
        "heading": "Our Holiday Lighting Services"
      },
      {
        "heading": "Service Areas"
      },
      {
        "heading": "Book Early — We Fill Up Fast"
      },
      {
        "paragraphs": [
          "October and November fill up quickly. Request your estimate now to secure your spot."
        ]
      },
      {
        "heading": "Get Your Free Holiday Lighting Estimate"
      },
      {
        "heading": "Frequently Asked Questions"
      }
    ],
    "subheading": "Installation, takedown, and storage handled completely by us. You enjoy the holidays — we handle the lights."
  },
  "/referral": {
    "h1": "Refer a Friend, Both Get Rewarded",
    "blocks": [
      {
        "heading": "How It Works"
      },
      {
        "heading": "Referral Rewards Tiers"
      },
      {
        "heading": "Submit Your Referral"
      },
      {
        "heading": "Questions About the Referral Program?"
      },
      {
        "paragraphs": [
          "Call or text us anytime."
        ]
      }
    ],
    "subheading": "Share Gulf Coast Palms with your neighbors and earn $50 off your next service — for each referral that becomes a customer."
  },
  "/payments": {
    "h1": "Payments & Invoicing",
    "blocks": [
      {
        "heading": "Deposit Payments"
      },
      {
        "paragraphs": [
          "For larger projects like palm installations, we may require a deposit to secure your booking and order materials. Deposits are typically 50% of the total project cost."
        ]
      },
      {
        "heading": "Invoice Payments"
      },
      {
        "paragraphs": [
          "After service completion, we'll send you a detailed invoice with a secure payment link. Pay online at your convenience — no need for cash or checks."
        ]
      },
      {
        "heading": "Have a Payment Question?"
      },
      {
        "paragraphs": [
          "Contact us for billing inquiries or to request an invoice."
        ]
      }
    ],
    "subheading": "Simple, transparent payment options for all Gulf Coast Palms services."
  },
  "/careers/gulf-coast-palms/team-leader": {
    "h1": "Team Leader",
    "blocks": [
      {
        "paragraphs": [
          "We need someone who can drive the truck and trailer, lead the crew, talk to customers, and keep every job running efficiently. If you can take ownership and make things happen, this role is for you."
        ]
      },
      {
        "heading": "What You'll Do"
      },
      {
        "heading": "What We Offer"
      },
      {
        "heading": "What We're Looking For"
      },
      {
        "paragraphs": [
          "Experience in tree work, landscaping, trailers, ladders, saws, cleanup, or outdoor labor goes a long way. But we're still open to the right person if they have the attitude, discipline, and work ethic to learn and lead."
        ]
      },
      {
        "heading": "Our Standards"
      },
      {
        "paragraphs": [
          "We move fast, work hard, protect customer property, and take pride in doing clean, professional work. If you're dependable, coachable, and want to grow with a serious company — this could be a strong fit."
        ]
      },
      {
        "heading": "Apply Now"
      },
      {
        "paragraphs": [
          "Fill out the form below and we'll be in touch if your background looks like a fit."
        ]
      }
    ],
    "subheading": "Lead crews in the field for a fast-growing palm tree trimming company that values speed, quality, safety, and professionalism."
  },
  "/careers/gulf-coast-palms/groundsman": {
    "h1": "Groundsman",
    "blocks": [
      {
        "paragraphs": [
          "We need someone who can move with pace, drag brush, load the trailer, and help keep every job site clean and efficient. Groundsman positions typically start around $20/hr during the first month and can move up to $25/hr."
        ]
      },
      {
        "heading": "What You'll Do"
      },
      {
        "heading": "What We Offer"
      },
      {
        "heading": "What We're Looking For"
      },
      {
        "paragraphs": [
          "Experience in tree work, landscaping, trailers, cleanup, or outdoor labor is a plus. But we're open to the right person if they have the attitude, discipline, and work ethic to learn."
        ]
      },
      {
        "heading": "Our Standards"
      },
      {
        "paragraphs": [
          "We move fast, work hard, protect customer property, and take pride in doing clean, professional work. If you're dependable, coachable, and want to grow with a serious company — this could be a strong fit."
        ]
      },
      {
        "heading": "Apply Now"
      },
      {
        "paragraphs": [
          "Fill out the form below and we'll be in touch if your background looks like a fit."
        ]
      }
    ],
    "subheading": "Support the crew from the ground on palm tree trimming jobs across the Gulf Coast."
  },
  "/careers/gulf-coast-palms/sales-operations": {
    "h1": "Sales & Operations Coordinator",
    "blocks": [
      {
        "paragraphs": [
          "This is a real growth position for someone who's sharp, organized, and wants to play a major role in how this company scales. You'll be the voice of the company and the engine that keeps the schedule tight."
        ]
      },
      {
        "heading": "What You'll Do"
      },
      {
        "heading": "What We Offer"
      },
      {
        "heading": "What We're Looking For"
      },
      {
        "paragraphs": [
          "Experience in customer service, scheduling, dispatch, sales, office/admin, or service business operations is a strong plus. But we're open to the right person if they have the drive, communication skills, and work ethic to learn fast."
        ]
      },
      {
        "heading": "Our Standards"
      },
      {
        "paragraphs": [
          "We move fast, stay organized, and take pride in how we communicate with customers. If you're sharp, dependable, and want to grow with a serious company — this could be a strong fit."
        ]
      },
      {
        "heading": "Apply Now"
      },
      {
        "paragraphs": [
          "Fill out the form below and we'll be in touch if your background looks like a fit."
        ]
      }
    ],
    "subheading": "Run the front end of a fast-growing palm tree trimming company — manage leads, book quotes, and keep everything organized."
  },
  "/careers/thank-you": {
    "h1": "Thanks for Applying",
    "blocks": [],
    "subheading": "We received your application. If your background looks like a fit, we'll be in touch soon."
  }
};

export function buildStaticContent(): Record<string, StaticPageContent> {
  const out: Record<string, StaticPageContent> = { ...literalContent, ...landingContent };

  out["/commercial-palm-tree-services"] = out["/commercial"];

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
      blocks: [...a.sections.map((s) => ({
        heading: s.heading,
        paragraphs: s.paragraphs,
      })), { heading: "Related Palm Services & Guides", links: [
        { label: "Professional palm tree trimming", href: "/services/palm-tree-trimming" },
        { label: "Palm tree removal", href: "/services/palm-tree-removal" },
        { label: "Palm tree service costs", href: "/palm-tree-cost" },
        ...articles.filter((other) => other.slug !== a.slug).map((other) => ({ label: other.title, href: `/learn/${other.slug}` })),
      ] }],
    };
  }

  // Trust facts (phone, real Google rating + review count, service area,
  // licensed/insured status) appended to every public page as real text so
  // AI crawlers reading the raw HTML can cite contact info and credibility.
  const trust = trustFactsText();
  for (const key of Object.keys(out)) {
    out[key] = {
      ...out[key],
      blocks: [...out[key].blocks, { heading: "Gulf Coast Palms", paragraphs: trust }],
    };
  }

  return out;
}