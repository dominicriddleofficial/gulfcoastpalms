import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PrintQuoteDocument from "@/components/documents/PrintQuoteDocument";

describe("accepted quote PDF", () => {
  it("shows only the chosen scope, lists unchosen options as excluded, and prints the agreed totals", () => {
    const { container } = render(<PrintQuoteDocument data={{
      quote_number: "GCP-Q-000100", business_name: "Gulf Coast Palms", shortcode: "GCP", tagline: "", footer: "",
      customer_name: "Jane Customer", customer_address: "1 Agreed St", scope_of_work: "Agreed scope: remove two oaks.",
      line_items: [
        { description: "Remove 2 oaks", quantity: 2, unit_price: 1200.1, line_total: 2400.2 },
        { description: "Roadside placement", quantity: 1, unit_price: 150.55, line_total: 150.55 },
        { description: "Stump grinding", quantity: 1, unit_price: 250, line_total: 250 },
      ],
      excluded_items: ["Haul away"], subtotal: 2800.75, discount_total: 50, tax_rate: 7, tax_total: 196.05, total: 2946.8,
      is_approved: true, approved_by: "Jane Customer", approved_at: "2026-10-20T15:00:00Z",
    }} />);
    const text = container.textContent ?? "";
    expect(screen.getByText("Agreed scope: remove two oaks.")).toBeInTheDocument();
    expect(text).toContain("Not selected (not included in total): Haul away");
    expect(text).toContain("2,946.80");
    expect(text).toContain("-$50.00");
    expect(text).not.toContain("400.00");
  });
});
