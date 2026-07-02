# Build Caching (Nitro + Vite)

We persist build artifacts from both Nitro (SSR / Cloudflare Worker bundler)
and Vite (client bundler + dep optimizer) so repeated `build` / `build:dev`
runs skip work for anything that hasn't changed. Configured in
[`vite.config.ts`](../vite.config.ts).

## What's cached and where

All cache directories live under `node_modules/.cache/` so they're wiped
whenever dependencies are reinstalled, and they're already ignored by git
via the standard `node_modules` rule.

| Layer         | Purpose                                                                 | Path                                  |
| ------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| Vite          | Pre-bundled deps (esbuild) + transform cache                            | `node_modules/.cache/vite`            |
| Nitro (prod)  | Rendered routes, chunk metadata, and prerender output for `build`       | `node_modules/.cache/nitro/build`     |
| Nitro (dev)   | Same as above but for `build:dev` / dev server                          | `node_modules/.cache/nitro/build-dev` |
| Rollup        | In-memory per-chunk cache during a single watch/dev session (automatic) | (memory only)                         |

## Relevant config

```ts
// vite.config.ts
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
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
    cacheDir: "node_modules/.cache/vite",
    optimizeDeps: { holdUntilCrawlEnd: false },
  },
});
```

- `tanstackStart.nitro.storage.build` → Nitro's production `build:` storage
  namespace, backed by the `fs` driver. Survives across `build` runs.
- `tanstackStart.nitro.devStorage.build` → same namespace for dev builds so
  `build:dev` and the dev server don't collide with production output.
- `vite.cacheDir` → explicit path for Vite's dep-optimizer manifest and
  transform cache (default is also `node_modules/.vite`, but we pin it so
  CI and local match).
- `optimizeDeps.holdUntilCrawlEnd: false` → lets Vite ship the cached
  optimized deps immediately on startup instead of waiting for a full crawl.

## Reproducing the faster builds

1. `bun install` (once per dependency change).
2. First `bun run build` / `bun run build:dev` populates the caches — expect
   normal cold-build times.
3. Subsequent builds reuse `node_modules/.cache/vite` and
   `node_modules/.cache/nitro/*` and should be substantially faster,
   especially for incremental route/component edits.

## When to clear the cache

Clear if you see stale SSR output, "ghost" routes, or dep-optimizer errors
after a major upgrade:

```bash
rm -rf node_modules/.cache/vite node_modules/.cache/nitro
```

Reinstalling deps (`rm -rf node_modules && bun install`) also clears
everything because the caches live inside `node_modules/`.

## CI note

To get the same speedup in CI, cache the `node_modules/.cache/` directory
between runs (keyed on the lockfile + a short cache-version salt so you can
bust it manually when needed).
