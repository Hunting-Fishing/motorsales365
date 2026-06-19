## Goal

`/admin/advertisements/qr-ads` (and `/dashboard/qr-ads`) currently render the global "Page not found" inside the advertisements layout, even though both route files exist and `src/routeTree.gen.ts` registers them correctly. Finish the rework by getting both pages to render and clean up the remaining loose ends.

## What I checked

- Route files exist: `src/routes/admin.advertisements.qr-ads.tsx` and `src/routes/dashboard.qr-ads.tsx`, both with the right `createFileRoute("/admin/advertisements/qr-ads")` / `"/dashboard/qr-ads"` IDs.
- `src/routeTree.gen.ts` registers both as children of their parents (`AdminAdvertisementsRouteChildren` includes `AdminAdvertisementsQrAdsRoute`).
- Old `share-kit` routes are now thin `throw redirect(...)` files.
- DB has the renamed tables (`qr_ad_templates`, `qr_ad_builtin_categories`, `qr_ad_hidden_builtins`, `qr_ad_layouts`).
- No remaining `share_kit` / `ShareKit` / `share-kit` refs in `src/` outside the redirect route strings.

Most likely cause of the live 404: a stale dev-server / route-tree state from when files were mid-rename. There may also be a small import or runtime issue that I'll confirm by viewing the rendered route once the server is restarted.

## Plan

1. Force a clean rebuild of the route tree
   - Restart the dev server so the Router plugin re-reads `src/routes/` and regenerates `routeTree.gen.ts`.
   - Open `/admin/advertisements/qr-ads` and `/dashboard/qr-ads` in the preview and confirm both render.

2. If either page still 404s or throws after restart
   - Read the dev console / network for the actual error and patch it in place. Likely candidates I already spotted to double-check:
     - `src/routes/admin.advertisements.qr-ads.tsx` line 24 has a stray blank import slot inside the `@/lib/qr-ads/categories` block — harmless but I'll tidy it.
     - Confirm `listQrAdLayouts` / `upsertQrAdLayout` are exported from `src/lib/qr-ad-layouts.functions.ts` and the server functions return the expected shape.
     - Confirm `useSignedCustomTemplates` handles the new column names from `qr_ad_templates`.

3. Clean up loose ends
   - Verify the legacy redirect routes (`admin.advertisements.share-kit.tsx`, `dashboard.share-kit.tsx`) still redirect cleanly to the new URLs.
   - Sanity-check the sidebar / nav entries (`admin.advertisements.tsx`, `admin.tsx`, `dashboard.tsx`, `dashboard.referral.tsx`, `my-qr.tsx`, `admin/user-advertisements-tab.tsx`) all point at `/qr-ads`. (Already done in the last pass, just verifying nothing slipped through.)
   - Confirm the search box's `?q=` round-trip works (debounced URL update + initial value from URL).

4. Out of scope
   - No further DB renames, no storage bucket rename, no new categories or filters beyond what's already in.

## Technical notes

- Route tree regeneration is what fixes most "route file exists but URL 404s" cases in TanStack Start; the fix is operational, not code.
- The redirect routes intentionally keep their `share-kit` path strings — those are the only remaining `share-kit` references in `src/` and they must stay so old bookmarks keep working.
