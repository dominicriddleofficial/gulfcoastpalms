import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import InvoiceBuilder from "@/components/platform/billing/InvoiceBuilder";
import InvoicePreviewPanel from "@/components/platform/billing/InvoicePreviewPanel";

const m = vi.hoisted(() => ({
  RecordedPaymentError: class RecordedPaymentError extends Error {},
  invoiceInsert: vi.fn(), lineInsert: vi.fn(), invoke: vi.fn(),
  record: vi.fn(), lineError: null as null | { message: string },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/record-invoice-payment", () => {
  return { recordInvoicePayment: m.record, RecordedPaymentError: m.RecordedPaymentError };
});
vi.mock("@/integrations/supabase/client", () => {
  const chain = (result: unknown): Record<string, unknown> => {
    const c: Record<string, unknown> = {};
    for (const k of ["select", "eq", "order", "limit", "ilike", "or", "in", "neq", "is"]) c[k] = () => c;
    c.single = async () => result; c.maybeSingle = async () => result;
    c.then = (r: (v: unknown) => unknown) => Promise.resolve(result).then(r);
    return c;
  };
  return { supabase: {
    rpc: async () => ({ data: "GCP-I-000200", error: null }),
    functions: { invoke: m.invoke },
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
    from: (table: string) => ({
      ...chain({ data: [], error: null }),
      insert: (payload: unknown) => {
        if (table === "platform_invoices") {
          m.invoiceInsert(payload);
          return chain({ data: { id: "inv-1", invoice_number: "GCP-I-000200" }, error: null });
        }
        if (table === "platform_invoice_line_items") {
          m.lineInsert(payload);
          return Promise.resolve({ error: m.lineError });
        }
        return chain({ data: null, error: null });
      },
    }),
  } };
});

const onCreated = vi.fn();
function setup(userId: string | null = "owner-1") {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <InvoiceBuilder businessId="gcp" userId={userId} onClose={() => {}} onCreated={onCreated}
        businesses={[{ id: "gcp", public_brand_name: "Gulf Coast Palms", shortcode: "gcp", logo_url: null }]}
        prefill={{ customer: { id: "cust-1", display_name: "Jane Doe", phone: null, email: null },
          items: [{ description: "Palm trimming", quantity: 2, unit_price: 125 }] }} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Already paid" }));
}

describe("InvoiceBuilder — Already paid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.lineError = null;
    m.record.mockResolvedValue({ id: "inv-1", status: "paid" });
  });

  it("shows paid amount, $0 balance, and only the Save Paid Invoice action", () => {
    setup();
    expect(screen.getByTestId("paid-amount").textContent).toContain("$250.00");
    expect(screen.getByTestId("paid-balance").textContent).toContain("$0.00");
    expect(screen.queryByRole("button", { name: /Save as Draft/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Send Invoice/ })).toBeNull();
    expect(screen.getByLabelText("Date received")).toHaveValue(new Date().toLocaleDateString("en-CA"));
  });

  it("saves the invoice, line items and a real payment without sending anything", async () => {
    setup();
    fireEvent.change(screen.getByLabelText("How payment was received"), { target: { value: "zelle" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Paid Invoice/ }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    expect(m.invoiceInsert).toHaveBeenCalledWith(expect.objectContaining({ total: 250, business_id: "gcp", customer_id: "cust-1", payment_method: "p2p" }));
    expect(m.lineInsert).toHaveBeenCalledOnce();
    expect(m.record).toHaveBeenCalledWith(expect.objectContaining({
      invoice: { id: "inv-1", business_id: "gcp" }, userId: "owner-1", amount: 250, method: "zelle", requireFullBalance: true,
    }));
    expect(m.invoke).not.toHaveBeenCalled();
  });

  it("ignores a double tap", async () => {
    setup();
    const btn = screen.getByRole("button", { name: /Save Paid Invoice/ });
    fireEvent.click(btn); fireEvent.click(btn);
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    expect(m.invoiceInsert).toHaveBeenCalledOnce();
    expect(m.record).toHaveBeenCalledOnce();
  });

  it("after a payment failure, retry only records the payment and never recreates the invoice", async () => {
    m.record.mockRejectedValueOnce(new Error("network down"));
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Save Paid Invoice/ }));
    const retry = await screen.findByRole("button", { name: /Finish saving/ });
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("GCP-I-000200");
    fireEvent.click(retry);
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    expect(m.invoiceInsert).toHaveBeenCalledOnce();
    expect(m.lineInsert).toHaveBeenCalledOnce();
    expect(m.record).toHaveBeenCalledTimes(2);
  });

  it("after a line-item failure, retry finishes lines and payment only", async () => {
    m.lineError = { message: "write failed" };
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Save Paid Invoice/ }));
    const retry = await screen.findByRole("button", { name: /Finish saving/ });
    expect(m.record).not.toHaveBeenCalled();
    m.lineError = null;
    fireEvent.click(retry);
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    expect(m.invoiceInsert).toHaveBeenCalledOnce();
    expect(m.lineInsert).toHaveBeenCalledTimes(2);
  });

  it.each([["", "empty"], ["2999-01-01", "future"], ["2026-02-30", "impossible"]])("blocks a %s (%s) received date before any write", async (value) => {
    setup();
    fireEvent.change(screen.getByLabelText("Date received"), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: /Save Paid Invoice/ }));
    await new Promise(r => setTimeout(r, 0));
    expect(m.invoiceInsert).not.toHaveBeenCalled();
    expect(m.lineInsert).not.toHaveBeenCalled();
    expect(m.record).not.toHaveBeenCalled();
  });

  it("does not show the recovery notice while the payment is still saving", async () => {
    let finish: (v: unknown) => void = () => {};
    m.record.mockImplementationOnce(() => new Promise(r => { finish = r; }));
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Save Paid Invoice/ }));
    await waitFor(() => expect(m.record).toHaveBeenCalledOnce());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
    finish({ id: "inv-1", status: "paid" });
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("RecordedPaymentError blocks any retry without duplicate writes", async () => {
    m.record.mockRejectedValueOnce(new m.RecordedPaymentError("already recorded"));
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Save Paid Invoice/ }));
    const blocked = await screen.findByRole("button", { name: /Finish saving/ });
    expect(blocked).toBeDisabled();
    expect(screen.getByRole("alert").textContent).toContain("needs review");
    fireEvent.click(blocked);
    await new Promise(r => setTimeout(r, 0));
    expect(m.invoiceInsert).toHaveBeenCalledOnce();
    expect(m.lineInsert).toHaveBeenCalledOnce();
    expect(m.record).toHaveBeenCalledOnce();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("surfaces an unexpected error and keeps the saved invoice for a safe resume", async () => {
    m.lineInsert.mockImplementationOnce(() => { throw new Error("socket closed"); });
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Save Paid Invoice/ }));
    const retry = await screen.findByRole("button", { name: /Finish saving/ });
    fireEvent.click(retry);
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    expect(m.invoiceInsert).toHaveBeenCalledOnce();
  });

  it("requires a signed-in user before saving", async () => {
    setup(null);
    fireEvent.click(screen.getByRole("button", { name: /Save Paid Invoice/ }));
    await new Promise(r => setTimeout(r, 0));
    expect(m.invoiceInsert).not.toHaveBeenCalled();
  });
});

