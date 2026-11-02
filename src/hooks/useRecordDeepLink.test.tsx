import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useRecordDeepLink, useClearOnClose, type DeepLinkTarget } from "./useRecordDeepLink";

type Rec = { id: string; name: string };
let nav: ReturnType<typeof useNavigate>;

function Page({ list, fetchOne }: { list: Rec[]; fetchOne: (t: DeepLinkTarget, b: string) => Promise<Rec | null> }) {
  const [sel, setSel] = useState<Rec | null>(null);
  nav = useNavigate();
  const dl = useRecordDeepLink<Rec>({
    businessId: "biz", listLoading: false,
    findInList: (t) => list.find((r) => r.id === t.id),
    fetchOne, onOpen: (r) => setSel(r), onClear: () => setSel(null),
  });
  useClearOnClose(sel, dl.clear);
  return (
    <div>
      <span data-testid="status">{dl.status}</span>
      <span data-testid="open">{sel?.name ?? "none"}</span>
      <button onClick={() => setSel(null)}>close</button>
    </div>
  );
}

const ID_A = "aaaaaaaa-0000-0000-0000-000000000001";
const ID_B = "bbbbbbbb-0000-0000-0000-000000000002";

describe("useRecordDeepLink", () => {
  it("opens a record that is NOT in the filtered list by fetching it directly", async () => {
    const fetchOne = vi.fn(async (t: DeepLinkTarget) => (t.id === ID_B ? { id: ID_B, name: "Outside filter" } : null));
    render(<MemoryRouter initialEntries={[`/platform/invoices?open=${ID_B}`]}><Page list={[{ id: ID_A, name: "A" }]} fetchOne={fetchOne} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("Outside filter"));
    expect(fetchOne).toHaveBeenCalledWith({ id: ID_B, source: "platform", propertyId: null }, "biz");
  });

  it("shows a missing message rather than silently opening the list", async () => {
    render(<MemoryRouter initialEntries={[`/x?open=${ID_B}`]}><Page list={[]} fetchOne={async () => null} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("missing"));
    expect(screen.getByTestId("open").textContent).toBe("none");
  });

  it("re-opens on repeated same-path selection and closes on Back", async () => {
    render(<MemoryRouter initialEntries={["/x"]}><Page list={[{ id: ID_A, name: "A" }, { id: ID_B, name: "B" }]} fetchOne={async () => null} /></MemoryRouter>);
    act(() => nav(`/x?open=${ID_A}`));
    await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("A"));
    act(() => nav(`/x?open=${ID_B}`));
    await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("B"));
    act(() => nav(-1));
    await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("A"));
    act(() => nav(-1));
    await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("none"));
  });

  it("closing the detail removes the link so it doesn't reopen", async () => {
    render(<MemoryRouter initialEntries={[`/x?open=${ID_A}`]}><Page list={[{ id: ID_A, name: "A" }]} fetchOne={async () => null} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("A"));
    act(() => screen.getByText("close").click());
    await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("none"));
    expect(screen.getByTestId("status").textContent).toBe("idle");
  });
});
