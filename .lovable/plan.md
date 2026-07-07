
## Goal

Jocelyn's screenshot shows the personal referral QR on `/dashboard/referral` rendered nearly edge‑to‑edge on her phone, with a very thin white border. When someone else tries to scan that off her screen (or off a screenshot she forwards), the QR often fails because there is not enough "quiet zone" (white margin) around the code — scanners need clear white space on all four sides.

Make the QR forgiving of imperfect framing on mobile, without changing any business logic (referral tracking, storage, promotions all stay identical).

## Scope

One file: `src/routes/dashboard.referral.tsx`, specifically the `ReferralQrCard` component and the fullscreen QR dialog. No route, data, or auth changes.

## Changes

1. Card thumbnail (small QR on the dashboard)
   - Add a large, always‑white padded frame around the QR so there is a real quiet zone even when the card is narrow on mobile.
   - Cap the QR itself to a comfortable size on phones (e.g. ~72–80% of the card width) and center it — the remaining space becomes guaranteed white margin.
   - Turn on `includeMargin` on `QRCodeCanvas` so the encoded PNG download itself also has a proper quiet zone.
   - Keep the "tap to open full screen" behaviour and hover hint.

2. Fullscreen QR dialog (what Jocelyn actually shows to the scanner)
   - Make the dialog mobile‑first: `w-[95vw] max-w-md sm:max-w-lg`, safe padding, scroll disabled.
   - Wrap the QR in a large white panel with generous padding (e.g. `p-6 sm:p-10`) and rounded corners so the code is visually isolated from the page chrome / status bar / bottom nav that appear in phone screenshots.
   - Size the QR responsively: use a CSS width like `min(78vw, 420px)` so it never touches the screen edges regardless of phone size, orientation, or browser UI.
   - Add a short helper line under the QR: "Ask the scanner to fit the whole white square in their camera."
   - Keep the name, referral code, link, and Download PNG button.

3. PNG download
   - Rebuild the download from a fresh offscreen `QRCodeCanvas` render at a fixed high resolution (e.g. 1024×1024) with `includeMargin` so the downloaded/shared image is high‑DPI and has its own quiet zone — independent of whatever size the on‑screen canvas happens to be.

4. Accessibility / semantics
   - Preserve existing `aria-label` on the trigger, add `role="img"` + `aria-label={\`QR code for ${fullName}\`}` on the QR wrapper, keep `DialogTitle` (visually hidden if needed) so Radix a11y doesn't warn.

## Out of scope

- `share-qr.tsx`, `listing-qr.tsx`, poster route (`/r/$code/poster`), and QR ad composer are unchanged.
- No changes to referral tracking, Supabase queries, promotions, KPIs, or storage.
- No copy changes to headers, KPIs, or "My promotions" section.

## Technical notes

- QR quiet zone: QR spec requires ≥ 4 modules of white on every side. `qrcode.react` provides this via `includeMargin`; the card view currently passes `includeMargin={false}` which is the root cause.
- Responsive sizing uses inline `style={{ width: "min(78vw, 420px)", height: "min(78vw, 420px)" }}` because Tailwind arbitrary values don't compose `min()` cleanly for both axes.
- Offscreen render for download: mount a hidden `QRCodeCanvas` at 1024px inside the dialog (or via a ref‑only container) and read its canvas — avoids sampling the small thumbnail.
