/**
 * "Page not found", inside the new header and footer.
 *
 * Same wording, page title, description and no-index setting as the current page
 * (src/pages/NotFound.tsx), the same log line for the missing address, and the same
 * report names for its quote button ("not_found") and call link ("404_page").
 */
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import { GCP_BUSINESS } from "@/lib/business-info";
import Layout from "../chrome/Layout";
import { CallLink, QuoteLink } from "../lib/actions";
import { PhoneIcon } from "../lib/icons";

/** Own description for missing addresses, never the homepage's. Copied from the current page. */
const NOT_FOUND_DESCRIPTION =
  "This page doesn't exist. Find palm tree trimming, removal, and hurricane prep for NW Florida on the Gulf Coast Palms site.";

export default function Missing() {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      {/* Missing addresses have no canonical link and are kept out of search results. */}
      <Helmet>
        <title>Page Not Found | Gulf Coast Palms</title>
        <meta name="description" content={NOT_FOUND_DESCRIPTION} />
        <meta name="robots" content="noindex, nofollow" />
        <meta property="og:title" content="Page Not Found | Gulf Coast Palms" />
        <meta property="og:description" content={NOT_FOUND_DESCRIPTION} />
        <meta name="twitter:title" content="Page Not Found | Gulf Coast Palms" />
      </Helmet>
      <section className="rd-thanks rd-dark">
        <div className="rd-wrap rd-stack">
          <p className="rd-small rd-muted">Page not found</p>
          <h1 className="rd-h1">We couldn't find that page</h1>
          <p className="rd-lead">
            The link may be broken or the page may have moved. Our palm tree trimming, removal, installation, and
            hurricane prep pages are all still here.
          </p>
          <div className="rd-actions" data-rd-actions>
            <QuoteLink placement="not_found" className="rd-btn rd-btn--go" />
            <Link to="/services" className="rd-btn rd-btn--line">Services</Link>
            <Link to="/" className="rd-btn rd-btn--line">Home</Link>
          </div>
          <p>
            <CallLink placement="404_page" className="rd-quoteband__phone">
              <PhoneIcon size={26} />
              {GCP_BUSINESS.phoneDisplay}
            </CallLink>
          </p>
        </div>
      </section>
    </Layout>
  );
}
