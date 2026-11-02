import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { SearchOutcome } from "@/lib/search/universalSearch";

const run = vi.fn<(c: unknown, biz: string, q: string) => Promise<SearchOutcome>>();
vi.mock("@/lib/search/universalSearch", async (orig) => ({
  ...(await orig<typeof import("@/lib/search/universalSearch")>()),
  runUniversalSearch: (c: unknown, b: string, q: string) => run(c, b, q),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/hooks/usePlatformAuth", () => ({ usePlatformAuth: () => ({ isOwner: true }) }));
vi.mock("@/hooks/useRecentActivity", () => ({ useRecentActivity: () => ({ data: [], isLoading: false }) }));

import UniversalSearch from "./UniversalSearch";

function Loc() { const l = useLocation(); return <span data-testid="loc">{l.pathname + l.search}</span>; }

const res = (id: string, title: string): SearchOutcome => ({
  failedSources: [],
  results: [{ type: "invoice", id, source: "platform", title, subtitle: "", rank: 0, path: `/platform/invoices?open=${id}` }],
});

function deferred<T>() { let r!: (v: T) => void; const p = new Promise<T>((x) => { r = x; }); return { p, r }; }

beforeEach(() => { run.mockReset(); });

describe("UniversalSearch (embedded / mobile)", () => {
  it("navigates to the exact record and tells the parent sheet to close", async () => {
    run.mockResolvedValue(res("inv-1", "GCP-I-000018"));
    const onNavigate = vi.fn();
    render(<MemoryRouter initialEntries={["/platform/invoices"]}><UniversalSearch businessId="biz" embedded autoOpen onNavigate={onNavigate} /><Loc /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Search records"), { target: { value: "18" } });
    fireEvent.click(await screen.findByText(/GCP-I-000018/));
    expect(screen.getByTestId("loc").textContent).toBe("/platform/invoices?open=inv-1");
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("discards a stale slower response for an earlier query", async () => {
    const first = deferred<SearchOutcome>();
    run.mockImplementationOnce(() => first.p).mockResolvedValueOnce(res("new", "NEW-RESULT"));
    render(<MemoryRouter><UniversalSearch businessId="biz" embedded autoOpen /></MemoryRouter>);
    const input = screen.getByLabelText("Search records");
    fireEvent.change(input, { target: { value: "ol" } });
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    fireEvent.change(input, { target: { value: "new" } });
    await screen.findByText("NEW-RESULT");
    await act(async () => { first.r(res("old", "OLD-RESULT")); });
    expect(screen.queryByText("OLD-RESULT")).toBeNull();
  });

  it("drops results from the previous workspace when the business changes", async () => {
    const slow = deferred<SearchOutcome>();
    run.mockImplementationOnce(() => slow.p);
    const { rerender } = render(<MemoryRouter><UniversalSearch businessId="gcp" embedded autoOpen /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Search records"), { target: { value: "334701" } });
    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.anything(), "gcp", "334701"));
    run.mockResolvedValue({ results: [], failedSources: [] });
    rerender(<MemoryRouter><UniversalSearch businessId="pps" embedded autoOpen /></MemoryRouter>);
    await act(async () => { slow.r(res("gcp-inv", "GCP-ONLY")); });
    expect(screen.queryByText("GCP-ONLY")).toBeNull();
  });

  it("shows a connection error instead of 'No matches' when search fails", async () => {
    run.mockResolvedValue({ results: [], failedSources: Array.from({ length: 10 }, (_, i) => `t${i}`) });
    render(<MemoryRouter><UniversalSearch businessId="biz" embedded autoOpen /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Search records"), { target: { value: "334701" } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't reach/i);
    expect(screen.queryByText(/No matches/)).toBeNull();
  });

  it("supports keyboard selection with Enter", async () => {
    run.mockResolvedValue(res("inv-9", "GCP-I-000009"));
    render(<MemoryRouter><UniversalSearch businessId="biz" embedded autoOpen /><Loc /></MemoryRouter>);
    const input = screen.getByLabelText("Search records");
    fireEvent.change(input, { target: { value: "9x" } });
    await screen.findByText(/GCP-I-000009/);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByTestId("loc").textContent).toBe("/?open=inv-9".replace("/?", "/platform/invoices?"));
  });
});
