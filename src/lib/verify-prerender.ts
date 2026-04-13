/**
 * Prerender.io Verification Instructions
 * 
 * Prerender.io serves fully rendered HTML to search engine crawlers
 * so Google can index your React SPA content properly.
 * 
 * IMPORTANT: Prerender.io requires middleware at the CDN/hosting level
 * to intercept crawler requests. On Lovable hosting, this is NOT automatic.
 * 
 * To fully enable Prerender.io, you need one of these approaches:
 * 
 * Option A — Cloudflare Worker (recommended with custom domain):
 *   1. Point your custom domain (gulfcoastpalmservices.com) through Cloudflare
 *   2. Add a Cloudflare Worker that detects crawler user agents
 *   3. Proxy crawler requests to service.prerender.io/YOUR_URL
 *   4. Return the pre-rendered HTML to the crawler
 * 
 * Option B — Prerender.io Cloudflare Integration:
 *   1. Go to prerender.io/dashboard → Integration
 *   2. Select "Cloudflare" and follow their one-click setup
 *   3. This automatically adds the worker to your Cloudflare zone
 * 
 * Option C — Custom domain with hosting that supports middleware:
 *   Deploy to Netlify/Vercel with their Prerender.io integrations
 * 
 * ─── VERIFICATION ───
 * 
 * To verify Prerender.io is working after setup:
 * 
 * 1. Go to https://search.google.com/search-console/
 * 2. Enter any page URL and click "Test Live URL"
 * 3. Click "View Tested Page" then "HTML" tab
 * 4. Your page content should be fully visible in the HTML
 * 5. If you only see <div id="root"></div> the page is not prerendered
 * 
 * Alternatively run in browser console:
 * 
 * fetch('https://service.prerender.io/https://gulfcoastpalmservices.com/', {
 *   headers: { 'X-Prerender-Token': 'YOUR_TOKEN_HERE' }
 * }).then(r => r.text()).then(html => console.log(html.slice(0, 1000)))
 * 
 * The output should show full HTML with page title and content.
 * If it just shows <div id="root"></div>, prerender is not active.
 * 
 * ─── PAGES TO PRERENDER ───
 * 
 * Public marketing pages (prerender these):
 *   /
 *   /services, /services/palm-tree-trimming, /services/palm-tree-removal, etc.
 *   /palm-tree-trimming-navarre-fl, /palm-tree-trimming-pensacola-fl, etc.
 *   /hoa-commercial-palm-maintenance
 *   /hurricane-palm-preparation
 *   /emergency-palm-service
 *   /holiday-lighting
 *   /palm-tree-cost
 *   /palm-tree-maintenance-plans
 *   /about, /gallery, /learn/*, /palm-trees/*
 * 
 * Do NOT prerender (authenticated/internal):
 *   /platform/*, /admin/*, /ops/*, /pay/*, /quote/*
 */

export const PRERENDER_PUBLIC_PATHS = [
  '/',
  '/services',
  '/services/palm-tree-trimming',
  '/services/palm-tree-removal',
  '/services/palm-diamond-cutting',
  '/services/palm-tree-trunk-skinning',
  '/services/palm-tree-installation',
  '/services/tree-trimming-removal',
  '/services/landscaping-services',
  '/palm-tree-trimming-navarre-fl',
  '/palm-tree-trimming-gulf-breeze-fl',
  '/palm-tree-trimming-pensacola-fl',
  '/palm-tree-trimming-fort-walton-beach-fl',
  '/palm-tree-trimming-destin-fl',
  '/palm-tree-trimming-30a-fl',
  '/palm-tree-trimming-perdido-key-fl',
  '/palm-tree-trimming-niceville-fl',
  '/palm-tree-trimming-mary-esther-fl',
  '/palm-tree-trimming-santa-rosa-beach-fl',
  '/palm-tree-trimming-pace-fl',
  '/palm-tree-trimming-milton-fl',
  '/hoa-commercial-palm-maintenance',
  '/hurricane-palm-preparation',
  '/emergency-palm-service',
  '/holiday-lighting',
  '/palm-tree-cost',
  '/palm-tree-maintenance-plans',
  '/about',
  '/gallery',
  '/referral',
  '/service-areas',
  '/learn',
  '/learn/how-often-trim-palm-trees-florida',
  '/learn/palm-tree-turning-brown-florida',
  '/learn/palm-tree-hurricane-prep-florida',
  '/learn/how-to-tell-if-palm-tree-is-dead',
  '/learn/palm-tree-trimming-cost-florida',
  '/palm-trees/types',
  '/palm-trees/canary-island-date-palm',
  '/palm-trees/sabal-palm',
  '/palm-trees/pindo-palm',
  '/palm-trees/washingtonia-palm',
  '/palm-trees/mule-palm',
  '/palm-trees/buy',
  '/palm-trees/guides',
] as const;

export const PRERENDER_BLOCKED_PREFIXES = [
  '/platform',
  '/admin',
  '/ops',
  '/pay',
  '/quote',
  '/employee',
  '/app',
] as const;
