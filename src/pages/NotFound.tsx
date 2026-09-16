import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Home, Wrench, Phone, FileText } from "lucide-react";
import { GCP_BUSINESS, TEL_HREF } from "@/lib/business-info";

const GREEN = "#1E8549";
const AMBER = "#F4A825";

/** Own description for the catch-all route — never the homepage's. */
const NOT_FOUND_DESCRIPTION =
  "This page doesn't exist. Find palm tree trimming, removal, and hurricane prep for NW Florida on the Gulf Coast Palms site.";

/** Missing routes have no canonical and are excluded from indexing. */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-16" style={{ background: "#0c1410" }}>
      <Helmet>
        <title>Page Not Found | Gulf Coast Palms</title>
        <meta name="description" content={NOT_FOUND_DESCRIPTION} />
        <meta name="robots" content="noindex, nofollow" />
        <meta property="og:title" content="Page Not Found | Gulf Coast Palms" />
        <meta property="og:description" content={NOT_FOUND_DESCRIPTION} />
        <meta name="twitter:title" content="Page Not Found | Gulf Coast Palms" />
      </Helmet>

      <div className="w-full max-w-xl text-center">
        <p
          className="font-body text-sm font-bold tracking-[0.2em] uppercase mb-4"
          style={{ color: AMBER }}
        >
          404 — Page not found
        </p>

        <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
          We couldn&apos;t find that page
        </h1>

        <p className="font-body text-base md:text-lg text-white/70 mb-8">
          The link may be broken or the page may have moved. Our palm tree trimming,
          removal, installation, and hurricane prep pages are all still here.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 min-h-[48px] rounded-xl font-body font-bold text-white"
            style={{ background: GREEN }}
          >
            <Home className="w-4 h-4" /> Home
          </Link>
          <Link
            to="/services"
            className="inline-flex items-center justify-center gap-2 px-6 min-h-[48px] rounded-xl font-body font-bold text-white border"
            style={{ borderColor: "rgba(255,255,255,0.22)" }}
          >
            <Wrench className="w-4 h-4" /> Services
          </Link>
          <Link
            to="/quote"
            className="inline-flex items-center justify-center gap-2 px-6 min-h-[48px] rounded-xl font-body font-bold"
            style={{ background: AMBER, color: "#1a1200" }}
          >
            <FileText className="w-4 h-4" /> Get a Free Quote
          </Link>
        </div>

        <a
          href={TEL_HREF}
          data-call-source="404_page"
          className="inline-flex items-center justify-center gap-2 font-body font-bold text-lg min-h-[48px]"
          style={{ color: GREEN }}
        >
          <Phone className="w-5 h-5" /> Call {GCP_BUSINESS.phoneDisplay}
        </a>
      </div>
    </main>
  );
};

export default NotFound;
