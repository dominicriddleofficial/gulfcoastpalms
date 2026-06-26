// Field Ops Service Worker
// Scope: /platform only. The public website is intentionally NOT cached so it
// continues to behave as a normal website with no offline shell.
//
// Update strategy:
//   * The registration URL is `/sw.js?v=<BUILD_ID>` (see src/main.tsx). Every
//     deploy ships a new BUILD_ID, so the browser fetches a byte-different
//     SW script and runs install -> activate for the new version.
//   * The cache name embeds that same `v` so a freshly-activated SW deletes
//     every cache that does not belong to the current build — rescuing
//     clients that were previously stuck on stale cache-first assets.
//   * install() calls skipWaiting() and activate() calls clients.claim() so
//     the new SW takes over open tabs immediately; the registration code
//     then triggers a single guarded reload so users land on fresh code
//     without manually clearing cache.

const SW_VERSION =
  new URL(self.location.href).searchParams.get('v') || 'field-ops-dev';
const CACHE_NAME = `field-ops-${SW_VERSION}`;
const APP_SHELL = ['/platform', '/platform/login'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // App shell HTML — best-effort, same as before.
      await cache.addAll(APP_SHELL).catch(() => {
        // Non-critical: shell URLs may not respond during install
      });

      // Precache hashed entry + vendor + platform chunks listed in
      // /asset-manifest.json (emitted at build time by the
      // platform-preload-and-manifest Vite plugin). This makes the next
      // cold start serve them from disk even immediately after a deploy,
      // since the build-id cache name otherwise wipes the previous
      // build's opportunistically-cached assets on activate.
      //
      // All failures fall back silently to the existing opportunistic
      // caching in the fetch handler so a missing/changed manifest never
      // breaks install.
      try {
        const resp = await fetch('/asset-manifest.json', { cache: 'no-cache' });
        if (resp && resp.ok) {
          const manifest = await resp.json();
          const urls = Array.isArray(manifest && manifest.precache)
            ? manifest.precache.filter(
                (u) => typeof u === 'string' && u.startsWith('/'),
              )
            : [];
          if (urls.length) {
            // addAll is atomic — if any one fails the whole call rejects.
            // Use individual puts so a single 404 (e.g. a chunk renamed
            // between manifest fetch and asset fetch) doesn't void the
            // entire precache.
            await Promise.all(
              urls.map((url) =>
                fetch(url, { credentials: 'same-origin' })
                  .then((r) => (r && r.ok ? cache.put(url, r) : null))
                  .catch(() => null),
              ),
            );
          }
        }
      } catch {
        // Manifest unavailable (older deploy, network blip) — skip
        // precache; fetch handler still warms the cache opportunistically.
      }
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Purge every cache from previous builds (and any cache shape from
      // older SW versions). Only the current versioned cache survives.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isPlatformNavigation(request, url) {
  return request.mode === 'navigate' && url.pathname.startsWith('/platform');
}

// Vite emits hashed filenames like `index-ab12cd34.js` for built assets.
// Those are content-addressed and safe to serve cache-first; their URL
// changes whenever the bytes change.
function isHashedAsset(url) {
  return (
    /\/assets\//.test(url.pathname) &&
    /-[A-Za-z0-9_-]{8,}\.(?:js|mjs|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|ico)$/.test(
      url.pathname
    )
  );
}

function isStaticAsset(url) {
  return /\.(?:js|mjs|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never touch Supabase, edge functions, OAuth, analytics, or non-platform pages.
  if (url.pathname.startsWith('/~oauth')) return;

  // Platform navigation: stale-while-revalidate. Serve the cached app shell
  // immediately for an instant cold-start paint (critical on weak cellular),
  // and refresh the cache in the background so the next launch has fresh HTML.
  //
  // Staleness is bounded by the existing build-id update mechanism:
  //   * The SW is registered as `/sw.js?v=<BUILD_ID>` (src/main.tsx), so a
  //     new deploy installs a new SW with a new CACHE_NAME.
  //   * On activate, the new SW calls clients.claim(), which fires
  //     `controllerchange` in the page and triggers a one-time reload so
  //     users land on the fresh build automatically.
  // The first paint after a deploy may briefly come from the previous build's
  // cache, then the update mechanism rolls the page onto fresh code.
  if (isPlatformNavigation(request, url)) {
    event.respondWith(
      (async () => {
        const cached =
          (await caches.match(request)) || (await caches.match('/platform'));

        const networkPromise = fetch(request)
          .then((resp) => {
            if (resp && resp.ok) {
              const clone = resp.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, clone))
                .catch(() => {});
            }
            return resp;
          })
          .catch(() => null);

        if (cached) {
          // Don't await — let the revalidation run in the background.
          event.waitUntil(networkPromise);
          return cached;
        }

        const network = await networkPromise;
        if (network) return network;
        return offlineFallback();
      })()
    );
    return;
  }

  // Hashed build assets: cache-first — their filename includes a content
  // hash, so a stale entry can never serve outdated code for a new build.
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((resp) => {
            if (resp.ok) {
              const clone = resp.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return resp;
          })
      )
    );
    return;
  }

  // Other static assets (unhashed files in /public, icons, manifests):
  // network-first so deployed updates replace stale copies.
  if (isStaticAsset(url)) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return resp;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((resp) => {
              if (resp.ok) {
                const clone = resp.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
              }
              return resp;
            });
          })
        )
    );
    return;
  }
  // Everything else (public website pages, API calls): pass through.
});

function offlineFallback() {
  return new Response(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title></head><body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#1A1A1A;color:#e8e8e8"><div style="text-align:center;padding:24px"><h1 style="color:#1B5E20">📶 Offline</h1><p>Field Ops will reconnect automatically when you have signal.</p></div></body></html>',
    { headers: { 'Content-Type': 'text/html' } }
  );
}
