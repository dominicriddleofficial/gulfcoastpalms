import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) }, storage: { from: () => ({ createSignedUrls: async () => ({ data: [], error: null }) }) } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ArboristLink from "@/pages/ArboristLink";
import { ARBORIST_LINK_STORAGE_KEY, readLinkToken, resetLinkTokenForTests } from "@/lib/arborist-link";

const OLD = "A".repeat(43);
const NEW = "B".repeat(43);
type TestWindow = Window & { __gcpNoTracking?: boolean; __gcpArboristToken?: string; loadGA?: () => void; loadMetaPixel?: () => void };
const w = window as TestWindow;

// The real inline head scripts shipped in index.html (capture + Google + Meta loaders).
const html = readFileSync(resolve(__dirname, "../../index.html"), "utf8");
const head = html.slice(0, html.indexOf("</head>"));
const inlineScripts = [...head.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const runHeadScripts = () => { for (const code of inlineScripts) (0, eval)(code); };

const tree = { id: "11111111-1111-4111-8111-111111111111", species: "Oak", service: "Tree removal", location: "", description: "Remove", customerDiscussion: "", priceType: "fixed", priceMin: "500", priceMax: "", photos: [] };
const report = (id: string, name: string) => ({ id, customer_name: name, property_address: "1 Example St", visit_date: "2026-10-26", arborist_name: "Climber", general_notes: "", trees: [tree], status: "draft", version: 1, submitted_at: null });
const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));
let fetchMock: ReturnType<typeof vi.fn>;
const bodies = () => fetchMock.mock.calls.map(c => JSON.parse(String((c[1] as RequestInit).body)) as { action: string; token: string });

beforeEach(() => {
  sessionStorage.clear();
  resetLinkTokenForTests();
  delete w.__gcpNoTracking; delete w.__gcpArboristToken;
  window.history.replaceState(null, "", "/arborist-link");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); document.querySelectorAll("script[src]").forEach(s => s.remove()); });

describe("private link token never leaks", () => {
  it("strips the fragment and loads no trackers even when sessionStorage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    window.history.replaceState(null, "", `/arborist-link#t=${OLD}`);
    runHeadScripts();
    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toContain(OLD);
    expect(w.__gcpNoTracking).toBe(true);
    // Even forcing the loaders does nothing on this page.
    w.loadGA?.(); w.loadMetaPixel?.();
    window.dispatchEvent(new Event("load"));
    const srcs = [...document.querySelectorAll("script[src]")].map(s => s.getAttribute("src") || "");
    expect(srcs.some(s => /googletagmanager|facebook/.test(s))).toBe(false);
    // The app still gets the token from the in-memory hand-off.
    expect(readLinkToken()).toBe(OLD);
  });

  it("a malformed new link clears the previous token and never reopens the old quote", () => {
    sessionStorage.setItem(ARBORIST_LINK_STORAGE_KEY, OLD);
    window.history.replaceState(null, "", "/arborist-link#t=not-a-real-token");
    runHeadScripts();
    expect(window.location.hash).toBe("");
    expect(readLinkToken()).toBeNull();
    expect(sessionStorage.getItem(ARBORIST_LINK_STORAGE_KEY)).toBeNull();
    expect(readLinkToken()).toBeNull();
  });

  it("a malformed fragment read by the app also clears an earlier token", () => {
    window.history.replaceState(null, "", `/arborist-link#t=${OLD}`);
    expect(readLinkToken()).toBe(OLD);
    window.history.replaceState(null, "", "/arborist-link#t=short");
    expect(readLinkToken()).toBeNull();
    expect(sessionStorage.getItem(ARBORIST_LINK_STORAGE_KEY)).toBeNull();
  });

  it("switching links in the same tab clears the old form and only uses the new token", async () => {
    let releaseNew: () => void = () => {};
    fetchMock.mockImplementation((_url, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.token === OLD) return reply(200, { state: "ok", expires_at: "2026-11-02T00:00:00Z", report: report("r-old", "Old Customer") });
      return new Promise<Response>(done => { releaseNew = () => done(new Response(JSON.stringify({ state: "ok", expires_at: "2026-11-02T00:00:00Z", report: report("r-new", "New Customer") }), { status: 200 })); });
    });
    window.history.replaceState(null, "", `/arborist-link#t=${OLD}`);
    render(<MemoryRouter><HelmetProvider><ArboristLink /></HelmetProvider></MemoryRouter>);
    expect(await screen.findByDisplayValue("Old Customer")).toBeInTheDocument();

    await act(async () => {
      window.history.replaceState(null, "", `/arborist-link#t=${NEW}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(screen.queryByDisplayValue("Old Customer")).toBeNull();
    expect(screen.getByText("Opening quote form…")).toBeInTheDocument();
    await act(async () => { releaseNew(); });
    expect(await screen.findByDisplayValue("New Customer")).toBeInTheDocument();
    expect(window.location.hash).toBe("");

    await act(async () => {
      window.history.replaceState(null, "", "/arborist-link#t=broken");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(await screen.findByText("Link not valid")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("New Customer")).toBeNull();
    expect(bodies().map(b => b.token)).toEqual([OLD, NEW]);
  });
});
