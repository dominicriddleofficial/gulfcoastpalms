import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RoleRoute from "@/components/platform/RoleRoute";
const state = vi.hoisted(() => ({ role: "arborist_only", isLoading: false, loading: false, accessDenied: false }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => state }));
vi.mock("@/hooks/usePlatformAuth", () => ({ usePlatformAuth: () => ({ ...state, userId: "fixture", businessAccess: [{}] }) }));
afterEach(cleanup);
describe("arborist-only page boundary", () => {
  it("redirects a restricted user from office pages without mounting their content", async () => {
    render(<MemoryRouter initialEntries={["/office"]}><Routes><Route path="/office" element={<RoleRoute allow={["owner"]}><p>Private office content</p></RoleRoute>} /><Route path="/platform/arborist-quotes" element={<p>Own reports</p>} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Own reports")).toBeInTheDocument(); expect(screen.queryByText("Private office content")).toBeNull();
  });
  it("permits the restricted reports page", () => {
    render(<MemoryRouter><RoleRoute allow={["arborist_only"]}><p>Own reports</p></RoleRoute></MemoryRouter>);
    expect(screen.getByText("Own reports")).toBeInTheDocument();
  });
  it("does not mount private content during authorization lookup", () => {
    state.loading = true;
    render(<MemoryRouter><RoleRoute allow={["owner"]}><p>Private office content</p></RoleRoute></MemoryRouter>);
    expect(screen.queryByText("Private office content")).toBeNull(); state.loading = false;
  });
});