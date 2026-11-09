import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { builderOptionErrors, computeOptionTotals, selectionErrors, type OptionLine } from "@/lib/quote-options";
import { depositCentsForTotal } from "@/lib/quote-deposit";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn(), from: () => { throw new Error("no direct db"); } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn(), useToast: () => ({ toast: vi.fn() }) }));
import ViewQuote from "@/pages/quote/ViewQuote";

const PATIO = "11111111-1111-4111-8111-111111111111";
const GARAGE = "22222222-2222-4222-8222-222222222222";
const lines: OptionLine[] = [
  { id: PATIO, description: "Patio", quantity: 605, unit: "sq ft", unit_price: 7.5, option_kind: "optional", option_group: null, default_selected: true },
  { id: GARAGE, description: "Garage", quantity: 975, unit: "sq ft", unit_price: 6.5, option_kind: "optional", option_group: null, default_selected: true },
];
const plan = { deposit_type: "percentage", deposit_value: 25 };
const at = (sel: string[]) => {
  const total = Math.round(computeOptionTotals(lines, sel, { taxRate: 0, discountTotal: 0 }).total * 100);
  const dep = depositCentsForTotal(plan, total) ?? 0;
  return [total, dep, total - dep];
};

describe("PPS all-optional line items", () => {
  it("both on, patio only and garage only give exact cents totals, 25% deposits (half-cents up) and balances", () => {
    expect(at([PATIO, GARAGE])).toEqual([1087500, 271875, 815625]);
    expect(at([PATIO])).toEqual([453750, 113438, 340312]);
    expect(at([GARAGE])).toEqual([633750, 158438, 475312]);
  });
  it("an empty selection is refused", () => {
    expect(selectionErrors(lines, [])).toContain("Turn on at least one line item to approve this quote.");
    expect(selectionErrors(lines, [PATIO])).toEqual([]);
  });
  it("PPS may save all-optional lines only when one starts selected; GCP still needs required work", () => {
    expect(builderOptionErrors(lines, { allowAllOptional: true })).toEqual([]);
    expect(builderOptionErrors(lines.map(l => ({ ...l, default_selected: false })), { allowAllOptional: true }).length).toBe(1);
    expect(builderOptionErrors(lines)).toEqual(["Add at least one required line of work."]);
  });
});

let calls: Array<[string, Record<string, unknown>]> = [];
function renderQuote(body: Record<string, unknown>, snapshot: Record<string, unknown>) {
  calls = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const name = String(url).split("/").pop() ?? "";
    calls.push([name, JSON.parse(String(init?.body ?? "{}"))]);
    if (name === "get-quote-public") return new Response(JSON.stringify(body));
    if (name === "approve-quote") return new Response(JSON.stringify({ success: true, status: "approved", snapshot }));
    return new Response(JSON.stringify({ error: true, message: "test stop" }), { status: 400 });
  }));
  return render(<HelmetProvider><MemoryRouter initialEntries={["/q/pps/q-pps"]}><Routes><Route path="/q/:shortcode/:quoteId" element={<ViewQuote />} /></Routes></MemoryRouter></HelmetProvider>);
}
beforeEach(() => {
  const ctx = { beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, clearRect() {} } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("public PPS quote toggles", () => {
  const quote = {
    id: "q-pps", quote_number: "PPS-Q-000099", status: "sent", created_at: "2026-11-06T00:00:00Z", shortcode: "PPS",
    business_name: "Prestige Property Services", customer_name: "Pat", subtotal: 10875, tax_total: 0, tax_rate: 0, discount_total: 0, total: 10875,
    deposit_required: true, deposit_amount: 2718.75, deposit_type: "percentage", deposit_value: 25, approval_token: "tok", pricing_fingerprint: "fp",
    line_items: lines.map(l => ({ ...l, line_total: l.quantity * l.unit_price })),
  };
  it("turning the garage off updates total, deposit and balance; all off blocks approval; approval sends selection and checks out from the recorded deposit", async () => {
    renderQuote(quote, { total: 4537.5, subtotal: 4537.5, tax_total: 0, discount_total: 0, deposit_amount: 1134.38, selected_option_ids: [PATIO] });
    await screen.findByTestId("quote-deposit");
    expect(screen.getByTestId("quote-deposit-amount").textContent).toBe("$2,718.75");
    expect(screen.getByTestId("quote-deposit-balance").textContent).toContain("$8,156.25");
    fireEvent.click(screen.getByRole("switch", { name: "Add Garage" }));
    expect(screen.getByTestId("quote-deposit-amount").textContent).toBe("$1,134.38");
    expect(screen.getByTestId("quote-deposit-balance").textContent).toContain("$3,403.12");
    fireEvent.click(screen.getByRole("switch", { name: "Add Patio" }));
    expect(screen.getByRole("alert").textContent).toContain("Turn on at least one line item");
    expect((screen.getByRole("button", { name: /approve/i }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("switch", { name: "Add Patio" }));

    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    fireEvent.mouseDown(canvas, { clientX: 1, clientY: 1 }); fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 }); fireEvent.mouseUp(canvas);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Approve & Pay Deposit" }));
    fireEvent.change(screen.getByPlaceholderText("Enter your full name"), { target: { value: "Pat" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Approval" }));
    await waitFor(() => expect(calls.map(c => c[0])).toContain("create-checkout"));
    const approve = calls.find(c => c[0] === "approve-quote")?.[1];
    expect(approve?.selected_option_ids).toEqual([PATIO]);
    expect(approve?.pricing_fingerprint).toBe("fp");
  });
});
