## Problem

The publish + media uploads fail with:
- `Photo limit reached for free plan (max 1)`
- `Video limit reached for free plan (max 0)`

Root cause: DB trigger `public.enforce_listing_media_caps` (migration `20260602081428_...`) hardcodes free-plan caps as **1 photo / 0 videos**, but the UI + `FREE_PLAN_LIMITS` promise **12 photos + 1 video**. Every photo after the 1st and every video is rejected by the trigger → the toast "Couldn't attach 9 files…" and submit failure.

Drafts already exist (auto-save to `listing_drafts` on step change, resume banner on load). No missing feature — just needs a small visibility tweak so users can see it's saving.

## Plan

1. **DB migration — align media caps with the actual free plan**
   Update `public.enforce_listing_media_caps()` so free/`NULL` plan = **12 photos, 1 video** (matches `FREE_PLAN_LIMITS` and the copy in `/sell` and `/start-selling`). Keep standard (5/1) and upgraded (20/3) as-is, or bump upgraded photo cap only if needed — leaving both untouched this turn.

   ```text
   free/NULL → 12 photos, 1 video
   standard  → 5 photos,  1 video     (unchanged)
   upgraded  → 20 photos, 3 videos    (unchanged)
   ```

2. **sell.tsx — surface auto-save state**
   Autosave logic already runs on step change (line ~815). Add a tiny "Draft saved · <time>" indicator next to the stepper so users know drafts are automatic (no button needed). Also toast once on first successful autosave.

3. **sell.tsx — friendlier error mapping**
   When `listing_media` insert returns error code `23514` with "limit reached", show a single clear toast ("Upgrade your plan to add more photos/videos") instead of one toast per failed file.

4. **No changes to** the eager-upload flow, blob URL cache, storage buckets, or draft schema — those are working.

## Files touched

- `supabase/migrations/<new>_fix_free_plan_media_caps.sql` (new)
- `src/routes/sell.tsx` (autosave indicator + error toast dedupe)

## Out of scope

- Repricing tiers (only fixing the mismatch with what's already promised).
- Rewriting media upload pipeline.
- Adding a manual "Save draft" button — autosave already covers this; just making it visible.