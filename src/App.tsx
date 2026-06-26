import { useEffect, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, keepPreviousData } from "@tanstack/react-query";
import { BrowserRouter, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { trackPageView } from "@/lib/analytics";
import ErrorBoundary from "@/components/ErrorBoundary";
import { CreateSheetsProvider } from "@/components/platform/CreateSheetsProvider";

import { MarketingRoutes } from "@/routes/MarketingRoutes";
import { AdminRoutes } from "@/routes/AdminRoutes";
import { PlatformRoutes } from "@/routes/PlatformRoutes";
import { PortalRoutes } from "@/routes/PortalRoutes";
import { PublicRoutes } from "@/routes/PublicRoutes";

const RouteTracker = () => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  useEffect(() => {
    const path = location.pathname;
    let manifestHref = "/manifest.json";
    let appleTitle = "Gulf Coast Palms";
    let themeColor = "#1a5c38";
    if (path.startsWith("/platform")) {
      manifestHref = "/platform-manifest.json";
      appleTitle = "Field Ops";
      themeColor = "#1B5E20";
    }
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (link && link.getAttribute("href") !== manifestHref) {
      link.setAttribute("href", manifestHref);
    }
    const apple = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (apple && apple.getAttribute("content") !== appleTitle) {
      apple.setAttribute("content", appleTitle);
    }
    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (theme && theme.getAttribute("content") !== themeColor) {
      theme.setAttribute("content", themeColor);
    }
  }, [location.pathname]);
  return null;
};

// Tuned for "stale-while-revalidate" feel:
// - Cached data stays fresh for 5 minutes → instant tab/workspace switches
// - Kept in memory for 30 minutes → coming back to a screen never shows a spinner
// - No refetch on window focus / mount when fresh → no surprise reloads
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      // Keep previously-loaded data visible while a query refetches in the
      // background. Prevents KPI cards / lists from flickering back to
      // skeleton/dash placeholders on every nav or business switch.
      placeholderData: keepPreviousData,
    },
  },
});

/**
 * Static, zero-cost platform shell that paints immediately while the route
 * chunk + auth resolve. No data, no animation, no JS work — just the
 * silhouette of the real shell so the screen doesn't sit blank during boot.
 */
function PlatformRouteFallback() {
  return (
    <div
      className="min-h-screen text-foreground"
      style={{ background: "#0a0f0a" }}
      aria-hidden
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 md:px-6 border-b"
        style={{
          height: 56,
          borderColor: "rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div
          className="rounded-md"
          style={{ width: 28, height: 28, background: "rgba(34,197,94,0.35)" }}
        />
        <div
          className="rounded"
          style={{ width: 140, height: 14, background: "rgba(255,255,255,0.08)" }}
        />
        <div className="flex-1" />
        <div
          className="rounded-full"
          style={{ width: 28, height: 28, background: "rgba(255,255,255,0.06)" }}
        />
      </div>

      <div className="flex">
        {/* Sidebar rail (desktop) */}
        <div
          className="hidden md:flex flex-col gap-3 p-3 border-r"
          style={{
            width: 224,
            minHeight: "calc(100vh - 56px)",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="rounded-md"
              style={{ height: 32, background: "rgba(255,255,255,0.04)" }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 space-y-4">
          <div
            className="rounded"
            style={{ width: 220, height: 22, background: "rgba(255,255,255,0.08)" }}
          />
          <div
            className="rounded"
            style={{ width: 160, height: 12, background: "rgba(255,255,255,0.05)" }}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border"
                style={{
                  height: 96,
                  borderColor: "rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.03)",
                }}
              />
            ))}
          </div>
          <div
            className="rounded-xl border"
            style={{
              height: 280,
              borderColor: "rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
            }}
          />
        </div>
      </div>

      {/* Bottom nav rail (mobile) */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around border-t px-2"
        style={{
          height: 64,
          borderColor: "rgba(255,255,255,0.06)",
          background: "rgba(10,15,10,0.95)",
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-md"
            style={{ width: 36, height: 36, background: "rgba(255,255,255,0.05)" }}
          />
        ))}
      </div>
    </div>
  );
}

function RouteSuspenseFallback() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/platform")) return <PlatformRouteFallback />;
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BusinessProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <CreateSheetsProvider>
                <RouteTracker />
                <Suspense fallback={<RouteSuspenseFallback />}>
                  <Routes>
                    {MarketingRoutes()}
                    {AdminRoutes()}
                    {PlatformRoutes()}
                    {PortalRoutes()}
                    {PublicRoutes()}
                  </Routes>
                </Suspense>
              </CreateSheetsProvider>
            </BrowserRouter>
          </ErrorBoundary>
        </BusinessProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
