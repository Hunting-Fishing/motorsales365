// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Stamp every build with a unique id so the service worker can bust its
// offline cache on each deploy without us editing public/sw.js by hand.
const BUILD_ID = `${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    // Persist Nitro's build artifacts between runs so unchanged routes/chunks
    // don't have to be re-rendered/re-bundled on every build.
    nitro: {
      storage: {
        build: { driver: "fs", base: "node_modules/.cache/nitro/build" },
      },
      devStorage: {
        build: { driver: "fs", base: "node_modules/.cache/nitro/build-dev" },
      },
    },
  },
  vite: {
    // Explicit cacheDir so Vite's dep-optimizer + transform cache is reused.
    cacheDir: "node_modules/.cache/vite",
    define: {
      __BUILD_ID__: JSON.stringify(BUILD_ID),
    },
    build: {
      // Keep Rollup's per-chunk cache across builds (faster re-bundles).
      cache: true,
    },
    optimizeDeps: {
      // Persist pre-bundled deps across restarts.
      holdUntilCrawlEnd: false,
    },
  },
});
