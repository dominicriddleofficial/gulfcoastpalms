// Field Ops Service Worker
// Scope: /platform only. The public website is intentionally NOT cached so it
// continues to behave as a normal website with no offline shell.

const CACHE_NAME = 'field-ops-v2';
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
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isPlatformNavigation(request, url) {
  return request.mode === 'navigate' && url.pathname.startsWith('/platform');
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

  // Static assets: network-first so deployed fixes replace stale bundled code.
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
