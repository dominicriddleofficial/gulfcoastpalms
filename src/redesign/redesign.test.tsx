/**
 * Checks that the redesign keeps what the current site depends on: the hidden preview
 * stays hidden, every tap is tracked under the existing names, the quote form sends
 * the same lead the current form sends, and every rebuilt page is a real public page.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { isTrackablePath } from "@/lib/analytics";
import { SMS_HREF, TEL_HREF } from "@/lib/business-info";
import { serviceNavLinks, servicesData } from "@/data/services";
import { locations } from "@/data/locations";
import { buildRouteMeta, rawRoutes } from "@/seo/routes.data.mjs";
import { REDESIGN_ACTIVE, REDESIGN_LIVE, REDESIGN_PREVIEW_BASE, redesignBaseFor } from "./mount";
import { REBUILT_SERVICES, hasRebuiltPage, page } from "./routes";
import { quotePath } from "./lib/quote-path";
import { cityPage, featuredProjects, nearbyProjects, projects } from "./data/projects";
import { palmCareCopy, priorityAreas, treeRemovalCopy } from "./data/priorityCopy";
import { applyRedesignSeo, redesignSeo } from "./seo.data.mjs";
import { applyRedesignStatic } from "./staticCopy";
import { buildStaticContent } from "@/seo/staticContent";
import Service from "./pages/Service";
import { serviceMedia } from "./data/serviceMedia";
import { treeRemovalSequence } from "./data/treeRemoval";
import { heroCopy, heroPhoto } from "./data/hero";
import { publicMarketing } from "@/data/publicMarketing";
import Hero from "./home/Hero";
import Header from "./chrome/Header";
import Dock from "./chrome/Dock";
import Quote from "./pages/Quote";

const submitLead = vi.fn();
vi.mock("@/lib/submit-lead", () => ({ submitLead: (...args: unknown[]) => submitLead(...args) }));

const within = (ui: React.ReactElement, path = "/") => render(
  <HelmetProvider><MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter></HelmetProvider>,
);
const labels = new Set([...serviceNavLinks.map((s) => s.label), "Other / Not sure"]);
/** Links inside `scope` that go to exactly `href`, compared as plain text (the text link has punctuation in it). */
const linksTo = (root: ParentNode, scope: string, href: string) =>
  [...root.querySelectorAll(`${scope} a`)].filter((a) => a.getAttribute("href") === href);
const placementsOf = (els: Element[]) => els.map((el) => el.getAttribute("data-track-placement"));

describe("where the redesign shows", () => {
  it("is off for the live site and on only under the hidden preview address", () => {
    expect(REDESIGN_LIVE).toBe(false);
    expect(REDESIGN_ACTIVE).toBe(false);
    expect(redesignBaseFor("/")).toBeNull();
    expect(redesignBaseFor("/services/tree-removal")).toBeNull();
    expect(redesignBaseFor("/preview/cinematic-home")).toBeNull();
    expect(redesignBaseFor("/preview/redesign-other")).toBeNull();
    expect(redesignBaseFor(REDESIGN_PREVIEW_BASE)).toBe(REDESIGN_PREVIEW_BASE);
    expect(redesignBaseFor(`${REDESIGN_PREVIEW_BASE}/`)).toBe(REDESIGN_PREVIEW_BASE);
    expect(redesignBaseFor(`${REDESIGN_PREVIEW_BASE}/quote`)).toBe(REDESIGN_PREVIEW_BASE);
  });

  it("leaves the current page in place while the redesign is not showing", () => {
    const live = <p>current page</p>;
    expect(page("/", live)).toBe(live);
    expect(page("/quote", live)).toBe(live);
  });

  it("keeps the preview out of search results, the sitemap and analytics", () => {
    const meta = buildRouteMeta().find((r: { path: string }) => r.path === REDESIGN_PREVIEW_BASE);
    expect(meta).toMatchObject({ noindex: true, keepCanonical: true, canonical: "https://gulfcoastpalmservices.com/" });
    expect(isTrackablePath(REDESIGN_PREVIEW_BASE)).toBe(false);
    expect(isTrackablePath(`${REDESIGN_PREVIEW_BASE}/services/tree-removal`)).toBe(false);
    expect(isTrackablePath(`${REDESIGN_PREVIEW_BASE}/quote`)).toBe(false);
  });
});

