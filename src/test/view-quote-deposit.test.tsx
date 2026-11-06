import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn(), from: () => { throw new Error("no direct db"); } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn(), useToast: () => ({ toast: vi.fn() }) }));
import ViewQuote from "@/pages/quote/ViewQuote";

const ppsQuote = (over: Record<string, unknown> = {}) => ({
  id: "q-pps", quote_number: "PPS-Q-000050", status: "sent", created_at: "2026-11-06T00:00:00Z", shortcode: "PPS",
  business_name: "Prestige Property Services", customer_name: "Pat", subtotal: 10875, tax_total: 0, tax_rate: 0, discount_total: 0, total: 10875,
  deposit_required: false, deposit_amount: 0, approval_token: "tok", scope_of_work: "Patio\n• Surface preparation for coating",
  line_items: [
    { description: "Patio — surface preparation, moisture vapor barrier, UV-resistant polyaspartic base coat, decorative flake broadcast, polyaspartic top coat", quantity: 605, unit: "sq ft", unit_price: 7.5, line_total: 4537.5 },
    { description: "Garage — surface preparation, epoxy base coat, decorative flake broadcast, polyaspartic top coat (no moisture vapor barrier)", quantity: 975, unit: "sq ft", unit_price: 6.5, line_total: 6337.5 },
  ],
  ...over,
});
let calls: string[] = [];
function renderQuote(body: Record<string, unknown>) {
  calls = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const name = String(url).split("/").pop() ?? "";
    calls.push(name);
    if (name === "get-quote-public") return new Response(JSON.stringify(body));
    if (name === "approve-quote") return new Response(JSON.stringify({ success: true, status: "approved" }));
    if (name === "create-checkout") return new Response(JSON.stringify({ error: true, message: "test stop" }), { status: 400 });
    return new Response("{}", { status: 404 });
  }));
  return render(<HelmetProvider><MemoryRouter initialEntries={["/q/pps/q-pps"]}><Routes><Route path="/q/:shortcode/:quoteId" element={<ViewQuote />} /></Routes></MemoryRouter></HelmetProvider>);
}
async function approve() {
  const canvas = document.querySelector("canvas")!;
  fireEvent.mouseDown(canvas, { clientX: 1, clientY: 1 }); fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 }); fireEvent.mouseUp(canvas);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: /approve/i }));
  fireEvent.change(screen.getByPlaceholderText("Enter your full name"), { target: { value: "Pat" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm Approval" }));
  await waitFor(() => expect(screen.getByText("Quote Approved!")).toBeTruthy());
}

beforeEach(() => {
  const ctx = { beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, clearRect() {} } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("public PPS quote deposits", () => {
  it("a no-deposit PPS quote shows no payment schedule, paid status or date and approves without checkout", async () => {
    renderQuote(ppsQuote());
    await screen.findAllByText("PPS-Q-000050");
    const text = document.body.textContent ?? "";
    for (const s of ["Paid", "Apr 10", "20%", "40%", "Deposit to schedule", "Pay Deposit", "Next Payment"]) expect(text).not.toContain(s);
    expect(screen.getByRole("button", { name: "Approve Quote" })).toBeTruthy();
    expect(text).toContain("605 sq ft");
    expect(text).toContain("$10,875.00");
    await approve();
    expect(calls).toEqual(["get-quote-public", "approve-quote"]);
  });

  it("a quote with a saved deposit shows exactly that amount as due (never paid) and starts checkout only after approval", async () => {
    renderQuote(ppsQuote({ deposit_required: true, deposit_amount: 1250 }));
    await screen.findByTestId("quote-deposit");
    const text = document.body.textContent ?? "";
    expect(text).toContain("$1,250.00");
    expect(text).toContain("Due after you approve");
    expect(text).not.toContain("Paid");
    expect(screen.queryByRole("button", { name: "Pay deposit" })).toBeNull();
    expect(screen.getByRole("button", { name: "Approve & Pay Deposit" })).toBeTruthy();
    await approve();
    expect(calls).toEqual(["get-quote-public", "approve-quote", "create-checkout"]);
  });

  it("a GCP quote with a saved deposit stays approval-only and never starts checkout", async () => {
    renderQuote(ppsQuote({ shortcode: "GCP", quote_number: "GCP-Q-000050", business_name: "Gulf Coast Palms", deposit_required: true, deposit_amount: 1250 }));
    await screen.findAllByText("GCP-Q-000050");
    expect(screen.queryByTestId("quote-deposit")).toBeNull();
    expect(screen.queryByRole("button", { name: "Approve & Pay Deposit" })).toBeNull();
    await approve();
    expect(calls).toEqual(["get-quote-public", "approve-quote"]);
  });
});
