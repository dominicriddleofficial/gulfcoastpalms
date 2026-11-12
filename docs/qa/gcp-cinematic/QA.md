# GCP cinematic homepage preview – real-film QA (unpublished)

Route: `/preview/cinematic-home` (noindex,nofollow; canonical `/`; not in sitemap; not tracked). Root `/` source and metadata untouched.

## Environment (be precise)
- Headless Chromium 147 (Playwright), Linux sandbox, local Vite **dev** server (unminified), films served from the project asset CDN path.
- Phone sizes emulated with `is_mobile`, touch, DPR 2. **No real-device iOS Safari or Android Chrome was run.**
- Autoplay: `--autoplay-policy=no-user-gesture-required` for the main runs; blocked autoplay simulated by rejecting `play()` until a user click.

## Films
| Device | File | Size | Spec verified with ffprobe |
|---|---|---|---|
| Desktop (≥768px) | canopy-film-desktop-1600.mp4 | 6,056,366 B | H.264 1600x904, 24fps, 15.5s, 372 frames, no audio, moov at start |
| Phone | canopy-film-portrait-720.mp4 | 3,175,149 B | H.264 720x1276, 24fps, 15.5s, 372 frames, no audio, moov at start |
Chapters from media time: property 0, palm 2.5, removal 8.5, reveal 14.0. playbackRate 1, no loop.

## Results (see qa-playback.json / qa-edge-cases.json)
| Viewport | Poster painted | First film frame | Poster transfer | Film transfer | MP4 requests | Dropped/total frames |
|---|---|---|---|---|---|---|
| 390x844 | 1.29s | 1.77s | 125 KB AVIF | ~3.1 MB | 1 (portrait only) | 1/372 |
| 375x667 | 1.62s | 2.06s | 125 KB AVIF | ~3.1 MB | 1 (portrait only) | 5/372 |
| 1440x900 | 1.64s | 2.34s | 264 KB AVIF | ~5.9 MB | 1 (desktop only) | 0/372 |
| 1440x640 | 1.25s | 1.61s | 264 KB AVIF | ~5.9 MB | 1 (desktop only) | 4/372 |
Times are from navigation start on the dev server; not production numbers.

All four sizes: autoplay started; palm chapter at 4.6s highlighted the Palm card, removal at 10.6s highlighted the Tree card; ended at 15.5s and held the final frame (still 15.5 after 1.5s), both cards settled, progress full, Replay shown; Replay restarted from 0; manual Pause held the frame (time unchanged after 1.2s) and stayed paused after scrolling away and back; when playing, offscreen and hidden-tab paused and returned; no horizontal overflow; no page errors.

Edge cases (390/375/1440): blocked autoplay → poster/first frame visible, real Play button, click plays. Reduced motion → no film downloaded until the visitor presses Play, then plays. Failed film request → poster stays, no control, no black layer, quote button + both service cards visible. Throttled 1.6 Mbps/150 ms → poster and quote shown before the film (dev server makes absolute times meaningless: ~31s poster, ~33s film).

Layout: phone hero ends exactly at the 52px Call/Text bar (no gap; bar gets safe-area padding via a preview-only wrapper). 375x667: headline 27px, call link hidden there (bar below covers calling), headline sits below the house in all four frames.

Quote links opened (nothing submitted): Tree card → `/quote?service=Tree+Removal&source=hero_cinematic_tree` preselects "Tree Removal"; Palm card → `...Palm+Tree+Trimming&source=hero_cinematic_palm` preselects "Palm Tree Trimming"; main button → `/quote`. Menu includes Home, Our work (/jobs), About, Buy Palm Trees, all service groups, guides and other shared-navbar routes.

Build: full `npm run build` passed incl. prerender + SEO check (72 pages, 67 sitemap URLs). Typecheck passed. 21 focused tests passed.

## Known limits / remaining quality notes
- Desktop poster is the earlier approved still; its framing differs slightly from the desktop film's first frame, so a soft 0.5s cross-fade is visible at start.
- 375x667 shows a small amount of driveway/lawn behind the cards; the film's palm crown is slightly trimmed at the top during the palm chapter on that size only (short-phone framing favours keeping the house clear of copy).
- Remaining console messages are pre-existing app-wide React dev warnings (forwardRef on App providers), not from the preview.
- Not verified: real iOS Safari/Low Power Mode autoplay, real cellular networks, production CDN timings.
