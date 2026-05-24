# Final Mobile Responsiveness Polish

Targeted scan turned up a small set of remaining issues at 360px. Most of the app is already mobile-clean from prior passes — this addresses what's left.

## Issues found

### 1. Overflowing QR code on admin referrals
`src/routes/admin.referrals.tsx` (lines 890, 893) hardcodes `h-[360px] w-[360px]` for the QR image and its placeholder. At 360px viewport with container padding, this overflows horizontally.

**Fix:** `h-auto w-full max-w-[360px] aspect-square`

### 2. `100vh` on map sidebar
`src/routes/map.tsx` (line 148) uses `lg:max-h-[calc(100vh-260px)]`. While `lg:` only applies on desktop, switching to `dvh` is consistent with the rest of the app.

**Fix:** `lg:max-h-[calc(100dvh-260px)]`

### 3. `min-h-screen` in router pending state
`src/router.tsx` (line 8) uses `min-h-screen` for the pending fallback shell. iOS Safari URL bar can clip it.

**Fix:** `min-h-dvh`

### 4. Static `text-4xl` and `text-7xl` headings
Several legal/info pages (`about`, `contact`, `privacy`, `terms`, `guidelines`, `refund-policy`, `payments`, `pricing`) and the 404 page use a non-responsive heading size. At 360px, `text-4xl` is borderline; `text-7xl` (404) is too aggressive.

**Fix:**
- Legal/info `text-4xl font-bold` → `text-3xl sm:text-4xl font-bold`
- 404 `text-7xl` → `text-5xl sm:text-7xl`

### 5. Poster page heading
`src/routes/r.$code.poster.tsx` (line 57) uses static `text-4xl`. Same treatment: `text-3xl sm:text-4xl`.

## Out of scope

- No business logic, route, server function, or content changes.
- No restructuring of layouts already verified clean (browse, listing, sell wizard, dashboard, messages, admin tables — all use `min-w-[…] + overflow-x-auto` or wrap correctly).

## Verification

After edits, re-check at 360×644:
- Admin referrals page: QR card no longer pushes horizontal scroll.
- Map page: no regression on mobile (no `lg:` styles apply).
- Legal/404 headings render without wrap awkwardness.
