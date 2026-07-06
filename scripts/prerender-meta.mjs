#!/usr/bin/env node
/**
 * Post-build SEO prerender.
 *
 * For every route in `src/seo/routes.data.mjs`, copy `dist/index.html`
 * to `dist/<route>/index.html` and rewrite the <head> so that non-JS
 * crawlers (Googlebot, Facebook, X, LinkedIn, Slack) see per-page
 * <title>, meta description, canonical, Open Graph, Twitter cards, and
 * robots directives without needing to execute the SPA.
 *
 * The runtime <SEOHead> still runs and overwrites the head client-side
 * with the same values (both sides source from routeMeta) so there is
 * no drift.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const indexPath = path.join(distDir, "index.html");

const { rawRoutes, SITE_ORIGIN, DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_ALT } = await import(
  path.join(projectRoot, "src", "seo", "routes.data.mjs")
);
const { writeSitemap } = await import(
  path.join(projectRoot, "scripts", "generate-sitemap.mjs")
);

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function upsertMeta(html, matcher, replacement) {
  if (matcher.test(html)) {
    return html.replace(matcher, replacement);
  }
  return html.replace(/<\/head>/i, `  ${replacement}\n</head>`);
}

function rewriteHead(html, meta) {
  const title = escapeAttr(meta.title);
  const description = escapeAttr(meta.description);
  const ogTitle = escapeAttr(meta.title);
  const ogDescription = escapeAttr(meta.description);
  const ogImage = escapeAttr(meta.ogImage || DEFAULT_OG_IMAGE);
  const ogImageAlt = escapeAttr(meta.ogImageAlt || DEFAULT_OG_IMAGE_ALT);
  const canonical = escapeAttr(meta.canonical);
  const robots = meta.noindex ? "noindex, nofollow" : "index, follow";

  let out = html;

  // <title>
  if (/<title>[^<]*<\/title>/i.test(out)) {
    out = out.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
  } else {
    out = out.replace(/<\/head>/i, `  <title>${title}</title>\n</head>`);
  }

  // description
  out = upsertMeta(
    out,
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${description}">`,
  );

  // robots
  out = upsertMeta(
    out,
    /<meta\s+name=["']robots["'][^>]*>/i,
    `<meta name="robots" content="${robots}">`,
  );

  // canonical
  out = upsertMeta(
    out,
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${canonical}">`,
  );

  // Open Graph
  out = upsertMeta(
    out,
    /<meta\s+property=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${ogTitle}">`,
  );
  out = upsertMeta(
    out,
    /<meta\s+property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${ogDescription}">`,
  );
  out = upsertMeta(
    out,
    /<meta\s+property=["']og:image["'](?![^>]*:)[^>]*>/i,
    `<meta property="og:image" content="${ogImage}">`,
  );
  out = upsertMeta(
    out,
    /<meta\s+property=["']og:image:alt["'][^>]*>/i,
    `<meta property="og:image:alt" content="${ogImageAlt}">`,
  );
  out = upsertMeta(
    out,
    /<meta\s+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${canonical}">`,
  );
  out = upsertMeta(
    out,
    /<meta\s+property=["']og:type["'][^>]*>/i,
    `<meta property="og:type" content="${meta.ogType || "website"}">`,
  );

  // Twitter
  out = upsertMeta(
    out,
    /<meta\s+name=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${ogTitle}">`,
  );
  out = upsertMeta(
    out,
    /<meta\s+name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${ogDescription}">`,
  );
  out = upsertMeta(
    out,
    /<meta\s+name=["']twitter:image["'](?![^>]*:)[^>]*>/i,
    `<meta name="twitter:image" content="${ogImage}">`,
  );
  out = upsertMeta(
    out,
    /<meta\s+name=["']twitter:image:alt["'][^>]*>/i,
    `<meta name="twitter:image:alt" content="${ogImageAlt}">`,
  );

  return out;
}

function outPathFor(routePath) {
  if (routePath === "/") return indexPath;
  const rel = routePath.replace(/^\//, "").replace(/\/$/, "");
  return path.join(distDir, rel, "index.html");
}

async function main() {
  const template = await fs.readFile(indexPath, "utf8");
  const meta = rawRoutes.map((r) => ({
    path: r.path,
    title: r.title,
    description: r.description,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: DEFAULT_OG_IMAGE_ALT,
    canonical: `${SITE_ORIGIN}${r.path}`,
    ogType: "website",
    noindex: r.noindex === true,
  }));

  // Sanity: unique descriptions/paths
  const seenDesc = new Set();
  const seenPath = new Set();
  for (const m of meta) {
    if (seenPath.has(m.path)) throw new Error(`Duplicate path in routeMeta: ${m.path}`);
    if (seenDesc.has(m.description)) throw new Error(`Duplicate description: ${m.path}`);
    seenPath.add(m.path);
    seenDesc.add(m.description);
  }

  let written = 0;
  for (const m of meta) {
    const target = outPathFor(m.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    const rewritten = rewriteHead(template, m);
    await fs.writeFile(target, rewritten, "utf8");
    written += 1;
  }

  console.log(
    `[prerender-meta] wrote ${written} per-route index.html files (of ${meta.length} routes)`,
  );

  // Also (re)generate the sitemap into dist/ from the same source of truth,
  // so the shipped bundle matches whatever routes just got prerendered.
  const sitemapPath = path.join(distDir, "sitemap.xml");
  const sitemapXml = await writeSitemap({ outFile: sitemapPath });
  console.log(`[prerender-meta] wrote dist/sitemap.xml (${sitemapXml.entries} entries)`);
}

main().catch((err) => {
  console.error("[prerender-meta] FAILED:", err);
  process.exit(1);
});