describe("rebuilt pages", () => {
  const known = new Set(rawRoutes.map((r: { path: string }) => r.path));

  it("exist only at addresses the site already has", () => {
    const rebuilt = [
      "/", "/services", "/service-areas", "/jobs", "/gallery", "/quote", "/thank-you",
      ...REBUILT_SERVICES.map((slug) => `/services/${slug}`),
      ...locations.map((l) => `/${l.slug}`),
    ];
    for (const path of rebuilt) {
      expect(known.has(path), `${path} is not a public route`).toBe(true);
      expect(hasRebuiltPage(path), `${path} has no rebuilt page`).toBe(true);
    }
    expect(hasRebuiltPage("/about")).toBe(false);
    expect(hasRebuiltPage("/platform")).toBe(false);
  });

  it("cover every service in the shared service data, each with real photos and honest captions", () => {
    expect([...REBUILT_SERVICES].sort()).toEqual(servicesData.map((s) => s.slug).sort());
    for (const slug of REBUILT_SERVICES) {
      const media = serviceMedia[slug];
      expect(media, slug).toBeTruthy();
      expect(media.hero.alt.length).toBeGreaterThan(20);
      expect(media.hero.caption.length).toBeGreaterThan(10);
      expect(media.after, `${slug}: no after photo is on file, none may be shown`).toBeUndefined();
      // Only the removal page shows the removal frames as a sequence, and they stay in order.
      if (slug === "tree-removal") expect(media.sequence?.frames.map((f) => f.caption)).toEqual(treeRemovalSequence.map((f) => f.caption));
      else expect(media.sequence, slug).toBeUndefined();
      for (const label of media.projects) expect(labels.has(label), label).toBe(true);
    }
  });

  it("open the homepage with the owner's headline and a plain-text line naming the services and area", () => {
    expect(heroCopy.lines).toEqual(["Expert tree work.", "Precision palm care."]);
    for (const phrase of ["Tree removal", "tree trimming", "palm care", "Perdido Key", "30A"]) {
      expect(heroCopy.lead, phrase).toContain(phrase);
    }
  });
});

describe("project notes", () => {
  it("send each quote button to an existing quote-form choice and service page", () => {
    const known = new Set(rawRoutes.map((r: { path: string }) => r.path));
    for (const p of projects) {
      expect(labels.has(p.service.label), `${p.id}: ${p.service.label}`).toBe(true);
      expect(known.has(p.service.to), `${p.id}: ${p.service.to}`).toBe(true);
      expect(p.alt.length).toBeGreaterThan(20);
      // Nothing is on record about what customers asked for or how jobs turned out.
      expect(p.need).toBeUndefined();
      expect(p.result).toBeUndefined();
    }
    // Exactly one project has a true before photo of the same subject.
    expect(projects.filter((p) => p.before).map((p) => p.id)).toEqual(["date-palm-clean-up"]);
    // Tree work is in the gallery, and no Facebook photo is given a city it was never recorded with.
    expect(projects.filter((p) => p.kind === "tree")).toHaveLength(1);
    for (const id of ["tree-removal-under-way", "date-palm-clean-up", "climbing-a-tall-sabal", "pool-yard-sabals"]) {
      expect(projects.find((p) => p.id === id)?.city, id).toBeUndefined();
    }
    expect(new Set(projects.map((p) => p.id)).size).toBe(projects.length);
    expect(featuredProjects).toHaveLength(5);
  });

  it("show a city page its own city first, and never without a recorded city", () => {
    expect(nearbyProjects("Navarre")[0].city).toMatch(/Navarre/);
    expect(nearbyProjects("Destin")[0].city).toBe("Destin");
    for (const loc of locations) {
      const picks = nearbyProjects(loc.city);
      expect(picks).toHaveLength(3);
      for (const p of picks) expect(p.city, `${loc.city}: ${p.id}`).toBeTruthy();
    }
  });
});

