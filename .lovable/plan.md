## Goal

Give every listing real engagement signals: a view counter, a public **Like** button (social-style count), a private **Save** bookmark, and an owner-facing analytics view (totals + 7/30 day trend).

## 1. Database changes

**New table `listing_likes`** (public counts)
- `listing_id`, `user_id`, `created_at`
- Primary key `(listing_id, user_id)` to prevent double-likes
- RLS: anyone can SELECT (so counts work for non-owners), users INSERT/DELETE only their own row

**New table `listing_views`** (raw event log for trend charts)
- `id`, `listing_id`, `viewer_id` (nullable for anon), `created_at`
- Index on `(listing_id, created_at)` for fast trend queries
- RLS: only the listing owner + admins can SELECT; anyone can INSERT (anon views allowed)

**Reuse existing**
- `listings.view_count` already exists → keep as fast denormalized counter
- `favorites` table already exists → this is the **Save** feature, no changes needed

**Trigger / function**
- `increment_listing_view(listing_id, viewer_id)` security-definer function: inserts into `listing_views` AND increments `listings.view_count`. Called from the listing page on every load (per user's choice).

## 2. UI — Listing detail page (`src/routes/listing.$id.tsx`)

Add an action bar near the title:

```text
👁 1,234 views   ❤ 56 Likes   🔖 Save
```

- **View**: fires `increment_listing_view` once on mount (every page load, per user's choice).
- **Like button**: heart icon + count. Logged-out users → toast "Sign in to like". Optimistic toggle.
- **Save button**: bookmark icon. Already partially exists via `favorites` — wire it to a clear "Save / Saved" button. Logged-out → sign-in prompt.

## 3. UI — Listing card (`src/components/listing-card.tsx`)

Small footer row showing `👁 views · ❤ likes`, plus a compact save (bookmark) icon in the corner. Keeps the social-proof visible in browse/search results.

## 4. Owner analytics

**Per-listing stats card** on `dashboard.index.tsx` (My Listings):
Each listing row gets a stats strip:
```text
Views: 1,234  ·  Likes: 56  ·  Saves: 12  ·  Messages: 8
[7d ▲ 23%]  [30d ▲ 110%]
```
- Trend = compare last 7 days vs previous 7 days (and 30 vs previous 30) using `listing_views` for views, `created_at` filters for likes/saves/messages.
- Tiny inline sparkline (7-day daily counts) using a lightweight inline SVG — no new dep.

Data fetched via a single server function `getListingStats(listingIds[])` that returns `{ views, likes, saves, messages, views7d, views_prev7d, ... }` for each ID.

## 5. Saved/Liked pages in user profile

- `dashboard.favorites.tsx` already exists → rename label to **"Saved"** in nav.
- Add new `dashboard.likes.tsx` showing listings the user has liked (joins `listing_likes` → `listings`).
- Footer/sidebar nav entries: **Saved** and **Liked**.

## 6. Files touched

**New**
- migration: `listing_likes`, `listing_views`, `increment_listing_view` function, RLS policies
- `src/routes/dashboard.likes.tsx`
- `src/lib/listing-stats.functions.ts` (server fn for owner analytics)

**Edited**
- `src/routes/listing.$id.tsx` — view ping + Like + Save buttons
- `src/components/listing-card.tsx` — view/like counters + save icon
- `src/routes/dashboard.index.tsx` — per-listing stats strip
- `src/routes/dashboard.tsx` — add "Liked" nav item, rename "Favorites" → "Saved"
- `src/routes/dashboard.favorites.tsx` — relabel page heading to "Saved listings"

## Out of scope

- Bot/scraper filtering on views (you chose every-load counting)
- Push notifications when someone likes your ad
- Public "people who liked this" list — only the count is shown

Ready to build when you approve.