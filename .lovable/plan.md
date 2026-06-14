# Admin Reports — full upgrade

## Why this is needed

The report form already captures category, target type, target URL, evidence files, and reporter contact — but `admin.reports.tsx` only renders `reason` and `details`, so the admin sees almost nothing. That's why "the reported ad did not tell the admin what the problem was."

We'll also add reporter counters and a fraud-signal panel (duplicate photos, duplicate posts, repeat sellers, repeat reporters, scam keywords).

## Schema (already approved & applied)

- `reports`: add `resolution` ('accepted'|'dismissed'), `resolved_by`, `resolved_at`, `signals jsonb`
- `listing_media`: add `phash`, `file_sha256` (nullable; future-fill)
- Indexes on the new columns

## Admin Reports page — what each card will show

1. **Header row** — status, target type, category badge, created date
2. **Target** — link to listing (existing) OR `target_url` for business/seller/other reports
3. **Reporter** — name / email / phone if provided, or "Signed-in user" link with profile, or "Anonymous"
4. **Counters chip on reporter** — Total · Open · Resolved · Accepted · Dismissed (click → filter list by this reporter)
5. **Details** — the full free-text from the reporter (already there but unstyled)
6. **Evidence gallery** — thumbnails (images) + download links (PDFs), fetched via short-lived signed URLs from the private `report-evidence` bucket
7. **Signals panel** (lazy-loaded per card on expand):
   - Duplicate photos: other listings sharing image sha or storage path
   - Duplicate posts: same title from a different seller in last 90 days
   - Seller prior reports: total + accepted count
   - Reporter history: total / accepted / dismissed (abuse detection)
   - Scam keyword hits: Western Union, crypto, off-platform contact, deposit pressure, gift cards, overseas/shipping
8. **Actions** — Hide listing / Delete / Resolve as Accepted / Resolve as Dismissed / Publish public summary (existing)

`Accepted` and `Dismissed` are stored on `reports.resolution` going forward; old resolved rows show as "Resolved" without a sub-label.

## New / changed files

- `src/lib/admin-reports.functions.ts` *(new)* — `getReportSignals`, `getReporterCounts`, `setReportResolution`, `getReportEvidenceUrls` (all gated by `requireDomainRole("moderator", ...)`)
- `src/components/admin/report-card.tsx` *(new)* — the rebuilt card UI
- `src/components/admin/report-signals.tsx` *(new)* — collapsible signals strip
- `src/routes/admin.reports.tsx` — switch list rendering to the new card; add `?reporter=<id>` filter
- `src/routes/report.tsx` — no change (it already captures everything)

## Out of scope (called out, not built)

- Real perceptual-hash backfill of historical images (worker job) — exact-hash dedupe ships now, pHash column is ready for later
- Auto-suspend sellers above N accepted reports — leave manual
- "Smart" image similarity (CLIP / vector search) — future enhancement

Approve to switch into build mode and ship.