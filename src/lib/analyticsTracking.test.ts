import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const posts: Array<Record<string, unknown>> = [];
beforeEach(() => {
  posts.length = 0;
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.test");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "anon");
  vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => { posts.push(JSON.parse(String(init.body))); return new Response("{}"); }));
  Object.defineProperty(window, "location", { configurable: true, value: new URL("https://gulfcoastpalmservices.com/services/palm-tree-trimming?utm_source=google&token=SECRET&phone=8505551234") });
  vi.resetModules();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); document.body.innerHTML = ""; });

const flush = () => new Promise((r) => setTimeout(r, 20));
async function load() { return await import("./analytics"); }

describe("website tracking", () => {
  it("one tap on a call link records exactly one call tap with its placement", async () => {
    const a = await load();
    document.body.innerHTML = `<div data-track-placement="sticky_bar"><a href="tel:8509101290"><span id="x">Call</span></a></div>`;
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    document.getElementById("x")?.dispatchEvent(ev);
    a.handleTrackedClick({ target: document.getElementById("x") } as unknown as Event);
    await flush();
    const calls = posts.filter((p) => p.event_name === "call_tap");
    expect(calls).toHaveLength(1);
    expect((calls[0].properties as Record<string, unknown>).placement).toBe("sticky_bar");
    expect(ev.defaultPrevented).toBe(false);
  });
  it("text links record a text tap, not a call", async () => {
    const a = await load();
    document.body.innerHTML = `<a id="t" href="sms:8509101290&body=hi">Text</a>`;
    a.handleTrackedClick({ target: document.getElementById("t") } as unknown as Event);
    await flush();
    expect(posts.map((p) => p.event_name)).toEqual(["text_tap"]);
  });
  it("tokens and contact details are stripped from the stored address; ad tags are kept", async () => {
    const a = await load();
    a.trackPageView("/services/palm-tree-trimming");
    await flush();
    expect(posts[0].page_url).toBe("https://gulfcoastpalmservices.com/services/palm-tree-trimming?utm_source=google");
    expect(JSON.stringify(posts[0])).not.toContain("8505551234");
  });
  it("app, payment and customer-link pages are never recorded", async () => {
    const a = await load();
    for (const p of ["/platform/analytics", "/pay/abc", "/q/123", "/quote/abc", "/arborist-link", "/portal"]) a.trackPageView(p);
    await flush();
    expect(posts).toHaveLength(0);
    expect(a.isTrackablePath("/quote")).toBe(true);
  });
  it("preview and local sites are not recorded", async () => {
    const a = await load();
    expect(a.isTrackableHost("localhost")).toBe(false);
    expect(a.isTrackableHost("id-preview--x.lovable.app")).toBe(false);
    expect(a.isTrackableHost("gulfcoastpalmservices.com")).toBe(true);
    expect(a.isTrackableHost("gulfcoastpalmservices.com", true)).toBe(false);
  });
  it("a route change records one page view even if the effect runs twice", async () => {
    const a = await load();
    a.trackPageView("/about"); a.trackPageView("/about"); a.trackPageView("/services");
    await flush();
    expect(posts.filter((p) => p.event_name === "page_view").map((p) => p.page_path)).toEqual(["/about", "/services"]);
  });
  it("free-text form fields are never sent", async () => {
    const a = await load();
    a.trackEvent("lead_form_submit", { form_source: "quote_request_page", service: "Palm trimming", location: "123 Main St", message: "call me" } as never);
    await flush();
    expect(posts[0].properties).toEqual({ form_source: "quote_request_page", service: "Palm trimming" });
  });
  it("analytics failure never throws into the page", async () => {
    vi.stubGlobal("fetch", () => { throw new Error("offline"); });
    const a = await load();
    expect(() => a.trackEvent("cta_click", { placement: "hero" })).not.toThrow();
  });
  it("two different real taps within a second both record (distinct click ids)", async () => {
    const a = await load();
    document.body.innerHTML = `<div data-track-placement="header"><a id="h" href="tel:1">Call</a></div><div data-track-placement="sticky_bar"><a id="s" href="tel:1">Call</a></div>`;
    a.handleTrackedClick({ target: document.getElementById("h") } as unknown as Event);
    a.handleTrackedClick({ target: document.getElementById("s") } as unknown as Event);
    await flush();
    const calls = posts.filter((p) => p.event_name === "call_tap");
    expect(calls.map((c) => (c.properties as Record<string, unknown>).placement)).toEqual(["header", "sticky_bar"]);
  });
  it("the same interaction id is only sent once; an id-less double-fire of the same button is merged", async () => {
    const a = await load();
    expect(a.shouldSend("call_tap", "/", "s", { click_id: "k1" }, 0)).toBe(true);
    expect(a.shouldSend("call_tap", "/", "s", { click_id: "k1" }, 60_000)).toBe(false);
    expect(a.shouldSend("call_tap", "/", "s", { click_id: "k2" }, 10)).toBe(true);
    expect(a.shouldSend("phone_click", "/", "s", { placement: "hero" }, 0)).toBe(true);
    expect(a.shouldSend("phone_click", "/", "s", { placement: "hero" }, 500)).toBe(false);
    expect(a.shouldSend("phone_click", "/", "s", { placement: "footer" }, 600)).toBe(true);
  });
  it("source/click_location aliases become the placement", async () => {
    const a = await load();
    expect(a.safeProps({ source: "quote_page" })).toEqual({ placement: "quote_page" });
    expect(a.safeProps({ click_location: "footer", customer_id: "x" })).toEqual({ placement: "footer" });
    expect(a.safeProps({ placement: "hero", source: "x" })).toEqual({ placement: "hero" });
  });
  it("blocked storage uses per-page memory ids, never a shared 'anon' id", async () => {
    const a = await load();
    const boom = () => { throw new Error("SecurityError"); };
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(boom);
    try {
      const v = a.getVisitorId(); const s1 = a.getSessionId();
      expect(v).toMatch(/^mem-/); expect(s1).toMatch(/^mem-/);
      expect(v).not.toBe("anon"); expect(a.getVisitorId()).toBe(v);
      a.__resetMemoryIds();
      expect(a.getVisitorId()).not.toBe(v);
    } finally { spy.mockRestore(); }
  });
  it("a stored legacy 'anon' id is replaced with a real one", async () => {
    localStorage.setItem("gcp_visitor_id", "anon");
    const a = await load();
    expect(a.getVisitorId()).not.toBe("anon");
  });
});
