import { GCP_BUSINESS } from "@/lib/business-info";

/** One business entity for both the static HTML and the rendered website. */
export function localBusinessSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    "@id": `${GCP_BUSINESS.url}/#business`,
    name: GCP_BUSINESS.name,
    legalName: GCP_BUSINESS.legalName,
    description: "Palm tree trimming, diamond cutting, trunk skinning, installation, removal and hurricane preparation across Northwest Florida's Emerald Coast.",
    telephone: GCP_BUSINESS.phone,
    email: GCP_BUSINESS.email,
    url: GCP_BUSINESS.url,
    logo: GCP_BUSINESS.logo,
    image: GCP_BUSINESS.ogImage,
    priceRange: GCP_BUSINESS.priceRange,
    address: { "@type": "PostalAddress", ...GCP_BUSINESS.address },
    areaServed: GCP_BUSINESS.areaServed.map((name) => ({
      "@type": "Place",
      name,
      containedInPlace: { "@type": "State", name: "Florida" },
    })),
    sameAs: [...GCP_BUSINESS.sameAs],
    // Do not manufacture branch offices, precise coordinates, opening hours,
    // or self-serving review markup from service-area/marketing information.
  };
}
