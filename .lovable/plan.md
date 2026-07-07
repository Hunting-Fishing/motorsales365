## Problem

The QR ads page fires a 400 (Bad Request) for every custom template image, hundreds at a time. The `share-kit-templates` bucket is private (workspace blocks public buckets), but each `qr_ad_templates` row still stores a `/object/public/...` URL. There is a client hook (`useSignedCustomTemplates`) that rewrites these to signed URLs, but:

1. Rendering falls back to `customData?.templates` (raw public URLs) while the signing query is in-flight, so every card immediately requests a URL that 400s.
2. A `useEffect` prewarm loop also `fetch`es each raw URL, multiplying the failures.
3. Each failed image triggers "Template render failed" errors in `template-card.tsx`.

Net effect: slow load + massive console noise.

## Fix

Sign the URLs server-side once, so the client never sees the broken public URLs.

### Changes

1. **`src/lib/qr-ad-templates.functions.ts` — `listQrAdTemplates`**
   - After fetching `qr_ad_templates`, extract the storage path from each row's `image_url` (parse `/storage/v1/object/public/share-kit-templates/...` or `/object/sign/...`).
   - Batch `supabase.storage.from("share-kit-templates").createSignedUrls(paths, 3600)`.
   - Return rows with `image_url` replaced by the signed URL. Rows whose path can't be resolved keep the original URL (harmless fallback).

2. **`src/routes/dashboard.qr-ads.tsx`**
   - Drop the `useSignedCustomTemplates` call and the `signedCustoms ?? customData?.templates` fallback; use `customData?.templates` directly (now already signed).
   - Same for the `prewarmBase` effect — it will now prewarm signed URLs, so no 400s.

3. **`src/components/qr-ads/use-signed-custom-templates.ts`**
   - No longer referenced. Delete the file to keep the code path single.

### Why this works

- No client render ever uses a raw `/object/public/...` URL, so the browser stops issuing 400s.
- One server round trip (already happening) returns usable URLs — no second "sign" query, so first paint of cards is faster.
- Signed URLs live 1 hour, matching the previous client hook's TTL; the `qr-ad-templates` query's staleTime keeps them fresh within that window.

### Out of scope

- Not switching the bucket to public (workspace policy blocks it).
- Not migrating stored URLs in the DB — parsing at read time keeps the change contained and reversible.
