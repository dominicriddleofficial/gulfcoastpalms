import { useEffect, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
    },
  },
});

function PlatformRouteFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-0.5 w-full bg-primary/20 overflow-hidden">
        <div className="h-full w-1/3 bg-primary animate-[loading_1s_ease-in-out_infinite]" />
      </div>
      <style>{`@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
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
