import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { imagetools } from "vite-imagetools";
import { visualizer } from "rollup-plugin-visualizer";

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
