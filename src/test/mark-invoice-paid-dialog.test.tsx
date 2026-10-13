import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MarkInvoicePaidDialog from "@/components/platform/billing/MarkInvoicePaidDialog";
import type { PlatformInvoice } from "@/hooks/usePlatformInvoices";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const invoice = { id: "invoice-1", invoice_number: "GCP-I-100", customer_name: "Test Customer", total: 1000, amount_paid: 250, balance_due: 750, status: "partial" } as PlatformInvoice;

describe("MarkInvoicePaidDialog", () => {
  it("shows the remaining balance and prevents double submission while saving", async () => {
    let finish!: (saved: boolean) => void;
    const onConfirm = vi.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
    const onClose = vi.fn();
    render(<MarkInvoicePaidDialog invoice={invoice} onClose={onClose} onConfirm={onConfirm} />);
    expect(screen.getByText("$750.00")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Payment method"), { target: { value: "zelle" } });
    fireEvent.change(screen.getByLabelText("Date received"), { target: { value: "2026-10-12" } });
    const button = screen.getByRole("button", { name: "Mark as Paid" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledWith(750, "zelle", expect.any(String), "2026-10-12");
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
    finish(true);
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("keeps the dialog open when saving fails", async () => {
    const onClose = vi.fn();
    render(<MarkInvoicePaidDialog invoice={invoice} onClose={onClose} onConfirm={vi.fn(async () => false)} />);
    fireEvent.click(screen.getByRole("button", { name: "Mark as Paid" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Mark as Paid" })).not.toBeDisabled());
    expect(onClose).not.toHaveBeenCalled();
  });
});
