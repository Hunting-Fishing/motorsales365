## Goal

Swap the old 365 MotorSales logo and favicon for the two new uploaded files so every place the brand mark appears (header, share-kit ads, OG images, PWA, browser tab) shows the new artwork.

## Files being replaced

- New logo source: `user-uploads://365_MotorSales_Logo_2.png` (1242 × ~1242, transparent background)
- New favicon source: `user-uploads://ChatGPT_Image_Jun_1_2026_01_37_58_AM.ico`

## Steps

1. **Favicon** — overwrite `public/favicon.ico` with the new `.ico`. No code changes needed; `__root.tsx` already references `/favicon.ico`.

2. **Public logo** — overwrite `public/logo.png` with the new PNG (used in OG/social share fallbacks).

3. **App-bundled logo** (`src/assets/logo.png` and `src/assets/logo-small.webp`):
   - Replace `src/assets/logo.png` with the new PNG.
   - Regenerate `src/assets/logo-small.webp` from the new PNG, resized to ~256 px wide (keeps `BrandLogo` header crisp without bloating the bundle). This is the file `src/components/brand-logo.tsx` imports.

4. **Share-kit embedded logo** (`src/lib/share-kit/logo-data.ts`):
   - Regenerate the `LOGO_DATA_URL` Base64 string from the new PNG (downscaled to ~512 px webp so SVG ad templates stay light). This file is consumed by every generated advertisement in the staff Share Kit and referral pages, so all ads will pick up the new logo automatically.

5. **PWA icons** (`public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`):
   - Regenerate each from the new logo at the correct dimensions so the installed PWA, Android home-screen, and iOS bookmark all use the new mark. The maskable variant gets a small safe-area padding so it doesn't get clipped by Android's mask.

6. **Banner** — leave `public/banner.webp` / `banner.png` alone (those are hero/marketing banners, not the logo). Call out separately if you want them refreshed.

## Out of scope

- No changes to colors, layout, components, or any text.
- No DNS/domain/auth work.
- Brand text baked into share-kit SVG art ("365motorsales.com") stays as-is.

## Technical details

- Resizes done with ImageMagick (`nix run nixpkgs#imagemagick`) and `cwebp` (`nix run nixpkgs#libwebp`) inside the sandbox. No new runtime dependencies.
- `BrandLogo` import path (`@/assets/logo-small.webp`) and all `<img src="/logo.png">` / `<link rel="icon">` references stay identical — only the file contents change, so there's nothing to wire up in components.
- Estimated files touched: 8 binary replacements + 1 edit to `src/lib/share-kit/logo-data.ts`.
