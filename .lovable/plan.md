# Crowdsourced Business Location Corrections

Let users propose a corrected lat/lng for any business (like Google Maps' "Move this location"). Admins review pending suggestions and approve (apply to the business) or reject (revert/dismiss).

## UX

**Public business page (`/businesses/$slug`)**
- Add a small "Suggest a better location" button near the map / address block.
- Opens a dialog with a draggable-pin map (reuse `LocationPickerInner`) pre-centered on the current business location.
- Optional note field ("Why is this the correct spot?", 0–300 chars).
- Submit creates a `pending` `business_location_corrections` row. Logged-in users record their `user_id`; anonymous users are allowed but rate-limited by IP/business (1 pending suggestion per business per IP).
- Toast: "Thanks — your suggestion will be reviewed."

**Admin panel — new page `/admin/location-corrections`**
- Linked from `admin.index.tsx` admin nav.
- Table of pending suggestions (default filter) with: business name + link, current lat/lng, proposed lat/lng, distance moved (km), submitter (name or "Anonymous"), note, submitted date.
- Row expands to a side-by-side mini-map showing the old pin vs. the proposed pin.
- Actions per row: **Approve** (writes proposed lat/lng to `businesses`, marks row `approved`, stores `previous_lat/lng` for rollback) and **Reject** (marks `rejected`).
- For already-approved rows, an **Undo / Revert** action restores `previous_lat/lng` on the business and marks row `reverted`.
- Filters: status (pending/approved/rejected/reverted), date range, business search.
- Realtime subscription on `business_location_corrections` (same pattern as `ops_alerts` page) so new submissions appear without refresh.

## Technical

**Database migration** — new table `public.business_location_corrections`:
- `id uuid pk`, `business_id uuid fk businesses(id) on delete cascade`
- `proposed_lat numeric, proposed_lng numeric` (validated 1e-6 precision, range checked)
- `previous_lat numeric, previous_lng numeric` (snapshot at submit time)
- `note text` (max 300)
- `submitter_user_id uuid null` (nullable for anon), `submitter_ip text null`
- `status text` enum-checked: `pending|approved|rejected|reverted`, default `pending`
- `reviewed_by uuid null`, `reviewed_at timestamptz null`, `review_note text null`
- `created_at`, `updated_at` + trigger
- Indexes: `(status, created_at desc)`, `(business_id)`
- GRANTs: `select, insert` for `anon` + `authenticated`; full for `service_role`; `update` only via server functions (admin).
- RLS:
  - Anyone can `insert` (rate limiting enforced in server fn, not policy).
  - Submitter (when logged in) can `select` their own row; anyone can `select` rows where `status = 'pending'` for the business they're on (optional — keep it simple: only admins read all, submitter reads own).
  - Admins (`has_role(auth.uid(), 'admin')`) can `select`/`update` all.
- Realtime: `alter publication supabase_realtime add table business_location_corrections; alter table ... replica identity full`.

**Server functions** — new `src/lib/location-corrections.functions.ts`:
- `submitLocationCorrection({ businessId, lat, lng, note })` — public; validates coords with Zod, looks up current `businesses.lat/lng` for the snapshot, enforces "1 pending per (business, user/ip)" via `supabaseAdmin`, inserts row. Uses request headers for IP (best-effort).
- `listLocationCorrections({ status?, fromDate?, toDate?, query? })` — admin (middleware `requireAdmin` or inline `has_role` check using `requireSupabaseAuth`), returns rows joined with business name/slug.
- `reviewLocationCorrection({ id, action: 'approve'|'reject'|'revert', reviewNote? })` — admin; on approve: updates `businesses.lat/lng` to proposed values; on revert: restores `previous_lat/lng`; updates row status + `reviewed_by/reviewed_at`. Logs to existing `admin_audit_log` (action: `'location_correction_'+action`).

**Components**:
- `src/components/businesses/suggest-location-dialog.tsx` — dialog wrapping the existing `LocationPicker` lazy component, with submit button.
- Add trigger button to `src/routes/businesses.$slug.tsx` near the existing map/address.

**Admin route** — `src/routes/admin.location-corrections.tsx`:
- Mirrors `admin.alerts.tsx` structure (filters, realtime, ack-like actions, dedup/upsert).
- Side-by-side map preview uses `LocationPickerInner` in read-only mode (no click handler) showing both markers.
- Add link in `admin.index.tsx` (admin home/nav).

## Files
- New: `supabase/migrations/<ts>_business_location_corrections.sql`
- New: `src/lib/location-corrections.functions.ts`
- New: `src/components/businesses/suggest-location-dialog.tsx`
- New: `src/routes/admin.location-corrections.tsx`
- Edited: `src/routes/businesses.$slug.tsx` (add trigger button)
- Edited: `src/routes/admin.index.tsx` (admin nav link)

## Out of scope
- Reputation/voting on suggestions
- Auto-approve when many users agree
- Suggestions for fields other than lat/lng (name, hours, etc.)
