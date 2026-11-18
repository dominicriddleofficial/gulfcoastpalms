# Public site redesign (hidden preview)

The redesigned public website lives beside the current one. It shows only at a hidden
address and changes nothing on the live site until one switch is flipped.

- Preview address: `/preview/redesign` (every public page works under it, for example
  `/preview/redesign/services/tree-removal`).
- The preview is never indexed (noindex, canonical pointing at the real page), is left
  out of the sitemap, and sends nothing to Google Analytics, Meta or the site's own
  visit table.
- The CRM, portal, admin and customer quote/pay links are not part of it.

## What is in it

Rebuilt pages: home, services index, the nine service pages in the shared service data,
all fourteen city pages, service areas, completed projects, the quote form, thank-you
and not-found. Every other public page (About, guides, careers, commercial and so on)
keeps its current content inside the new header and footer, re-coloured to match.

The look: white surfaces with the CRM's emerald. The light is the CRM's own recipe
(`.platform-fade`: it rises from the bottom edge of a surface and is gone halfway up),
mixed into white, with a white-hot edge so it reads as light. It is defined once, as
`--rd-light` in `src/redesign/styles/first-view.css`, and used by the opening screen,
page headers, panels, alternate bands, the closing quote band and the footer.

## Where things are

| What | Where |
| --- | --- |
| Colours, type, buttons, header, opening screen | `src/redesign/styles/first-view.css` |
| Everything below the opening screen | `src/redesign/styles/site.css` |
| Homepage sections | `src/redesign/home/` |
| Pages | `src/redesign/pages/` |
| Tree removal and palm care sections | `src/redesign/pages/priority/` and their words in `src/redesign/data/priorityCopy.ts` |
| Header, phone menu, footer, phone action bar | `src/redesign/chrome/` |
| Photos and project notes | `src/redesign/data/` (what each photo is and where it came from: `src/assets/facebook/README.md`) |
| Homepage motion | `src/redesign/lib/motion.ts` and the "Motion" part of `site.css` |
| Which addresses have a rebuilt page | `src/redesign/routes.tsx` |
| The go-live switch | `src/redesign/live.mjs` |
| New page titles and descriptions | `src/redesign/seo.data.mjs` |
| Search-engine copy for the changed pages | `src/redesign/staticCopy.ts` |
| Tests | `src/redesign/redesign.test.tsx` |

Shared files touched, all inert while the switch is off: `src/App.tsx`,
`src/components/Layout.tsx`, `src/components/SEOHead.tsx`, the two route files,
`src/seo/routes.data.mjs`, `src/seo/staticContent.ts`, `src/seo/jsonLd.ts`,
`scripts/prerender-meta.mjs`, `scripts/check-seo.mjs`.

One change in the shared SEO code is not behind the switch: breadcrumb data now names
the page itself ("Tree Removal") where it used to repeat the page's whole title. It
applies to the current pages as soon as this branch is merged.

## What stays exactly as it is

- Every address. No page was added, renamed or removed.
- The quote form's service and area choices and the lead it sends (`submit-lead`).
- Click reporting: the same `data-track-cta` and `data-track-placement` names, handled by
  the one site-wide click handler. Buttons that have no equivalent on the current site
  report under new placement names, for example `home_services_tree`,
  `home_services_palm`, `home_tree_frames`, `home_projects`, `home_commercial`,
  `projects_lightbox` and `service_tree-removal_job`. They will appear as new rows in
  the website report.
- Service names. `service.title` is also the quote-form label the CRM routes on, so it is
  never changed. A page that needs a different heading gets one in `seo.data.mjs`.

## The two priority pages

| Page | Address | Title once live |
| --- | --- | --- |
| Tree removal | `/services/tree-removal` | Tree Removal \| Navarre & Emerald Coast FL \| Gulf Coast Palms |
| Palm care | `/services/palm-tree-trimming` | Palm Tree Trimming & Care \| Emerald Coast FL \| Gulf Coast Palms |

Both were the strongest existing addresses for their subject, so nothing new was
created. Their new titles, descriptions, headings and search-engine copy reach the real
addresses only when the switch is on. The preview shows them now.

## Motion

Everything is optional on top of a page that is complete without it.

- Opening screen: the light breathes and drifts, a glint runs along the edge, a band of
  light crosses the headline once, a glint circles the quote button. As the page scrolls,
  the photo settles back and dims and the light runs on into the next section.
- Below: blocks arrive as they are reached (`data-rv`), photos are uncovered from the
  bottom up, the three tree-removal frames come on in order, the review count runs up,
  a light runs through the coast list, the closing band lights up.
- A block is only held back if it is still below the screen, so nothing visible ever
  disappears. With scripts off, or when the visitor asks for less motion, nothing moves
  and nothing is hidden.

## Going live (the owner's decision)

1. Set `REDESIGN_LIVE` to `true` in `src/redesign/live.mjs`. The rebuilt pages then show
   at the real addresses, with the new titles, descriptions and search-engine copy for
   the home page, tree removal and palm care.
2. Opening screen in the first HTML. Today only the preview address ships the prebuilt
   opening screen (`src/redesign/firstView.tsx`). Before go-live, add it for `/` in
   `scripts/prerender-meta.mjs`, and make sure it is removed when the same file is served
   for CRM and other app addresses (see `unknownRouteScript` there). Until that is done
   the live home page would show plain copy for a moment before the design appears.
3. `index.html` still links two Google Fonts stylesheets the new design does not use
   (it ships its own font file). Remove them at go-live to save two requests.
4. `/gallery` and `/jobs` show the same page; the canonical already points to `/jobs`.
5. Build and check: `npm run build` (includes the SEO check), `npm test`.
6. Ship with `deploy_project`, as for any other change.

## Checking the work

```sh
npm test                 # unit tests, including src/redesign/redesign.test.tsx
npm run build            # build + first HTML for every page + SEO check
```

## What would make it better

Things only the office can supply:

- Search Console access, to confirm the two priority pages against real search terms.
- The city for the tree removal, the two sabals, the trunk clean-up and the date palm
  (none is recorded, so none is shown).
- The original camera files or the job video for the tree removal (the frames are
  720 pixels wide, taken from the video on the business's Facebook page).
- A photo of seed pods or flower stalks being removed, and an after-cleanup photo of the
  tree removal.
- The name of the finish on the trunk clean-up pair (it is described, not named).
