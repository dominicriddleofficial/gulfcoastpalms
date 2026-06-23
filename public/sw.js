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
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL).catch(() => {
        // Non-critical: shell URLs may not respond during install
      })
    )
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

  // Platform navigation: network-first, fall back to cached shell for offline.
  // The app shell must always come from the network when online so the HTML
  // references the freshest hashed asset filenames after a deploy.
  if (isPlatformNavigation(request, url)) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return resp;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || caches.match('/platform') || offlineFallback()
          )
        )
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
