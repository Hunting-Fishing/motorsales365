## Admin Ad Slots & Placeholders Manager

Build the admin UI to manage everything that drives the `/advertise` preview and live ad rendering: slot specs, placeholder creatives, advertiser-creative assignments, and a live preview that mirrors the public `placement-preview.tsx`.

### New routes
- `/admin/advertisements/slots` — list & edit all 12 seeded `ad_slots`
- `/admin/advertisements/placeholders` — upload/manage `ad_creatives` where `kind='placeholder'`
- `/admin/advertisements/preview` — full-page live preview of every section, pulling real data from `ad_slot_assignments`

All three added as tabs under the existing `admin.advertisements.tsx` shell, beside Campaigns / Inquiries / Promotions / QR Ads / History.

### Screen 1 — Slots manager (`/admin/advertisements/slots`)
Grid of slot cards grouped by `placement` (marketplace_home, marketplace_category, browse, rides, …). Each card shows:
- `slot_key`, `label`, `placement`, `position`
- Current image spec: `min_width × min_height`, `aspect_ratio`, `max_bytes`, allowed MIME
- Active toggle
- Thumbnail of currently-assigned creative (advertiser ad if live, else placeholder, else empty state)
- Edit button → dialog to update label/description/spec/position/active
- Drag-and-drop reordering inside a placement (updates `position`)

Server fns: `listAdSlots`, `updateAdSlot`, `reorderAdSlots` (admin-only, `has_role(...,'admin')` or `canManageAds`).

### Screen 2 — Placeholders manager (`/admin/advertisements/placeholders`)
Per-slot panel listing placeholder creatives stacked for that slot. Each row:
- Image preview, headline, alt text, target URL
- Spec validation badge (green if `spec_ok`, red with `spec_errors` tooltip)
- Active/inactive toggle, drag handle for ordering, delete
- "Upload placeholder" button → file picker

Upload flow:
1. Client reads file → measures dimensions, MIME, byte size
2. Validates against the slot's `image_spec` before upload (instant feedback)
3. Uploads to `advertisements` storage bucket at `placeholders/{slot_key}/{uuid}-{filename}`
4. Calls `createPlaceholderCreative` server fn → inserts `ad_creatives` row (`kind='placeholder'`, `order_id=null`) + `ad_slot_assignments` row (no `ends_at`, `active=true`)
5. Re-validates server-side and stores `spec_ok` + `spec_errors`

Server fns: `listPlaceholdersForSlot`, `createPlaceholderCreative`, `updatePlaceholderCreative`, `deletePlaceholderCreative`, `reorderPlaceholders`.

### Screen 3 — Live preview (`/admin/advertisements/preview`)
Renders the same `PlacementPreview` component used on `/advertise`, but switched to data mode:
- Reuses `placement-preview.tsx` layout
- For each `AdSlot`, calls `getLiveCreativeForSlot(slot_key)` (anon-safe server fn) which returns the highest-priority active assignment: advertiser ad in window first, then placeholder, then `null`
- Falls back to a dashed "Empty slot — no creative" tile when null
- Section dropdown + "Refresh" button + last-updated timestamp
- Each rendered slot has an overlay with `slot_key`, current creative kind, and a quick "Manage" link to the Placeholders screen filtered to that slot

### Wire `/advertise` preview to live data
Refactor `src/components/advertise/placement-preview.tsx`:
- Replace hardcoded `import adHero from ...` lines with a `useSlotCreative(slot_key)` hook that calls `getLiveCreativeForSlot` (via TanStack Query, 60s stale)
- `AdSlot` accepts `slotKey` instead of `src`, derives src/alt/sub from data, keeps the "Example ad" pill when `kind='placeholder'`
- Bundled `src/assets/advertise-samples/*` images become the initial placeholder seed (uploaded once into `ad_creatives` via a one-off migration that copies them via signed upload OR an admin-run "Seed defaults" button)

### Seeding strategy for current sample images
Add a "Seed default placeholders" button on the Placeholders screen (admin-only, idempotent). It:
1. For each of the 15 current `src/assets/advertise-samples/*.jpg`, fetches the bundled asset
2. Uploads to `advertisements/placeholders/seed/...`
3. Inserts a placeholder `ad_creatives` row + `ad_slot_assignments` mapped to the matching `slot_key`

Mapping table lives in `src/lib/advertise-seed-map.ts` (slot_key → asset path → headline/alt).

### Server functions (new file `src/lib/advertise-admin.functions.ts`)
- All admin write fns use `requireSupabaseAuth` + `has_role(userId, 'admin')` or `canManageAds` check
- `getLiveCreativeForSlot` is public (anon-safe), uses server publishable client, narrow SELECT, picks one row per slot

### RLS additions
Current migration already covers slots/creatives/assignments admin-write + anon-read-active. Add: storage policy on `advertisements/placeholders/**` allowing admin upload/delete.

### Files to create
- `src/routes/admin.advertisements.slots.tsx`
- `src/routes/admin.advertisements.placeholders.tsx`
- `src/routes/admin.advertisements.preview.tsx`
- `src/lib/advertise-admin.functions.ts`
- `src/lib/advertise-public.functions.ts` (`getLiveCreativeForSlot`)
- `src/lib/advertise-seed-map.ts`
- `src/components/advertise/slot-card.tsx`
- `src/components/advertise/placeholder-uploader.tsx`
- `src/hooks/use-slot-creative.ts`

### Files to edit
- `src/routes/admin.advertisements.tsx` — add 3 tabs
- `src/routes/admin.advertisements.index.tsx` — keep redirect target
- `src/components/advertise/placement-preview.tsx` — switch to live data with sample images as fallback while DB empty

### Verification
- Admin can edit a slot's `min_width`; uploading a too-small image shows red badge and stores `spec_errors`
- Drag-reorder persists `position` across reload
- Toggling a placeholder inactive immediately removes it from `/advertise` preview after refetch
- Seed button is idempotent (re-running doesn't duplicate)
- Non-admins hitting any of the 3 routes see "Ads manager role required"

### Out of scope (next phase)
- Advertiser-facing upload wizard
- Stripe checkout for `ad_orders`
- Admin order review queue
- Owner dashboard at `/account/advertisements`
- Cron expiry job