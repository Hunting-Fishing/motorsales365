## Findings

Searched the whole codebase. There are **no live navigation links** pointing to `/dashboard/share-kit` or `/admin/advertisements/share-kit` anywhere in the UI (sidebar, header, dashboard nav, admin nav — all clean). The only things left are:

1. **Two redirect-only route files** that forward to the QR Ads pages:
   - `src/routes/dashboard.share-kit.tsx` → `/dashboard/qr-ads`
   - `src/routes/admin.advertisements.share-kit.tsx` → `/admin/advertisements/qr-ads`
2. **Two orphaned image assets** never imported anywhere:
   - `src/assets/share-kit/arm-band.png.asset.json`
   - `src/assets/share-kit/rear-shirt.png.asset.json`
3. **A Supabase storage bucket named `share-kit-templates`** that is actively used by the QR Ads custom-template uploader (`src/components/qr-ads/use-signed-custom-templates.ts`, `src/components/qr-ads/template-upload-dialog.tsx`). This is just an internal bucket identifier — users never see it — and renaming it would require migrating existing uploaded files. Migration history confirms it's already in production use.

## Plan

### 1. Delete legacy redirect routes
Remove both files so the URLs cleanly 404 and the route tree no longer carries dead entries:
- `src/routes/dashboard.share-kit.tsx`
- `src/routes/admin.advertisements.share-kit.tsx`

The TanStack route tree (`src/routeTree.gen.ts`) is auto-generated and will regenerate without these entries on the next build.

### 2. Delete unused share-kit image assets
- `src/assets/share-kit/arm-band.png.asset.json`
- `src/assets/share-kit/rear-shirt.png.asset.json`
- Remove the now-empty `src/assets/share-kit/` directory

### 3. Leave the storage bucket name alone
The `share-kit-templates` bucket stays as `share-kit-templates` internally. It is referenced only by the QR Ads code, not exposed to users, and renaming would orphan existing uploaded template files. No code change needed.

## Risk

- Anyone with an old bookmark to `/dashboard/share-kit` or `/admin/advertisements/share-kit` will get a 404 instead of being redirected. Given there's no current UI pointing to those URLs, this is the intended outcome per your request.
- No other code paths break — confirmed by full-repo search.
