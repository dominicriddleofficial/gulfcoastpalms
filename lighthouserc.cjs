/**
 * Lighthouse CI config — Core Web Vitals budgets.
 *
 * Local:  bun run perf:lighthouse
 * CI:     runs in .github/workflows/perf.yml
 *
 * Failing assertions break the build. Tune in `assertions` below.
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: "bunx vite preview --port 4173 --strictPort",
      startServerReadyPattern: "Local:.*4173",
      url: [
        "http://localhost:4173/",
        "http://localhost:4173/services",
        "http://localhost:4173/quote",
      ],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        // Avoid noisy a11y/seo throttling-related flake on CI hardware.
        throttlingMethod: "simulate",
        skipAudits: ["uses-http2", "canonical"],
      },
    },
    assert: {
      // Per-URL overrides could go in assertMatrix if needed.
      assertions: {
        // Core Web Vitals — fail the build on regression.
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift":  ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time":      ["error", { maxNumericValue: 300 }],
        "first-contentful-paint":   ["error", { maxNumericValue: 1800 }],
        "speed-index":              ["warn",  { maxNumericValue: 3400 }],
        "interactive":              ["warn",  { maxNumericValue: 3800 }],

        // Category scores
        "categories:performance":   ["error", { minScore: 0.85 }],
        "categories:accessibility": ["warn",  { minScore: 0.9 }],
        "categories:best-practices":["warn",  { minScore: 0.9 }],
        "categories:seo":           ["warn",  { minScore: 0.9 }],

        // Resource budgets — covered by performance-budget.json below too.
        "resource-summary:script:size":     ["error", { maxNumericValue: 450_000 }],
        "resource-summary:stylesheet:size": ["error", { maxNumericValue: 80_000 }],
        "resource-summary:image:size":      ["warn",  { maxNumericValue: 600_000 }],
        "resource-summary:total:size":      ["error", { maxNumericValue: 1_800_000 }],

        "unused-javascript":        ["warn",  { maxLength: 5 }],
        "render-blocking-resources":["warn",  { maxLength: 2 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};