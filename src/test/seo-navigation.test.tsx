import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import SEOHead from "@/components/SEOHead";
import { getRouteMeta } from "@/seo/routeMeta";
import { localBusinessSchema } from "@/seo/businessSchema";

afterEach(() => { cleanup(); document.head.innerHTML = ""; });

describe("SEO when navigating between pages", () => {
  it("replaces initial HTML tags instead of leaving a homepage canonical on a service page", async () => {
    document.head.innerHTML = '<title>Home</title><meta data-rh="true" name="description" content="Old"><meta data-rh="true" name="robots" content="index, follow"><link data-rh="true" rel="canonical" href="https://gulfcoastpalmservices.com/"><meta data-rh="true" property="og:url" content="https://gulfcoastpalmservices.com/">';
    const view = (path: string) => <HelmetProvider><SEOHead title="Stale title" description="Stale description" canonicalUrl={path} /></HelmetProvider>;
    const { rerender } = render(view("/services/palm-tree-trimming"));
    await waitFor(() => expect(document.title).toBe(getRouteMeta("/services/palm-tree-trimming")!.title));
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", "https://gulfcoastpalmservices.com/services/palm-tree-trimming");
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    rerender(view("/payments"));
    await waitFor(() => expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow"));
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    rerender(view("/jobs"));
    await waitFor(() => expect(document.title).toBe("Completed Palm Tree Projects | Gulf Coast Palms"));
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });

  it("uses one commercial canonical and the same metadata for the old URL", () => {
    const primary = getRouteMeta("/commercial")!;
    const alias = getRouteMeta("/commercial-palm-tree-services")!;
    expect(alias.canonical).toBe(primary.canonical);
    expect(alias.title).toBe(primary.title);
    expect(alias.description).toBe(primary.description);
  });

  it("describes service areas without creating fake offices or self-review markup", () => {
    const business = localBusinessSchema();
    expect(business["@id"]).toBe("https://gulfcoastpalmservices.com/#business");
    expect(business).not.toHaveProperty("geo");
    expect(business).not.toHaveProperty("aggregateRating");
    expect(business).not.toHaveProperty("openingHoursSpecification");
  });
});
