/**
 * Build-time first view for /preview/cinematic-home only.
 *
 * Rendered into the prerendered HTML (and reused verbatim as that route's Suspense
 * fallback) so visitors get the real poster, H1, quote action, both service paths and
 * call/text links before the app's JavaScript and main stylesheet arrive. All copy,
 * links and media come from the same data the React hero uses; geometry comes from the
 * same cinematic.css, inlined. No player or menu controls are drawn until they work.
 */
import cineCss from "./cinematic.css?raw";
import {
  cinematicCopy, cinematicHeaderLinks, cinematicPortraitPoster, cinematicPoster, cinematicServices,
} from "@/data/cinematicHero";
import { GCP_BUSINESS, GOOGLE_BUSINESS_URL, SMS_HREF, TEL_HREF } from "@/lib/business-info";

export const CINEMATIC_SHELL_ID = "seo-static-content";
const MOBILE = "(max-width: 767px)";

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const svg = (d: string, size: number) =>
  `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none">${d}</svg>`;
const ARROW = '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>';
const PHONE = '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>';
const MESSAGE = '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>';
const STAR = '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"/>';

/** Tailwind-equivalent rules for the few utilities the shell needs before the main CSS loads. */
const SHELL_CSS = `
#${CINEMATIC_SHELL_ID}[data-cine-shell]{--palm-dark:150 40% 8%;--palm-light:145 45% 52%;--palm-gold:38 90% 55%;--palm-sand:35 30% 92%;--primary:145 63% 32%;--primary-foreground:0 0% 100%;margin:0;line-height:1.5;-webkit-text-size-adjust:100%;font-family:Outfit,sans-serif;color:hsl(var(--palm-sand));background:hsl(var(--palm-dark))}
body{margin:0}
[data-cine-shell] *{box-sizing:border-box}
:where([data-cine-shell] *){margin:0}
[data-cine-shell] a{color:inherit;text-decoration:none}
[data-cine-shell] .cs-head{position:sticky;top:0;z-index:40;background:hsl(var(--palm-dark)/.95);border-bottom:1px solid hsl(var(--palm-sand)/.1)}
[data-cine-shell] .cs-wrap{width:100%;margin-left:auto;margin-right:auto;padding-left:1.25rem;padding-right:1.25rem}
@media(min-width:768px){[data-cine-shell] .cs-wrap{padding-left:2.5rem;padding-right:2.5rem}}
@media(min-width:1400px){[data-cine-shell] .cs-wrap{max-width:1400px}}
[data-cine-shell] .cs-bar{height:4rem;display:flex;align-items:center;justify-content:space-between;gap:1rem}
@media(min-width:768px){[data-cine-shell] .cs-bar{height:5rem}}
[data-cine-shell] .cs-brand{font-family:Fraunces,Outfit,serif;font-size:1.125rem;line-height:1.75rem;font-weight:700}
@media(min-width:768px){[data-cine-shell] .cs-brand{font-size:1.25rem}}
[data-cine-shell] .cs-brand span{color:hsl(var(--palm-light))}
[data-cine-shell] .cs-nav{display:none;align-items:center;gap:1.75rem;font-size:.875rem;color:hsl(var(--palm-sand)/.8)}
@media(min-width:1024px){[data-cine-shell] .cs-nav{display:flex}}
[data-cine-shell] .cs-right{display:flex;align-items:center;gap:.5rem}
[data-cine-shell] .cs-phone{display:inline-flex;align-items:center;gap:.5rem;height:2.5rem;padding:0 .75rem;border-radius:.5rem;border:1px solid hsl(var(--palm-sand)/.25);font-size:.875rem;font-weight:600}
[data-cine-shell] .cs-phone span,[data-cine-shell] .cs-btn.cs-hquote{display:none}
@media(min-width:640px){[data-cine-shell] .cs-phone span{display:inline}}
@media(min-width:768px){[data-cine-shell] .cs-btn.cs-hquote{display:inline-flex;padding-top:.625rem!important;padding-bottom:.625rem!important;font-size:.875rem!important}}
[data-cine-shell] .cs-menu-space{width:2.5rem;height:2.5rem}
@media(min-width:1024px){[data-cine-shell] .cs-menu-space{display:none}}
[data-cine-shell] .cs-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;padding:.875rem 1.5rem;border-radius:.75rem;font-weight:700;font-size:1rem;line-height:1.5rem;white-space:nowrap;background:hsl(var(--primary));color:hsl(var(--primary-foreground));box-shadow:0 10px 15px -3px hsl(var(--primary)/.3)}
[data-cine-shell] .cine-title{font-family:Fraunces,Outfit,serif;font-weight:700;color:hsl(var(--primary-foreground))}
[data-cine-shell] .cine-eyebrow{text-transform:uppercase;color:hsl(var(--palm-gold))}
[data-cine-shell] .cine-sub,[data-cine-shell] .cine-call{color:hsl(var(--palm-sand)/.85)}
[data-cine-shell] .cine-call{line-height:1.25rem}
[data-cine-shell] .cine-call b{color:hsl(var(--primary-foreground))}
[data-cine-shell] .cine-copy{max-width:42rem}
[data-cine-shell] .cs-badge{display:inline-flex;align-items:center;gap:.375rem;border-radius:999px;background:hsl(var(--primary-foreground)/.1);border:1px solid hsl(var(--primary-foreground)/.25);padding:.25rem .75rem;font-size:.75rem;line-height:1rem;font-weight:600;color:hsl(var(--primary-foreground))}
[data-cine-shell] .cs-badge svg{color:hsl(var(--palm-gold))}
[data-cine-shell] .cs-badge small{font-size:11px;line-height:1rem;font-weight:400;color:hsl(var(--palm-sand)/.7)}
[data-cine-shell] .cs-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem;list-style:none;padding:0}
@media(min-width:768px){[data-cine-shell] .cs-cards{gap:.75rem}}
[data-cine-shell] .cs-card{display:block;border-radius:.75rem;padding:.625rem .75rem}
@media(min-width:768px){[data-cine-shell] .cs-card{padding:1rem 1rem .5rem}}
[data-cine-shell] .cs-ct{display:flex;align-items:center;justify-content:space-between;gap:.5rem;font-family:Fraunces,Outfit,serif;font-size:15px;line-height:1.25;font-weight:600;color:hsl(var(--primary-foreground))}
@media(min-width:768px){[data-cine-shell] .cs-ct{font-size:1.25rem}}
[data-cine-shell] .cs-cd{display:none;font-size:.875rem;line-height:1.25rem;color:hsl(var(--palm-sand)/.8);margin-top:.25rem}
@media(min-width:768px){[data-cine-shell] .cs-cd{display:block}}
[data-cine-shell] .cs-fq{display:block;font-size:.75rem;line-height:1rem;color:hsl(var(--palm-gold));margin-top:.125rem}
[data-cine-shell] .cs-about{display:none;padding:0 1rem .75rem;font-size:.75rem;line-height:1rem;color:hsl(var(--palm-sand)/.75)}
@media(min-width:768px){[data-cine-shell] .cs-about{display:block}}
[data-cine-shell] .cs-contact{position:fixed;left:0;right:0;bottom:0;z-index:50;display:flex;background:hsl(var(--primary));padding-bottom:env(safe-area-inset-bottom,0px)}
@media(min-width:768px){[data-cine-shell] .cs-contact{display:none}}
[data-cine-shell] .cs-contact a{flex:1;display:flex;align-items:center;justify-content:center;gap:.5rem;padding:1rem 0;color:hsl(var(--primary-foreground));font-weight:600;font-size:.875rem;line-height:1.25rem}
[data-cine-shell] .cs-contact a+a{border-left:1px solid hsl(var(--primary-foreground)/.2)}
[data-cine-shell] .cine-hero{overflow:hidden;isolation:isolate;background:hsl(var(--palm-dark))}
[data-cine-shell] picture{display:block}
`;

