# Responsive QR Component

Ship one shared `<ResponsiveQr>` component that every QR rendering site uses, so the "canvas intrinsic size forces the parent wider than the viewport" bug can't come back on any page — including ones we haven't fixed yet.

## The rule the component enforces

A `<canvas>` (and to a lesser extent `<img>`) contributes its **intrinsic pixel size** as min-content in flex/grid layouts. `qrcode.react`'s `<QRCodeCanvas size={512} />` therefore tries to make every ancestor ≥ 512px, and `style={{width:'100%'}}` only clips it *after* layout is decided. The fix used on `/dashboard/referral` was ad-hoc (`min-w-0` on parents + `grid-cols-[minmax(0,1fr)]`). We codify it in the component itself.

## Component API

`src/components/qr/responsive-qr.tsx`

```text
<ResponsiveQr
  value="https://…"
  level="H"                   // "L" | "M" | "Q" | "H"; default "H"
  maxPx={512}                 // hard cap on rendered size; default 512
  minPx={128}                 // never render smaller; default 128
  quietZone="auto"            // "auto" (uses computeQuietZoneModules) | number
  imageSettings={...}         // optional logo overlay, passed through
  className=""                // wrapper classes
  aria-label="…"
  data-qr="…"                 // for tests
/>
```

Renders a wrapper that:

1. Measures its own width with a `ResizeObserver`.
2. Picks a rendered pixel size = `clamp(minPx, floor(container-width), maxPx)`, rounded to the nearest QR module count to keep modules crisp.
3. Renders `QRCodeCanvas` with `size={pickedPx}` and inline `style={{ width: pickedPx, height: pickedPx, maxWidth: '100%', display: 'block' }}`.
4. The wrapper itself is `inline-block max-w-full min-w-0` with `aspect-square` only when consumers want it (opt-in via `aspectSquare` prop) — otherwise it sizes to the canvas.
5. Sets `containIntrinsicSize` / `contain: 'size layout'` so the canvas cannot influence grid track sizing during initial layout before the observer fires; a small SSR placeholder (`minPx` square) shows for the first frame to avoid layout jump.
6. Zero horizontal contribution: the wrapper's `min-width: 0` is set inline as a style prop (not just a Tailwind class) so it applies even in styling-hostile environments.

Result: the canvas can never push its parent wider than the container it's placed in — even inside a raw CSS grid with no `minmax(0,1fr)`.

## Utility for downloadable PNGs

Downloads still need a large (1024–2048px) PNG regardless of on-screen size. Add a paired helper:

```text
src/lib/qr-image.ts
  renderQrPng({ value, sizePx, level, quietZone }): Promise<string>  // wraps qrcode.toDataURL
```

Consumers keep calling this for "Download PNG" buttons. The on-screen `<ResponsiveQr>` no longer does double duty as a print asset.

## Migration — one PR, one component per call site

Replace direct `QRCodeCanvas` / hand-rolled `<img>` renders in these files with `<ResponsiveQr>`:

- `src/routes/dashboard.referral.tsx` (both the card trigger and the fullscreen dialog inside `<ZoomableQr>`)
- `src/routes/my-qr.tsx`
- `src/routes/r.$code.qr.tsx`
- `src/routes/r.$code.poster.tsx` (kept fixed-size for print; opts in via `maxPx={900} minPx={900}`)
- `src/routes/dashboard.qr-scan-test.tsx`
- `src/routes/dashboard.partner-program.tsx`
- `src/routes/admin.referrals.tsx`
- `src/components/share-qr.tsx`
- `src/components/listing-qr.tsx`
- `src/components/admin/staff-qr-dialog.tsx`

`ZoomableQr` keeps working — it just wraps `<ResponsiveQr>` and lets the child render at its natural size while the transform handles zoom/pan.

The ad-hoc `min-w-0` / `grid-cols-[minmax(0,1fr)]` patches added on `/dashboard/referral` last turn are left in place (belt-and-suspenders) but are no longer required for correctness once the component ships.

## Verification

- Manual: load `/dashboard/referral`, `/my-qr`, `/r/<code>/qr` at 360, 390, 414 px. Confirm QR fits, no page horizontal scroll, canvas rendered size matches container width (checked via DevTools).
- Playwright smoke: one new test `e2e/qr-responsive.spec.ts` that visits each of those routes at 360×780 and asserts:
  - no element right-edge exceeds 360px,
  - the QR canvas width equals its wrapper width,
  - the QR canvas is a perfect square.
  This is the minimum needed to prevent this specific regression; the broader mobile audit suite is a separate ask.

## Out of scope

- No visual/design changes (colors, borders, layout order).
- No new tablet/desktop coverage.
- No admin-only pages beyond `admin.referrals.tsx` (already listed) and `staff-qr-dialog.tsx`.
- No changes to the download filename, ECC defaults, or quiet-zone math.
- Not touching print/poster/ad-composer PNG generation paths beyond wiring them to `renderQrPng`.

Approve and I'll add `<ResponsiveQr>`, migrate the call sites, and land the smoke test.
