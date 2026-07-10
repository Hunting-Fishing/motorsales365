# LTO Document Verification for Listings

Add a "Registration & Ownership" step to `/sell` where sellers upload their LTO OR (Official Receipt) and CR (Certificate of Registration). Our software runs OCR + AI comparison against the listing (VIN/chassis, make/model, year, color, plate, owner) and issues a verification badge.

## User flow

1. In the Sell form, a new **"Verify with LTO documents"** section appears under VIN/Chassis (collapsible, optional but strongly encouraged with an "Anti-Scam Verified" badge incentive).
2. Seller uploads **CR** (Certificate of Registration) and **OR** (Official Receipt). PNG/JPG/PDF, up to 10 MB each.
3. On upload, files go to a private `listing-documents` bucket, then a server function calls Lovable AI (Gemini 2.5 Flash multimodal) to extract structured fields.
4. Extracted fields are compared to the listing form. Results show inline as chips:
   - ✅ Green: match (VIN, Make, Model, Year, Color, Plate)
   - ⚠️ Amber: mismatch — with the value we found vs what you typed, plus "Use document value" button
   - 🔴 Red: registration expired / OR renewal past due (based on "valid until" date on OR)
5. Owner-name field is compared to the signed-in user's profile name (fuzzy match). Mismatch flags "Owner name differs — additional proof may be required."
6. If all checks pass, the listing gets a persisted `verification_status = 'lto_verified'` badge visible on the public listing page.

## What we verify (from your sample docs)

From **CR**: Plate No, Engine No, Chassis No, VIN, Make/Brand, Series (Model), Body Type, Color, Fuel Type, Year Model, Owner Name, CR Date.
From **OR**: Plate No, "valid until" and "due for renewal" dates, Received From (owner), Year Model, Color, Fuel Type.

Cross-checks:
- CR chassis/VIN ↔ listing VIN/chassis field
- CR plate ↔ OR plate (must match each other)
- CR make/series/year/color ↔ listing values
- OR "valid until" date ↔ today (expired → red flag)
- CR/OR owner name ↔ user profile name (fuzzy)

## Technical details

**Storage**
- New private bucket `listing-documents`, RLS: owner can read/write their own `{userId}/{listingId}/...`; admins read all.

**DB (migration)**
- `listing_documents` table: `id, listing_id, user_id, doc_type (cr|or), storage_path, mime_type, file_size, uploaded_at`.
- `listing_verifications` table: `listing_id (PK), status (unverified|pending|lto_verified|mismatch|expired), extracted_json, mismatches_json, checked_at, verified_by (system|admin)`.
- Extend `listings` with `verification_status` (denormalized) + realtime trigger to keep it in sync.
- GRANTs + RLS: users read their own; public reads only `verification_status` on listings (already public).

**Server function** `verifyListingDocuments.functions.ts` (auth-required, `requireSupabaseAuth`):
1. Signed URL for uploaded CR/OR.
2. POST to Lovable AI Gateway `/v1/chat/completions` with `google/gemini-2.5-flash`, structured output (JSON schema) requesting the fields above.
3. Normalize (uppercase VIN, strip spaces, parse dates PH format `MM/DD/YYYY`).
4. Compare to listing row; build mismatch array.
5. Upsert `listing_verifications`; update `listings.verification_status`.

**UI**
- New component `src/components/sell/lto-verification.tsx`:
  - Two `SingleFileUploader` slots (CR, OR)
  - "Verify documents" button → calls server fn, streams status
  - Result panel: match chips per field + "Apply document values to listing" bulk action
  - Persistent state — re-opens with prior extraction if user comes back
- Add "Anti-Scam Verified" badge to `/vehicles/[id]` public page when `verification_status = 'lto_verified'`.

**Privacy**
- Docs stored private; only OCR-extracted summary is shown to seller. Nothing but the badge is public — owner name, plate, and file itself never surface publicly.
- Note in `/privacy` update: LTO documents processed by AI OCR for verification, retained for the life of the listing + 90 days.

## Out of scope (future)
- Deed of Sale / Special Power of Attorney uploads for third-party sellers
- LTO API integration (not publicly available); we rely on document OCR
- Admin manual review queue (can add later if AI flags too many false positives)

## Files touched
- New: `supabase/migrations/<ts>_lto_verification.sql`, `src/lib/listing-verification.functions.ts`, `src/components/sell/lto-verification.tsx`, `src/components/listing/verified-badge.tsx`
- Edit: `src/routes/sell.tsx` (insert section under VIN block), `src/routes/vehicles.$id.tsx` (badge), `src/routes/privacy.tsx` + `src/routes/terms.tsx` (policy update per memory rules)
