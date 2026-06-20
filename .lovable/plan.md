## Goal

Turn `/advertise` from a marketing/preview page into a working portal: advertisers submit creatives → pay/select package → admin verifies (purchase, package, image specs, content) → approved ads slot into placements alongside admin-managed placeholder creatives, all reorderable via drag-and-drop.

## What we already have

- `public.advertisements` table (basic: title, image_url, target_url, placement enum, status, priority, dates, counters, created_by, category_slug).
- `src/lib/advertiser-portal.functions.ts` — list / submit (draft) / pause for owners.
- Admin tabs scaffolded at `/admin/advertisements` (inquiries, campaigns, promotions, qr-ads, history).
- `placement-preview.tsx` shows hardcoded sample images per placement.

What's missing: packages/pricing, payments link, asset storage + spec validation, admin-curated placeholder library, slot ordering, structured approval workflow with reasons, per-placement spec rules.

## New database structure

### 1. `ad_packages` (admin-managed catalog)
- `slug` (unique), `name`, `description`
- `placement` (enum, reuse existing `ad_placement`)
- `duration_days`, `price_cents`, `currency`
- `max_impressions` (nullable), `priority_weight`
- `image_spec`: `min_width`, `min_height`, `aspect_ratio` (text e.g. "16:9"), `max_bytes`, `allowed_mime` (text[])
- `active`, `sort_order`
- RLS: anon SELECT where active; admin/advertising full write.

### 2. `ad_orders` (one row per purchase attempt)
- `advertiser_id` (auth.users), `package_id` (fk), `placement`, `category_slug`
- `status` enum: `pending_payment | paid | submitted | in_review | approved | rejected | live | expired | refunded | cancelled`
- `payment_id` (fk → existing `payments`), `amount_cents`, `currency`
- `requested_start`, `requested_end`, `actual_start`, `actual_end`
- `rejection_reason`, `admin_notes`, `reviewed_by`, `reviewed_at`
- Timestamps + update trigger.
- RLS: owner read own; admin/advertising read+write all.

### 3. `ad_creatives` (uploaded images, 1..N per order)
- `order_id` (fk, nullable for placeholder library entries), `uploaded_by`
- `image_url` (storage path), `image_width`, `image_height`, `file_size_bytes`, `mime_type`
- `headline`, `caption`, `target_url`, `alt_text`
- `kind` enum: `advertiser | placeholder` (placeholders shown when no paid ad fills a slot)
- `spec_ok` bool + `spec_errors` jsonb (server-validated on upload)
- `status`: `pending | approved | rejected`, `rejection_reason`
- Timestamps. RLS: owner CRUD own draft; admin all; public SELECT only via server fn that joins to live orders/placeholders.

### 4. `ad_slots` (the actual placement positions on the site)
- `slot_key` (unique, e.g. `marketplace_home_hero_1`, `category_cars_banner`, `rides_top`)
- `placement` (enum), `category_slug` (nullable), `label`, `description`
- `image_spec` (same shape as package), `position` (int, for drag-drop ordering inside a placement group)
- `active`
- Seeded with every placement the current `placement-preview.tsx` shows.
- Admin/advertising write; anon read active.

### 5. `ad_slot_assignments` (which creative occupies which slot, when)
- `slot_id` (fk), `creative_id` (fk), `order_id` (nullable — null = placeholder)
- `starts_at`, `ends_at`, `position` (drag-drop order within slot rotation), `active`
- Unique partial index: one active assignment per (slot, position, time window).
- RLS: anon read currently-live rows via SECURITY DEFINER fn; admin full write.

### 6. `ad_order_events` (audit / approval history)
- `order_id`, `actor_id`, `event_type` (`submitted | payment_verified | package_verified | image_verified | approved | rejected | paused | resumed | expired`), `notes`, `created_at`. Admin/owner read; insert via server fns.

### 7. Storage bucket `advertisements`
- Private bucket. Server fns issue signed URLs for review; approved creatives served via signed URL or copied to a public read path.
- RLS on `storage.objects`: owner can insert/read own prefix `{user_id}/...`; admin all.

## Server functions (new / extended)

`src/lib/advertise-packages.functions.ts`
- `listAdPackages` (public), `upsertAdPackage` / `deleteAdPackage` (admin).

