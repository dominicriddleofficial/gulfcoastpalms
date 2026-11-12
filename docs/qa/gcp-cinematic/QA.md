# GCP cinematic homepage preview – QA (unpublished)

Route `/preview/cinematic-home`: noindex,nofollow, canonical `/`, not in sitemap, not tracked. Root `/` source and metadata unchanged. Full build + SEO check (72 pages, 67 sitemap URLs), typecheck and 26 focused player/preview/first-view/public-service tests pass (pass 4).

## Pass 4 (current) – startup / first view
**Environment:** same compiled build + local static server; headless Chromium 147, default autoplay policy, no play patch; phone 390x844 (is_mobile, DPR 2) on CDP 1.6 Mbps / 150 ms, fresh cold context; desktop 1440x900 unthrottled. Raw data: qa-startup.json.

**What blocked the first view (before this pass, slow phone):** both `/` and the preview waited on the shared app boot. The main stylesheet (134 KB, done 4.3s) blocked any paint; the React shell then needed vendor-supabase 190 KB (6.5s), index 162 KB, vendor-react 161 KB (5.1s), StickyContactBar chunk 139 KB and vendor-motion 121 KB (9.9s), all competing with the site-wide Meta pixel 112 KB + config 106 KB and gtag. `/` showed the plain SEO copy with a working `/quote` link at 4.0s (unstyled) and its React hero at 10.5s. The preview was the same: plain copy and link at 4.35s (first paint), React hero/quote 10.4s, poster 10.8s, film 12.1s. So the delay is existing app-boot cost, not the preview itself.

**Change (preview route only):** the prerendered HTML for `/preview/cinematic-home` now holds a styled first view built at build time from the same data as the React hero: header (brand, links, phone, quote; space held for the menu, no fake button), poster `<picture>`, "Service visualization" label (no player control), one H1, main quote link, call link, review badge, both service links, and the Call/Text bar. It reuses cinematic.css inlined plus a small block of matching base styles. The poster is preloaded right after the viewport meta, with a media query per device. The main stylesheet moves after this markup, so the first view paints without waiting for it. The app scripts still run after the stylesheet loads. React's Suspense fallback for this route reuses the same captured markup, so takeover never shows a spinner. `/` and every other route's HTML are byte-identical apart from asset hashes (diffed).

| Slow phone 390x844 | Before | After |
|---|---|---|
| First paint | 4.35s | **0.34s** |
| First working quote link visible | 4.35s (plain copy) | **0.28–0.34s (styled hero first view)** |
| Poster | 10.83s | **4.73s** |
| React hero quote button | 10.41s | 11.22s (React itself is not faster) |
| First film frame | 12.14s | 12.78s |
| Requests for poster / film | 1 / 1 | 1 (portrait-720.avif) / 1 (portrait mp4) |
`/` under the same profile in the same final run: plain copy + link 4.1s, React 11.0s. That's unchanged and is the existing app's cost.

**Takeover checks (slow phone):** in 684 frame samples there were no frames without an H1, no frames with two H1s and no spinner. Positions match between the first view and the React hero: H1 525/525px, quote 605→604px, cards 702/702px. A service link clicked before the app loaded opened `/quote?service=Palm+Tree+Trimming&source=hero_cinematic_palm` directly.
**Desktop 1440x900 (unthrottled):** first view at 0.06s, poster 0.44s, React 1.6s, film 2.85s. One poster (1600.avif) and one film request. H1/quote identical across takeover; card tops move 6px (663→657).
Screenshots: slow-mobile-first-view-before-poster.jpg, slow-mobile-poster-before-film.jpg, desktop-1440x900-first-view.jpg.

**Limits:** from 0.3s to about 4.7s on the slow phone, the first view is the dark brand background with the styled copy and links but no photo yet. The poster competes with about 1 MB of shared app JavaScript and the site-wide tracking scripts, which this preview-only pass did not change. The film still waits for React (~12.8s). Fonts may swap after loading (they are loaded the same way as on `/`). The desktop card position moves 6px. Not run: real Safari/devices, production hosting/CDN.

