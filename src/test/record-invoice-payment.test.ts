import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordInvoicePayment, RecordedPaymentError } from "@/lib/record-invoice-payment";

const mocks = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
  payments: [] as { amount: number; is_refund: boolean }[],
  insert: vi.fn(), update: vi.fn(), number: vi.fn(),
  updateError: null as null | { message: string },
}));

vi.mock("@/integrations/supabase/client", () => {
  const query = (result: unknown) => {
    const chain = { eq: vi.fn(), select: vi.fn(), single: vi.fn(async () => result), then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
    chain.eq.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    return chain;
  };
  return { supabase: {
    from: (table: string) => table === "platform_invoices" ? {
      select: () => query({ data: mocks.current, error: null }),
      update: (payload: Record<string, unknown>) => {
        mocks.update(payload);
        return query({ data: mocks.updateError ? null : { ...mocks.current, ...payload }, error: mocks.updateError });
      },
    } : {
      select: () => query({ data: mocks.payments, error: null }),
      insert: mocks.insert,
    },
    rpc: mocks.number,
  } };
});

const input = {
  invoice: { id: "invoice-1", business_id: "gcp" }, userId: "owner",
  amount: 750, method: "check", notes: "Check 101", paymentDate: "2026-10-12",
};

describe("recordInvoicePayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.current = { id: "invoice-1", business_id: "gcp", customer_id: "customer-1", total: 1000, amount_paid: 250, balance_due: 750, status: "partial", updated_at: "2026-10-01T00:00:00Z", deposit_required: true };
    mocks.payments = [{ amount: 250, is_refund: false }];
    mocks.updateError = null;
    mocks.insert.mockResolvedValue({ error: null });
    mocks.number.mockResolvedValue({ data: "GCP-P-100", error: null });
  });

  it("records only the remaining balance and returns the persisted paid invoice", async () => {
    const saved = await recordInvoicePayment(input);
    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ amount: 750, method: "check", payment_date: "2026-10-12", recorded_by_user_id: "owner", invoice_id: "invoice-1" }));
    expect(saved).toMatchObject({ status: "paid", amount_paid: 1000, balance_due: 0, deposit_paid: true });
    expect(saved.paid_at).toContain("2026-10-12");
  });

  it("rejects a stale balance without recording more money", async () => {
    mocks.current.amount_paid = 500;
    await expect(recordInvoicePayment(input)).rejects.toThrow("balance has changed");
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("does not mark a changed invoice paid when its total has increased", async () => {
    mocks.current.total = 1200;
    await expect(recordInvoicePayment({ ...input, requireFullBalance: true })).rejects.toThrow("balance has changed");
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("keeps a smaller manual payment partial", async () => {
    const saved = await recordInvoicePayment({ ...input, amount: 100 });
    expect(saved).toMatchObject({ status: "partial", amount_paid: 350, balance_due: 650 });
  });

  it.each(["paid", "void"])("does not record another payment for a %s invoice", async status => {
    mocks.current.status = status;
    await expect(recordInvoicePayment(input)).rejects.toThrow(`already ${status}`);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("blocks another insert after an earlier payment was saved without its invoice update", async () => {
    mocks.payments.push({ amount: 750, is_refund: false });
    await expect(recordInvoicePayment(input)).rejects.toBeInstanceOf(RecordedPaymentError);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("leaves the invoice unchanged when generating a payment number fails", async () => {
    mocks.number.mockResolvedValue({ data: null, error: { message: "No access" } });
    await expect(recordInvoicePayment(input)).rejects.toThrow("No access");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("leaves the invoice unchanged when the payment insert fails", async () => {
    mocks.insert.mockResolvedValue({ error: { message: "Write failed" } });
    await expect(recordInvoicePayment(input)).rejects.toThrow("Write failed");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("reports a recorded payment separately from a failed invoice update", async () => {
    mocks.updateError = { message: "Invoice changed" };
    await expect(recordInvoicePayment(input)).rejects.toThrow("Payment was recorded, but the invoice could not be updated");
    expect(mocks.insert).toHaveBeenCalledOnce();
  });

  it("handles cents without leaving a floating point balance", async () => {
    mocks.current = { ...mocks.current, total: 0.3, amount_paid: 0.1, balance_due: 0.2 };
    mocks.payments = [{ amount: 0.1, is_refund: false }];
    const saved = await recordInvoicePayment({ ...input, amount: 0.2 });
    expect(saved).toMatchObject({ status: "paid", amount_paid: 0.3, balance_due: 0 });
  });
});
