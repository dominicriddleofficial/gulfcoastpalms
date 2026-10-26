import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { newArboristQuote, newArboristTree } from "@/lib/arborist-quotes";

const api = vi.hoisted(() => ({ save: vi.fn(), prepare: vi.fn(), upload: vi.fn() }));
vi.mock("@/hooks/useArboristQuotes", () => ({ saveArboristQuote: api.save, prepareArboristPhoto: api.prepare, uploadArboristPhoto: api.upload, useArboristQuotes: vi.fn(), arboristQuotesKey: vi.fn() }));
vi.mock("@/components/platform/PlatformLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ createSignedUrls: async () => ({ data: [], error: null }) }) } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ArboristQuoteEditor } from "@/pages/platform/PlatformArboristQuotes";

function setup(report = newArboristQuote("business", "author")) {
  const saved = vi.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><ArboristQuoteEditor initial={report} onBack={vi.fn()} onSaved={saved} /></QueryClientProvider>);
  return saved;
}
describe("arborist quote editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.save.mockImplementation(async (report, status) => ({ ...report, status, version: report.version + 1 }));
    api.prepare.mockResolvedValue(new Blob(["photo"], { type: "image/jpeg" }));
    api.upload.mockResolvedValue("business/author/report/tree/photo.jpg");
    URL.createObjectURL = vi.fn(() => "blob:test-photo");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });
  it("creates five separately numbered trees and keeps notes with the correct tree after removal", () => {
    setup();
    const count = screen.getByLabelText(/How many trees/);
    fireEvent.change(count, { target: { value: "5" } }); fireEvent.blur(count);
    expect(screen.getAllByTestId("arborist-tree")).toHaveLength(5);
    fireEvent.change(screen.getByLabelText("Tree 2 type / species"), { target: { value: "Magnolia" } });
    fireEvent.change(screen.getByLabelText("Tree 2 customer discussion"), { target: { value: "Only limbs over shed" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove tree 1" }));
    expect(screen.getByLabelText("Tree 1 type / species")).toHaveValue("Magnolia");
    expect(screen.getByLabelText("Tree 1 customer discussion")).toHaveValue("Only limbs over shed");
    expect(screen.getAllByTestId("arborist-tree")).toHaveLength(4);
  });
  it("blocks incomplete submission without any write", async () => {
    setup(); fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Tree 1: add at least one photo.");
    expect(api.save).not.toHaveBeenCalled();
  });
  it("saves an incomplete draft once even if tapped twice", async () => {
    const saved = setup();
    fireEvent.change(screen.getByLabelText("Customer name"), { target: { value: "Example visit" } });
    const button = screen.getByRole("button", { name: "Save draft" }); fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    expect(api.save).toHaveBeenCalledTimes(1);
    expect(api.save.mock.calls[0][1]).toBe("draft");
  });
  it("keeps entered notes when saving fails", async () => {
    api.save.mockRejectedValueOnce(new Error("Connection interrupted"));
    const saved = setup();
    fireEvent.change(screen.getByLabelText("Tree 1 description and work needed"), { target: { value: "Oak by the driveway" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Connection interrupted");
    expect(screen.getByLabelText("Tree 1 description and work needed")).toHaveValue("Oak by the driveway");
    expect(saved).not.toHaveBeenCalled();
  });
  it("does not submit after a photo upload fails, and retries against the saved draft", async () => {
    const report = newArboristQuote("business", "author");
    Object.assign(report, { customer_name: "Example", property_address: "Example address", arborist_name: "Example climber" });
    report.trees = [{ ...newArboristTree(), species: "Oak", service: "Tree removal", description: "Remove tree", customerDiscussion: "Haul away", priceMin: "600" }];
    api.upload.mockRejectedValueOnce(new Error("Upload failed"));
    const saved = setup(report);
    fireEvent.change(screen.getByLabelText("Choose photos for tree 1"), { target: { files: [new File(["photo"], "oak.jpg", { type: "image/jpeg" })] } });
    await screen.findByText("Uploads when saved");
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Upload failed");
    expect(api.save.mock.calls.map(call => call[1])).toEqual(["draft"]);
    expect(saved).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    expect(api.save.mock.calls[1][0].version).toBe(1);
    expect(api.save.mock.calls.at(-1)?.[1]).toBe("submitted");
    expect(saved.mock.calls[0][0].trees[0].photos).toHaveLength(1);
  });
});
