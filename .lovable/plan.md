## Fix /sell publish failure, duplicates, media issues, and add drafts

### 1. Fix publish failure (root cause found)
The DB trigger `tg_listings_match_parts_wanted` compares `NEW.status = 'published'`, but `'published'` isn't in the `listing_status` enum (valid: `draft`, `pending_payment`, `active`, `expired`, `hidden`, `sold`, `pending_sale`). Postgres tries to cast the literal to enum on every INSERT → `22P02 invalid input value for enum listing_status: "published"`.

Migration: replace `'published'` with `'active'` inside the trigger function.

### 2. Remove duplicate form entries (page 1 – "Details")
- `CategoryAttributesEditor` currently renders **twice** for non-vehicle categories (parts, truck, etc.): once inline in the Listing section and again in the standalone "Details" `SellGroup`. Keep only the inline one; delete the second block.
- The standalone "Vehicle details" block also re-renders Make/Model/Year inputs that already exist in the Listing section for non-car/motorcycle categories. Delete that duplicate block (Listing section already covers it).

### 3. Map render error
Leaflet map ends up half-rendered (blank right side) because the container is inside a hidden/accordion panel that mounts before layout is final. Call `map.invalidateSize()` on mount + on step change + on ResizeObserver in `location-picker-inner.tsx`.

### 4. Media issues
- Photo thumbnails call `URL.createObjectURL(file)` on **every render** → old blob URLs get GC'd and network log fills with `ERR_FILE_NOT_FOUND`. Cache blob URLs in a `Map<File, string>` (or `useMemo` per file) and `revokeObjectURL` on removal/unmount.
- Video: same fix + ensure thumbnail preview stays visible after upload completes (currently only shows during progress).
- Block Submit / step-forward when any photo or video is still `uploading` — show a small warning banner and disable navigation buttons instead of silently allowing submit.

### 5. Auto-save "Safe Drafts"
- Create table `public.listing_drafts` (user_id, category_slug, form_json, media_paths jsonb, updated_at) with RLS scoped to `auth.uid()` and grants for `authenticated` + `service_role`.
- Debounced (2s) auto-save of the whole form state to the user's draft row while typing. Also save on step change.
- On `/sell` mount, if a draft exists, show a banner: "Resume your draft from {date} · [Resume] [Discard]".
- Delete the draft row on successful publish.

### 6. Phone prefill fix
Don't silently prefill `contact_phone` from the user's profile — the user reported "a phone number that shouldn't be there". Change the prefill to only populate on explicit "Use my saved number" button, OR add an inline "×" clear affordance and skip prefill if the profile phone is different from the visible national field (keep blank by default).

### Technical notes
- Files touched: `src/routes/sell.tsx`, `src/components/businesses/location-picker-inner.tsx`, one new migration, one new `listing-drafts.functions.ts` (or direct supabase calls from client), plus regen types after migration.
- Trigger migration is the single blocker for publishing; everything else is UX polish.
- No changes to pricing/fees so Terms doesn't need a bump.

### Out of scope (ask if wanted)
- Swapping tow map from Google to Leaflet.
- Server-side draft cleanup cron.
