import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { submitLead } from "@/lib/submit-lead";
import { invokeEdge } from "@/lib/invoke-edge";
import { trackEvent } from "@/lib/analytics";

vi.mock("@/lib/invoke-edge", () => ({ invokeEdge: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
const lead = { name: "Audit Test", phone: "8505550101", service: "Palm Tree Trimming" };

beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-18T12:00:00Z")); });
afterEach(() => vi.useRealTimers());

describe("Lead submission reliability", () => {
  it("keeps a fast autofill submission retryable instead of claiming it was saved", async () => {
    const input = { ...lead, formRenderTime: Date.now() - 500 };
    const first = await submitLead(input);
    expect(first.success).toBe(false);
    expect(first.error).toContain("not been sent");
    expect(invokeEdge).not.toHaveBeenCalled();
    expect(trackEvent).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    vi.mocked(invokeEdge).mockResolvedValue({ data: { success: true, id: "test-lead" }, error: null } as never);
    expect((await submitLead(input)).success).toBe(true);
    expect(invokeEdge).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledTimes(1);
  });

  it("does not track a conversion when the server refuses a fast submission", async () => {
    vi.mocked(invokeEdge).mockResolvedValue({ data: { success: true, too_fast: true }, error: null } as never);
    expect((await submitLead(lead)).success).toBe(false);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("does not claim success when saving the request fails", async () => {
    vi.mocked(invokeEdge).mockResolvedValue({ data: null, error: { message: "Could not save request" } } as never);
    expect(await submitLead(lead)).toEqual({ success: false, error: "Could not save request" });
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