`src/lib/advertise-orders.functions.ts`
- `createAdOrder` (auth) → returns order + Stripe checkout link (reuses existing `payments` infra).
- `listMyAdOrders`, `getAdOrder`.
- `adminListAdOrders`, `adminReviewAdOrder({ id, decision: 'approved'|'rejected', reason })` — writes `ad_order_events`, flips status, on approve creates `ad_slot_assignments`.

`src/lib/advertise-creatives.functions.ts`
- `uploadCreativeMetadata` — called after client uploads to storage; server reads file from storage, validates: mime in `allowed_mime`, `file_size_bytes <= max_bytes`, dimensions ≥ `min_width/height`, aspect within tolerance. Writes row with `spec_ok` + `spec_errors`.
- `listMyCreatives`, `deleteMyCreative` (only draft).
- Admin: `adminApproveCreative`, `adminRejectCreative`.

`src/lib/advertise-slots.functions.ts`
- `listSlots`, `upsertSlot`, `reorderSlots({ placement, ids[] })` (admin drag-drop).
- `listSlotAssignments(slotId)`, `assignCreativeToSlot`, `reorderSlotAssignments({ slotId, ids[] })`.
- `getLiveCreativeForSlot(slotKey)` — anon, used by frontend; picks first active assignment (advertiser priority over placeholder).

`src/lib/advertise-placeholders.functions.ts` (admin)
- CRUD on `ad_creatives` where `kind='placeholder'`, plus quick "replace placeholder" action.

## Frontend work (after DB is approved)

### `/advertise` (public portal)
- Replace static preview with: packages grid (from `ad_packages`), "Buy this placement" CTA.
- Auth gate → wizard:
  1. Pick package
  2. Upload creative(s) → live spec check (client-side dims/size, then server confirms)
  3. Pick start date / category
  4. Stripe checkout
  5. Submitted screen → "in review"
- Dashboard tab at `/account/advertisements`: list orders + status, can pause live ads, edit drafts.

### `/admin/advertisements/campaigns` (extend)
- Tabs: **Orders to review** | **Live** | **Placeholders** | **Slots**.
- Orders table → review drawer (image preview, spec check results, advertiser info, payment status). Approve/Reject with required reason. Approval auto-creates slot assignment for selected slot/position.
- Placeholders: gallery; upload + assign to slot. Drag-and-drop reorder within a placement group (uses `@dnd-kit/sortable`, already common in the project).
- Slots: list per placement, drag-drop reorder, edit image_spec, toggle active.

### `placement-preview.tsx`
- Switch from hardcoded imports to `getLiveCreativeForSlot(slotKey)` so admin changes show up immediately. Keep current AI-generated images as seeded placeholder rows so visuals don't regress.

## Verification checklist (the "anything I'm missing" list)

- Purchase verify → `payments.status = 'succeeded'` linked to `ad_orders.payment_id` before approval is allowed.
- Package verify → order's package must be `active` and creative's `placement` matches package's `placement`.
- Image verify → mime, byte size, min dimensions, aspect ratio tolerance, NSFW flag field (manual for now, AI-moderation hook later).
- Content verify → required `alt_text`, `target_url` must be https + same/whitelisted domain or admin override.
- Schedule verify → `starts_at < ends_at`, ends within package `duration_days` from start.
- Conflict verify → no overlapping active assignment in same `(slot, position)` window.
- Audit trail → every state change writes `ad_order_events`; admin actions also go to existing `admin_audit_log`.
- Owner controls → pause/resume own live ad; pausing flips assignment `active=false` without deleting history.
- Expiry job → daily server route under `/api/public/cron/expire-ads` flips finished ads to `expired` and deactivates assignments.
- Refund path → admin can mark `refunded`, automatically pauses assignment.
- Anti-abuse → rate-limit creative uploads per user/hour; max creatives per order.
- Accessibility → require `alt_text`; enforce min contrast in admin guidance.
- Analytics → keep existing `impressions_count` / `clicks_count`; log to `ad_events` (already exists) for time-series.

## Build order (one approval per migration)

1. **Migration 1** — `ad_packages`, `ad_orders`, `ad_creatives`, `ad_slots`, `ad_slot_assignments`, `ad_order_events` + grants + RLS + triggers + storage bucket + seed slots from current placements.
2. Server functions for packages/orders/creatives/slots.
3. Admin UI: slots + placeholders + orders review (drag-drop).
4. Public `/advertise` wizard + Stripe checkout reuse.
5. Wire `placement-preview.tsx` to live data; keep current images as seeded placeholders.
6. Cron expiry route + owner dashboard.

Confirm and I'll start with Migration 1.
