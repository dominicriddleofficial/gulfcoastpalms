import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PaymentMethodCard from "@/components/platform/billing/PaymentMethodCard";

const updateSpy = vi.fn();

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ isOwner: true, role: "owner", isLoading: false }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "platform_payments") {
        return {
          select: () => ({ eq: () => Promise.resolve({ count: 0, error: null }) }),
        };
      }
      return {
        update: (payload: Record<string, unknown>) => {
          updateSpy(payload);
          return { eq: () => Promise.resolve({ error: null }) };
        },
      };
    },
  },
}));

const base = {
  id: "inv-1",
  invoice_number: "GCP-I-000106",
  status: "sent",
  payment_method: "card",
  amount_paid: 0,
};

describe("PaymentMethodCard", () => {
  beforeEach(() => updateSpy.mockClear());

  it("lets an owner change a sent invoice from card to check, updating only payment_method", async () => {
    const onUpdated = vi.fn();
    render(<PaymentMethodCard invoice={base} businessName="Gulf Coast Palms" onUpdated={onUpdated} />);

    expect(screen.getByTestId("payment-method-value").textContent).toContain("Card (online payment link)");
    fireEvent.click(screen.getByTestId("payment-method-edit"));
    fireEvent.click(screen.getByText("Check (mail-in)"));

    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith("check"));
    expect(updateSpy).toHaveBeenCalledWith({ payment_method: "check" });
  });

  it("shows the method read-only with a note when the invoice is paid", async () => {
    render(
      <PaymentMethodCard
        invoice={{ ...base, status: "paid", amount_paid: 975 }}
        businessName="Gulf Coast Palms"
        onUpdated={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("payment-method-edit")).toBeNull();
    expect(
      screen.getByText("This invoice has been paid. Payment method can't be changed."),
    ).toBeTruthy();
  });
});