describe("the two priority pages: tree removal and palm care", () => {
  const TREE = "/services/tree-removal";
  const PALM = "/services/palm-tree-trimming";
  const known = new Set(rawRoutes.map((r: { path: string }) => r.path));

  it("gives each its own title, description and heading, and only once the redesign is live", () => {
    const current = (path: string) => rawRoutes.find((r: { path: string }) => r.path === path) as { path: string; title: string; description: string };
    for (const path of [TREE, PALM]) {
      const now = current(path);
      // Off: the route table hands back today's values untouched.
      expect(applyRedesignSeo(now, false)).toBe(now);
      const live = applyRedesignSeo(now, true) as { title: string; description: string };
      expect(live.title).toBe(redesignSeo[path].title);
      expect(live.description).toBe(redesignSeo[path].description);
      expect(live.title.length).toBeLessThanOrEqual(65);
      expect(live.description.length).toBeLessThanOrEqual(160);
    }
    expect(redesignSeo[TREE].title).not.toBe(redesignSeo[PALM].title);
    expect(redesignSeo[TREE].title).toMatch(/^Tree Removal/);
    expect(redesignSeo[PALM].title).toMatch(/^Palm Tree Trimming/);
    // The published route table still carries today's titles.
    const meta = buildRouteMeta().find((r: { path: string }) => r.path === TREE) as { title: string };
    expect(meta.title).toBe(current(TREE).title);
  });

  it("shows the real removal, the three answers and a removal quote button beside the evidence", () => {
    const { container } = within(<Service slug="tree-removal" />, TREE);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelector("h1")?.textContent).toBe(redesignSeo[TREE].h1);
    // The frames, then what they show.
    expect(container.querySelectorAll(".rd-phero__frames img")).toHaveLength(3);
    const facts = [...container.querySelectorAll(".rd-ticket--still dt")].map((dt) => dt.textContent);
    expect(facts).toEqual(treeRemovalCopy.job.facts.map((f) => f.label));
    // Estimates, cleanup and haul-away, stump grinding.
    const answers = [...container.querySelectorAll(".rd-answer h3")].map((h) => h.textContent);
    expect(answers).toEqual(treeRemovalCopy.answers.map((a) => a.heading));
    expect(answers.join(" ")).toMatch(/estimate/i);
    expect(answers.join(" ")).toMatch(/haul-away/i);
    expect(answers.join(" ")).toMatch(/stump grinding/i);
    // The quote button named for this job, next to the frames and next to the notes, still preselecting "Tree Removal".
    const asks = [...container.querySelectorAll('a[data-track-cta="quote_request"]')].filter((a) => a.textContent === treeRemovalCopy.quoteLabel);
    expect(placementsOf(asks)).toEqual(["service_tree-removal", "service_tree-removal_job"]);
    for (const a of asks) expect(a.getAttribute("href")).toContain("service=Tree+Removal");
    // Storm cleanup, finished jobs and the six communities.
    const hrefs = new Set([...container.querySelectorAll("main a, section a")].map((a) => a.getAttribute("href")));
    for (const to of ["/services/storm-damage-cleanup", "/services/tree-trimming", "/jobs", "/service-areas", ...priorityAreas.map((a) => a.to)]) {
      expect(hrefs.has(to), to).toBe(true);
      expect(known.has(to), to).toBe(true);
    }
  });

  it("shows the four kinds of palm work with matched photos and paths to each palm service", () => {
    const { container } = within(<Service slug="palm-tree-trimming" />, PALM);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelector("h1")?.textContent).toBe(redesignSeo[PALM].h1);
    const kinds = [...container.querySelectorAll(".rd-kinds h3")].map((h) => h.textContent);
    expect(kinds).toEqual([palmCareCopy.canopy.heading, palmCareCopy.pods.heading, palmCareCopy.boots.heading, palmCareCopy.diamond.heading]);
    // Three pairs in the comparison and one in the first-visit block, each photo described.
    const pairs = [...container.querySelectorAll(".rd-compare")];
    expect(pairs).toHaveLength(4);
    for (const pair of pairs) {
      const photos = [...pair.querySelectorAll("img")];
      expect(photos).toHaveLength(2);
      for (const img of photos) expect((img.getAttribute("alt") ?? "").length).toBeGreaterThan(20);
      expect(pair.querySelectorAll("figcaption")).toHaveLength(2);
    }
    // First visit against the visits after it.
    const visits = [...container.querySelectorAll(".rd-kind--plain h3")].map((h) => h.textContent);
    expect(visits).toEqual([palmCareCopy.first.heading, palmCareCopy.after.heading]);
    const hrefs = new Set([...container.querySelectorAll("section a")].map((a) => a.getAttribute("href")));
    for (const to of ["/services/palm-diamond-cutting", "/services/palm-tree-trunk-skinning", "/palm-tree-maintenance-plans", "/service-areas", ...priorityAreas.map((a) => a.to)]) {
      expect(hrefs.has(to), to).toBe(true);
      expect(known.has(to), to).toBe(true);
    }
    // Area links say what they lead to.
    expect(screen.getByRole("link", { name: "Palm tree trimming in Navarre" }).getAttribute("href")).toBe("/palm-tree-trimming-navarre-fl");
  });

  it("keeps every other service page on its current title and heading", () => {
    const { container } = within(<Service slug="palm-diamond-cutting" />, "/services/palm-diamond-cutting");
    const service = servicesData.find((s) => s.slug === "palm-diamond-cutting")!;
    expect(container.querySelector("h1")?.textContent).toBe(service.title);
    expect(container.querySelector(".rd-kinds, .rd-answers")).toBeNull();
    expect(Object.keys(redesignSeo).sort()).toEqual(["/", PALM, TREE].sort());
  });

  it("puts the same words into the search-engine copy, for the changed pages only", () => {
    const today = buildStaticContent();
    const live = buildStaticContent();
    applyRedesignStatic(live);
    expect(live["/"].h1).toBe(redesignSeo["/"].h1);
    expect(live[TREE].h1).toBe(redesignSeo[TREE].h1);
    expect(live[PALM].h1).toBe(redesignSeo[PALM].h1);
    const headings = (page: { blocks: { heading?: string }[] }) => page.blocks.map((b) => b.heading).filter(Boolean);
    for (const a of treeRemovalCopy.answers) expect(headings(live[TREE])).toContain(a.heading);
    for (const h of [palmCareCopy.canopy.heading, palmCareCopy.pods.heading, palmCareCopy.boots.heading, palmCareCopy.diamond.heading, palmCareCopy.first.heading, palmCareCopy.after.heading]) {
      expect(headings(live[PALM])).toContain(h);
    }
    // Existing copy is kept, not replaced.
    for (const h of headings(today[TREE]).filter((h) => h !== "Related Services")) expect(headings(live[TREE])).toContain(h);
    // Every link in the new copy goes to a real page.
    for (const path of ["/", TREE, PALM]) {
      for (const block of live[path].blocks) for (const link of block.links ?? []) {
        if (link.href.startsWith("/")) expect(known.has(link.href.split("?")[0]), link.href).toBe(true);
      }
    }
    // Pages the redesign does not retitle are word for word what they are today.
    expect(live["/services/palm-diamond-cutting"]).toEqual(today["/services/palm-diamond-cutting"]);
    expect(live["/palm-tree-trimming-navarre-fl"]).toEqual(today["/palm-tree-trimming-navarre-fl"]);
  });

  it("links a job's recorded city to that city's page", () => {
    expect(cityPage("Navarre")).toBe("/palm-tree-trimming-navarre-fl");
    expect(cityPage("Navarre Beach")).toBe("/palm-tree-trimming-navarre-fl");
    expect(cityPage("Fort Walton Beach")).toBe("/palm-tree-trimming-fort-walton-beach-fl");
    expect(cityPage(undefined)).toBeUndefined();
    expect(cityPage("Atlantis")).toBeUndefined();
    for (const p of projects) if (p.city) expect(known.has(cityPage(p.city) ?? ""), p.city).toBe(true);
  });
});

