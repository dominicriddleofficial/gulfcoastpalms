import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      insert: () => Promise.resolve({ data: null, error: null }),
    }),
  },
}));

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when no error", async () => {
    const ErrorBoundary = (await import("@/components/ErrorBoundary")).default;
    render(
      <HelmetProvider>
        <MemoryRouter>
          <ErrorBoundary>
            <div>Hello World</div>
          </ErrorBoundary>
        </MemoryRouter>
      </HelmetProvider>
    );
    expect(screen.getByText("Hello World")).toBeTruthy();
  });

  it("renders fallback UI when error is thrown", async () => {
    const ErrorBoundary = (await import("@/components/ErrorBoundary")).default;
    const ThrowingComponent = () => {
      throw new Error("Test error");
    };
    render(
      <HelmetProvider>
        <MemoryRouter>
          <ErrorBoundary>
            <ThrowingComponent />
          </ErrorBoundary>
        </MemoryRouter>
      </HelmetProvider>
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Reload Page")).toBeTruthy();
    expect(screen.getByText("Go Home")).toBeTruthy();
  });
});
