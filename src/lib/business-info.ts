/**
 * Centralized business information for Gulf Coast Palms.
 *
 * Use this as the single source of truth for phone numbers, addresses,
 * domain, and structured-data fields across the site. Importing from
 * here keeps brand info consistent and easy to update in one place.
 */

export const GCP_BUSINESS = {
  name: "Gulf Coast Palms",
  legalName: "Gulf Coast Palms LLC",
  /** E.164 format — use in tel: links and structured data */
  phone: "+1-850-910-1290",
  /** Display format — use in visible labels */
  phoneDisplay: "(850) 910-1290",
  /** Raw digits — used by tel:/sms: hrefs to maximize compatibility */
  phoneDigits: "8509101290",
  email: "info@gulfcoastpalmservices.com",
  url: "https://gulfcoastpalmservices.com",
  logo: "https://gulfcoastpalmservices.com/og-image.jpg",
  ogImage: "https://gulfcoastpalmservices.com/og-image.jpg",
  ogImageAlt:
    "Gulf Coast Palms — professional palm tree trimming, installation, and removal across Florida's Emerald Coast",
  address: {
    streetAddress: "7371 Grand Navarre Blvd",
    addressLocality: "Navarre",
    addressRegion: "FL",
    postalCode: "32566",
    addressCountry: "US",
  },
  geo: { latitude: 30.3577, longitude: -87.1636 },
  areaServed: [
    "Pensacola",
    "Navarre",
    "Gulf Breeze",
    "Destin",
    "Fort Walton Beach",
    "Milton",
    "Pace",
    "30A",
    "Perdido Key",
    "Niceville",
    "Mary Esther",
    "Santa Rosa Beach",
  ],
  sameAs: [
    "https://www.facebook.com/gulfcoastpalmtreetrimming/",
    "https://g.page/r/CVI5xmZYC-NAEBM",
    "https://www.instagram.com/gulfcoastpalms",
  ] as string[],
  priceRange: "$$",
  aggregateRating: { ratingValue: "5.0", reviewCount: "100" },
} as const;

/** Convenient href helpers */
export const TEL_HREF = `tel:${GCP_BUSINESS.phoneDigits}`;
/**
 * Site-wide "Text Us a Photo" CTA body. Encoded once so links can be built
 * without repeating the string. iOS Safari expects `sms:NUMBER&body=...`
 * (Android also accepts `?body=` — iOS form works on both).
 */
export const SMS_BODY =
  "Hi Gulf Coast Palms! I'd like a quote — here's a photo of my palms:";
export const SMS_BODY_ENCODED = encodeURIComponent(SMS_BODY);
/** Raw sms: href without body prefill — for admin / dynamic-recipient use. */
export const SMS_HREF_RAW = `sms:${GCP_BUSINESS.phoneDigits}`;
/** Public "Text Us a Photo" CTA link with body prefill. */
export const SMS_HREF = `${SMS_HREF_RAW}&body=${SMS_BODY_ENCODED}`;