## Root cause

The 400s on `/` come from this embed in `src/routes/index.tsx` (also used by `dashboard.likes.tsx`, `dashboard.favorites.tsx`, and `src/lib/rewards.functions.ts`):

```
profiles:user_id(verification_status, phone_verified_at)
```

PostgREST needs a foreign key to resolve an embed. Current FKs on `listings`:

- `listings.user_id → auth.users(id)`
- `listings.vehicle_id → vehicles(id)` ✓ (that embed works)

There is no FK from `listings` to `public.profiles`, so PostgREST can't resolve `profiles:user_id(...)` and returns `400`. Both other embeds in the same select (`listing_media`, `vehicles`) have proper FKs, so they're fine — the whole request just fails because of the profiles one. The identical embed in `dashboard.likes.tsx`, `dashboard.favorites.tsx`, and `rewards.functions.ts` is broken for the same reason.

I confirmed:
- All existing `listings.user_id` values already have a matching row in `public.profiles` (0 orphans).
- `profiles.id` is already `PRIMARY KEY` and 1:1 with `auth.users(id)`.

## Fix

One backend-only migration — no application code changes.

Add a second foreign key on `listings.user_id` targeting `public.profiles(id)`. That gives PostgREST the relationship it needs to resolve `profiles:user_id(...)` everywhere the embed is used.

```sql
ALTER TABLE public.listings
  ADD CONSTRAINT listings_user_id_profiles_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
```

Notes:
- Safe to add — every existing row satisfies it.
- Keeps the existing `listings_user_id_fkey → auth.users(id)` in place; both cascade on delete, so behavior is consistent.
- `NOTIFY pgrst, 'reload schema'` refreshes the Data API's relationship cache so the embed starts working immediately.

## Verification

After the migration:
1. Reload `/` and confirm the two failing requests (`boost_until=gt...` and `published_at.desc.nullslast`) return `200` with `profiles` populated.
2. Spot-check `/dashboard/likes` and `/dashboard/favorites` — same embed, same fix.
3. Nothing to change in `src/routes/index.tsx` or the other files.

## Out of scope

- No changes to RLS, grants, or column shape.
- No changes to the failing routes' queries.