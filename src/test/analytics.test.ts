import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

beforeEach(() => { vi.resetModules(); localStorage.clear(); sessionStorage.clear(); window.gtag = vi.fn(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true })); });
afterEach(() => { delete window.gtag; vi.unstubAllGlobals(); });

describe("Public marketing analytics", () => {
  it("sends one GA4 event for one route view, including duplicate mount calls", async () => {
    const { trackPageView } = await import("@/lib/analytics");
    trackPageView("/services/palm-tree-trimming");
    trackPageView("/services/palm-tree-trimming");
    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith("event", "page_view", expect.objectContaining({page_path: "/services/palm-tree-trimming"}));
    trackPageView("/quote");
    expect(window.gtag).toHaveBeenCalledTimes(2);
  });

  it.each(["/platform/schedule", "/pay/gcp/test", "/quote/gcp/test", "/portal", "/admin"])("excludes private route %s from GA4", async (path) => {
    const { trackPageView } = await import("@/lib/analytics");
    trackPageView(path);
    expect(window.gtag).not.toHaveBeenCalled();
  });
});