/** Responsive poster sources: exactly one is chosen by the browser for the device. */
export function cinematicPosterPreloads(): string {
  return [
    `<link rel="preload" as="image" fetchpriority="high" media="${MOBILE}" type="image/avif" imagesrcset="${esc(cinematicPortraitPoster.avif)}" imagesizes="100vw">`,
    `<link rel="preload" as="image" fetchpriority="high" media="(min-width: 768px)" type="image/avif" imagesrcset="${esc(cinematicPoster.avif)}" imagesizes="100vw">`,
  ].join("");
}

export function renderCinematicShell(): string {
  const r = GCP_BUSINESS.aggregateRating;
  const nav = cinematicHeaderLinks.map((l) => `<a href="${esc(l.to)}">${esc(l.label)}</a>`).join("");
  const cards = cinematicServices.map((s) => `<li class="cine-card"><a class="cs-card" href="${esc(s.quoteHref)}" data-track-cta="quote_request" data-track-placement="${esc(s.placement)}"><span class="cs-ct"><span class="cine-card-full">${esc(s.title)}</span><span class="cine-card-short">${esc(s.shortTitle)}</span>${svg(ARROW, 16)}</span><span class="cs-cd">${esc(s.detail)}</span><span class="cs-fq">Free quote</span></a><a class="cs-about" href="${esc(s.pageHref)}">About ${esc(s.title.toLowerCase())}</a></li>`).join("");
  return `<div id="${CINEMATIC_SHELL_ID}" data-cine-shell class="cine-page"><style>${cineCss}${SHELL_CSS}</style>`
    + `<header class="cs-head"><div class="cs-wrap cs-bar"><a class="cs-brand" href="/">Gulf Coast <span>Palms</span></a><nav class="cs-nav" aria-label="Main">${nav}</nav>`
    + `<div class="cs-right"><a class="cs-phone" href="${TEL_HREF}" data-track-placement="header" aria-label="Call ${esc(GCP_BUSINESS.phoneDisplay)}">${svg(PHONE, 16)}<span>${esc(GCP_BUSINESS.phoneDisplay)}</span></a>`
    + `<a class="cs-btn cs-hquote" href="/quote" data-track-cta="quote_request" data-track-placement="header">Free Quote${svg(ARROW, 20)}</a><span class="cs-menu-space" aria-hidden="true"></span></div></div></header>`
    + `<main class="cine-main"><section class="cine-hero" aria-labelledby="cinematic-shell-title"><div class="cine-media"><picture>`
    + `<source media="${MOBILE}" type="image/avif" srcset="${esc(cinematicPortraitPoster.avif)}" sizes="100vw">`
    + `<source media="${MOBILE}" type="image/webp" srcset="${esc(cinematicPortraitPoster.webp)}" sizes="100vw">`
    + `<source media="${MOBILE}" srcset="${esc(cinematicPortraitPoster.jpg)}" sizes="100vw">`
    + `<source type="image/avif" srcset="${esc(cinematicPoster.avif)}" sizes="100vw">`
    + `<source type="image/webp" srcset="${esc(cinematicPoster.webp)}" sizes="100vw">`
    + `<img class="cine-frame" src="${esc(cinematicPoster.fallback)}" srcset="${esc(cinematicPoster.jpg)}" sizes="100vw" alt="${esc(cinematicPoster.alt)}" width="${cinematicPoster.width}" height="${cinematicPoster.height}" fetchpriority="high" loading="eager" decoding="async"></picture>`
    + `<div class="cine-scrim" aria-hidden="true"></div></div>`
    + `<div class="cine-player"><div class="cine-player-row"><p class="cine-label">${esc(cinematicCopy.label)}</p></div></div>`
    + `<div class="cine-content cs-wrap"><div class="cine-copy"><p class="cine-eyebrow">${esc(cinematicCopy.eyebrow)}</p><h1 id="cinematic-shell-title" class="cine-title">${esc(cinematicCopy.title)}</h1><p class="cine-sub">${esc(cinematicCopy.subheading)}</p>`
    + `<div class="cine-actions"><a class="cs-btn cine-quote" href="/quote" data-track-cta="quote_request" data-track-placement="hero_cinematic_main">${esc(cinematicCopy.quoteLabel)}${svg(ARROW, 20)}</a>`
    + `<a class="cine-call" href="${TEL_HREF}" data-track-placement="hero_cinematic">or call <b>${esc(GCP_BUSINESS.phoneDisplay)}</b></a>`
    + `<span class="cine-badge"><a class="cs-badge" href="${GOOGLE_BUSINESS_URL}" target="_blank" rel="noopener noreferrer" aria-label="${esc(`${Number(r.ratingValue)} stars from ${r.reviewCount} Google reviews — read on Google`)}">${svg(STAR, 14)}${esc(Number(r.ratingValue).toFixed(1))}<small>· ${esc(r.reviewCount)} Google Reviews</small></a></span></div></div>`
    + `<nav class="cine-journey" aria-label="Choose a service"><ul class="cs-cards">${cards}</ul></nav></div></section></main>`
    + `<div class="cs-contact"><a href="${TEL_HREF}" data-track-placement="sticky_bar">${svg(PHONE, 20)}Call Now</a><a href="${esc(SMS_HREF)}" data-track-placement="sticky_bar">${svg(MESSAGE, 20)}Text Us a Photo</a></div>`
    + `<script>window.__gcpCineShell=document.getElementById("${CINEMATIC_SHELL_ID}").outerHTML;</script></div>`;
}
