/**
 * Page frame for the redesigned site: header, phone menu, footer and the phone
 * action bar.
 *
 * Older pages that have not been rebuilt yet (About, guides, careers and so on) are
 * rendered inside this same frame with `legacy` set, which re-colours and re-sets
 * their existing markup to match (see the "Older pages" block in styles/site.css).
 */
import { Component, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation, useNavigationType } from "react-router-dom";
import { LocalBusinessJsonLd } from "@/components/JsonLd";
import { trackEvent } from "@/lib/analytics";
import { motionShift } from "../lib/motion";
import Dock from "./Dock";
import Footer from "./Footer";
import Header from "./Header";
import { MenuContext } from "./menu-context";
import "../styles/first-view.css";
import "../styles/hero-preview.css";
import "../styles/site.css";

const loadMenu = () => import("./Menu");
const Menu = lazy(loadMenu);
// Same chat assistant as the current site, still loaded only after the page is idle.
const ChatWidget = lazy(() => import("@/components/ChatWidget"));

/** An extra on the page (the chat bubble) that fails is left out. It never takes the page down with it. */
class Optional extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error("Optional part of the page left out:", error); }
  render() { return this.state.failed ? null : this.props.children; }
}

interface LayoutProps {
  children: ReactNode;
  /** Wraps a page that still uses the previous page markup. */
  legacy?: boolean;
  /** Pages with their own fixed submit button (the quote form) leave the action bar off. */
  dock?: boolean;
  /** The chat bubble sits bottom-right; the quote form turns it off so it cannot cover the submit button. */
  chat?: boolean;
  /** The homepage places the season notice itself, under its opening screen. */
  season?: boolean;
  /** The page opens with a full-width photo, so the header floats over it. */
  over?: boolean;
}

const SEASON_KEY = "gcpalms_banner_dismissed";

/** In season (April through November, as on the current site) and not dismissed on this device. */
function seasonNoticeWanted(): boolean {
  if (typeof window === "undefined") return false;
  const month = new Date().getMonth();
  if (month < 3 || month > 10) return false;
  try { return localStorage.getItem(SEASON_KEY) !== "true"; } catch { return true; }
}

/**
 * Hurricane-season notice. `below` is the homepage version, placed under the opening
 * screen so the first screen never moves; `top` sits under the header on wide screens.
 */
export function SeasonStrip({ where }: { where: "top" | "below" }) {
  const [shown, setShown] = useState(seasonNoticeWanted);
  if (!shown) return null;
  return (
    <div className={`rd-season rd-season--${where}`}>
      <p>
        Hurricane season: storm cleanup and emergency palm service.{" "}
        <Link to="/emergency-palm-service" className="rd-link">See emergency service</Link>
      </p>
      <button
        type="button"
        aria-label="Dismiss notice"
        onClick={() => { setShown(false); try { localStorage.setItem(SEASON_KEY, "true"); } catch { /* storage blocked */ } }}
      >
        ×
      </button>
    </div>
  );
}

function useIdleMount() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let done = false;
    const go = () => { if (!done) { done = true; setReady(true); } };
    const events: Array<keyof WindowEventMap> = ["scroll", "pointerdown", "touchstart", "keydown"];
    events.forEach((ev) => window.addEventListener(ev, go, { once: true, passive: true }));
    const timer = window.setTimeout(go, 4000);
    return () => { events.forEach((ev) => window.removeEventListener(ev, go)); window.clearTimeout(timer); };
  }, []);
  return ready;
}

export default function RedesignLayout({ children, legacy = false, dock = true, chat = true, season = true, over = false }: LayoutProps) {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuWanted, setMenuWanted] = useState(false);
  const [dockShown, setDockShown] = useState(false);
  const idle = useIdleMount();
  // Lets animations that began in the prebuilt first screen carry on, not restart. Read once.
  const [shift] = useState(motionShift);

  // A new page starts at the top; the back button keeps the browser's own position.
  useLayoutEffect(() => {
    if (navType !== "POP" && !hash) window.scrollTo(0, 0);
  }, [pathname, hash, navType]);

  useEffect(() => setMenuOpen(false), [pathname]);

  // The action bar waits until the page's own main buttons have scrolled away.
  useEffect(() => {
    if (!dock) { setDockShown(false); return; }
    const target = document.querySelector("[data-rd-actions]");
    if (!target || typeof IntersectionObserver === "undefined") { setDockShown(true); return; }
    const io = new IntersectionObserver(([entry]) => setDockShown(!entry.isIntersecting), { threshold: 0 });
    io.observe(target);
    return () => io.disconnect();
  }, [pathname, dock]);

  const openMenu = useCallback((open: boolean) => {
    if (open) {
      setMenuWanted(true);
      trackEvent("mobile_menu_opened", { source: "navbar" });
    }
    setMenuOpen(open);
  }, []);
  const menu = useMemo(() => ({ open: menuOpen, setOpen: openMenu, warm: () => { void loadMenu(); } }), [menuOpen, openMenu]);

  // A tap on the menu button before the app had loaded (see firstView.tsx) is honoured now.
  useEffect(() => {
    const w = window as Window & { __gcpAppReady?: boolean; __gcpMenuWanted?: boolean };
    w.__gcpAppReady = true;
    if (!w.__gcpMenuWanted) return;
    w.__gcpMenuWanted = false;
    document.documentElement.classList.remove("rd-menu-wanted");
    openMenu(true);
  }, [openMenu]);

  return (
    <MenuContext.Provider value={menu}>
      <div
        className={`rd rd-page${legacy ? " rd-legacy" : ""}${dock ? " rd-page--dock" : ""}${over ? " rd-page--over" : ""}`}
        style={shift ? ({ "--rd-shift": shift } as CSSProperties) : undefined}
      >
        <LocalBusinessJsonLd />
        <a className="rd-skip" href="#rd-main">Skip to content</a>
        <Header />
        {season && <SeasonStrip where="top" />}
        <main id="rd-main" className={`rd-main${legacy ? " rd-skin" : ""}`}>{children}</main>
        <Footer />
        {dock && <Dock shown={dockShown} />}
        {menuWanted && (
          <Suspense fallback={null}>
            <Menu open={menuOpen} onOpenChange={openMenu} />
          </Suspense>
        )}
        {chat && idle && (
          <div className="rd-chat rd-skin" data-hidden={dock && !dockShown}>
            <Optional><Suspense fallback={null}><ChatWidget /></Suspense></Optional>
          </div>
        )}
      </div>
    </MenuContext.Provider>
  );
}
