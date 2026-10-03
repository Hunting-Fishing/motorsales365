# Build Caching (Vite)

Configured in [`vite.config.ts`](../vite.config.ts).

| Layer  | Purpose                                                                 | Path                       |
| ------ | ----------------------------------------------------------------------- | -------------------------- |
| Vite   | Pre-bundled deps (esbuild) + transform cache                            | `node_modules/.cache/vite` |
| Rollup | In-memory per-chunk cache during a single watch/dev session (automatic) | (memory only)              |

- `cacheDir: "node_modules/.cache/vite"` pins Vite's dep-optimizer manifest
  and transform cache so CI and local match; it is wiped whenever
  dependencies are reinstalled and ignored by git via `node_modules`.
- `optimizeDeps.holdUntilCrawlEnd: false` lets Vite ship cached optimized
  deps immediately on startup instead of waiting for a full crawl.

Note: earlier versions of this doc described Nitro `storage`/`devStorage`
options passed through `tanstackStart.nitro`. TanStack Start does not accept
a `nitro` key, so those settings were silently ignored and have been removed
from the config; build output is unchanged.

## Build

```sh
npm ci --legacy-peer-deps
npm run build          # production → .output/ (Cloudflare Worker + assets)
npm run build:dev      # development-mode build
```

## When to clear the cache

Clear `node_modules/.cache` if you see stale optimized deps or odd HMR
behaviour after switching branches: `rm -rf node_modules/.cache`.
