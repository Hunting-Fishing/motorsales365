## Summary
Make Report visible on every listing card and seller profile via a kebab (⋮) menu with quick-report categories. Add a Block seller feature backed by a new `user_blocks` table that hides the blocker's view of that seller's listings, cards, and messages.

## Backend

**New migration — `user_blocks`**
```sql
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_user_id),
  CHECK (blocker_id <> blocked_user_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own blocks" ON public.user_blocks
  FOR ALL USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);
```
No DB-side filtering of listings — the app filters client-side using a small `useBlockedUserIds()` hook so existing public queries don't need RLS changes.

## Report prefill

Extend `src/routes/report.tsx` with `validateSearch` accepting `target_type`, `category`, `listing_id`, `target_url`, `details`. Add the 6 new categories to the `CATEGORIES` array:
- "Fake / forged documents"
- "Stolen vehicle"
- "Off-platform / scam payment"
- "Duplicate listing"
- "Price bait / hidden fees"
- (existing ones kept; "Fake / cloned OR-CR" renamed to "Fake / forged documents" for consistency)

Form initializes from the URL params; when `listing_id` is present, also send it on insert.

## New shared component — `src/components/listings/listing-actions-menu.tsx`
A dropdown (kebab) with:
- Report listing (general → `/report?target_type=listing&listing_id=...`)
- Report fake documents
- Report stolen vehicle
- Report scam payment
- Report duplicate listing
- Report price bait
- Block seller (signed-in only; opens confirm dialog, inserts into `user_blocks`, toast + invalidate)

Each report item links to `/report` with prefilled `category` and `listing_id`/`target_url`. Built on existing `DropdownMenu` shadcn primitive.

## New hook — `src/hooks/use-blocked-users.ts`
Returns `Set<string>` of blocked seller IDs for the current user via TanStack Query (key `['user-blocks', userId]`). Used to filter cards and to expose `block(userId)` / `unblock(userId)` mutations.

## UI integration

- `src/components/listing-card.tsx`: render `<ListingActionsMenu listingId seller_id />` absolutely positioned top-right of the image (alongside existing favorite button). Clicking does not navigate.
- `src/routes/listing.$id.tsx`: add the same menu to the seller-info block on the detail page.
- `src/routes/seller.$id.tsx`: add a "Report seller" + "Block seller" dropdown in the profile header.
- Filter blocked sellers out of `featured`/`recent` on `index.tsx`, `browse.$category.tsx`, `dashboard.favorites.tsx`, `dashboard.likes.tsx`, `seller.$id.tsx` (no-op for self).
- `src/routes/dashboard.tsx` (or sidebar): add a "Blocked users" link to a new `src/routes/dashboard.blocked.tsx` page that lists blocks with an Unblock button.

## Out of scope
- Hiding blocked users' messages in conversations (separate pass; threads stay readable so existing chats aren't orphaned).
- Auto-suppressing blocked sellers from search results server-side.
- Notifying blocked users (intentionally silent).

## Terms sync
Add a short "Blocking and reporting" paragraph to `/terms` describing what Block does (hides their listings from your view; does not notify them) and the available report categories. Bump "Last updated".