describe("tracking stays as it is today", () => {
  it("builds quote links the way the current button does", () => {
    expect(quotePath()).toBe("/quote");
    expect(quotePath("Tree Removal", "hero")).toBe("/quote?service=Tree+Removal&source=hero");
    expect(quotePath("Palm Tree Trimming", "location_navarre", { location: "Navarre, FL" }))
      .toBe("/quote?service=Palm+Tree+Trimming&location=Navarre%2C+FL&source=location_navarre");
  });

  it("marks the opening screen's three actions for the site-wide click handler", () => {
    const { container } = within(<Hero />);
    const quote = container.querySelector('.rd-hero__actions a[data-track-cta="quote_request"]');
    expect(quote?.getAttribute("href")).toBe("/quote");
    expect(quote?.getAttribute("data-track-placement")).toBe("hero");
    expect(TEL_HREF).toBe("tel:8509101290");
    expect(SMS_HREF.startsWith("sms:8509101290&body=")).toBe(true);
    expect(placementsOf(linksTo(container, ".rd-hero__actions", TEL_HREF))).toEqual(["hero"]);
    expect(placementsOf(linksTo(container, ".rd-hero__actions", SMS_HREF))).toEqual(["hero"]);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelector("h1")?.textContent).toBe("Expert tree work. Precision palm care.");
    expect(container.querySelector(".rd-hero__lead")?.textContent).toBe(heroCopy.lead);
  });

  it("keeps the header and phone bar placement names", () => {
    const { container } = within(<><Header /><Dock shown /></>);
    expect(placementsOf(linksTo(container, ".rd-hd", TEL_HREF)).sort()).toEqual(["header", "header_mobile"]);
    expect(placementsOf(linksTo(container, ".rd-hd", SMS_HREF))).toEqual(["header"]);
    expect(placementsOf([...container.querySelectorAll('.rd-hd a[data-track-cta="quote_request"]')])).toEqual(["header"]);
    expect(placementsOf(linksTo(container, ".rd-dock", TEL_HREF))).toEqual(["sticky_bar"]);
    expect(placementsOf(linksTo(container, ".rd-dock", SMS_HREF))).toEqual(["sticky_bar"]);
    expect(placementsOf([...container.querySelectorAll('.rd-dock a[data-track-cta="quote_request"]')])).toEqual(["sticky_bar"]);
  });

  it("opens on one photo of the crew at work, with nothing floating over it", () => {
    const { container } = within(<Hero />);
    const photos = [...container.querySelectorAll(".rd-hero img")];
    expect(photos).toHaveLength(1);
    expect(photos[0].getAttribute("alt")).toBe(heroPhoto.alt);
    expect(photos[0].getAttribute("alt")).toMatch(/climber/);
    // The thumbnail, the look-closer marks and the slider are gone from the opening.
    expect(container.querySelector(".rd-hero__inset, .rd-hero__spot, [data-rd-reveal], input")).toBeNull();
    // The light sits beside the hero, not inside it, so it can cross the hero's bottom edge:
    // the fade above the edge and its tail below are two halves of one piece.
    expect(container.querySelector(".rd-open > .rd-hero")).not.toBeNull();
    expect(container.querySelector(".rd-open > .rd-horizon .rd-horizon__up")).not.toBeNull();
    expect(container.querySelector(".rd-open > .rd-horizon .rd-horizon__down")).not.toBeNull();
    expect(container.querySelector(".rd-hero .rd-horizon")).toBeNull();
    const proof = container.querySelector("a.rd-hero__proof");
    expect(proof?.textContent).toBe(heroCopy.rating);
  });
});

