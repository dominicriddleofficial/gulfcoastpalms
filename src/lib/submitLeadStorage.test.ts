import { describe, it, expect, vi, beforeEach, afterEach, onTestFinished } from "vitest";

const invokeEdge = vi.fn();
const trackEvent = vi.fn();
vi.mock("@/lib/invoke-edge", () => ({ invokeEdge: (...a: unknown[]) => invokeEdge(...a) }));

const valid = { name: "Test Person", phone: "8505550100", service: "Palm Tree Trimming", location: "Pensacola", message: "hi", formRenderTime: Date.now() - 10_000 };
const throwing = () => {
  const boom = () => { throw new Error("blocked"); };
  return { getItem: boom, setItem: boom, removeItem: boom, clear: boom, key: boom, length: 0 };
};
const at = (u: string) => Object.defineProperty(window, "location", { configurable: true, value: new URL(u) });

beforeEach(() => { vi.resetModules(); invokeEdge.mockReset(); trackEvent.mockReset(); at("https://gulfcoastpalmservices.com/quote"); });
afterEach(() => { vi.unstubAllGlobals(); vi.doUnmock("@/lib/analytics"); });

describe("quote form with blocked storage", () => {
  it("still sends a valid lead and reports success when every storage call throws", async () => {
    vi.stubGlobal("sessionStorage", throwing());
    vi.stubGlobal("localStorage", throwing());
    invokeEdge.mockResolvedValue({ data: { success: true, id: "x" }, error: null });
    const { submitLead } = await import("./submit-lead");
    const r = await submitLead({ ...valid, formRenderTime: Date.now() - 10_000 });
    expect(r).toEqual({ success: true });
    expect(invokeEdge).toHaveBeenCalledTimes(1);
    expect(invokeEdge.mock.calls[0][0]).toBe("submit-lead");
  });

  it("still sends when the storage getter itself throws", async () => {
    const orig = Object.getOwnPropertyDescriptor(window, "sessionStorage");
    Object.defineProperty(window, "sessionStorage", { configurable: true, get: () => { throw new Error("denied"); } });
    onTestFinished(() => { if (orig) Object.defineProperty(window, "sessionStorage", orig); });
    invokeEdge.mockResolvedValue({ data: { success: true }, error: null });
    const { submitLead } = await import("./submit-lead");
    expect((await submitLead({ ...valid, formRenderTime: Date.now() - 10_000 })).success).toBe(true);
    expect(invokeEdge).toHaveBeenCalledTimes(1);
  });
});

describe("save results and tracking", () => {
  it("a failed backend save returns failure and records no success event", async () => {
    vi.doMock("@/lib/analytics", async (orig) => ({ ...(await orig<typeof import("./analytics")>()), trackEvent: (...a: unknown[]) => trackEvent(...a) }));
    invokeEdge.mockResolvedValue({ data: { success: false, error: "db down" }, error: null });
    const { submitLead } = await import("./submit-lead");
    const r = await submitLead({ ...valid, formRenderTime: Date.now() - 10_000 });
    expect(r).toEqual({ success: false, error: "db down" });
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("uses the same visit ad tags as analytics: new campaign replaces old, a new visit starts clean", async () => {
    invokeEdge.mockResolvedValue({ data: { success: true }, error: null });
    const a = await import("./analytics");
    const { submitLead } = await import("./submit-lead");
    at("https://gulfcoastpalmservices.com/quote?utm_source=google&utm_medium=cpc&utm_campaign=spring");
    await submitLead({ ...valid, formRenderTime: Date.now() - 10_000 });
    let body = invokeEdge.mock.calls.at(-1)?.[1] as { lead_source: string; page_context: Record<string, unknown> };
    expect(body.lead_source).toBe("Google Ads");
    expect(body.page_context.utm_campaign).toBe("spring");

    at("https://gulfcoastpalmservices.com/quote?utm_source=facebook&utm_campaign=storm");
    a.captureUtmFromUrl();
    at("https://gulfcoastpalmservices.com/quote");
    await submitLead({ ...valid, formRenderTime: Date.now() - 10_000 });
    body = invokeEdge.mock.calls.at(-1)?.[1] as typeof body;
    expect(body.lead_source).toBe("Facebook/Instagram Ads");
    expect(body.page_context.utm_campaign).toBe(a.captureUtmFromUrl().utm_campaign);

    // A later visit (new session) does not inherit the old campaign.
    sessionStorage.clear(); a.__resetMemoryIds();
    await submitLead({ ...valid, formRenderTime: Date.now() - 10_000 });
    body = invokeEdge.mock.calls.at(-1)?.[1] as typeof body;
    expect(body.page_context.utm_campaign).toBeNull();
    expect(body.lead_source).toBe("Direct / Unknown");
  });
});