## Pass 3 – compiled build, default autoplay
**Environment:** `npm run build` output (`dist/`) served by a local static server on 127.0.0.1:4173; the `/__l5e/` film/image paths are passed through to the project asset path. Headless Chromium 147 (Playwright), Linux sandbox, **launched with no autoplay-policy flag and no play()/gesture patch**. Phones emulated (is_mobile, touch, DPR 2). Not real production hosting, not Safari, not a real device.

| Viewport | Poster painted | First film frame | Default autoplay | Poster file | Film | MP4 requests | Dropped/total |
|---|---|---|---|---|---|---|---|
| 390x844 | 0.92s | 1.84s | started (muted inline) | first-frame-portrait-720.avif, 92 KB | portrait 720 | 1 | 1/372 |
| 1440x900 | 0.53s | 1.49s | started | first-frame-1600.avif, 174 KB | desktop 1600 (5.9 MB) | 1 | 1/372 |
| 375x667 | 0.63s | 1.84s | started | first-frame-portrait-720.avif | portrait 720 | 1 | 9/372 |
Times from navigation start, unthrottled local network. Figures are copied from the saved final run in qa-production-build.json (an earlier unsaved run had shown 0/3/0 dropped frames; that earlier summary was wrong to publish). Each ran palm (4.6s) → removal (10.6s) → ended at 15.5s holding the last frame with Replay.

**Posters = exact first frames.** The supplied PNGs are pixel-identical to frame 0 decoded with ffmpeg (mean diff 0.0). Encoded as AVIF/WebP/JPEG: desktop 960/1280/1600w (1600x904), portrait 480/720w (720x1276, not upscaled). In-browser poster vs film frame 0 mean difference is ~2.8/255 per channel (lossy compression only). Proofs: start-frame-proof-desktop.jpg / start-frame-proof-portrait.jpg (left = decoded film frame 0, right = supplied frame). The fade from poster to film is now 150ms.

**375x667:** top framing (0%), no crop offset; headline 26px; short card labels "Tree removal" / "Palm trimming" (quote values unchanged); tighter card padding. Palm crown and worker are fully visible in the palm frame; headline sits below the house (h1 441–496px, quote 501–545, cards 553–606, hero ends 616 at the Call/Text bar). 390x844 layout unchanged.

**Breakpoint change (390 → 1280 wide, same tab):** exactly one new source requested after the change (portrait then desktop, never both at load).
- While paused at 6.1s: new desktop film at 6.14s, still paused, Play shown; did not resume.
- While playing at 6.0s: continued at the same story position on the desktop film (8.6s after ~2.6s).
- In both, the last frame is held on a canvas until the new film presents a frame; every 50ms sample during the swap had a visible image (no dark gap). See breakpoint-swap-*.jpg.

**Forced-block mock (explicit fallback test only, play() always rejects):** Play button shown, quote button and both service choices present.

**Throttled compiled cold load (pass 3, before the first-view change):** React quote button 10.5s, poster 11.1s, first film frame 12.5s. Superseded by pass 4 above.

## Earlier passes (still valid, Vite dev server)
Reduced motion (no film fetched until Play), failed film request (poster stays, no control, no dark layer), manual pause sticks through scroll/tab, offscreen/hidden-tab pause and resume, quote links preselect "Tree Removal" / "Palm Tree Trimming" without submitting, menu routes: see qa-playback.json / qa-edge-cases.json. Edge-*.jpg and mobile-menu.jpg are from that pass and show the earlier poster image. 1440x640 was not re-run in pass 3.

## Remaining limits
- Not run: real iPhone Safari (incl. Low Power Mode autoplay), real Android, real cellular, production CDN timings.
- During a breakpoint swap the held frame is the previous film's composition shown with cover framing for up to ~1s on this machine before the new film's frame appears.
- Desktop film is 5.9 MB; on slow links the poster carries the hero until it buffers.
