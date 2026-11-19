/**
 * Prebuilt first view of the redesigned homepage.
 *
 * The build renders the real header and opening screen to HTML and places it in the
 * page before any JavaScript, with their stylesheet inlined. A visitor on a slow
 * phone connection sees the finished opening (photo, glow, headline, quote, call and
 * text buttons, all working links) straight away; the app then takes over the same markup.
 *
 * It is the same Header and Hero components and the same first-view.css the live
 * page uses, so the two cannot drift apart.
 *
 * Only imported by scripts/prerender-meta.mjs.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import css from "./styles/first-view.css?raw";
import previewCss from "./styles/hero-preview.css?raw";
import Atmosphere from "./chrome/Atmosphere";
import Header from "./chrome/Header";
import { heroScenes } from "./data/hero";
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
  + `var t=e.target&&e.target.closest?e.target:null;if(!t)return;`
  + `var b=t.closest("[data-rd-menu]");`
  + `if(b){window.__gcpMenuWanted=true;document.documentElement.classList.add("rd-menu-wanted");return}`
  // The same for the switch on the work panel: the chosen word is marked at once, and the
  // panel changes scene when the app arrives.
  + `var s=t.closest("[data-rd-scene]");`
  + `if(s){window.__gcpSceneWanted=s.getAttribute("data-rd-scene");`
  + `var all=s.parentNode.querySelectorAll("[data-rd-scene]");for(var i=0;i<all.length;i++)all[i].setAttribute("aria-pressed",all[i]===s?"true":"false")}`
  + `},true);`;

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * The typeface is declared twice: here in the first view's own styles, and again in the
 * app's stylesheet. When the app takes over, the first declaration goes and the second
 * starts from nothing, so on a slow connection every word dropped to the stand-in face
 * for a moment and then changed back. Registering the same file with the page directly
 * keeps one loaded copy in place the whole time. Without scripts the styles alone do the job.
 */
const KEEP_FONT = `try{if(window.FontFace&&document.fonts){var f=new FontFace("GCP Geist",'url("/fonts/gcp-geist.woff2") format("woff2")',{weight:"100 900",style:"normal",display:"swap"});document.fonts.add(f);f.load().catch(function(){})}}catch(e){}`;

/**
 * Head tags that start the opening photo, the font and the header mark before anything
 * else. Only the first scene's photo: the second is fetched once the page has loaded.
 */
export function firstViewPreloads(): string {
  const photo = heroScenes[0].photo;
  return [
    `<link rel="preload" as="image" fetchpriority="high" type="image/avif" imagesrcset="${esc(photo.avif)}" imagesizes="${esc(photo.sizes)}">`,
    `<link rel="preload" as="font" type="font/woff2" href="/fonts/gcp-geist.woff2" crossorigin>`,
    // The palm mark in the header is small but was fetched last; asked for early, it is there with the first frames.
    `<link rel="preload" as="image" type="image/png" href="/media/redesign/gcp-mark.png" fetchpriority="high" crossorigin>`,
  ].join("");
}

export function renderFirstView(base: string = REDESIGN_PREVIEW_BASE): string {
  const body = renderToStaticMarkup(
    <StaticRouter location={base || "/"} basename={base || undefined}>
      <div className="rd rd-page rd-page--over">
        <Atmosphere />
        <Header />
        <main className="rd-main">
          <Hero />
        </main>
      </div>
    </StaticRouter>,
  );
  return (
    `<div id="${FIRST_VIEW_ID}" data-rd-first-view><style>${RESET}${css}${previewCss}</style>${body}`
    + `<script>window.__gcpT0=performance.now();window.__gcpFirstView=document.getElementById("${FIRST_VIEW_ID}").outerHTML;${KEEP_FONT};${EARLY_MENU_TAP}</script></div>`
  );
}
