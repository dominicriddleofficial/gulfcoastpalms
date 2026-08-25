import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ServiceAddressCard from "@/components/platform/billing/ServiceAddressCard";
import {
  buildFormattedAddress,
  resolveInvoiceDisplayAddress,
  serviceAddressUpdatePayload,
} from "@/lib/invoice-address";

const updateSpy = vi.fn();

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ isOwner: true, role: "owner", isLoading: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      update: (payload: Record<string, unknown>) => {
        updateSpy(payload);
        return { eq: () => Promise.resolve({ error: null }) };
      },
    }),
  },
}));

describe("invoice address helper", () => {
  it("builds a formatted string from parts", () => {
    expect(buildFormattedAddress({ line1: "615 Lagoon Drive", city: "Destin", state: "FL", zip: "32541" }))
      .toBe("615 Lagoon Drive, Destin, FL 32541");
  });

  it("ignores a stale formatted address that disagrees with line1", () => {
    expect(
      resolveInvoiceDisplayAddress({
        service: {
          line1: "615 Lagoon Drive",
          city: "Destin",
          state: "FL",
          zip: "32541",
          formatted: "625 Lagoon Dr, Destin, FL 32541, USA",
        },
      }),
    ).toBe("615 Lagoon Drive, Destin, FL 32541");
  });

  it("keeps a matching Google formatted address", () => {
    expect(
      serviceAddressUpdatePayload(
        { line1: "615 Lagoon Drive", city: "Destin", state: "FL", zip: "32541" },
        "615 Lagoon Drive, Destin, FL 32541, USA",
      ).service_formatted_address,
    ).toBe("615 Lagoon Drive, Destin, FL 32541, USA");
  });

  it("falls back to the property address when no service override exists", () => {
    expect(resolveInvoiceDisplayAddress({ service: null, propertyAddress: "1 Main St, Destin" }))
      .toBe("1 Main St, Destin");
  });
});

describe("ServiceAddressCard", () => {
  it("writes line1 and the rebuilt formatted address together", async () => {
    const onUpdated = vi.fn();
    render(
      <ServiceAddressCard
        invoice={{
          id: "inv-1",
          service_address_line1: "615 Lagoon Drive",
          service_city: "Destin",
          service_state: "FL",
          service_zip: "32541",
          service_formatted_address: "625 Lagoon Dr, Destin, FL 32541, USA",
        }}
        onUpdated={onUpdated}
      />,
    );

    // Stale formatted value must not be displayed.
    expect(screen.getByTestId("service-address-value").textContent).toBe("615 Lagoon Drive, Destin, FL 32541");

    fireEvent.click(screen.getByTestId("service-address-edit"));
    fireEvent.change(screen.getByTestId("service-address-line1"), { target: { value: "618 Lagoon Drive" } });
    fireEvent.click(screen.getByText("Save address"));

    await waitFor(() => expect(onUpdated).toHaveBeenCalled());
    expect(updateSpy).toHaveBeenCalledWith({
      service_address_line1: "618 Lagoon Drive",
      service_address_line2: null,
      service_city: "Destin",
      service_state: "FL",
      service_zip: "32541",
      service_formatted_address: "618 Lagoon Drive, Destin, FL 32541",
    });
  });
});
