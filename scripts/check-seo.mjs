#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { JSDOM } from "jsdom";
import { rawRoutes, buildRouteMeta, SITE_ORIGIN } from "../src/seo/routes.data.mjs";

const routes = buildRouteMeta();
const knownPaths = new Set(routes.map((route) => route.path));
const sitemap = new JSDOM(await fs.readFile("dist/sitemap.xml", "utf8"), { contentType: "text/xml" });
const urls = [...sitemap.window.document.querySelectorAll("loc")].map((node) => node.textContent);
const expected = rawRoutes.filter((r) => !r.noindex && (!r.canonicalPath || r.canonicalPath === r.path)).map((r) => `${SITE_ORIGIN}${r.path}`);
assert.deepEqual(urls.sort(), expected.sort(), "Sitemap must contain exactly the canonical, indexable pages");
assert.equal(urls.length, new Set(urls).size, "Duplicate sitemap URLs");

for (const route of routes) {
  const filename = route.path === "/" ? "dist/index.html" : `dist${route.path}/index.html`;
  const dom = new JSDOM(await fs.readFile(filename, "utf8"));
  const doc = dom.window.document;
  const one = (selector) => {
    assert.equal(doc.querySelectorAll(selector).length, 1, `${route.path}: expected one ${selector}`);
    return doc.querySelector(selector);
  };
  assert.equal(one("title").textContent, route.title);
  assert.equal(one('meta[name="description"]').content, route.description);
  assert.equal(one('meta[property="og:title"]').content, route.title);
  assert.equal(one('meta[property="og:description"]').content, route.description);
  assert.equal(one('meta[name="twitter:title"]').content, route.title);
  assert.equal(one('meta[name="robots"]').content.includes("noindex"), route.noindex);
  assert.ok(one("h1").textContent.trim(), `${route.path}: empty heading`);
  assert.ok(doc.querySelector('#seo-static-content a[href="/quote"]'), `${route.path}: missing crawlable quote link`);
  assert.ok(!doc.body.textContent.includes("[PRICE]"), `${route.path}: placeholder price`);
  if (route.noindex) {
    assert.equal(doc.querySelectorAll('link[rel="canonical"]').length, 0);
    assert.equal(doc.querySelectorAll('script[type="application/ld+json"]').length, 0);
  } else {
    assert.equal(one('link[rel="canonical"]').getAttribute("href"), route.canonical);
    assert.equal(one('meta[property="og:url"]').content, route.canonical);
  }
  for (const link of doc.querySelectorAll('#seo-static-content a[href^="/"]')) {
    const path = new URL(link.getAttribute("href"), SITE_ORIGIN).pathname;
    assert.ok(knownPaths.has(path), `${route.path}: broken internal link ${path}`);
  }
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    const data = JSON.parse(script.textContent);
    if (data["@type"] === "HomeAndConstructionBusiness") {
      assert.equal(data["@id"], `${SITE_ORIGIN}/#business`);
      assert.ok(!data.aggregateRating && !data.geo && !data.openingHoursSpecification);
    }
    if (data["@type"] === "BreadcrumbList") {
      for (const item of data.itemListElement) {
        assert.ok(knownPaths.has(new URL(item.item).pathname), `${route.path}: nonexistent breadcrumb ${item.item}`);
      }
    }
  }
  dom.window.close();
}

// Exercise the shipped fallback script without loading analytics or making requests.
const home = await fs.readFile("dist/index.html", "utf8");
for (const path of ["/platform", "/platform/leads", "/portal", "/pay/test/invoice", "/quote/gcp/example", "/employee/gulf-coast-palms/sop/team-leader", "/does-not-exist", "/quote", "/careers/gulf-coast-palms/team-leader"]) {
  const dom = new JSDOM(home, { url: `${SITE_ORIGIN}${path}`, runScripts: "outside-only" });
  const doc = dom.window.document;
  dom.window.eval(doc.querySelector("script[data-gcp-route-guard]").textContent);
  doc.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  const publicPage = knownPaths.has(path);
  assert.equal(doc.querySelector('meta[name="robots"]').content.includes("noindex"), !publicPage, `Fallback indexing: ${path}`);
  if (!publicPage) {
    assert.equal(doc.querySelectorAll('link[rel="canonical"], #seo-static-content, script[type="application/ld+json"]').length, 0, `Homepage leakage: ${path}`);
    assert.equal(doc.title.includes("Page Not Found"), path === "/does-not-exist", `Private route mislabeled: ${path}`);
  }
  dom.window.close();
}
console.log(`[seo-check] PASS: ${routes.length} pages, ${urls.length} canonical sitemap URLs, metadata, content, links, schema and private/404 fallback rules`);
