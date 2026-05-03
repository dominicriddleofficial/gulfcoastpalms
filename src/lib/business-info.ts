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
  logo: "https://gulfcoastpalmservices.com/og-image.png",
  ogImage: "https://gulfcoastpalmservices.com/og-image.png",
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
  aggregateRating: { ratingValue: "5.0", reviewCount: "54" },
} as const;

/** Convenient href helpers */
export const TEL_HREF = `tel:${GCP_BUSINESS.phoneDigits}`;
export const SMS_HREF = `sms:${GCP_BUSINESS.phoneDigits}`;