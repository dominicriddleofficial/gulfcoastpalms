import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useRecordDeepLink, useClearOnClose, type DeepLinkTarget } from "./useRecordDeepLink";

type Rec = { id: string; name: string; biz?: string };
let nav: ReturnType<typeof useNavigate>;

function Page({ list, fetchOne, biz = "biz", listLoading = false }: { list: Rec[]; fetchOne: (t: DeepLinkTarget, b: string) => Promise<Rec | null>; biz?: string; listLoading?: boolean }) {
  const [sel, setSel] = useState<Rec | null>(null);
  nav = useNavigate();
  const loc = useLocation();
  const dl = useRecordDeepLink<Rec>({
    businessId: biz, listLoading,
    findInList: (t) => list.find((r) => r.id === t.id),
    identify: (r) => ({ id: r.id, businessId: r.biz ?? "biz", source: "platform" }),
    fetchOne, onOpen: (r) => setSel(r), onClear: () => setSel(null),
  });
  useClearOnClose(sel, dl);
  return (
    <div>
      <span data-testid="url">{loc.search}</span>
      <span data-testid="status">{dl.status}</span>
      <span data-testid="open">{sel?.name ?? "none"}</span>
      <button onClick={() => setSel(null)}>close</button>
    </div>
  );
}

const ID_A = "aaaaaaaa-0000-0000-0000-000000000001";
const ID_B = "bbbbbbbb-0000-0000-0000-000000000002";
const ID_C = "cccccccc-0000-0000-0000-000000000003";

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

  it("A open -> delayed B: A closes at once, URL keeps B, then B opens", async () => {
    let resolveB: (r: Rec) => void = () => {};
    const fetchOne = vi.fn((t: DeepLinkTarget) => new Promise<Rec | null>((r) => { if (t.id === ID_B) resolveB = r; }));
    render(<MemoryRouter initialEntries={["/x"]}><Page list={[{ id: ID_A, name: "A" }]} fetchOne={fetchOne} /></MemoryRouter>);
    act(() => nav(`/x?open=${ID_A}`));
    await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("A"));
    act(() => nav(`/x?open=${ID_B}`));
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("loading"));
    expect(screen.getByTestId("open").textContent).toBe("none");
    expect(screen.getByTestId("url").textContent).toBe(`?open=${ID_B}`);
    await act(async () => { resolveB({ id: ID_B, name: "B" }); });
    expect(screen.getByTestId("open").textContent).toBe("B");
  });

  it("A open -> missing / failing / invalid B never keeps showing A", async () => {
    const fetchOne = vi.fn(async (t: DeepLinkTarget) => { if (t.id === ID_C) throw new Error("x"); return null; });
    render(<MemoryRouter initialEntries={[`/x?open=${ID_A}`]}><Page list={[{ id: ID_A, name: "A" }]} fetchOne={fetchOne} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("A"));
    act(() => nav(`/x?open=${ID_B}`));
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("missing"));
    expect(screen.getByTestId("open").textContent).toBe("none");
    expect(screen.getByTestId("url").textContent).toBe(`?open=${ID_B}`);
    act(() => nav(`/x?open=${ID_A}`));
    await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("A"));
    act(() => nav(`/x?open=${ID_C}`));
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("error"));
    expect(screen.getByTestId("open").textContent).toBe("none");
    act(() => nav(`/x?open=${ID_A}`));
    await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("A"));
    act(() => nav("/x?open=not-a-valid-id!"));
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("missing"));
    expect(screen.getByTestId("open").textContent).toBe("none");
  });

  it("rapid A -> B: a late A response never replaces B", async () => {
    const pending: Record<string, (r: Rec) => void> = {};
    const fetchOne = vi.fn((t: DeepLinkTarget) => new Promise<Rec | null>((r) => { pending[t.id] = r; }));
    render(<MemoryRouter initialEntries={["/x"]}><Page list={[]} fetchOne={fetchOne} /></MemoryRouter>);
    act(() => nav(`/x?open=${ID_A}`));
    await waitFor(() => expect(pending[ID_A]).toBeDefined());
    act(() => nav(`/x?open=${ID_B}`));
    await waitFor(() => expect(pending[ID_B]).toBeDefined());
    await act(async () => { pending[ID_B]({ id: ID_B, name: "B" }); });
    await act(async () => { pending[ID_A]({ id: ID_A, name: "A" }); });
    expect(screen.getByTestId("open").textContent).toBe("B");
  });

  it("business switch with previous list kept (keepPreviousData) never opens the old workspace's row", async () => {
    const oldList = [{ id: ID_A, name: "A in GCP", biz: "gcp" }];
    const fetchOne = vi.fn(async (_t: DeepLinkTarget, b: string) => (b === "gcp" ? oldList[0] : null));
    const { rerender } = render(<MemoryRouter initialEntries={[`/x?open=${ID_A}`]}><Page biz="gcp" list={oldList} fetchOne={fetchOne} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("A in GCP"));
    // Switch workspace: list still holds GCP rows (placeholder) and is not "loading".
    rerender(<MemoryRouter initialEntries={[`/x?open=${ID_A}`]}><Page biz="pps" list={oldList} fetchOne={fetchOne} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("missing"));
    expect(screen.getByTestId("open").textContent).toBe("none");
    expect(fetchOne).toHaveBeenLastCalledWith(expect.objectContaining({ id: ID_A }), "pps");
    // A wrong-business row from a fetch is also rejected.
    rerender(<MemoryRouter initialEntries={[`/x?open=${ID_A}`]}><Page biz="pps" list={[]} fetchOne={async () => oldList[0]} /></MemoryRouter>);
    expect(screen.getByTestId("open").textContent).toBe("none");
  });
});
