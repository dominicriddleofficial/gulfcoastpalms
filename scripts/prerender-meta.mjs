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
import os from "node:os";
import { build as esbuild } from "esbuild";

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

const NOT_FOUND_TITLE = "Page Not Found | Gulf Coast Palms";
const NOT_FOUND_DESCRIPTION =
  "That page doesn't exist. Browse Gulf Coast Palms palm tree trimming, removal and installation services across Northwest Florida, or call (850) 910-1290.";

/**
 * Bundle `src/seo/staticContent.ts` (and the data modules it imports) into a
 * temporary ESM file we can import from this Node script. Image imports are
 * stubbed — only text copy is needed here.
 */
async function loadStaticContent() {
  const outFile = path.join(
    await fs.mkdtemp(path.join(os.tmpdir(), "gcp-seo-")),
    "static-content.mjs",
  );
  await esbuild({
    entryPoints: [path.join(projectRoot, "src", "seo", "staticContent.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: outFile,
    logLevel: "silent",
    plugins: [
      {
        name: "stub-assets",
        setup(b) {
          // Any non-code asset import (images, fonts, css) resolves to a stub.
          b.onResolve({ filter: /\.(png|jpe?g|webp|avif|svg|gif|css)(\?.*)?$/ }, (args) => ({
            path: args.path,
            namespace: "asset-stub",
          }));
          b.onLoad({ filter: /.*/, namespace: "asset-stub" }, () => ({
            contents: 'export default "";',
            loader: "js",
          }));
          // Resolve the project's `@` / `@img` aliases.
          b.onResolve({ filter: /^@img\// }, (args) => ({
            path: args.path,
            namespace: "asset-stub",
          }));
          b.onResolve({ filter: /^@\// }, async (args) => {
            const result = await b.resolve("./" + args.path.slice(2), {
              resolveDir: path.join(projectRoot, "src"),
              kind: "import-statement",
            });
            if (result.errors.length) return { errors: result.errors };
            return { path: result.path, external: result.external };
          });
        },
      },
    ],
  });
  const mod = await import(`file://${outFile}`);
  return mod.buildStaticContent();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Strip the light markdown markers used in some copy strings. */
function plain(text) {
  return String(text).replace(/\*\*/g, "").replace(/^##\s*/, "").trim();
}

function isMarkdownHeading(text) {
  return /^##\s+/.test(String(text));
}

function renderParagraphs(paragraphs, out) {
  for (const p of paragraphs) {
    if (!p) continue;
    if (isMarkdownHeading(p)) {
      out.push(`<h3>${escapeHtml(plain(p))}</h3>`);
    } else {
      out.push(`<p>${escapeHtml(plain(p))}</p>`);
    }
  }
}

/**
 * Render a route's marketing copy as plain semantic markup. This is placed
 * inside #root, so React's `createRoot().render()` replaces it wholesale on
 * mount — no hydration, therefore no hydration-mismatch warnings.
 */
function renderStaticContent(content) {
  if (!content) return "";
  const out = [];
  out.push(`<h1>${escapeHtml(plain(content.h1))}</h1>`);
  if (content.subheading) out.push(`<p>${escapeHtml(plain(content.subheading))}</p>`);
  for (const block of content.blocks || []) {
    if (block.heading) out.push(`<h2>${escapeHtml(plain(block.heading))}</h2>`);
    if (block.paragraphs) renderParagraphs(block.paragraphs, out);
    if (block.list && block.list.length) {
      out.push(
        `<ul>${block.list.map((li) => `<li>${escapeHtml(plain(li))}</li>`).join("")}</ul>`,
      );
    }
  }
  return `<div id="seo-static-content" style="max-width:760px;margin:0 auto;padding:24px 16px;line-height:1.6">${out.join(
    "",
  )}</div>`;
}

function injectBody(html, markup) {
  if (!markup) return html;
  // The built index.html ships an empty <div id="root"></div>.
  return html.replace(
    /<div id="root">\s*<\/div>/i,
    `<div id="root">${markup}</div>`,
  );
}

/**
 * The host's SPA fallback serves dist/index.html (the homepage document) for
 * any unmatched URL with HTTP 200, so an unknown path would otherwise inherit
 * homepage head tags. This blocking inline script — parsed before the app
 * bundle and before first paint — rewrites the head to the 404 variant and
 * drops the homepage static copy whenever the path is not a real route.
 */
function unknownRouteScript(knownPaths) {
  const known = JSON.stringify(knownPaths);
  return `<script>(function(){try{var known=${known};var p=location.pathname.replace(/\\/+$/,"")||"/";if(known.indexOf(p)!==-1)return;if(p.indexOf("/platform")===0||p.indexOf("/portal")===0||p.indexOf("/admin")===0)return;document.title=${JSON.stringify(
    NOT_FOUND_TITLE,
  )};var r=document.querySelector('meta[name="robots"]');if(r)r.setAttribute("content","noindex, nofollow");var d=document.querySelector('meta[name="description"]');if(d)d.setAttribute("content",${JSON.stringify(
    NOT_FOUND_DESCRIPTION,
  )});var c=document.querySelector('link[rel="canonical"]');if(c&&c.parentNode)c.parentNode.removeChild(c);var ou=document.querySelector('meta[property="og:url"]');if(ou&&ou.parentNode)ou.parentNode.removeChild(ou);var ot=document.querySelector('meta[property="og:title"]');if(ot)ot.setAttribute("content",${JSON.stringify(
    NOT_FOUND_TITLE,
  )});document.addEventListener("DOMContentLoaded",function(){var s=document.getElementById("seo-static-content");if(s&&s.parentNode)s.parentNode.removeChild(s);});}catch(e){}})();</script>`;
}

/** Build the standalone dist/404.html document (no canonical, noindex). */
function buildNotFoundDoc(template) {
  let out = rewriteHead(template, {
    path: "/404",
    title: NOT_FOUND_TITLE,
    description: NOT_FOUND_DESCRIPTION,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: DEFAULT_OG_IMAGE_ALT,
    canonical: "",
    ogType: "website",
    noindex: true,
  });
  // No canonical and no og:url on the 404 document.
  out = out.replace(/\s*<link\s+rel=["']canonical["'][^>]*>/gi, "");
  out = out.replace(/\s*<meta\s+property=["']og:url["'][^>]*>/gi, "");
  return injectBody(
    out,
    renderStaticContent({
      h1: "We couldn't find that page",
      subheading: NOT_FOUND_DESCRIPTION,
      blocks: [],
    }),
  );
}

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
  const staticContent = await loadStaticContent();
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
  let withContent = 0;
  const knownPaths = meta.map((m) => (m.path === "/" ? "/" : m.path.replace(/\/+$/, "")));
  const fallbackScript = unknownRouteScript(knownPaths);

  for (const m of meta) {
    const target = outPathFor(m.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    let rewritten = rewriteHead(template, m);
    const markup = renderStaticContent(staticContent[m.path]);
    if (markup) withContent += 1;
    rewritten = injectBody(rewritten, markup);
    // Only the root document doubles as the host's SPA fallback for unknown
    // URLs, so the unknown-route head correction goes there.
    if (m.path === "/") {
      rewritten = rewritten.replace(/<\/head>/i, `  ${fallbackScript}\n</head>`);
    }
    await fs.writeFile(target, rewritten, "utf8");
    written += 1;
  }

  console.log(
    `[prerender-meta] wrote ${written} per-route index.html files (of ${meta.length} routes)`,
  );
  console.log(
    `[prerender-meta] injected static body copy on ${withContent}/${meta.length} routes`,
  );

  // Standalone 404 document — harmless if the host ignores it.
  await fs.writeFile(path.join(distDir, "404.html"), buildNotFoundDoc(template), "utf8");
  console.log("[prerender-meta] wrote dist/404.html (noindex, no canonical)");

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