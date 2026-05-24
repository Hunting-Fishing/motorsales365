# Final Mobile Responsiveness Pass — All User Types

A targeted audit and fix sweep covering every user role at 360×644 (phone) and 768×1024 (tablet). Builds on the prior chrome + admin table work; this pass is about the remaining detail issues across each user journey.

## A. By user type — audit & fixes

### 1. Guest / buyer
- `index.tsx` (home): re-verify hero clamp, marquee strips, category card grid; confirm sticky CTA doesn't collide with mobile tab bar.
- `browse.$category.tsx`: filter sheet trigger, sort dropdown, listing card grid (already `grid-cols-1 sm:grid-cols-2`), pagination row.
- `listing.$id.tsx` (525 lines): gallery (full-bleed), seller card stacking, contact button full-width on mobile, sticky CTA above tab bar.
- `seller.$id.tsx`: avatar + meta header stacks, listings grid.
- `map.tsx`: already `lg:grid-cols-[360px_1fr]` (stacks below lg). Ensure map height isn't `100vh` (would clip behind tab bar) — use `h-[calc(100dvh-64px-env(safe-area-inset-bottom))]`.
- `pricing.tsx`, `about.tsx`, `contact.tsx`, `guidelines.tsx`, `privacy.tsx`, `terms.tsx`, `refund-policy.tsx`: confirm typographic clamps + single-column flow.
- `signup.tsx`, `login.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `verify-email.tsx`: form rows stacked, account-type cards full-width under `sm`.

### 2. Seller (private + business listings)
- `sell.tsx` (1014-line wizard): each step's two-column rows → `grid-cols-1 sm:grid-cols-2`; primary "Continue" full-width on mobile; sticky bottom action bar above tab bar.
- `sell.import.tsx` (Facebook import flow): URL input + button stack, results list responsive.
- `listing.$id.edit.tsx`: same form-row treatment; image manager grid `grid-cols-2 sm:grid-cols-3 md:grid-cols-4`.
- `my-qr.tsx`: QR size already responsive.

### 3. Business owner
- `businesses.submit.tsx` (497 lines): hours grid, tag picker, `LocationPicker` (300px+ map) — wrap in container with `min-w-0`; "Save" full-width on mobile.
- `businesses.$slug.tsx`: hero, hours `dl grid-cols-2` (fine), map embed responsive height, contact buttons stack.
- `businesses.index.tsx`: directory grid + filter chips wrap.

### 4. Rider / vehicle owner
- `rides.index.tsx`, `rides.$slug.tsx`: timeline / service log card layouts.
- `dashboard.rides.tsx`, `dashboard.rides_.$id.edit.tsx`, `dashboard.rides_.new.tsx`: form rows + photo uploader grid.
- `dashboard.tow.tsx` (852 lines): rate card grid, coverage map, request form.

### 5. Account / billing / messaging
- `dashboard.tsx`: pill-bar nav (done) — verify scroll snap.
- `dashboard.index.tsx` (424 lines): KPI grid `grid-cols-2 md:grid-cols-4`, recent activity list.
- `dashboard.profile.tsx`: two-column rows stack; avatar uploader full-width.
- `dashboard.billing.tsx`: invoice details drawer (verify on 360), payment-method cards stack with full-width remove button.
- `dashboard.verification.tsx`: document upload tiles `grid-cols-1 sm:grid-cols-2`, the existing `flex items-center justify-between` doc rows — switch to `flex flex-wrap gap-2`.
- `dashboard.messages.tsx`: already `lg:grid-cols-[320px_1fr]`. Below lg, ensure conversation view replaces (rather than stacks under) the thread list; add a back button to return.
- `dashboard.favorites.tsx`, `dashboard.likes.tsx`, `dashboard.searches.tsx`, `dashboard.businesses.tsx`: listing-card grids responsive.
- `payments.tsx`, `payments.$id.receipt.tsx`: receipt scroll wrappers (done last pass) — re-verify print path.
- `checkout.return.tsx`: status card full-width on mobile.

### 6. Tow operator + public tow
- `tow.tsx` public landing: hero, coverage CTA.
- `dashboard.tow.tsx`: covered already in seller section.

### 7. Referral / staff
- `r.$code.tsx` (referral landing), `r.$code.poster.tsx` (print poster — fine).
- `dashboard.referral.tsx`: stats grid + QR.

### 8. Admin (mostly handled — finish remaining)
- Verify `admin.index.tsx`, `admin.analytics.tsx`, `admin.businesses.tsx`, `admin.listings.tsx`, `admin.reports.tsx`, `admin.sandbox.tsx`, `admin.performance.tsx` haven't been missed (KPI grids, chart heights, table wrappers).
- `admin.tsx` shell: section `Select` dropdown — confirm full-width on `<md`.
- `EditAccountDialog`, `add-user-dialog`, `edit-user-dialog`: now inherit `w-[calc(100vw-2rem)] max-h-[90dvh]` from the dialog primitive — re-test.
- `import-places-panel`, `image-metrics-panel`: add `min-w-[640px]` to the diagnostic table.

## B. Cross-cutting polish

- **Header/heading rows**: Audit every `flex items-center justify-between` in `dashboard.billing`, `dashboard.index`, `admin.audit`, `admin.users`, `admin.pricing`, `dashboard.verification` — switch to `flex flex-wrap items-center justify-between gap-2` so a long heading wraps before pushing the action button off-screen.
- **Sticky CTAs**: any page using `fixed bottom-0` or `sticky bottom-0` must add `bottom-[calc(64px+env(safe-area-inset-bottom))] md:bottom-0` so it sits above the mobile tab bar.
- **Touch targets**: re-verify icon-only buttons in listing cards, photo uploaders, and message thread rows reach 44×44 (the global CSS rule covers `<button>` but not all `<a>` icon links).
- **Inputs**: 16px font on mobile already enforced in `styles.css` — spot-check date inputs and the search input in the header drawer.
- **`100vh` audit**: any `h-screen` or `min-h-screen` should be `h-dvh` / `min-h-dvh` to avoid the iOS Safari URL bar pushing content under the tab bar. Convert where found.
- **Horizontal overflow guard**: add `overflow-x-hidden` to `<body>` (in `__root.tsx`) as a safety net so any stray wide element scrolls inside its container, never the page.

## C. Verification matrix

Browser-test at 360×644 and 768×1024 for each user-type smoke flow:
1. Guest: home → browse → listing detail → contact seller modal
2. Buyer: signup → email verify → dashboard
3. Seller: sell wizard step 1–4 → listing edit → my listings
4. Business: businesses.submit (with location picker) → public business page
5. Rider: dashboard.rides → ride edit → photo upload
6. Account: dashboard.profile, dashboard.billing (incl. invoice drawer + remove payment method), dashboard.messages (open a thread on mobile)
7. Admin: admin home → users → accounts (open EditAccountDialog) → referrals → audit

Pass criteria: no horizontal page scroll, tab bar never overlaps a primary CTA, all dialogs scroll internally, all tables either fit or scroll horizontally inside their card.

## Out of scope

No business logic, server function, database, auth, or copy changes. No new pages or features. PWA manifest/icons unchanged.

## Technical notes

- New utility (only if needed): a `.stacking-flex` class isn't worth adding — prefer inline `flex-wrap gap-2`.
- For `dashboard.messages.tsx`, the mobile "thread vs conversation" toggle is local state, not a route change — no router work.
- `__root.tsx` overflow-x-hidden goes on `<body>`, not `<html>`, to keep `position: sticky` working in the header.
