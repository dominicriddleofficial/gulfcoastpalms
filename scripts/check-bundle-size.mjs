#!/usr/bin/env node
/**
 * Bundle-size performance budget enforcement.
 *
 * Reads dist/assets/*.js and fails (exit 1) when any budget is exceeded.
 * Budgets are intentionally a little above current sizes so normal churn
 * passes but real regressions break the build.
 *
 * Sizes are raw bytes. Run AFTER `vite build`.
 */
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { join } from "node:path";

const DIST = "dist/assets";

if (!existsSync(DIST)) {
  console.error(`[bundle-budget] ${DIST} not found. Run \`vite build\` first.`);
  process.exit(1);
}

/**
 * Budgets matched by prefix (first match wins). All sizes in bytes (gzip).
 * Keep these tight — raise only with intentional perf review.
 */
const BUDGETS = [
  { pattern: /^index-/,            label: "entry (index)",       gzipMax: 110_000 },
  { pattern: /^vendor-react-/,     label: "vendor: react",       gzipMax: 60_000 },
  { pattern: /^vendor-supabase-/,  label: "vendor: supabase",    gzipMax: 60_000 },
  { pattern: /^vendor-motion-/,    label: "vendor: motion",      gzipMax: 45_000 },
  { pattern: /^vendor-ui-/,        label: "vendor: radix-ui",    gzipMax: 40_000 },
  { pattern: /^vendor-icons-/,     label: "vendor: icons",       gzipMax: 20_000 },
  { pattern: /^vendor-query-/,     label: "vendor: react-query", gzipMax: 25_000 },
  { pattern: /^AreaChart-/,        label: "chunk: charts",       gzipMax: 120_000 },
  { pattern: /^PlatformSchedule-/, label: "chunk: schedule",     gzipMax: 70_000 },
  // Catch-all: any single async chunk should stay reasonable.
  { pattern: /.*/,                 label: "any chunk",           gzipMax: 150_000 },
];

// Aggregate budgets
const TOTAL_JS_GZIP_MAX = 1_400_000;        // ~1.4 MB gzipped total app JS
const TOTAL_INITIAL_GZIP_MAX = 280_000;     // entry + react vendor combined

const files = readdirSync(DIST)
  .filter((f) => f.endsWith(".js"))
  .map((f) => {
    const full = join(DIST, f);
    const buf = readFileSync(full);
    return {
      name: f,
      raw: statSync(full).size,
      gzip: gzipSync(buf, { level: 9 }).length,
      brotli: brotliCompressSync(buf).length,
    };
  });

const failures = [];
let totalGzip = 0;
let initialGzip = 0;

const seen = new Set();
for (const file of files) {
  totalGzip += file.gzip;
  if (/^index-/.test(file.name) || /^vendor-react-/.test(file.name)) {
    initialGzip += file.gzip;
  }
  for (const b of BUDGETS) {
    if (b.pattern.test(file.name)) {
      seen.add(b.label);
      if (file.gzip > b.gzipMax) {
        failures.push(
          `${file.name} (${b.label}): ${kb(file.gzip)} gz > budget ${kb(b.gzipMax)} gz`,
        );
      }
      break;
    }
  }
}

if (totalGzip > TOTAL_JS_GZIP_MAX) {
  failures.push(`TOTAL JS: ${kb(totalGzip)} gz > budget ${kb(TOTAL_JS_GZIP_MAX)} gz`);
}
if (initialGzip > TOTAL_INITIAL_GZIP_MAX) {
  failures.push(
    `INITIAL JS (entry + react vendor): ${kb(initialGzip)} gz > budget ${kb(TOTAL_INITIAL_GZIP_MAX)} gz`,
  );
}

// Pretty report (always print so CI logs are useful even on success).
const sorted = [...files].sort((a, b) => b.gzip - a.gzip);
console.log("\n[bundle-budget] dist/assets/*.js (sorted by gzip):");
for (const f of sorted.slice(0, 25)) {
  console.log(
    `  ${f.name.padEnd(48)} raw=${kb(f.raw).padStart(8)}  gz=${kb(f.gzip).padStart(8)}  br=${kb(f.brotli).padStart(8)}`,
  );
}
console.log(`\n  total chunks: ${files.length}`);
console.log(`  total gzip:   ${kb(totalGzip)}  (budget ${kb(TOTAL_JS_GZIP_MAX)})`);
console.log(`  initial gzip: ${kb(initialGzip)}  (budget ${kb(TOTAL_INITIAL_GZIP_MAX)})`);

if (failures.length) {
  console.error("\n[bundle-budget] ❌ Performance budget exceeded:");
  for (const line of failures) console.error("  - " + line);
  console.error("\nFix the regression or — if intentional — bump the budget in scripts/check-bundle-size.mjs after review.");
  process.exit(1);
}

console.log("\n[bundle-budget] ✅ All budgets within limits.");

function kb(n) {
  return (n / 1024).toFixed(1) + " KB";
}