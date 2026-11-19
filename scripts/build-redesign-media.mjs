#!/usr/bin/env node
/**
 * Photo crops for the redesigned public site.
 *
 * Run by hand after changing a crop or swapping a source photo:
 *   node scripts/build-redesign-media.mjs
 * The output is committed, so the normal build never depends on this script.
 *
 * Two kinds of output:
 *  - public/media/redesign/*  Files for the opening screen at fixed addresses. The opening
 *    photo is requested from the page's first HTML, before the app's JavaScript exists,
 *    so its address cannot carry a build hash.
 *  - src/assets/redesign/*    Cropped sources. Pages import these through vite-imagetools,
 *    which makes the responsive sizes and formats at build time.
 *
 * Every source is a real Gulf Coast Palms job photo in src/assets (the ones under
 * facebook/ came from the business's own Facebook page). Nothing is generated,
 * retouched or enlarged. Crop boxes are in source pixels.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "src", "assets");
const PUBLIC_OUT = path.join(root, "public", "media", "redesign");
const ASSET_OUT = path.join(root, "src", "assets", "redesign");
const PREVIEW_OUT = path.join(root, "src", "redesign", "styles", "hero-preview.css");

/**
 * The opening photo's stand-in: the night photo shrunk to a few dozen pixels and written into a
 * small stylesheet as text. The page's first HTML carries that stylesheet, so the very
 * first frame already has the sky and the palms in their places, drawn soft; the real
 * photo then arrives on top of it. Without this the top of the opening screen is blank
 * until the photo has downloaded, which on a weak signal is a couple of seconds.
 *
 * It is the same photo and the same crop, only tiny.
 */
const PREVIEW = { width: 32, soften: 0.6, quality: 48 };

/**
 * Opening-screen files (fixed public addresses, AVIF with a JPEG fallback).
 *
 * The opening shows the work in one framed panel with two scenes, both the owner's own:
 *   - hero-night: the white condo building after dark, its palms lit from below
 *     (src/assets/owner/condo-night.jpg, the camera file).
 *   - hero-air:   the waterfront estate from the air. This is the first frame of the drone
 *     clip that then plays in the panel (src/assets/owner/estate-from-the-air.jpg), so the
 *     still and the moving picture join without a jump.
 * Both are cut four wide by five tall and never enlarged. Phones show the middle of each
 * as a square (see .rd-reel__stage in first-view.css).
 *
 * The clip itself is made once by hand, from the owner's drone video, with ffmpeg:
 *   ffmpeg -ss 7 -t 7 -i drone.mov -an -vf "crop=1080:1352:0:300,scale=540:676,fps=24,format=yuv420p" \
 *     -c:v libx264 -preset veryslow -crf 31 -g 48 -movflags +faststart public/media/redesign/hero-air-540.mp4
 *   ffmpeg -ss 7 -t 7 -i drone.mov -an -vf "crop=1080:1350:0:300,scale=720:900,fps=24,format=yuv420p" \
 *     -c:v libx264 -preset veryslow -crf 32 -g 48 -movflags +faststart public/media/redesign/hero-air-720.mp4
 * Seven seconds, no sound, about 0.9 MB for phones and 1.4 MB for wide screens. It is
 * fetched only after the page has finished loading, and never on a data-saving connection.
 */
const FIRST_VIEW = [
  { name: "hero-night", preview: true, source: "owner/condo-night.jpg", box: { left: 0, top: 410, width: 1242, height: 1552 }, widths: [660, 990, 1242], quality: 42 },
  { name: "hero-air", source: "owner/estate-from-the-air.jpg", box: { left: 0, top: 300, width: 1080, height: 1350 }, widths: [540, 720, 1080], quality: 38 },
];

