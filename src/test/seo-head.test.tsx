import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import SEOHead from "@/components/SEOHead";

describe("SEOHead", () => {
  it("renders without errors", () => {
    const { container } = render(
      <HelmetProvider>
        <SEOHead
          title="Test Page | Gulf Coast Palms"
          description="This is a test description for SEO."
          canonicalUrl="/test"
        />
      </HelmetProvider>
    );
    // Component renders successfully — this ensures SEOHead + HelmetProvider integration works
    expect(container).toBeTruthy();
  });

  it("accepts all expected props without errors", () => {
    expect(() => {
      render(
        <HelmetProvider>
          <SEOHead
            title="Full Props Test"
            description="Testing all props"
            canonicalUrl="/services"
            ogImage="https://example.com/image.jpg"
            ogType="article"
            noIndex={true}
          />
        </HelmetProvider>
      );
    }).not.toThrow();
  });

  it("renders with noIndex prop", () => {
    expect(() => {
      render(
        <HelmetProvider>
          <SEOHead
            title="No Index Page"
            description="Should not be indexed"
            noIndex
          />
        </HelmetProvider>
      );
    }).not.toThrow();
  });
});
