## Goal
Resolve Issue #2 in `.lovable/june7-audit.md`: pricing + photo-limit inconsistency. Standardize on **12 photos** per Private Seller (free) listing across all surfaces, and align the public plan table with the homepage.

## Canonical plan table (single source of truth)

| Plan | Price | Active listings | Photos | Video | Duration |
|---|---|---|---|---|---|
| Private Seller | Free | 5 | **12** | 1 | 60 days |
| Verified Seller | ₱149/mo | More | 20 | Yes | 60 days |
| Dealer Starter | ₱499/mo | 25 | 20 | Yes | 60 days |
| Dealer Pro | ₱1,499/mo | Unlimited | 20 | Yes | 60 days |

Free = 12 photos. Paid tiers = 20 photos.

## Inconsistencies found

1. **`src/routes/pricing.tsx:277`** — "Free listing… Up to 20 photos" → should be **12**.
2. **`src/routes/sell.tsx`** — uses a different (paid) tier model: Free=1 photo, Standard=5, Upgraded=20. Copy and caps conflict with the Private Seller free=12 model on the homepage. Needs reconciliation so the free path allows **12 photos**, not 1.
3. **`src/lib/plan-limits.ts:16`** — `FREE_PLAN_LIMITS.maxPhotosPerListing = 20` → change to **12**.
4. **`src/routes/index.tsx`** — already says 12; keep as-is and use as the canonical reference.
5. Database `subscription_plans` rows for the Private Seller plan may have `max_photos_per_listing = 20`; verify and update via migration if needed.

## Changes

### Frontend copy (presentation only)
- **`src/routes/pricing.tsx`**: change "Up to 20 photos and 1 video" → "Up to 12 photos and 1 video" for the Free row. Sync the rest of the plan table to the canonical 4-tier structure above.
- **`src/routes/sell.tsx`**: update the free-tier cap from 1 to 12 photos and rewrite the overflow/upgrade copy. Keep the paid Standard/Upgraded tiers using 20 photos. Update the inline copy on lines 405, 407, 424, 546, 548, 1301, 1367 to reflect Free=12, Paid=20.
- **`src/routes/index.tsx`**: no copy change needed (already 12); verify alignment after the rest.

### Plan limits helper
- **`src/lib/plan-limits.ts`**: set `FREE_PLAN_LIMITS.maxPhotosPerListing = 12`.

### Database (only if rows disagree)
- Read `subscription_plans` to confirm the Private Seller row's `max_photos_per_listing`. If it's 20, write a migration to set it to 12. Otherwise skip.

### Audit log
- Mark Issue #2 complete in `.lovable/june7-audit.md` and append a Progress Log entry dated 2026-06-08.

## Out of scope
- No changes to paid tier prices, durations, or counts beyond aligning the table.
- No changes to upload validation logic beyond the numeric caps (e.g. no new error UI).
- No Terms/Privacy edits — this is a pricing-table consistency fix, not a policy change. (If the pricing page text materially changes plan benefits, I'll flag it for a Terms sync per the core memory rule.)

## Verification
- Grep for `20 photos`, `12 photos`, `maxPhotos`, `max_photos_per_listing` after edits — only paid tiers should reference 20; Free should reference 12 everywhere.
- Load `/`, `/pricing`, `/sell` in the preview and confirm consistent copy.
