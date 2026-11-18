import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    // Same two shortcuts as vite.config.ts, so tests can load the real page data
    // (photos come through as plain file paths here, which is all a test needs).
    alias: { "@": path.resolve(__dirname, "./src"), "@img": path.resolve(__dirname, "./src/assets") },
  },
});
