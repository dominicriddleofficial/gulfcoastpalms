import { ReactNode, Suspense, lazy, useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import StickyContactBar from "./StickyContactBar";
import SeasonalBanner from "./home/SeasonalBanner";

// ChatWidget is loaded lazily, AFTER the main thread is idle or after the
// user shows intent (scroll / pointer / touch). This keeps it off the
// initial critical path and out of the LCP measurement.
const ChatWidget = lazy(() => import("./ChatWidget"));

interface LayoutProps {
  children: ReactNode;
}

function useDeferredMount() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (mounted) return;
    let done = false;
    const trigger = () => {
      if (done) return;
      done = true;
      setMounted(true);
    };

    // 1) Mount on first user interaction (strongest signal).
    const events: Array<keyof WindowEventMap> = ["scroll", "pointerdown", "touchstart", "keydown"];
    events.forEach((ev) => window.addEventListener(ev, trigger, { once: true, passive: true }));

    // 2) Or when the browser is idle (with a hard fallback timeout).
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    let idleId = 0;
    const fallback = window.setTimeout(trigger, 4000);
    if (ric) idleId = ric(trigger, { timeout: 3000 });

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, trigger));
      window.clearTimeout(fallback);
      const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
      if (cic && idleId) cic(idleId);
    };
  }, [mounted]);
  return mounted;
}

const Layout = ({ children }: LayoutProps) => {
  const showChat = useDeferredMount();
  return (
    <div className="min-h-screen flex flex-col">
      <SeasonalBanner />
      <Navbar />
      <main className="flex-1 pt-16 md:pt-20 pb-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] md:pb-0">
        {children}
      </main>
      <Footer />
      <StickyContactBar />
      {showChat && (
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
      )}
    </div>
  );
};

export default Layout;