describe("quote form", () => {
  beforeEach(() => { submitLead.mockReset(); });

  const open = (query = "") => within(
    <Routes>
      <Route path="/quote" element={<Quote />} />
      <Route path="/thank-you" element={<p>thanks page</p>} />
    </Routes>,
    `/quote${query}`,
  );

  it("offers exactly the service and area choices the current form offers", () => {
    open();
    const options = (id: string) => [...(document.getElementById(id) as HTMLSelectElement).options].map((o) => o.value);
    expect(options("q-service")).toEqual(["", ...serviceNavLinks.map((s) => s.label), "Other / Not sure"]);
    expect(options("q-location")).toEqual(["", ...locations.map((l) => `${l.city}, ${l.state}`), "Other"]);
  });

  it("preselects the service and area named in the link, and keeps an unlisted service", () => {
    open("?service=Tree+Removal&location=Navarre%2C+FL&source=hero");
    expect((document.getElementById("q-service") as HTMLSelectElement).value).toBe("Tree Removal");
    expect((document.getElementById("q-location") as HTMLSelectElement).value).toBe("Navarre, FL");
  });

  it("keeps the Commercial page's own service wording", () => {
    open("?source=commercial&service=Commercial%20%2F%20HOA%20Portfolio&message=Portfolio%20pricing%20please");
    expect((document.getElementById("q-service") as HTMLSelectElement).value).toBe("Commercial / HOA Portfolio");
    expect((document.getElementById("q-message") as HTMLTextAreaElement).value).toBe("Portfolio pricing please");
  });

  it("sends the same lead fields as the current form, then goes to the thank-you page", async () => {
    submitLead.mockResolvedValue({ success: true });
    open("?service=Tree+Removal&source=hero");
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Test Customer" } });
    fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: "(850) 555-0100" } });
    fireEvent.change(screen.getByLabelText(/^Property address/), { target: { value: "1 Test St, Navarre, FL" } });
    fireEvent.change(screen.getByLabelText(/Tell us about your trees or palms/), { target: { value: "Leaning oak by the fence" } });
    fireEvent.change(document.getElementById("q-location") as HTMLSelectElement, { target: { value: "Navarre, FL" } });
    fireEvent.click(screen.getByRole("button", { name: /request my free quote/i }));

    await waitFor(() => expect(screen.getByText("thanks page")).toBeTruthy());
    expect(submitLead).toHaveBeenCalledTimes(1);
    const sent = submitLead.mock.calls[0][0];
    expect(Object.keys(sent).sort()).toEqual(
      ["email", "formRenderTime", "location", "message", "name", "phone", "service", "source", "website"].sort(),
    );
    expect(sent).toMatchObject({
      name: "Test Customer",
      phone: "(850) 555-0100",
      email: undefined,
      service: "Tree Removal",
      location: "Navarre, FL",
      message: "Address: 1 Test St, Navarre, FL\nLeaning oak by the fence",
      source: "quote_request_page",
      website: "",
    });
    expect(typeof sent.formRenderTime).toBe("number");
  });

  it("keeps the visitor on the form and says what went wrong when a request is not saved", async () => {
    submitLead.mockResolvedValue({ success: false, error: "Please wait a moment, then submit again. Your request has not been sent yet." });
    open();
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Test Customer" } });
    fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: "8505550100" } });
    fireEvent.click(screen.getByRole("button", { name: /request my free quote/i }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("has not been sent yet"));
    expect(screen.queryByText("thanks page")).toBeNull();
    expect((screen.getByLabelText(/^Name/) as HTMLInputElement).value).toBe("Test Customer");
  });
});
