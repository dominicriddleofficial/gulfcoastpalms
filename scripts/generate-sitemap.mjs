#!/usr/bin/env node
/**
 * Sitemap generator — single source of truth is `src/seo/routes.data.mjs`.
 * Runs as `predev` / `prebuild` (writes public/sitemap.xml so Vite ships it)
 * and is re-invoked by `prerender-meta.mjs` post-build (writes dist/sitemap.xml
 * from the same data). Routes flagged `noindex: true` are excluded.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const { rawRoutes, SITE_ORIGIN } = await import(
  path.join(projectRoot, "src", "seo", "routes.data.mjs")
);

/**
 * Per-path metadata for sitemap fields. Anything not listed here inherits
 * sensible defaults (changefreq=monthly, priority=0.6).
 */
const OVERRIDES = {
  "/": { changefreq: "weekly", priority: "1.0" },
  "/services": { priority: "0.9" },
  "/emergency-palm-service": { changefreq: "weekly", priority: "0.9" },
  "/hurricane-palm-preparation": { priority: "0.85" },
  "/hoa-commercial-palm-maintenance": { priority: "0.85" },
  "/palm-tree-cost": { priority: "0.85" },
  "/palm-tree-maintenance-plans": { priority: "0.9" },
  "/gallery": { priority: "0.8" },
  "/learn": { priority: "0.85" },
  "/about": { priority: "0.7" },
  "/service-areas": { priority: "0.7" },
  "/jobs": { priority: "0.7" },
  "/terms-of-service": { changefreq: "yearly", priority: "0.3" },
  "/privacy-policy": { changefreq: "yearly", priority: "0.3" },
  "/text-consent": { changefreq: "yearly", priority: "0.3" },
};

function priorityFor(p) {
  if (OVERRIDES[p]?.priority) return OVERRIDES[p].priority;
  if (p.startsWith("/services/")) return "0.9";
  if (p.startsWith("/palm-tree-trimming-")) return "0.85";
  if (p.startsWith("/palm-trees/")) return "0.8";
  if (p.startsWith("/learn/")) return "0.75";
  if (p.startsWith("/careers/")) return "0.6";
  return "0.6";
}

function changefreqFor(p) {
  if (OVERRIDES[p]?.changefreq) return OVERRIDES[p].changefreq;
  return "monthly";
}

function renderXml(entries) {
  const urls = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${SITE_ORIGIN}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export async function writeSitemap({ outFile } = {}) {
  const indexable = rawRoutes.filter((r) => r.noindex !== true);
  const entries = indexable.map((r) => ({
    path: r.path,
    priority: priorityFor(r.path),
    changefreq: changefreqFor(r.path),
  }));
  const xml = renderXml(entries);
  const target = outFile || path.join(projectRoot, "public", "sitemap.xml");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, xml, "utf8");
  return { entries: entries.length, target, xml };
}

// Direct-invocation mode (predev / prebuild): write public/sitemap.xml.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { entries, target } = await writeSitemap();
  console.log(`[generate-sitemap] wrote ${target} (${entries} entries)`);
}
