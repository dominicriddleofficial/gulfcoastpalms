import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import Quote from "@/pages/Quote";
import QuoteRequestButton from "@/components/cta/QuoteRequestButton";
import { servicesData, serviceNavLinks, treeServiceLinks } from "@/data/services";
import { buildStaticContent } from "@/seo/staticContent";
import { buildRouteJsonLd, trustFactsText } from "@/seo/jsonLd";
import { localBusinessSchema } from "@/seo/businessSchema";
import { getRouteMeta } from "@/seo/routeMeta";
import { publicMarketing } from "@/data/publicMarketing";
import { submitLead } from "@/lib/submit-lead";

vi.mock("@/components/Layout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/submit-lead", () => ({ submitLead: vi.fn() }));

beforeEach(() => { vi.clearAllMocks(); vi.mocked(submitLead).mockResolvedValue({ success: false, error: "Mocked only" }); });
afterEach(cleanup);

describe("Public tree services", () => {
  it.each(treeServiceLinks)("preselects and submits the exact $label option using mocks only", async (link) => {
    const source = `service_${link.to.split("/").pop()}`;
    const buttonView = render(<MemoryRouter><QuoteRequestButton service={link.label} source={source} /></MemoryRouter>);
    const href = screen.getByRole("link", { name: "Get a Free Quote" }).getAttribute("href");
    expect(href).toBe(`/quote?${new URLSearchParams({ service: link.label, source })}`);
    buttonView.unmount();
    render(<MemoryRouter initialEntries={[href ?? "/quote"]}><Quote /></MemoryRouter>);
    expect(screen.getByLabelText("Service Needed")).toHaveValue(link.label);
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Mock Request" } });
    fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: "8505550101" } });
    fireEvent.submit(screen.getByRole("button", { name: "Request My Free Quote" }).closest("form") ?? document.createElement("form"));
    await waitFor(() => expect(submitLead).toHaveBeenCalledWith(expect.objectContaining({ service: link.label, source: "quote_request_page" })));
  });

  it("keeps legacy quote values and a plain default quote link", () => {
    for (const label of ["Tree Trimming & Removal", "Palm Tree Trimming", "Palm Tree Installation", "Palm Tree Removal", "Palm Diamond Cutting", "Palm Tree Trunk Skinning", "Landscaping Services", "HOA & Commercial Maintenance", "Hurricane Palm Preparation"]) {
      expect(serviceNavLinks.some((link) => link.label === label)).toBe(true);
    }
    render(<MemoryRouter><QuoteRequestButton /></MemoryRouter>);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/quote");
  });

  it("shares substantial tree hub/page copy, FAQs, links and canonical metadata with initial HTML", () => {
    const pages = buildStaticContent();
    const schemas = buildRouteJsonLd();
    for (const service of servicesData.filter((item) => !item.slug.startsWith("palm"))) {
      const path = `/services/${service.slug}`;
      const content = pages[path];
      expect(content.h1).toBe(service.title);
      expect(content.blocks.flatMap((block) => block.paragraphs ?? []).join(" ")).toContain(service.introParagraphs[2]);
      expect(content.blocks.some((block) => block.links?.some((link) => link.href.startsWith("/quote?")))).toBe(true);
      expect(getRouteMeta(path)?.canonical).toBe(`https://gulfcoastpalmservices.com${path}`);
      expect(getRouteMeta(path)?.description).toBe(service.metaDescription);
      const faq = schemas[path].find((schema) => schema["@type"] === "FAQPage");
      expect(faq?.mainEntity).toHaveLength(service.faqs?.length ?? 0);
      expect(schemas[path].find((schema) => schema["@type"] === "Service")?.provider).toMatchObject({ "@id": "https://gulfcoastpalmservices.com/#business" });
    }
    expect(pages["/"].h1).toBe(publicMarketing.heroHeading);
    expect(pages["/"].subheading).toBe(publicMarketing.heroText);
    expect(pages["/quote"].subheading).toBe(publicMarketing.quoteText);
  });

  it("attributes the current review total to the owner without self-serving review schema", () => {
    expect(trustFactsText().join(" ")).toContain("Owner-confirmed 5.0 rating and 168 five-star Google reviews as of 2026-10-15");
    expect(localBusinessSchema()).not.toHaveProperty("aggregateRating");
    expect(localBusinessSchema()).not.toHaveProperty("review");
    expect(JSON.stringify(buildRouteJsonLd())).not.toContain('"aggregateRating"');
  });
});