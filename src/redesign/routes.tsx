/**
 * Which public addresses have a rebuilt page.
 *
 * The route tables call `page()` for these addresses. While the redesign is not
 * showing it returns the current page untouched, so the live site is unaffected.
 * Addresses not listed here keep their current page content inside the new frame.
 */
import { lazy, type ReactElement } from "react";
import { REDESIGN_ACTIVE } from "./mount";

const Home = lazy(() => import("./pages/Home"));
const Services = lazy(() => import("./pages/Services"));
const Service = lazy(() => import("./pages/Service"));
const Area = lazy(() => import("./pages/Area"));
const Areas = lazy(() => import("./pages/Areas"));
const Projects = lazy(() => import("./pages/Projects"));
const Quote = lazy(() => import("./pages/Quote"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const Missing = lazy(() => import("./pages/Missing"));

/** Service pages rebuilt on the shared service data (landscaping keeps its own page for now). */
export const REBUILT_SERVICES = [
  "tree-trimming-removal", "tree-removal", "tree-trimming", "storm-damage-cleanup",
  "palm-tree-trimming", "palm-tree-installation", "palm-tree-removal", "palm-diamond-cutting", "palm-tree-trunk-skinning",
];

function rebuilt(path: string): ReactElement | null {
  if (path === "/") return <Home />;
  if (path === "/services") return <Services />;
  if (path.startsWith("/services/")) {
    const slug = path.slice("/services/".length);
    return REBUILT_SERVICES.includes(slug) ? <Service slug={slug} /> : null;
  }
  if (/^\/palm-tree-trimming-[a-z0-9-]+-fl$/.test(path)) return <Area slug={path.slice(1)} />;
  if (path === "/service-areas") return <Areas />;
  if (path === "/jobs" || path === "/gallery") return <Projects />;
  if (path === "/quote") return <Quote />;
  if (path === "/thank-you") return <ThankYou />;
  // "*" is the catch-all for addresses that do not exist.
  if (path === "*") return <Missing />;
  return null;
}

/** The page to show at a public address: the rebuilt one when the redesign is showing, otherwise the current one. */
export function page(path: string, live: ReactElement): ReactElement {
  if (!REDESIGN_ACTIVE) return live;
  return rebuilt(path) ?? live;
}

/** Same lookup without the switch, for tests and the route check. */
export const hasRebuiltPage = (path: string) => rebuilt(path) !== null;
