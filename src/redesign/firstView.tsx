/**
 * Prebuilt first view of the redesigned homepage.
 *
 * The build renders the real header and opening screen to HTML and places it in the
 * page before any JavaScript, with their stylesheet inlined. A visitor on a slow
 * phone connection sees the finished opening (photo, headline, quote, call and text
 * buttons, all working links) straight away; the app then takes over the same markup.
 *
 * It is the same Header and Hero components and the same first-view.css the live
 * page uses, so the two cannot drift apart.
 *
 * Only imported by scripts/prerender-meta.mjs.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import css from "./styles/first-view.css?raw";
import Header from "./chrome/Header";
import { heroPhoto } from "./data/hero";
import Hero from "./home/Hero";
import { REDESIGN_PREVIEW_BASE } from "./mount";

/** Same id the plain crawler copy uses, so the existing takeover and checks apply. */
export const FIRST_VIEW_ID = "seo-static-content";

/**
 * The few resets the main stylesheet normally provides, for the moment before it loads.
 * Scoped to the first view, and written with :where() so they never outrank the
 * component styles that follow.
 */
const SCOPE = `:where(#${FIRST_VIEW_ID})`;
const RESET = `
body{margin:0}
${SCOPE} *,${SCOPE} *::before,${SCOPE} *::after{box-sizing:border-box}
${SCOPE} :where(h1,h2,h3,p,ul,ol,figure){margin:0}
${SCOPE} :where(ul,ol){padding:0;list-style:none}
${SCOPE} :where(a){color:inherit;text-decoration:none}
${SCOPE} :where(img,svg,picture){display:block;max-width:100%}
${SCOPE} :where(img){height:auto}
${SCOPE} :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer}
${SCOPE} :where(.rd-page){min-height:100vh;display:flex;flex-direction:column;overflow-x:clip}
${SCOPE} [hidden]{display:none!important}
`;

/**
 * The quote, call and text buttons are plain links and work before the app has loaded.
 * The menu button needs the app, so a tap on it in that gap is remembered: the button
 * lights up at once, and the page frame opens the menu the moment it is ready.
 */
const EARLY_MENU_TAP = `document.addEventListener("click",function(e){if(window.__gcpAppReady)return;`
  + `var b=e.target&&e.target.closest&&e.target.closest("[data-rd-menu]");`
  + `if(b){window.__gcpMenuWanted=true;document.documentElement.classList.add("rd-menu-wanted")}},true);`;

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Head tags that start the opening photo and the headline font before anything else. */
export function firstViewPreloads(): string {
  return [
    `<link rel="preload" as="image" fetchpriority="high" type="image/avif" imagesrcset="${esc(heroPhoto.avif)}" imagesizes="${esc(heroPhoto.sizes)}">`,
    `<link rel="preload" as="font" type="font/woff2" href="/fonts/gcp-archivo-condensed.woff2" crossorigin>`,
  ].join("");
}

export function renderFirstView(base: string = REDESIGN_PREVIEW_BASE): string {
  const body = renderToStaticMarkup(
    <StaticRouter location={base || "/"} basename={base || undefined}>
      <div className="rd rd-page">
        <Header />
        <main className="rd-main">
          <Hero />
        </main>
      </div>
    </StaticRouter>,
  );
  return (
    `<div id="${FIRST_VIEW_ID}" data-rd-first-view><style>${RESET}${css}</style>${body}`
    + `<script>window.__gcpFirstView=document.getElementById("${FIRST_VIEW_ID}").outerHTML;${EARLY_MENU_TAP}</script></div>`
  );
}
