import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "staff-jwt" } } }) }, storage: { from: () => ({ createSignedUrls: async () => ({ data: [], error: null }) }) } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ArboristLink from "@/pages/ArboristLink";
import { SendQuoteLinkDialog } from "@/components/platform/arborist/SendQuoteLinkDialog";
import { readLinkToken, resetLinkTokenForTests } from "@/lib/arborist-link";

const TOKEN = "A".repeat(43);
const tree = (over = {}) => ({ id: "11111111-1111-4111-8111-111111111111", species: "Oak", service: "Tree removal", location: "", description: "Remove", customerDiscussion: "Haul away", priceType: "fixed", priceMin: "500", priceMax: "", photos: [] as { id: string; path: string; name: string }[], ...over });
const report = (over = {}) => ({ id: "r1", customer_name: "Example", property_address: "1 Example St", visit_date: "2026-10-26", arborist_name: "Climber", general_notes: "", trees: [tree()], status: "draft", version: 1, submitted_at: null, ...over });
const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));
let fetchMock: ReturnType<typeof vi.fn>;
const calls = () => fetchMock.mock.calls.map(c => JSON.parse(String((c[1] as RequestInit).body)));

function renderGuest() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><HelmetProvider><QueryClientProvider client={qc}><ArboristLink /></QueryClientProvider></HelmetProvider></MemoryRouter>);
}

beforeEach(() => {
  sessionStorage.clear();
  resetLinkTokenForTests();
  window.history.replaceState(null, "", "/arborist-link");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  URL.createObjectURL = vi.fn(() => "blob:x"); URL.revokeObjectURL = vi.fn();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("arborist guest quote link", () => {
  it("takes the token from the fragment and removes it from the address bar", () => {
    window.history.replaceState(null, "", `/arborist-link#t=${TOKEN}`);
    expect(readLinkToken()).toBe(TOKEN);
    expect(window.location.hash).toBe("");
    expect(readLinkToken()).toBe(TOKEN); // resumes in the same tab
  });

  it("shows a not-valid message without contacting the server when no token is present", async () => {
    renderGuest();
    expect(await screen.findByText("Link not valid")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows only the turned-off state for a revoked link, never report data", async () => {
    window.history.replaceState(null, "", `/arborist-link#t=${TOKEN}`);
    fetchMock.mockImplementation(() => reply(410, { state: "revoked" }));
    renderGuest();
    expect(await screen.findByText("Link turned off")).toBeInTheDocument();
    expect(screen.queryByLabelText("Customer name")).toBeNull();
  });

  it("opens the standalone form, supports five trees with photo inputs, and saves a draft with the expected version", async () => {
    window.history.replaceState(null, "", `/arborist-link#t=${TOKEN}`);
    fetchMock.mockImplementation((_url, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.action === "load") return reply(200, { state: "ok", expires_at: "2026-11-02T00:00:00Z", report: report() });
      if (body.action === "save") return reply(200, { report: { ...report(), ...body.fields, version: 2 } });
      return reply(400, {});
    });
    renderGuest();
    expect(await screen.findByRole("heading", { name: "Internal arborist quote" })).toBeInTheDocument();
    expect(screen.getByText("Gulf Coast Palms")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Back/ })).toBeNull();
    const count = screen.getByLabelText(/How many trees/);
    fireEvent.change(count, { target: { value: "5" } }); fireEvent.blur(count);
    expect(screen.getAllByTestId("arborist-tree")).toHaveLength(5);
    expect(screen.getByLabelText("Take photo for tree 5")).toHaveAttribute("capture", "environment");
    expect(screen.getByLabelText("Choose photos for tree 5")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(calls().some(c => c.action === "save")).toBe(true));
    const save = calls().find(c => c.action === "save");
    expect(save).toMatchObject({ token: TOKEN, version: 1, status: "draft" });
    expect(save.fields.trees).toHaveLength(5);
    expect(save).not.toHaveProperty("fields.author_id");
  });

  it("submits for review and then shows the received state with the form locked", async () => {
    window.history.replaceState(null, "", `/arborist-link#t=${TOKEN}`);
    const photo = { id: "22222222-2222-4222-8222-222222222222", path: "b/a/r1/t/p.jpg", name: "oak.jpg" };
    fetchMock.mockImplementation((_url, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.action === "load") return reply(200, { state: "ok", expires_at: "2026-11-02T00:00:00Z", report: report({ trees: [tree({ photos: [photo] })] }) });
      if (body.action === "sign") return reply(200, { urls: [{ path: photo.path, signedUrl: "https://example.test/p.jpg" }] });
      if (body.action === "save") return reply(200, { report: report({ status: "submitted", version: 2, trees: [tree({ photos: [photo] })] }) });
      return reply(400, {});
    });
    renderGuest();
    fireEvent.click(await screen.findByRole("button", { name: "Submit for review" }));
    expect(await screen.findByText("Quote received")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save draft" })).toBeNull();
    expect(calls().find(c => c.action === "save")?.status).toBe("submitted");
  });

  it("switches to the expired state if the link expires while editing", async () => {
    window.history.replaceState(null, "", `/arborist-link#t=${TOKEN}`);
    fetchMock.mockImplementation((_url, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      return body.action === "load" ? reply(200, { state: "ok", expires_at: "2026-11-02T00:00:00Z", report: report() }) : reply(410, { state: "expired" });
    });
    renderGuest();
    fireEvent.click(await screen.findByRole("button", { name: "Save draft" }));
    expect(await screen.findByText("Link expired")).toBeInTheDocument();
  });
});

describe("send quote link dialog", () => {
  it("creates a link with optional prefills and offers copy and text without sending anything", async () => {
    fetchMock.mockImplementation(() => reply(200, { token: TOKEN, report_id: "r9", expires_at: "2026-11-02T15:00:00Z" }));
    const issued = vi.fn();
    render(<SendQuoteLinkDialog open onOpenChange={vi.fn()} businessId="biz" onIssued={issued} />);
    fireEvent.change(screen.getByLabelText("Climber name"), { target: { value: "Sam" } });
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));
    const box = await screen.findByLabelText("Private quote link");
    expect((box as HTMLInputElement).value).toBe(`${window.location.origin}/arborist-link#t=${TOKEN}`);
    expect(issued).toHaveBeenCalledWith("r9");
    const req = calls()[0];
    expect(req).toMatchObject({ action: "issue", business_id: "biz", arborist_name: "Sam", customer_name: "" });
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer staff-jwt" });
    const text = screen.getByRole("link", { name: /Text link/ });
    expect(text.getAttribute("href")).toMatch(/^sms:\?&body=/);
    expect(decodeURIComponent(text.getAttribute("href") ?? "")).toContain(`#t=${TOKEN}`);
    expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
    expect(screen.queryByText(/\bsent\b/i)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