/** Cropped sources for imagetools (high-quality JPEG; the build makes the web sizes). */
const CROPS = [
  // Palm route: Canary Island date palm with its cut base, the row of sabals and the house at dusk.
  { name: "palm-canary-home", source: "gallery/job-8.jpeg", box: { left: 0, top: 110, width: 1400, height: 1250 } },
  // Diamond cutting detail: the date palm crown down to its cut base.
  { name: "palm-canary-tall", source: "gallery/job-8.jpeg", box: { left: 250, top: 150, width: 800, height: 1200 } },
  // Palm trimming: two sabal crowns and the pindo, roofline kept for scale.
  { name: "palm-sabals-yard", source: "gallery/job-9.jpeg", box: { left: 0, top: 200, width: 1400, height: 1250 } },
  // Trunk skinning, close up: boots left under the crown, fresh orange trunk, older grey trunk below.
  { name: "skinning-detail", source: "trunk-skinning.jpg", box: { left: 200, top: 560, width: 520, height: 690 } },
  // Trunk skinning, tall: the lead palm from crown to ladder.
  { name: "skinning-tall", source: "trunk-skinning.jpg", box: { left: 80, top: 230, width: 1000, height: 1500 } },
  // Commercial: the row of trimmed palms along the road, parked cars cropped off.
  { name: "commercial-row", source: "gallery/job-10.jpeg", box: { left: 0, top: 60, width: 1350, height: 1060 } },
  // Commercial: the waterfront estate from the air, neighbouring roof trimmed off.
  { name: "estate-aerial", source: "gallery/job-2.jpeg", box: { left: 0, top: 380, width: 1082, height: 1300 } },
  // Residential: the coastal home and its palms, without the empty road in front.
  { name: "home-coastal", source: "gallery/job-1.jpeg", box: { left: 0, top: 330, width: 1206, height: 960 } },
  // Cleanup: the crew truck and loaded dump trailer in the driveway.
  { name: "trailer-loaded", source: "trunk-skinning.jpg", box: { left: 800, top: 1150, width: 640, height: 520 } },
  // Condo at night: lit palms across the front, dark sky and driveway trimmed.
  { name: "condo-night", source: "gallery/job-11.jpeg", box: { left: 0, top: 560, width: 1080, height: 1000 } },
  // Climber and the crown he is working on, with the saw on its lanyard.
  { name: "climber-close", source: "facebook/climber-sabal.jpg", box: { left: 360, top: 440, width: 853, height: 1066 } },
  // Crew clearing fronds by the pool, without the empty sky above.
  { name: "crew-pool-yard", source: "facebook/crew-pool-yard.jpg", box: { left: 0, top: 560, width: 1152, height: 976 } },
  // The date palm by the paver drive, before the work: cut so the trunk is the same size and
  // in the same place as in the finished photo (owner/date-palm-drive-after.jpg, used whole).
  { name: "date-palm-drive-before", source: "owner/date-palm-drive-before.jpg", box: { left: 209, top: 138, width: 1210, height: 1614 } },
];

async function main() {
  await fs.mkdir(PUBLIC_OUT, { recursive: true });
  await fs.mkdir(ASSET_OUT, { recursive: true });
  const report = {};
  let preview = "";

  for (const item of FIRST_VIEW) {
    let base = sharp(path.join(SRC, item.source)).rotate();
    if (item.box) base = base.extract(item.box);
    const { data, info } = await base.toBuffer({ resolveWithObject: true });
    const entry = { width: info.width, height: info.height, files: [] };
    for (const w of item.widths) {
      const resized = sharp(data).resize({ width: Math.min(w, info.width), withoutEnlargement: true });
      const avif = path.join(PUBLIC_OUT, `${item.name}-${w}.avif`);
      const jpg = path.join(PUBLIC_OUT, `${item.name}-${w}.jpg`);
      await resized.clone().avif({ quality: item.quality ?? 52, effort: 6 }).toFile(avif);
      await resized.clone().jpeg({ quality: 76, mozjpeg: true, progressive: true }).toFile(jpg);
      const [a, j] = await Promise.all([fs.stat(avif), fs.stat(jpg)]);
      entry.files.push({ w, avif: a.size, jpg: j.size });
    }
    if (item.preview) {
      const tiny = await sharp(data).resize({ width: PREVIEW.width }).blur(PREVIEW.soften).webp({ quality: PREVIEW.quality, effort: 6 }).toBuffer();
      preview = `data:image/webp;base64,${tiny.toString("base64")}`;
      entry.preview = { bytes: tiny.length };
    }
    report[item.name] = entry;
  }

  await fs.writeFile(
    PREVIEW_OUT,
    [
      "/* Made by scripts/build-redesign-media.mjs from the opening photo. Do not edit by hand:",
      "   change the crop there and run the script. See the note on PREVIEW in that file. */",
      `.rd-reel__stage { --rd-hero-pre: url("${preview}"); }`,
      "",
    ].join("\n"),
  );

  for (const item of CROPS) {
    let img = sharp(path.join(SRC, item.source)).rotate();
    if (item.box) img = img.extract(item.box);
    const out = path.join(ASSET_OUT, `${item.name}.jpg`);
    const info = await img.jpeg({ quality: 90, mozjpeg: true }).toFile(out);
    report[item.name] = { width: info.width, height: info.height, bytes: info.size };
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
