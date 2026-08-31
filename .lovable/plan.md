# Findings: safest existing mechanism to copy the two >50 MB draft videos

Read-only investigation. Nothing was copied, edited, or published.

## Existing helper infrastructure

- Route: `src/routes/api/public/migration-export.ts` (GET only)
- Helper module: `src/lib/migration-export.server.ts` (server-only, read-only)
- Second route: `src/routes/api/public/migration-target-preflight.ts` (target-only, no source reads)

## The mechanism that fits

**Existing mode: `mode=storage-signed-url`** — the only existing path that can yield readable bytes for a private source object without touching bucket visibility.

Request shape:

```text
GET /api/public/migration-export
  ?mode=storage-signed-url
  &bucket=listing-videos
  &path=drafts/66beaa5c-.../fb46125a-.../VIDEO-2026-08-25-01-04-28.mp4
  &expires=300              # clamped 1..300 seconds
Header: x-365-migration-token: <one-time token>
(fallback accepted: &migration_token=<token> for transports that cannot set headers)
```

Auth mechanism:
- Caller side: SHA-256 of the supplied token is compared in constant time against a committed digest (`verifyMigrationToken`). Signed-URL mode is token-gated (only `push-*` modes are token-exempt).
- Source side: `supabaseAdmin` from `@/integrations/supabase/client.server`, backed by secret names `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. The key is never returned; the response contains only a short-lived signed URL.
- Bucket stays private; the signed URL grants read of exactly one object for at most 300 s.

Existing supporting modes: `mode=buckets`, `mode=storage-list` / `push-storage-list` (to confirm the exact object names/sizes before signing).

## Can it stream/copy to the target today?

Not by itself. Two gaps:

1. There is **no** `push-storage-object` mode. `PushKind` declares `"storage_object"` but no handler implements it, and `migration_ingest` is a JSON row inbox — unsuitable for 92 MiB binaries anyway.
2. So the copy has to be driven **outside** the route: fetch the signed URL bytes, then upload to the target. Target credentials already exist as secrets `TARGET_SUPABASE_URL` + `TARGET_SUPABASE_SERVICE_ROLE_KEY` (values never printed), so the upload leg needs no new credential.

## Recommended copy procedure (not executed)

For each of the two objects, one at a time:

1. `mode=storage-list` on `listing-videos` at `drafts/66beaa5c-.../fb46125a-.../` to confirm exact name and byte size.
2. `mode=storage-signed-url` with `expires=300` to mint a single-object read URL.
3. Stream that URL directly into the target Storage REST API
   `POST {TARGET_SUPABASE_URL}/storage/v1/object/listing-videos/<same path>`
   with `apikey` + `Authorization: Bearer` from `TARGET_SUPABASE_SERVICE_ROLE_KEY`,
   `x-upsert: false`, `Content-Type: video/mp4`.
4. Verify by `HEAD`/list on the target and compare byte size; no source mutation at any step.

No source bucket is made public, no service-role value is exposed, and the source objects are only read.

## If you want this automated instead

Option: add a temporary `mode=push-storage-object` to the same route that performs steps 2–3 server-side (signed read → streamed target upload) and returns only `{ ok, bucket, path, bytes }`. That is a code change and needs your go-ahead; it is not part of this read-only report.
