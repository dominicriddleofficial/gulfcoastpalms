import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Global error handlers for errors outside React's component tree
const logErrorToSupabase = async (errorMessage: string, errorStack: string) => {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("error_logs").insert({
      error_message: errorMessage,
      error_stack: errorStack,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
    });
  } catch {
    // Silently fail — don't crash the app over error logging
  }
};

window.onerror = (_message, _source, _lineno, _colno, error) => {
  if (error) {
    logErrorToSupabase(error.message, error.stack || "");
  }
};

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack || "" : "";
  logErrorToSupabase(message, stack);
});

// Register the Field Ops service worker ONLY when the user is on the /platform
// section of the app. The public website must remain a normal website with no
// service-worker caching.
if ('serviceWorker' in navigator) {
  const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const isPreviewHost =
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com");
  const isPlatformRoute = window.location.pathname.startsWith("/platform");

  if (import.meta.env.PROD && isPlatformRoute && !isInIframe && !isPreviewHost) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/platform' })
        .catch((err) => {
          console.error('Field Ops service worker registration failed:', err);
        });
    });
  } else {
    // Outside /platform (or in preview/iframe): make sure no stale SW is
    // intercepting public-website navigations.
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => {
        if (!isPlatformRoute) r.unregister();
      });
    }).catch(() => {});
  }
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
