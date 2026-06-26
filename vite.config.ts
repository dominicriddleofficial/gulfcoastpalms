import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { imagetools } from "vite-imagetools";
import { visualizer } from "rollup-plugin-visualizer";

// Cold-start Wave 3 — Fix #1 + Fix #2.
//
// On a /platform load, the entry chunk's `lazy(() => import(...))` calls for
// PlatformDashboard / PlatformLayout are only discovered AFTER the entry has
// downloaded + executed, creating a serial round-trip before the real UI
// mounts. This plugin:
//
//   (1) Injects <link rel="modulepreload"> hints into the built index.html
//       for the hashed PlatformDashboard + PlatformLayout chunks so the
//       browser fetches them in parallel with the entry + vendor chunks.
//   (2) Emits dist/asset-manifest.json listing the critical hashed assets
//       (entry, CSS, vendor-*, PlatformDashboard, PlatformLayout) so the
//       service worker can precache them on install — making the next cold
//       start instant even right after a deploy (which otherwise wipes the
//       previous build's cache via the build-id cache name).
//
// Robust to hashed filenames because it reads them straight from the
// rollup bundle at build time. If the chunk shape changes (e.g. a chunk
// renamed) the matchers below just skip — no preload is injected and the
// SW falls back to opportunistic caching. Behavior degrades, not breaks.
function platformPreloadAndManifestPlugin() {
  const CRITICAL_VENDOR_CHUNKS = [
    "vendor-react",
    "vendor-query",
    "vendor-ui",
    "vendor-icons",
    "vendor-supabase",
  ];
  // Lazy chunks on the /platform critical path. Names come from the
  // default Vite chunk-naming (`<ComponentName>-<hash>.js`).
  const CRITICAL_PLATFORM_CHUNKS = ["PlatformDashboard", "PlatformLayout"];

  type ChunkLike = {
    type: "chunk" | "asset";
    fileName: string;
    isEntry?: boolean;
    name?: string;
  };

  function collectCriticalAssets(bundle: Record<string, ChunkLike>) {
    let entryJs: string | null = null;
    let entryCss: string | null = null;
    const vendors: string[] = [];
    const platformChunks: string[] = [];

    for (const file of Object.values(bundle)) {
      if (file.type === "chunk") {
        if (file.isEntry && file.fileName.endsWith(".js") && !entryJs) {
          entryJs = file.fileName;
        }
        const baseName = (file.name ?? "").trim();
        if (CRITICAL_VENDOR_CHUNKS.includes(baseName)) {
          vendors.push(file.fileName);
        }
        if (CRITICAL_PLATFORM_CHUNKS.includes(baseName)) {
          platformChunks.push(file.fileName);
        }
      } else if (file.type === "asset") {
        // The entry stylesheet ends up under assets/index-<hash>.css.
        if (
          !entryCss &&
          /^assets\/index-[^/]+\.css$/.test(file.fileName)
        ) {
          entryCss = file.fileName;
        }
      }
    }

    return { entryJs, entryCss, vendors, platformChunks };
  }

  return {
    name: "platform-preload-and-manifest",
    apply: "build" as const,
    enforce: "post" as const,

    // Inject modulepreload hints for the platform chunks into index.html.
    transformIndexHtml: {
      order: "post" as const,
      handler(html: string, ctx: { bundle?: Record<string, ChunkLike> }) {
        if (!ctx.bundle) return html;
        const { platformChunks } = collectCriticalAssets(ctx.bundle);
        if (platformChunks.length === 0) return html;

        const tags = platformChunks
          .map(
            (file) =>
              `<link rel="modulepreload" crossorigin href="/${file}">`,
          )
          .join("\n    ");

        // Insert just before </head>. If </head> is missing for any
        // reason, return the HTML unchanged rather than corrupting it.
        if (!html.includes("</head>")) return html;
        return html.replace("</head>", `    ${tags}\n  </head>`);
      },
    },

    // Emit dist/asset-manifest.json next to the bundle.
    generateBundle(_options: unknown, bundle: Record<string, ChunkLike>) {
      const { entryJs, entryCss, vendors, platformChunks } =
        collectCriticalAssets(bundle);

      const precache: string[] = [];
      if (entryJs) precache.push(`/${entryJs}`);
      if (entryCss) precache.push(`/${entryCss}`);
      for (const f of vendors) precache.push(`/${f}`);
      for (const f of platformChunks) precache.push(`/${f}`);

      const manifest = {
        // Schema version — bump if the shape changes so old SWs can refuse.
        version: 1,
        entry: entryJs ? `/${entryJs}` : null,
        css: entryCss ? `/${entryCss}` : null,
        vendors: vendors.map((f) => `/${f}`),
        platform: platformChunks.map((f) => `/${f}`),
        precache,
      };

      // emitFile writes into Vite's outDir alongside the rest of the
      // bundle, so this lands at dist/asset-manifest.json without any
      // direct filesystem coupling.
      // @ts-expect-error — `this` is the rollup PluginContext at runtime.
      this.emitFile({
        type: "asset",
        fileName: "asset-manifest.json",
        source: JSON.stringify(manifest, null, 2),
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    // Build-time identifier injected into client code. Used to version the
    // service worker registration URL (and, via its query string, the SW's
    // own cache names) so every deploy installs a fresh SW and purges
    // previous-build caches.
    __BUILD_ID__: JSON.stringify(
      process.env.BUILD_ID || String(Date.now())
    ),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    imagetools(),
    mode === "development" && componentTagger(),
    platformPreloadAndManifestPlugin(),
    // Bundle analyzer — outputs dist/stats.html when ANALYZE=1 is set.
    // Run with: ANALYZE=1 bun run build
    process.env.ANALYZE === "1" &&
      visualizer({
        filename: "dist/stats.html",
        template: "treemap",
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@img": path.resolve(__dirname, "./src/assets"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-motion": ["framer-motion"],
          "vendor-icons": ["lucide-react"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-popover",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-accordion",
            "@radix-ui/react-select",
          ],
        },
      },
    },
    target: "es2020",
    cssCodeSplit: true,
    minify: "esbuild",
    cssMinify: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "lucide-react",
      "@supabase/supabase-js",
    ],
  },
}));
