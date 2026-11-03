import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const posts: Array<Record<string, unknown>> = [];
beforeEach(() => {
  posts.length = 0;
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.test");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "anon");
  vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => { posts.push(JSON.parse(String(init.body))); return new Response("{}"); }));
  Object.defineProperty(window, "location", { configurable: true, value: new URL("https://gulfcoastpalmservices.com/") });
  vi.resetModules();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); document.body.innerHTML = ""; vi.useRealTimers(); });

const flush = () => new Promise((r) => setTimeout(r, 20));
const props = (p: Record<string, unknown>) => p.properties as Record<string, unknown>;

async function withListener() {
  const a = await import("./analytics");
  const h = (e: Event) => a.handleTrackedClick(e);
  document.addEventListener("click", h, { capture: true });
  return { a, off: () => document.removeEventListener("click", h, { capture: true }) };
}

describe("real clicks through the site-wide tracker", () => {
  it("one native click seen by two handlers is recorded once, with one id", async () => {
    const { a, off } = await withListener();
    document.body.innerHTML = `<a id="c" href="tel:8509101290" data-track-placement="header">Call</a>`;
    const el = document.getElementById("c") as HTMLElement;
    el.addEventListener("click", (e) => a.handleTrackedClick(e)); // duplicate handler, same native event
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flush(); off();
    expect(posts.filter((p) => p.event_name === "call_tap")).toHaveLength(1);
  });

  it("two rapid real clicks on the same button both count with different ids", async () => {
    const { off } = await withListener();
    document.body.innerHTML = `<a id="c" href="tel:8509101290" data-track-placement="header">Call</a>`;
    const el = document.getElementById("c") as HTMLElement;
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flush(); off();
    const calls = posts.filter((p) => p.event_name === "call_tap");
    expect(calls).toHaveLength(2);
    expect(props(calls[0]).click_id).not.toBe(props(calls[1]).click_id);
  });

  it("a call link inside a quote CTA (generic + specific) records only the call", async () => {
    const { off } = await withListener();
    document.body.innerHTML = `<div data-track-cta="quote_request" data-track-placement="hero"><a id="c" href="tel:8509101290">Call</a></div>`;
    document.getElementById("c")?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flush(); off();
    expect(posts.map((p) => p.event_name)).toEqual(["call_tap"]);
  });

  it("the shared Get a Free Quote button records one click per real tap with its placement", async () => {
    const { off } = await withListener();
    const { default: QuoteRequestButton } = await import("@/components/cta/QuoteRequestButton");
    const { getByRole } = render(<MemoryRouter><QuoteRequestButton source="hero" /></MemoryRouter>);
    const link = getByRole("link", { name: /free quote/i });
    fireEvent.click(link); fireEvent.click(link);
    await flush(); off();
    const ctas = posts.filter((p) => p.event_name === "cta_click");
    expect(ctas).toHaveLength(2);
    expect(props(ctas[0]).placement).toBe("hero");
    expect(props(ctas[0]).click_id).toBeTruthy();
    expect(props(ctas[0]).click_id).not.toBe(props(ctas[1]).click_id);
  });
});

describe("storage that throws", () => {
  it("still records the event when every storage method throws", async () => {
    const boom = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
    vi.stubGlobal("sessionStorage", boom);
    vi.stubGlobal("localStorage", boom);
    const a = await import("./analytics");
    a.trackEvent("call_tap", { placement: "header", click_id: "k1" });
    await flush();
    expect(posts).toHaveLength(1);
    expect(String(posts[0].session_id)).toMatch(/^mem-/);
  });

  it("memory sessions end after 30 idle minutes", async () => {
    vi.stubGlobal("sessionStorage", { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } });
    const a = await import("./analytics");
    const t0 = Date.now();
    const spy = vi.spyOn(Date, "now").mockReturnValue(t0);
    const s1 = a.getSessionId();
    spy.mockReturnValue(t0 + 10 * 60_000);
    expect(a.getSessionId()).toBe(s1);
    spy.mockReturnValue(t0 + 41 * 60_000);
    expect(a.getSessionId()).not.toBe(s1);
    spy.mockRestore();
  });
});

describe("ad tags belong to one visit", () => {
  it("are reused within the visit, replaced by a new campaign, and dropped in a later visit", async () => {
    const a = await import("./analytics");
    Object.defineProperty(window, "location", { configurable: true, value: new URL("https://gulfcoastpalmservices.com/?utm_source=google&utm_campaign=spring") });
    expect(a.captureUtmFromUrl("s1").utm_campaign).toBe("spring");
    Object.defineProperty(window, "location", { configurable: true, value: new URL("https://gulfcoastpalmservices.com/about") });
    expect(a.captureUtmFromUrl("s1").utm_campaign).toBe("spring");
    Object.defineProperty(window, "location", { configurable: true, value: new URL("https://gulfcoastpalmservices.com/?utm_source=facebook&utm_campaign=storm") });
    expect(a.captureUtmFromUrl("s1").utm_campaign).toBe("storm");
    Object.defineProperty(window, "location", { configurable: true, value: new URL("https://gulfcoastpalmservices.com/about") });
    expect(a.captureUtmFromUrl("s2")).toEqual({});
  });
});

describe("Google Analytics guard", () => {
  it("does not send to Google Analytics from preview or local hosts", async () => {
    Object.defineProperty(window, "location", { configurable: true, value: new URL("https://id-preview--x.lovable.app/") });
    const gtag = vi.fn();
    (window as unknown as { gtag: unknown }).gtag = gtag;
    const a = await import("./analytics");
    a.trackEvent("call_tap", { placement: "header", click_id: "k2" });
    await flush();
    expect(gtag).not.toHaveBeenCalled();
    expect(posts).toHaveLength(0);
    delete (window as unknown as { gtag?: unknown }).gtag;
  });
});
