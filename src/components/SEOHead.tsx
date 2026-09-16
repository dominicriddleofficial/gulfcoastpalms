import { Helmet } from "react-helmet-async";
import { GCP_BUSINESS } from "@/lib/business-info";
import { getRouteMeta } from "@/seo/routeMeta";

const BASE_URL = GCP_BUSINESS.url;
const DEFAULT_OG_IMAGE = GCP_BUSINESS.ogImage;

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
}

const SEOHead = ({
  title,
  description,
  canonicalUrl,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  noIndex = false,
}: SEOHeadProps) => {
  const routePath = canonicalUrl
    ? new URL(canonicalUrl, BASE_URL).pathname.replace(/\/+$/, "") || "/"
    : undefined;
  const meta = routePath ? getRouteMeta(routePath) : undefined;
  title = meta?.title ?? title;
  description = meta?.description ?? description;
  noIndex = noIndex || meta?.noindex === true;
  const fullCanonical = noIndex ? undefined : meta?.canonical ?? (canonicalUrl
    ? canonicalUrl.startsWith("http") ? canonicalUrl : `${BASE_URL}${canonicalUrl}`
    : undefined);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {fullCanonical && <link rel="canonical" href={fullCanonical} />}
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={GCP_BUSINESS.ogImageAlt} />
      <meta property="og:site_name" content={GCP_BUSINESS.name} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      {fullCanonical && <meta property="og:url" content={fullCanonical} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={GCP_BUSINESS.ogImageAlt} />
    </Helmet>
  );
};

export default SEOHead;
