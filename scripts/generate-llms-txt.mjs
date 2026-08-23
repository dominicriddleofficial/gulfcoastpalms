#!/usr/bin/env node
/**
 * Emits public/llms.txt and public/llms-full.txt from the same data modules
 * the site renders from, so the AI-crawler summary can never drift from the
 * real pages. Facts only — no invented claims, ratings or awards.
 *
 * Run standalone (`node scripts/generate-llms-txt.mjs`) or imported by the
 * prerender step, which also copies the result into dist/.
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

async function loadData() {
  const outFile = path.join(
    await fs.mkdtemp(path.join(os.tmpdir(), "gcp-llms-")),
    "data.mjs",
  );
  await esbuild({
    stdin: {
      contents: `
        export { GCP_BUSINESS } from "@/lib/business-info";
        export { servicesData } from "@/data/services";
        export { locations } from "@/data/locations";
        export { homeFaqs } from "@/data/homeFaq";
      `,
      resolveDir: projectRoot,
      loader: "ts",
    },
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: outFile,
    logLevel: "silent",
    plugins: [
      {
        name: "stub-assets",
        setup(b) {
          b.onResolve({ filter: /\.(png|jpe?g|webp|avif|svg|gif|css)(\?.*)?$/ }, (a) => ({
            path: a.path,
            namespace: "asset-stub",
          }));
          b.onResolve({ filter: /^@img\// }, (a) => ({
            path: a.path,
            namespace: "asset-stub",
          }));
          b.onLoad({ filter: /.*/, namespace: "asset-stub" }, () => ({
            contents: 'export default "";',
            loader: "js",
          }));
          b.onResolve({ filter: /^@\// }, async (a) => {
            const r = await b.resolve("./" + a.path.slice(2), {
              resolveDir: path.join(projectRoot, "src"),
              kind: "import-statement",
            });
            if (r.errors.length) return { errors: r.errors };
            return { path: r.path, external: r.external };
          });
        },
      },
    ],
  });
  return import(`file://${outFile}`);
}

function oneLine(text) {
  return String(text).replace(/\s+/g, " ").trim();
}

export async function buildLlmsTxt() {
  const { GCP_BUSINESS, servicesData, locations, homeFaqs } = await loadData();
  const { ratingValue, reviewCount } = GCP_BUSINESS.aggregateRating;
  const site = GCP_BUSINESS.url;

  const head = [
    `# ${GCP_BUSINESS.name}`,
    "",
    `> Palm tree trimming, diamond cutting, trunk skinning, installation, removal and hurricane preparation across Northwest Florida's Emerald Coast.`,
    "",
    `${GCP_BUSINESS.legalName} is a palm-tree specialist serving Northwest Florida. Licensed and insured, with general liability insurance and workers' compensation coverage on every job. ${ratingValue} rating from ${reviewCount} five-star Google reviews.`,
    "",
    "## Contact",
    "",
    `- Phone / text: ${GCP_BUSINESS.phoneDisplay}`,
    `- Email: ${GCP_BUSINESS.email}`,
    `- Website: ${site}`,
    `- Base: ${GCP_BUSINESS.address.addressLocality}, ${GCP_BUSINESS.address.addressRegion}`,
    `- Hours: Monday–Saturday; storm and emergency calls answered seven days a week`,
    "",
    "## Service area",
    "",
    `${GCP_BUSINESS.areaServed.join(", ")} — Perdido Key to 30A.`,
    "",
    "## Services",
    "",
    ...servicesData.map(
      (s) => `- [${s.title}](/services/${s.slug}): ${oneLine(s.metaDescription)}`,
    ),
    "",
    "## City pages",
    "",
    ...locations.map(
      (l) => `- [Palm tree trimming in ${l.city}, ${l.state}](/${l.slug}): ${oneLine(l.subheading)}`,
    ),
    "",
    "## What makes us different",
    "",
    "- Palm specialists, not a generalist tree crew — trimming, diamond cutting and trunk skinning are core work, not add-ons.",
    "- Free quotes from a texted photo: send a photo to " +
      GCP_BUSINESS.phoneDisplay +
      " and we usually reply with a price the same day.",
    "- Proper technique: we remove dead fronds, seed pods and flower stalks — never healthy green fronds or the crown.",
    "- Full cleanup and haul-off included on every job, with before/after photos attached to the invoice.",
    "- HOA, condo and commercial programs with volume pricing, board reporting and priority hurricane response.",
    "",
    "## Optional",
    "",
    "- [Palm tree cost guide](/palm-tree-cost): Honest pricing information for trimming, diamond cutting, installation and removal.",
    "- [Maintenance plans](/palm-tree-maintenance-plans): Recurring scheduled palm maintenance and pre-hurricane trimming.",
    "- [Hurricane preparation](/hurricane-palm-preparation): Storm-season palm trimming and preparation.",
    "- [Emergency palm service](/emergency-palm-service): Storm damage response and insurance documentation.",
    "- [Learn](/learn): Palm care articles, trimming schedules and disease identification.",
    "",
  ];

  const faq = [
    "## Frequently asked questions",
    "",
    ...homeFaqs.flatMap((f) => [`### ${f.q}`, "", oneLine(f.a), ""]),
  ];

  return {
    short: head.join("\n"),
    full: [...head, ...faq].join("\n"),
  };
}

export async function writeLlmsTxt(outDir) {
  const { short, full } = await buildLlmsTxt();
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "llms.txt"), short, "utf8");
  await fs.writeFile(path.join(outDir, "llms-full.txt"), full, "utf8");
  return { shortLines: short.split("\n").length, fullLines: full.split("\n").length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const res = await writeLlmsTxt(path.join(projectRoot, "public"));
  console.log(
    `[llms-txt] wrote public/llms.txt (${res.shortLines} lines) and public/llms-full.txt (${res.fullLines} lines)`,
  );
}
