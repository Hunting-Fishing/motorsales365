# Finish "set up your business" for incomplete business signups

## What's actually happening

Your account signed up as **seller_type = "business"**, **business_kind = "towing"**, **business_name = "365 TOWING TEST"** — but there is **no row in the `businesses` table** for you yet. Every "My businesses" surface (sidebar, account dropdown, My businesses page, workspace links) is gated on actual `businesses` rows, so they all correctly show empty. Nothing is broken — the gap is that the app never *invites* you to finish creating the business record after signup, so it looks like a bug.

The header welcome strip pulls the name from `profiles.business_name`, which is why "Welcome: 365 Tow Company 365 Towing" still shows even though no business exists.

## Fix: detect the incomplete state and surface a guided CTA

A user is "incomplete-business" when:
`profile.seller_type === "business"` AND no row exists in `businesses` where `owner_id = user.id`.

When that's true, every place that currently hides "My businesses" instead shows a single bright CTA: **"Finish setting up your towing business"** (kind comes from `profile.business_kind`) that deep-links to `/businesses/submit?type=<kind>&name=<business_name>` with the signup info pre-filled.

### 1. Account dropdown (`src/components/site-header.tsx`)
- Keep the "My businesses" section header always visible for `seller_type=business`.
- If `myBusinesses.length === 0`, render a single highlighted item: **"Finish setting up your <kind> business"** → `/businesses/submit?type=<kind>&name=<encoded business_name>`.
- Same change in the mobile sheet block (line ~539).

### 2. Dashboard sidebar / nav (left rail in the second screenshot)
- Find the "My businesses" entry. When the user is incomplete-business, add a small amber dot/badge ("Set up") next to the label, and on hover/click route to the same submit URL with prefill.

### 3. My businesses page (`src/routes/dashboard.businesses.tsx`)
- Replace the generic empty state ("You haven't listed any business yet.") with a tailored card when `seller_type=business`:
  - Title: **"Finish setting up <business_name>"**
  - Sub: "You signed up as a towing business. Add a few details to publish your page and unlock your workspace."
  - Primary button: **Continue setup** → `/businesses/submit?type=towing&name=…&kind=…`
  - Secondary: **Switch account type** → `/dashboard/profile`
- Keep the existing empty state as a fallback for non-business sellers.

### 4. Prefill `/businesses/submit`
- Read `type`, `name`, `kind` from URL search params and seed the corresponding form fields on mount. Falls back to current defaults when params are absent. No behavior change for users who land there without params.

### 5. Welcome strip honesty (small polish)
- In `site-header.tsx`, when incomplete-business, append a small ✱ chip next to the welcome name: **"Setup pending"** → links to the submit page. Makes it obvious why "My businesses" appears empty while the welcome still uses the business name.

## Files
- **Edited**: `src/components/site-header.tsx`, `src/routes/dashboard.businesses.tsx`, `src/routes/businesses.submit.tsx` (or wherever the submit form lives — will confirm during build), and the dashboard sidebar (likely `src/components/dashboard-sidebar.tsx`).
- **No schema changes**, no new server functions — pure UX wiring on top of fields that already exist (`profiles.seller_type`, `business_kind`, `business_name`).

## Note on the existing record
The row you see in the welcome strip is just `profiles.business_name`. There is genuinely no business yet to "link" to — completing the submit form is what creates it. Once submitted (and `status` becomes `active` or even `pending`), every quick link in the dropdown/sidebar/workspace lights up automatically; no extra wiring needed.

Approve to build.
