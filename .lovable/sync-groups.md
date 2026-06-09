# Sync Groups Registry

Each "sync group" is a feature whose correctness depends on multiple files staying consistent. Files participating in a group MUST include a `SYNC GROUP:` header pointing at the matching anchor below. When you change a file in a group, scan the others in the group and apply matching edits, then bump the `VERSION` on every touched file.

Find every file in a group fast: `rg "SYNC GROUP: <name>"`

Convention for the header (place at the very top of the file):

```ts
/**
 * SYNC GROUP: <group-name>
 * Source of truth: .lovable/sync-groups.md#<group-name>
 * On change: bump VERSION + update sync-groups.md
 * VERSION: 1
 */
```

---

## vehicle-passport
Public per-vehicle profile (`/passport/$slug`) — owner timeline, service history, photos, mods, accident/flood disclosure, ownership count, QR, transfer-on-sale, public/private toggle, premium hook.

**Files**
- `src/routes/passport.$slug.tsx` — public passport page (SSR head + loader)
- `src/routes/dashboard.vehicles.tsx` — owner editor (privacy toggle, disclosures, mods, photos, transfer)
- `src/components/passport-share-section.tsx` — share/QR row
- migration: `vehicles` columns `ownership_count`, `disclosures`, `modifications`, `transferred_to_listing_id`, `passport_premium`; table `vehicle_photos`

**Also update when this changes**
- `/terms` §data-handling and `/privacy` (passport data + retention)
- `.lovable/june7-audit.md` — bump item #14

**Schema invariants**
- `vehicles.is_public = true` is the gate for everything public
- `vehicles.disclosures` = `{ flood: 'none'|'minor'|'major', accident: 'none'|'minor'|'major', notes?: string }`
- `vehicle_photos` RLS: anon SELECT only when parent vehicle `is_public`

---

## inspection-services
PH inspection & transaction-safety upsells (audit #20).

**Files**
- `src/routes/services.inspection.tsx` — public rate card + request form
- `src/lib/inspection.functions.ts` — `listInspectionServices`, `createInspectionOrder`, `listMyInspectionOrders`
- `src/routes/listing.$id.tsx` — "Request inspection" CTA aside (cars/motos/trucks only)
- migration: `inspection_services` (catalog), `inspection_orders` (requests)

**Also update**: `/terms` §services language, `/refund-policy`, bump "Last updated".

**Schema invariants**
- `inspection_services.active = true` gates catalog visibility for anon/auth
- `inspection_orders.buyer_id` MUST equal `auth.uid()` on insert (RLS)
- `inspection_orders.status ∈ {requested, assigned, in_progress, completed, cancelled}`; buyer can only update while `requested|assigned`
- Never use the word "escrow" in copy — use "transaction assistance" / "payment release partner"

---

## vehicle-quality  *(existing)*
Listing quality fields + validation + VIN scan + (pending) PH document checklist.

**Files**
- `src/components/vehicle-quality-fields.tsx` — schema + form
- `src/components/vin-scan-dialog.tsx` — VIN scan + decode
- `src/routes/sell.tsx`, `src/routes/listing.$id.edit.tsx` — integration
- `src/routes/listing.$id.tsx` — read-only render

**Also update**: any new attribute persisted to `listings.attributes` must render on the detail page renderer.

---

## payments  *(existing, expansion pending — step 4)*
Plan caps, payment methods, receipt rendering.

**Files**
- `src/lib/plan-limits.ts`, `src/routes/pricing.tsx`, `src/routes/payments.$id.receipt.tsx`, `src/lib/listing-payment.functions.ts`

**Also update**: `/terms` §payments, `/refund-policy`, `/pricing`, bump "Last updated".

---

## business-directory  *(existing, depth pass pending — step 5)*
**Files**: `src/routes/businesses.$slug.tsx`, `src/routes/businesses.index.tsx`, `src/lib/businesses.functions.ts`, `src/lib/business-claims.functions.ts`.

---

## learn  *(existing, commercialization pending — step 6)*
**Files**: `src/routes/learn.index.tsx`, `src/routes/learn.$slug.tsx`, `src/lib/education.functions.ts`, training_partners + courses tables.

---

## terms-and-policies  *(meta)*
Core memory rule: any change to fees / payments / boosts / subscriptions / refunds / business directory / services-products catalog / pricing units / prohibited items / data handling MUST also update `/terms` (+ `/refund-policy`, `/privacy` where relevant) and bump "Last updated".

**Files**: `src/routes/terms.tsx`, `src/routes/refund-policy.tsx`, `src/routes/privacy.tsx`.
