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

The look is the business's own backend, flipped to white (the owner's direction, with
a screenshot of the Prestige dashboard as the reference):

| Backend (`src/styles/platform.css`) | Public site (`src/redesign/styles/first-view.css`) |
| --- | --- |
| near-black page, charcoal cards | white page `#FAFAFA`, white cards |
| white type, white hairlines at 7% | black type `#09090B`, black hairlines at 7% |
| `.platform-grid`, 64 px, top of the screen | `.rd-atmos__grid`, the same |
| `.platform-fade`: silver, fixed to the bottom half of the screen | `.rd-atmos__fade`: the same silver, the same half, the same recipe (0.3 bloom, 72% and 48% mixes) |
| `.command-kpi`, `.command-panel`, `.command-period`, `.command-eyebrow` | `.rd-kpi`, `.rd-panel`, `.rd-seg`, `.rd-eyebrow` |
| top bar and bottom bar | `.rd-hd` and `.rd-dock`, the same shapes |
| white accent | a regular green (`#15803D` under white words, `#16A34A` for lines and glows), on actions and highlights only |

The atmosphere (grid and fade) is one fixed layer behind every page
(`src/redesign/chrome/Atmosphere.tsx`). Sections have no fill of their own; content
sits in white cards that float over it. The only colour on a page is the green of an
action and the photographs.

Because the fade is fixed to the screen, words printed straight on the page pass over
every shade of it as the page scrolls, and the darkest shade is at the bottom. So text
on the page itself is always ink, and green words appear only on white cards. The
older pages follow the same rule through one value in `site.css` ("Green words"):
their green words turn to ink when nothing solid is behind them, a link keeps its green
as the line under it, and a white or pale card switches them back to green.

## Where things are

| What | Where |
| --- | --- |
| Colours, type, buttons, header, opening screen | `src/redesign/styles/first-view.css` |
| Everything below the opening screen | `src/redesign/styles/site.css` |
| Homepage sections | `src/redesign/home/` |
| Pages | `src/redesign/pages/` |
| Tree removal and palm care sections | `src/redesign/pages/priority/` and their words in `src/redesign/data/priorityCopy.ts` |
| Header, phone menu, footer, phone action bar | `src/redesign/chrome/` |
| Photos and project notes | `src/redesign/data/` (what each photo is and where it came from: `src/assets/owner/README.md` and `src/assets/facebook/README.md`) |
| The opening photo, its crops and the soft copy shown before it arrives | `scripts/build-redesign-media.mjs` (writes `public/media/redesign/hero-*` and `src/redesign/styles/hero-preview.css`) |
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

## The opening screen

Built like the backend's dashboard, facing the customer: a headline block (the Google
rating as the small line above it), quote / call / text, a work panel, and four cards
of figures (`src/redesign/home/Hero.tsx`, words and facts in `src/redesign/data/hero.ts`).

The work panel has two scenes and a switch between them, like the backend's
Week / Month: the white condo building after dark (the owner's photo), then the
waterfront estate from the air (seven seconds of the owner's drone video, silent). It
moves on by itself until the visitor picks a scene. Both are jobs already on the
Completed Jobs page, so the town, property and work shown are the ones recorded there.

On a weak signal:

- The first HTML of the homepage carries the top bar, the opening screen and their
  styles, so they are on screen before the app has loaded. The buttons are plain links
  and work from that first frame.
- A few-dozen-pixel copy of the night photo sits in the page itself and is drawn soft
  where the photo will be. Every phone gets the 660-pixel photo file (about 22 KB).
- The second scene's still and the clip (0.9 MB on a phone) are fetched only after the
  page has finished loading. The clip is never fetched on a data-saving connection or
  for visitors who ask for less motion; they get the two stills and the switch.
- The header's palm mark is asked for with the photo, and the typeface is registered
  with the page once, so the words do not change face when the app takes over.

Straight under the opening screen is a panel of six one-tap quote starts (tree removal,
tree trimming, storm cleanup, palm trimming, diamond cutting, trunk skinning). Each
opens the quote form with that work already chosen, using the form's own service names
(`src/redesign/home/QuickQuote.tsx`).

To change a scene, change the source and crop in `scripts/build-redesign-media.mjs`,
run it, and update the facts in `src/redesign/data/hero.ts`. The ffmpeg commands for
the clip are in that script's notes.

## What stays exactly as it is

- Every address. No page was added, renamed or removed.
- The quote form's service and area choices and the lead it sends (`submit-lead`).
- Click reporting: the same `data-track-cta` and `data-track-placement` names, handled by
  the one site-wide click handler. Buttons that have no equivalent on the current site
  report under new placement names: `hero_card` (the "Written quote" card),
  `home_quick` (the six one-tap quote starts), `home_services_tree`,
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

- Opening screen: the fade rises, the headline arrives a word at a time, the work panel
  settles into place and a light runs once round its edge, the figures run up. The quote,
  call and text buttons are never hidden, even for a frame. After that: the picture
  drifts slowly closer, a line under the switch counts down to the next scene, the drone
  clip plays, a glint circles the quote button, and now and then a band of light crosses
  the silver. On a mouse the work panel leans a degree or two toward the pointer and the
  grid lines near it show stronger. As the page scrolls, the picture settles back.
- Below: blocks arrive as they are reached (`data-rv`), the figure cards and the one-tap
  quote buttons come on in a run, photos are uncovered from the bottom up, the three
  tree-removal frames come on in order, the review count runs up, a line runs under the
  coast list. On the homepage a green line along the top bar shows how far the page has
  been read.
- A block is only held back if it is still below the screen, so nothing visible ever
  disappears. With scripts off, or when the visitor asks for less motion, nothing moves
  and nothing is hidden.
- One rule for the work panel's entrance: it may start larger than its resting size,
  never smaller or lower. Browsers time a page by when its largest picture is drawn and
  restart that clock if the same picture is later drawn bigger. The app redraws the
  panel when it takes over, which is seconds later on a weak signal, so an entrance
  that starts small moves the measured time from about one second to the takeover.

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
  from the Facebook page, and for the two jobs the owner sent on 18 November (the date
  palm by the paver drive and the five sabals). None is recorded, so none is shown and
  none links to a service-area page yet.
- The original camera files or the job video for the tree removal (the frames are
  720 pixels wide, taken from the video on the business's Facebook page).
- A photo of seed pods or flower stalks being removed, and an after-cleanup photo of the
  tree removal.
- The name of the finish on the trunk clean-up pair (it is described, not named).
