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

// Register service worker for ops PWA (production only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const isPreviewHost = window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com");
  if (!isInIframe && !isPreviewHost) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err);
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