describe("InvoicePreviewPanel — paid", () => {
  const base = {
    invoiceNumber: "GCP-I-1", issueDate: "2026-10-01", dueDate: "2026-10-31", customerName: "Jane",
    lineItems: [{ description: "Trim", quantity: 1, unit_price: 500, line_total: 500 }],
    subtotal: 500, taxRate: 0, taxAmount: 0, discountAmount: 0, total: 500, publicNotes: "",
    businessName: "Gulf Coast Palms", shortcode: "gcp", paymentMethod: "check",
  };
  it("shows PAID, total, amount paid and $0 balance with no pay/remit blocks", () => {
    render(<InvoicePreviewPanel data={{ ...base, isDraft: false, status: "paid", amountPaid: 500 }} />);
    const text = document.body.textContent || "";
    expect(text).toContain("PAID");
    expect(text).toContain("Amount Paid$500.00");
    expect(text).toContain("Balance Due$0.00");
    expect(text).not.toContain("PAY TO");
    expect(text).not.toContain("PAY BY CHECK");
    expect(text).not.toContain("Pay Now");
  });
  it("unpaid check invoice is unchanged", () => {
    render(<InvoicePreviewPanel data={{ ...base, isDraft: true }} />);
    const text = document.body.textContent || "";
    expect(text).toContain("PAY TO");
    expect(text).toContain("TOTAL DUE");
    expect(text).not.toContain("Balance Due");
  });
});
