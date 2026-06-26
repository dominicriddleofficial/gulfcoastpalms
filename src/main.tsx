import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Pre-warm Supabase auth: kick off the async client init immediately on
// module load so `INITIAL_SESSION` is ready by the time usePlatformAuth
// subscribes. Fire-and-forget — we never await the result here.
void import("@/integrations/supabase/client").then(({ supabase }) => {
  void supabase.auth.getSession().catch(() => { /* ignore — handled later */ });
}).catch(() => { /* ignore */ });

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
      // Versioned URL: every deploy ships a new __BUILD_ID__, so the browser
      // sees a byte-different SW script and triggers install -> activate for
      // the new version. The SW reads this `v` param to name its cache, so
      // old-build caches are purged automatically on activate.
      const swUrl = `/sw.js?v=${encodeURIComponent(__BUILD_ID__)}`;

      // Snapshot whether a SW was already controlling this page BEFORE we
      // register. If there was none, the first activation is a fresh install
      // (not an update) and must not trigger a reload.
      const hadControllerAtLoad = !!navigator.serviceWorker.controller;

      navigator.serviceWorker
        .register(swUrl, { scope: '/platform' })
        .then((registration) => {
          // When an updated SW is found, wait for it to install and then
          // reload exactly once so the user lands on the fresh app shell.
          // The guard below prevents an infinite reload loop if controller
          // changes fire for any other reason.
          let reloading = false;
          const reloadOnce = () => {
            if (reloading) return;
            reloading = true;
            window.location.reload();
          };

          // Case 1: brand-new SW finishes installing while the page is open
          // and an old SW is still controlling it -> reload once activated.
          registration.addEventListener('updatefound', () => {
            const installing = registration.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (
                installing.state === 'activated' &&
                navigator.serviceWorker.controller
              ) {
                reloadOnce();
              }
            });
          });

          // Case 2: rescue clients stuck on the OLD cache-first SW. When the
          // new SW calls clients.claim(), `controllerchange` fires here; we
          // reload once so the user immediately gets fresh assets.
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (hadControllerAtLoad) reloadOnce();
          });
        })
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
