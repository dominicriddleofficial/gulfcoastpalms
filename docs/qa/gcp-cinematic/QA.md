# GCP cinematic homepage preview – QA (unpublished)

Route `/preview/cinematic-home`: noindex,nofollow, canonical `/`, not in sitemap, not tracked. Root `/` source and metadata unchanged. Full build + SEO check (72 pages, 67 sitemap URLs), typecheck and 17 focused player/preview tests pass.

## Pass 3 (current) – compiled build, default autoplay
**Environment:** `npm run build` output (`dist/`) served by a local static server on 127.0.0.1:4173; the `/__l5e/` film/image paths are passed through to the project asset path. Headless Chromium 147 (Playwright), Linux sandbox, **launched with no autoplay-policy flag and no play()/gesture patch**. Phones emulated (is_mobile, touch, DPR 2). Not real production hosting, not Safari, not a real device.

| Viewport | Poster painted | First film frame | Default autoplay | Poster file | Film | MP4 requests | Dropped/total |
|---|---|---|---|---|---|---|---|
| 390x844 | 0.92s | 1.84s | started (muted inline) | first-frame-portrait-720.avif, 92 KB | portrait 720 | 1 | 0/372 |
| 1440x900 | 0.53s | 1.49s | started | first-frame-1600.avif, 174 KB | desktop 1600 (5.9 MB) | 1 | 3/372 |
| 375x667 | 0.63s | 1.84s | started | first-frame-portrait-720.avif | portrait 720 | 1 | 0/372 |
Times from navigation start, unthrottled local network (qa-production-build.json). Each ran palm (4.6s) → removal (10.6s) → ended at 15.5s holding the last frame with Replay.

**Posters = exact first frames.** The supplied PNGs are pixel-identical to frame 0 decoded with ffmpeg (mean diff 0.0). Encoded as AVIF/WebP/JPEG: desktop 960/1280/1600w (1600x904), portrait 480/720w (720x1276, not upscaled). In-browser poster vs film frame 0 mean difference is ~2.8/255 per channel (lossy compression only). Proofs: start-frame-proof-desktop.jpg / start-frame-proof-portrait.jpg (left = decoded film frame 0, right = supplied frame). The fade from poster to film is now 150ms.

**375x667:** top framing (0%), no crop offset; headline 26px; short card labels "Tree removal" / "Palm trimming" (quote values unchanged); tighter card padding. Palm crown and worker are fully visible in the palm frame; headline sits below the house (h1 441–496px, quote 501–545, cards 553–606, hero ends 616 at the Call/Text bar). 390x844 layout unchanged.

**Breakpoint change (390 → 1280 wide, same tab):** exactly one new source requested after the change (portrait then desktop, never both at load).
- While paused at 6.1s: new desktop film at 6.14s, still paused, Play shown; did not resume.
- While playing at 6.0s: continued at the same story position on the desktop film (8.6s after ~2.6s).
- In both, the last frame is held on a canvas until the new film presents a frame; every 50ms sample during the swap had a visible image (no dark gap). See breakpoint-swap-*.jpg.

**Forced-block mock (explicit fallback test only, play() always rejects):** Play button shown, quote button and both service choices present.

**Throttled compiled cold load, 390x844, 1.6 Mbps / 150 ms (CDP emulation, cache off):** quote button 10.5s, poster 11.1s, first film frame 12.5s; poster and quote come before the film (slow-mobile-poster-before-film.jpg). Relative order is meaningful; absolute numbers are emulation only.

## Earlier passes (still valid, Vite dev server)
Reduced motion (no film fetched until Play), failed film request (poster stays, no control, no dark layer), manual pause sticks through scroll/tab, offscreen/hidden-tab pause and resume, quote links preselect "Tree Removal" / "Palm Tree Trimming" without submitting, menu routes: see qa-playback.json / qa-edge-cases.json. Edge-*.jpg and mobile-menu.jpg are from that pass and show the earlier poster image. 1440x640 was not re-run in pass 3.

## Remaining limits
- Not run: real iPhone Safari (incl. Low Power Mode autoplay), real Android, real cellular, production CDN timings.
- During a breakpoint swap the held frame is the previous film's composition shown with cover framing for up to ~1s on this machine before the new film's frame appears.
- Desktop film is 5.9 MB; on slow links the poster carries the hero until it buffers.
