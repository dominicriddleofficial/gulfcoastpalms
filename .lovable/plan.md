# Cinematic homepage hero — audit and isolated preview plan (read-only audit done)

## What is live today (checked on gulfcoastpalmservices.com, 12 Nov 2026)
- Hero: still photo of palms on the water, gold "Serving Perdido Key to 30A" pill, headline "Tree Removal, Tree Trimming & Palm Care", review badge "5.0 · 168 Google Reviews", main button "Get a Free Quote Online", two smaller buttons "Tree Services" and "Palm Care", "or call (850) 910-1290", hurricane emergency pill.
- Phone (375/390): the top hurricane bar plus header take about 110px; the headline wraps to 3 lines; buttons and call link fit above the fold; sticky bottom bar "Call Now / Text Us a Photo".
- Desktop (1440): everything sits above the fold; tree and palm get equal button weight.
- Page tags: title "Gulf Coast Palms | Tree Services & Palm Care on the Emerald Coast", canonical `https://gulfcoastpalmservices.com/`, robots `index, follow`, 2 structured-data blocks.
- Weight: 45 requests, about 3.7 MB on phone and 4.0 MB on desktop (first load, nothing cached).

Screenshots (saved in Files): hero-audit/home-375.png, hero-audit/home-390.png, hero-audit/home-1440.png.

## Exact files involved
- Homepage: `src/pages/Index.tsx` (hero, then services, trust, why us, areas, gallery, map, Google reviews, video testimonials, FAQ, final CTA).
- Hero: `src/components/home/HeroSection.tsx`; copy comes from `src/data/publicMarketing.ts` (`heroHeading`, `heroText`); photo from `src/data/assets.ts` (`HERO_IMAGE_URL`, `heroSrcSet`).
- Review proof: `src/components/home/HeroReviewBadge.tsx`, `GoogleReviews.tsx`, `src/data/reviews.ts`.
- Quote button: `src/components/cta/QuoteRequestButton.tsx` — goes to `/quote?service=<label>&source=<placement>`, tracked once by the site-wide click handler via `data-track-cta="quote_request"` and `data-track-placement`.
- Quote form: `src/pages/Quote.tsx` reads `?service=` and preselects a dropdown whose values are service **labels** from `serviceNavLinks` in `src/data/services.ts`.
- Search setup: `src/seo/routes.data.mjs` (single page list driving titles, noindex, sitemap), `scripts/prerender-meta.mjs`, `scripts/generate-sitemap.mjs`, `scripts/check-seo.mjs`, `src/components/SEOHead.tsx`.
- Routing: `src/routes/MarketingRoutes.tsx` (`/` → Index).

## Quote button values for the new hero (existing values only)
- Tree removal: `service=Tree Removal` (page `/services/tree-removal`)
- Tree trimming: `service=Tree Trimming` (page `/services/tree-trimming`)
- Tree combined: `service=Tree Trimming & Removal` (page `/services/tree-trimming-removal`)
- Palm trimming: `service=Palm Tree Trimming` (page `/services/palm-tree-trimming`)
- Palm removal: `service=Palm Tree Removal` (page `/services/palm-tree-removal`)
- Placement labels: `hero_cinematic_tree`, `hero_cinematic_palm`, `hero_cinematic_main`.
No new claims: reuse only the 168 reviews / 5.0 badge data, "Perdido Key to 30A", and the existing phone number.

## Safe preview approach
- Add one hidden page at `/preview/cinematic-home`, listed in the shared page list with `noindex: true`, left out of the sitemap, with no links to it from menus, and its canonical pointing at `/`.
- It renders the existing homepage sections unchanged and swaps only the hero for a new `CinematicHero` component. `/`, the admin/CRM area, city pages, service pages and the quote page stay untouched.
- Release later by changing one line in `Index.tsx`; going back is the same one-line change.

## Contract for the new hero
1. Equal weight for tree work and palm work: two matching paths plus one main quote button. Keep the call link and review badge visible on a 390px screen without scrolling.
2. Video: muted, autoplay, inline, looping, with a still poster image. Phone file ≤ 1.5 MB, desktop ≤ 4 MB, H.264 MP4 plus WebM. Load the video only after the poster is on screen. Phones with data saver or reduced motion get the still image only.
3. The poster must load as fast as or faster than today's photo (keep it the high-priority image). No new fonts, and no animation library added to the first load.
4. Keep the single `<h1>`, the same text style tokens, and readable text over the video (dark gradient as today).
5. All taps go through the existing tracking attributes; no new tracking code.
6. Improvements worth making alongside: on phones, fold the hurricane emergency pill into the top bar so it isn't repeated twice above the fold.

## Checks before release
Screenshots at 375/390/1440, page weight compared with today's numbers, the SEO check script, confirming the preview page is marked noindex in the built HTML, and confirming each button opens `/quote` with the right service preselected (no form submission).

Waiting on: your approved video files and poster frames.
