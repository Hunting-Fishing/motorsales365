## Problem

`https://www.365motorsales.com/b/365towingtestaccount` redirects to `/businesses` because the business row has `status = 'pending'`. Both `/b/$slug` (vanity redirector) and `/businesses/$slug` (detail page) hard-gate on `status = 'active'`, so any business that hasn't been admin-approved is invisible — even to the owner who is sharing their own URL.

Today: 68 pending vs 36 active. Most owner-facing mini-sites are dark.

## Fix

Treat the mini-site (`/b/<vanity>` → `/businesses/<slug>`) as a real, public page as soon as the owner submits. `pending` means "awaiting admin verification," not "hidden." Only `archived` / `hidden` (and any future explicit suppression status) should 404 / redirect.

### Changes

1. **`src/routes/b.$slug.tsx`** — replace the `status !== 'active'` gate with a deny-list (`['archived','hidden']`). Pending businesses resolve normally and redirect to their canonical `/businesses/<slug>`.

2. **`src/routes/businesses.$slug.tsx`** (loader, ~line 69) — change `.eq("status", "active")` to `.not("status", "in", "(archived,hidden)")` so the page renders for pending businesses.

3. **Pending banner on the public page** — when `status === 'pending'`, render a small non-blocking notice at the top of the business page: "This business is awaiting verification by 365 Motor Sales." Keeps trust signals honest without breaking the share link.

4. **Listings stay gated** — `/businesses` index and search/discover stay `status = 'active'` only. Pending businesses are reachable by direct link (what owners share) but don't appear in the public directory until approved. No change needed there beyond confirming current behavior.

5. **SEO** — for `status = 'pending'`, set `<meta name="robots" content="noindex">` in the route's `head()` so unverified pages don't get indexed; flip to indexable automatically once activated.

### Out of scope

- Auto-activating on submit (keeps admin moderation intact).
- Owner-only preview mode (not needed once pending is publicly viewable).
- Changes to `/dashboard` or admin approval flow.

### Verification

- Visit `/b/365towingtestaccount` → 200, renders the business page with a "Awaiting verification" banner.
- `/businesses` directory still shows only the 36 active businesses.
- Archive a test business → `/b/<vanity>` and `/businesses/<slug>` both redirect to `/businesses`.
