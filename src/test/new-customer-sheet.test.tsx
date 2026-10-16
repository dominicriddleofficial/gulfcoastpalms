import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
let propFail = 0;
let custFail = false;

vi.mock("@/components/platform/AddressAutocomplete", () => ({
  default: ({ value, onTextChange, label }: { value: string; onTextChange: (v: string) => void; label?: string }) => (
    <input aria-label={label} value={value} onChange={(e) => onTextChange(e.target.value)} />
  ),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        inserts.push({ table, row });
        if (table === "platform_customers") {
          return { select: () => ({ single: async () => custFail
            ? { data: null, error: { message: "denied" } }
            : { data: { id: "cust-1", display_name: row.display_name, email: row.email, phone: row.phone }, error: null } }) };
        }
        if (propFail > 0) { propFail--; return Promise.resolve({ error: { message: "prop fail" } }); }
        return Promise.resolve({ error: null });
      },
    }),
  },
}));

import NewCustomerSheet from "@/components/platform/billing/NewCustomerSheet";

function setup() {
  const onCreated = vi.fn();
  const onOpenChange = vi.fn();
  render(<NewCustomerSheet open businessId="biz-quote" onOpenChange={onOpenChange} onCreated={onCreated} />);
  return { onCreated, onOpenChange };
}

describe("NewCustomerSheet", () => {
  beforeEach(() => { inserts.length = 0; propFail = 0; custFail = false; });

  it("requires a name and validates email without inserting", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Save customer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/name/i);
    fireEvent.change(screen.getByLabelText("First name *"), { target: { value: "Ann" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "bad" } });
    fireEvent.click(screen.getByRole("button", { name: "Save customer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/email/i);
    expect(inserts).toHaveLength(0);
  });

  it("saves trimmed customer + property into the quote's business and returns it", async () => {
    const { onCreated } = setup();
    fireEvent.change(screen.getByLabelText("First name *"), { target: { value: "  Ann " } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: " a@b.co " } });
    fireEvent.change(screen.getByLabelText("Property address (optional)"), { target: { value: "1 Main" } });
    const btn = screen.getByRole("button", { name: "Save customer" });
    fireEvent.click(btn); fireEvent.click(btn);
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(inserts.filter((i) => i.table === "platform_customers")).toHaveLength(1);
    expect(inserts[0].row).toMatchObject({ business_id: "biz-quote", display_name: "Ann", email: "a@b.co" });
    expect(inserts[1]).toMatchObject({ table: "platform_properties", row: { business_id: "biz-quote", customer_id: "cust-1", address_1: "1 Main" } });
    expect(onCreated.mock.calls[0][0]).toMatchObject({ id: "cust-1", display_name: "Ann" });
  });

  it("property failure does not re-insert the customer on retry", async () => {
    propFail = 1;
    const { onCreated } = setup();
    fireEvent.change(screen.getByLabelText("First name *"), { target: { value: "Bo" } });
    fireEvent.change(screen.getByLabelText("Property address (optional)"), { target: { value: "2 Oak" } });
    fireEvent.click(screen.getByRole("button", { name: "Save customer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/address could not be saved/i);
    expect(onCreated).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry address" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(inserts.filter((i) => i.table === "platform_customers")).toHaveLength(1);
    expect(inserts.filter((i) => i.table === "platform_properties")).toHaveLength(2);
  });

  it("customer failure keeps inputs; cancel creates nothing", async () => {
    custFail = true;
    const { onCreated, onOpenChange } = setup();
    fireEvent.change(screen.getByLabelText("First name *"), { target: { value: "Cy" } });
    fireEvent.click(screen.getByRole("button", { name: "Save customer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("denied");
    expect(screen.getByLabelText("First name *")).toHaveValue("Cy");
    inserts.length = 0;
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCreated).not.toHaveBeenCalled();
    expect(inserts).toHaveLength(0);
  });
});
