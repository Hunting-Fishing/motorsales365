## Member Share Kit (personalized ads + QR)

Give signed-in staff (e.g. joan@365motorsales.com) a one-stop page where they can grab branded 365 Motor Sales advertisements with **their own referral QR + tracking link** automatically baked into every design.

Scope: **staff with a `staff_referrals` record** (same audience as `/my-qr`). Non-staff members get a polite "no code yet" state. Broadening to all members stays for a follow-up.

### New route: `/dashboard/share-kit`

Add a link to it from `/dashboard/referral` and `/my-qr` so Joan finds it from either entry point.

Page layout:
- Header: "Your Share Kit" + her name + active/inactive badge
- Gallery of **template cards** (4–6 to start), each shows a live preview with her QR composited in
- Each card: **Download PNG**, **Print A4 poster**, **Native share**, **Share to Facebook / Messenger / WhatsApp / X** quick links, **Copy link**

### Templates (mix of uploaded artwork + clean SVG variants)

1. **Rear Shirt Ad** — uses the uploaded `365_Rear_Shirt_Logo.png` as a background, QR composited bottom-right with a white plate + "Scan to shop · {firstName}" caption.
2. **Arm Band Ad** — uses `365_arm_band_ready_to_go_edit_no_sun.png`, QR replaces the placeholder QR area at the bottom (already sized for it).
3. **Clean SVG: Square Social** (1080×1080) — bold red/blue 365 wordmark, vehicle category strip, QR + name + code.
4. **Clean SVG: Story / Reel** (1080×1920) — vertical, big QR, "Scan to shop nationwide" headline.
5. **Clean SVG: Landscape Banner** (1200×630, doubles as OG image) — for Facebook posts and link previews.
6. **A4 Print Poster** — refreshed version of the existing `/r/$code/poster` styled to match the new ad system.

Templates 3–6 are pure SVG/HTML so they stay razor-sharp at any export size and keep QR contrast perfect.

### How sharing works

For each template:
- **Download PNG/JPG**: render the template to an offscreen canvas (uploaded image + drawn QR, or rasterized SVG), then trigger a `.png` download named `365-{template}-{code}.png`.
- **Print A4 poster**: opens a print-styled route (reuse the `r.$code.poster.tsx` pattern, one route per template variant or a single `?template=` param).
- **Native share**: `navigator.share({ files: [pngBlob], title, text, url })` when supported; falls back to copy link.
- **Social quick links**: pre-filled URLs
  - Facebook: `https://www.facebook.com/sharer/sharer.php?u={link}`
  - Messenger (web): `https://www.facebook.com/dialog/send?link={link}&app_id=...&redirect_uri=...` (fallback: copy + toast)
  - WhatsApp: `https://wa.me/?text={encoded text + link}`
  - X / Twitter: `https://twitter.com/intent/tweet?text=...&url={link}`
- **Copy link**: clipboard copy of `https://365motorsales.com/r/{code}`.

All shares point at `/r/{code}` so the existing scan-tracking pipeline (`qr_scans`, `user_referrals`, 90-day attribution) keeps working unchanged.

### Asset handling

Upload the two PNGs via `lovable-assets` so they're CDN-hosted (large images, no need to bloat the repo):
- `src/assets/share-kit/rear-shirt.png.asset.json`
- `src/assets/share-kit/arm-band.png.asset.json`

### Technical notes

- New file `src/lib/share-kit/templates.ts` — pure config: each template's id, label, size, base image (or SVG render fn), QR placement box `{x, y, w, h, plate?}`, caption text builder.
- New component `src/components/share-kit/template-card.tsx` — renders preview via `<canvas>` (for image-based templates) or inline SVG (for vector templates). Memoizes the rendered Blob/dataURL for instant download/share.
- New component `src/components/share-kit/qr-composer.ts` — utility that draws a QR (qrcode lib, already in deps) onto a canvas at the configured box with a rounded white plate behind it for scan reliability.
- New route file `src/routes/dashboard.share-kit.tsx`.
- New print route `src/routes/r.$code.poster_.$template.tsx` (or extend the existing poster route with a `template` search param) for the A4 print variants.
- Add a "Share Kit" link to `/dashboard/referral` and `/my-qr`.
- Reuse existing `staff_referrals` lookup (`referral_code`, `full_name`, `active`). No DB schema changes.
- No business-logic / billing / data-handling changes → no `/terms` or `/privacy` update needed.

### Out of scope (follow-ups)

- Auto-creating referral codes for non-staff members (Scope question deferred).
- Admin-managed template library / per-staff custom backgrounds.
- Server-side image composition (everything renders client-side; fine for the volumes involved).
- A11y sweep of new icon-only buttons will be done as I build, matching the patterns already established.
