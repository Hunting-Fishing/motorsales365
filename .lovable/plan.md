## Remaining Audit Work — Build Plan

Tackle the unfinished items in priority order, and add **cross-file "sync headers"** at the top of every related file so future edits stay consistent.

### Cross-file consistency convention (new)

Every file that participates in a shared feature gets a top comment block:

```ts
/**
 * SYNC GROUP: vehicle-passport
 * Sibling files (keep in sync):
 *  - src/routes/passport.$slug.tsx
 *  - src/components/passport/passport-card.tsx
 *  - src/lib/passport.functions.ts
 *  - supabase migration: 20260609_vehicle_passport.sql
 * Source of truth: .lovable/sync-groups.md#vehicle-passport
 * On change: bump VERSION below + update sync-groups.md
 * VERSION: 1
 */
```

Plus a new `.lovable/sync-groups.md` registry listing every group, its files, schema columns, and the "must-also-update" pages (Terms, Privacy, Refund). This becomes the single source of truth — a quick `rg "SYNC GROUP: <name>"` reveals every file to touch.

### Build order

**1. #14 — 365 Vehicle Passport** (highest leverage)
- New `vehicle_passports` table (slug, owner_id, vehicle_id, public bool, ownership_count, qr_token) + `passport_events` (owner change, service, mod, accident, photo) + `passport_documents`.
- Public route `/passport/$slug` (SSR, OG tags from loader) — timeline, photos, mods, service history, ownership count (no PII), accident/flood disclosure.
- Owner controls: `/dashboard/vehicles/$id/passport` — public/private toggle, QR download, "Transfer on sale" action that links a passport to a listing and re-assigns on sale.
- Premium tier hook (free = basic timeline; paid = full history report PDF) — wires to existing `subscription_plans`.
- Sync group ties: `passport`, `listings`, `user_garage_vehicles`, `/terms` §data-handling, `/privacy`.

**2. #20 — Inspection & transaction-safety upsells**
- New `inspection_services` catalog (OR/CR review ₱199–499, ID verify ₱99–299, pre-purchase inspection ₱500–2,500, history report ₱199–999, transaction assistance flat/%).
- New `inspection_orders` table (buyer_id, listing_id, service_id, status, provider_id, payment_id).
- Route `/services/inspection` (public rate card) + checkout flow reusing existing `payments` table.
- Buyer CTA "Request inspection" on `/listing/$id`.
- Language: "transaction assistance" / "payment release partner" — never "escrow."
- Sync group: `inspection`, `/terms` §services, `/refund-policy`, `/listing/$id`.

**3. #7-ext — PH Vehicle-Document Workflow checklist**
- Per-listing checklist persisted in `listings.attributes.doc_checklist`: OR/CR present, owner matches CR, deed of sale ready, valid IDs, chassis matches CR, engine matches CR, plate matches, LTO alarm clear, encumbrance/chattel mortgage check, HPG clearance (high-value), flood/accident disclosure.
- New `DocumentChecklist` component shown on `/sell`, `/listing/$id/edit`, and a read-only badge row on `/listing/$id`.
- "Transfer of ownership" guide page `/learn/transfer-of-ownership` linked from listing detail.
- Sync group: `vehicle-quality` (extends existing `VehicleQualityFields`).

**4. #9-ext — Payments: expand for PH market**
- Add Maya, QR Ph, GCash send-to-number, manual payment upload (private bucket `payment-proofs`), PayPal (international export only).
- `payment_methods` enum extension + UI on `/checkout` and `/dashboard/billing`.
- Receipt/invoice PDF download from `/payments/$id/receipt` (already exists — add downloadable PDF).
- "Pay with GCash" mini-guide page.
- Sync group: `payments`, `/terms` §payments, `/refund-policy`, `/pricing`.

**5. #11 — Business Directory profile depth**
- Extend `businesses` UI (no schema change): ensure each profile shows Claim button, Verified/Unclaimed badge, hours, services, photos, reviews tab, sponsored upgrade CTA.
- Add "Claim this business" inline CTA on every unclaimed `/businesses/$slug`.
- Sync group: `business-directory`.

**6. #17 — Learn commercial purpose**
- Wire existing `courses` + `training_partners` tables to: paid-course marketplace tiles on `/learn`, sponsored training schools row, mechanic certification badge on `business_profiles`, "Hire trained mechanic" directory filter, tool-affiliate row beneath each course (pulls from `shop_products` by category tag).
- Sync group: `learn`, `/businesses`, `/shop`.

**7. Monetization track wiring** (mostly UI surfacing; backend already exists)
- Boosted listings: surface `/dashboard/boosts` CTA on owner's listing card.
- Dealer subscriptions: link `/pricing` Dealer tiers from `/start-selling` and `/dashboard`.
- Business directory paid profiles: "Upgrade to Featured" CTA on owner's `/dashboard/businesses`.
- Sponsored ad placements: ensure `/advertise` inquiry form reaches `ad_inquiries` (already does — verify).
- Inspection referrals + Vehicle Passport premium fold into items #20 and #14.

### Audit log
Each completed step appends a dated line to `.lovable/june7-audit.md` and updates `.lovable/sync-groups.md`.

### Order of execution (one batch per turn for review)
1. Sync-groups registry + Vehicle Passport (#14)
2. Inspection services (#20)
3. PH document checklist (#7-ext)
4. PH payments expansion (#9-ext)
5. Business directory depth (#11)
6. Learn commercialization (#17)
7. Monetization surfacing pass

Approve to start with **step 1 (sync registry + Vehicle Passport)**.