import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "field-ops-install-dismissed";

/**
 * Mobile-only install banner shown inside the /platform shell.
 * - Android / desktop Chrome: uses the native `beforeinstallprompt` flow.
 * - iOS Safari: shows a static "Add to Home Screen" hint (no API available).
 * Dismissed state is remembered for 14 days.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    // Already installed / running standalone — hide forever.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS-specific
      // @ts-expect-error legacy iOS Safari property
      window.navigator.standalone === true;
    if (standalone) return;

    // Respect a recent dismissal.
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    if (dismissedAt && Date.now() - dismissedAt < fourteenDays) return;

    // Only show on phone-sized screens (the crew's primary device).
    if (window.innerWidth > 820) return;

    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);

    if (isIOS && isSafari) {
      setIosHint(true);
      setVisible(true);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!visible) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div
      className="fixed left-3 right-3 z-50 lg:hidden"
      style={{ bottom: "calc(72px + env(safe-area-inset-bottom))" }}
      role="dialog"
      aria-label="Install Field Ops"
    >
      <div
        className="rounded-2xl border border-white/10 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] p-3.5 flex items-center gap-3"
        style={{ background: "linear-gradient(160deg, rgba(27,94,32,0.92), rgba(15,38,23,0.92))" }}
      >
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-[13px] font-semibold text-white leading-tight">
            Install Field Ops for quick access
          </p>
          <p className="font-body text-[11px] text-white/70 mt-0.5 leading-snug">
            {iosHint
              ? "Tap Share, then \"Add to Home Screen\"."
              : "Add to your home screen — works offline in the field."}
          </p>
        </div>
        {!iosHint && deferredPrompt && (
          <button
            type="button"
            onClick={handleInstall}
            className="min-h-[44px] px-4 rounded-full bg-white text-[#0F2617] font-body text-[12px] font-semibold active:scale-95 transition-transform"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white/70 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}