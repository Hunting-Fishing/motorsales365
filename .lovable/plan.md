## Why QR-Ads are slow today

`TemplateCard` calls `composeTemplate` per card, which on every card does:

1. Fetches and decodes the **template image** (`new Image()` + network) — the same image is re-fetched/decoded for every card that uses it. With 9+ cards on a category, that's 9+ identical decodes.
2. Generates a **fresh QR code** via `QRCode.toDataURL` at H-level error correction and `width ≥ 512` — but every card on the page uses the **same `context.link`** (your referral URL), so the QR is identical for every card and is being recomputed every time.
3. Exports the canvas with **`canvas.toDataURL("image/png")`** — this is synchronous, blocks the main thread, and produces a multi‑megabyte base64 string that the browser then has to re-decode to display in an `<img>`. This is the single biggest visible delay ("Rendering…" sits while the main thread is frozen encoding PNGs).
4. A `MAX_CONCURRENT_RENDERS = 4` limiter keeps it serial-ish, but because each unit of work is heavy, the queue drains slowly.

Net effect: even though work is lazy + intersection-observed, every card pays full cost as it enters the viewport.

## Fix (frontend only, no backend changes)

### 1. Module-level base-image cache in `src/lib/qr-ads/compose.ts`
- Add `const baseImageCache = new Map<string, Promise<HTMLImageElement | ImageBitmap>>()` keyed by `template.imageUrl` (and a separate cache for SVG keyed by `template.id + serialized ctx` since SVG output depends on context).
- `loadImage` becomes a thin wrapper that consults the cache so the same URL is fetched + decoded **once per session**.
- Prefer `createImageBitmap(blob)` over `new Image()` when available — faster, decodes off the main thread.

### 2. Shared QR-code cache
- Add `const qrCache = new Map<string, Promise<HTMLImageElement | ImageBitmap>>()` keyed by `link` (size is normalized to one large bucket, e.g. 1024px, since we always scale on draw).
- Generate the QR **once per `context.link`**, reuse across every card. This alone removes ~N-1 `QRCode.toDataURL` calls per page.

### 3. Replace `toDataURL` with blob URLs
- In `TemplateCard`, after `composeTemplate`, do `canvas.toBlob(...)` → `URL.createObjectURL(blob)` and feed that into `<img src>`. Massive win: no base64 encode, no second decode, async, off main thread.
- Track the URL in a ref and `URL.revokeObjectURL` on unmount / when a new preview is generated to avoid leaks.

### 4. Pre-warm on page mount
- In `dashboard.qr-ads.tsx`, once `context` is available, kick off:
  - one QR generation (`prewarmQr(context.link)`),
  - parallel `prewarmBase(url)` for every unique built-in `template.imageUrl` that's in the current filter.
- This is fire-and-forget (no await on render path); it just primes the caches so `TemplateCard` effects hit warm caches.

### 5. Raise concurrency
- With caches warm and `toBlob` async, per-card work is small. Raise `MAX_CONCURRENT_RENDERS` from 4 → 8 (configurable constant). Keep the limiter so we don't spam `toBlob` on mobile.

### 6. Keep download/share paths working
- `getBlob()` in `TemplateCard` should keep using a real `canvas` ref (kept for full-resolution downloads). We still store the canvas — we just stop using `toDataURL` for the on-screen preview.

## Files touched

- `src/lib/qr-ads/compose.ts` — add `loadBaseImage(template, ctx)`, `loadQrImage(link, sizeBucket)`, `prewarmBase`, `prewarmQr`; rewrite `composeTemplate` to use them; switch QR draw path to use cached image directly rather than `QRCode.toDataURL` + `loadImage` every call.
- `src/components/qr-ads/template-card.tsx` — swap `toDataURL` for `toBlob` + `URL.createObjectURL`; revoke on unmount/replace; raise `MAX_CONCURRENT_RENDERS` to 8.
- `src/routes/dashboard.qr-ads.tsx` — once `context` + `allTemplatesUnfiltered` are ready, call `prewarmQr(context.link)` and `prewarmBase` for each unique built-in `imageUrl` in a `useEffect`.

## Out of scope (intentionally)

- No server-side image generation / job queue — current architecture renders in the browser per user and that's correct (each user's QR differs). Caching + blob URLs eliminate the perceived delay without that complexity.
- No change to admin upload / template management flow.
- SVG-kind templates still re-render per ctx (rare; the heavy ones in the screenshot are image-kind).

## Expected result

First card paints visibly faster (no per-card PNG encode), and every subsequent card in the same category is near-instant because the base image and QR are already decoded in memory.
