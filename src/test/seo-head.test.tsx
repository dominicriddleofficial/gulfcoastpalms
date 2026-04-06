import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import SEOHead from "@/components/SEOHead";

describe("SEOHead", () => {
  it("renders correct title and description", () => {
    const title = "Test Page | Gulf Coast Palms";
    const description = "This is a test description for SEO.";

    render(
      <HelmetProvider>
        <SEOHead title={title} description={description} canonicalUrl="/test" />
      </HelmetProvider>
    );

    // react-helmet-async updates document.title synchronously in test env
    expect(document.title).toBe(title);

    const metaDesc = document.querySelector('meta[name="description"]');
    expect(metaDesc).toBeTruthy();
    expect(metaDesc?.getAttribute("content")).toBe(description);
  });

  it("sets canonical URL correctly", () => {
    render(
      <HelmetProvider>
        <SEOHead
          title="Canonical Test"
          description="Testing canonical"
          canonicalUrl="/services"
        />
      </HelmetProvider>
    );

    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical).toBeTruthy();
    expect(canonical?.getAttribute("href")).toContain("/services");
  });

  it("sets Open Graph tags", () => {
    render(
      <HelmetProvider>
        <SEOHead
          title="OG Test"
          description="OG description"
          canonicalUrl="/"
        />
      </HelmetProvider>
    );

    const ogTitle = document.querySelector('meta[property="og:title"]');
    expect(ogTitle?.getAttribute("content")).toBe("OG Test");

    const ogDesc = document.querySelector('meta[property="og:description"]');
    expect(ogDesc?.getAttribute("content")).toBe("OG description");
  });
});
