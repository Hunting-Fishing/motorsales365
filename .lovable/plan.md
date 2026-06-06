## Problem

The discover-businesses screen currently shows **two different category vocabularies**:

1. **Search-terms group dropdown** (image 1) — uses `BUSINESS_KIND_OPTIONS` (22 values: `dealer`, `rental`, `parts_shop`, `repair_shop`, `body_shop`, `tire_shop`, `battery_shop`, `towing`, `fuel_station`, `carwash`, `salvage`, `accessories`, `audio_tint`, `inspection`, `driving_school`, `lto_services`, `insurance`, `financing`, `transport`, `corporate`, `other`).
2. **Per-row "category" dropdown on imported preview** (image 2) — uses `business_types.slug` (11 values: `dealership`, `repair_shop`, `motorcycle_shop`, `tire_shop`, `body_paint`, `parts_accessories`, `carwash`, `fuel_station`, `insurance`, `salvage`, `towing`).

These overlap but don't match (`dealer` vs `dealership`, `parts_shop` vs `parts_accessories`, `body_shop` vs `body_paint`, plus 11 fields from the signup list have no `business_types` row, so an imported FB page in those fields cannot be filed correctly).

## Goal

One shared category list across signup, discover search-terms, and the imported-row category picker, so any field you can pick during discovery is the same field stored on the resulting business and the same field a business owner picks at signup.

## Approach — make `business_types` the single source

`business_types` is the table the directory, map, filters and routing already key off (`businesses.type_slug` is a FK-style text). It's the harder one to change after the fact, so we align everything to it and grow it to cover the full 365 field list.

### 1. Expand `business_types` (DB migration)

Add the missing slugs (with labels + sort_order) so the table covers every 365 field:

```
rental             — Vehicle rental
parts_accessories  — already exists, re-label to "Parts supplier / shop"
battery_shop       — Battery shop
accessories        — Accessories / customization
audio_tint         — Audio & window tint
inspection         — Inspection / emissions
driving_school     — Driving school
lto_services       — LTO / registration services
financing          — Financing / loans
transport          — Transport / logistics
corporate          — Corporate / fleet
other              — Other
```

(Existing `dealership`, `repair_shop`, `motorcycle_shop`, `tire_shop`, `body_paint`, `carwash`, `fuel_station`, `insurance`, `salvage`, `towing` stay as-is so existing businesses keep working.)

### 2. Replace `BUSINESS_KIND_OPTIONS` with a derived list

`src/data/business-kinds.ts` becomes a thin wrapper that reads from a single hard-coded list of `{ slug, label }` matching `business_types`. Old slugs (`dealer`, `parts_shop`, `body_shop`) are removed; existing profile rows in those values are migrated:

```sql
update public.profiles set business_kind = 'dealership'        where business_kind = 'dealer';
update public.profiles set business_kind = 'parts_accessories' where business_kind = 'parts_shop';
update public.profiles set business_kind = 'body_paint'        where business_kind = 'body_shop';
```

Then rebuild the `business_kind` enum to match the new canonical list (drop old labels, add new ones).

### 3. Rewrite `src/data/discover-search-terms.ts`

Re-key every group by the new canonical slug (`dealership`, `repair_shop`, `motorcycle_shop`, `body_paint`, `parts_accessories`, `tire_shop`, `battery_shop`, `towing`, `fuel_station`, `carwash`, `salvage`, `accessories`, `audio_tint`, `inspection`, `driving_school`, `lto_services`, `insurance`, `financing`, `transport`, `corporate`, `rental`, `other`). Curated FB/Google search terms stay; only the `kind` field changes.

### 4. Update the FB-category → slug mapper

In `src/routes/admin.discover-businesses.tsx` (`FB_CATEGORY_TO_TYPE`) and `src/lib/business-discovery-sync.server.ts` (`GOOGLE_TYPE_TO_SLUG`, `places.server.ts`) — replace any stale slug with the canonical one and add rules for the new fields (e.g. `/rent|rental/i → rental`, `/insur/i → insurance`, `/tint|audio/i → audio_tint`, etc.).

### 5. Wire the per-row category dropdown

The dropdown in image 2 already reads from `business_types`. Once step 1 lands it will automatically show all 22 fields, matching the discover-group dropdown 1:1. No UI change needed beyond verifying the option list source.

### 6. Sweep code references

`rg` for `"dealer"`, `"parts_shop"`, `"body_shop"` literals and update:
- `src/routes/signup.tsx`
- `src/lib/admin-profile.functions.ts` (the `z.enum(["dealer","repair_shop","insurance"])` — extend or drop the narrow allow-list)
- `src/lib/business-seed.functions.ts`, `business-discovery-sync.server.ts`, `places.server.ts` mapper tables
- `email-templates/verification-submitted.tsx` sample data
- `admin.discover-businesses.tsx` hard-coded array on lines 328-332

### 7. Smoke test

- Discover a FB page → row category dropdown shows all 22 fields, defaults sensibly, imports cleanly.
- Existing businesses (`type_slug` already in `dealership`/`repair_shop`/etc.) still render on `/businesses` and `/map`.
- Existing profiles whose `business_kind` was `dealer`/`parts_shop`/`body_shop` now show as `dealership`/`parts_accessories`/`body_paint` on `/admin/accounts`.
- Signup category picker shows the same 22 options.

## Files touched

- `supabase/migrations/<new>.sql` — add 12 `business_types` rows, rename/migrate `business_kind` enum, backfill `profiles.business_kind`.
- `src/data/business-kinds.ts` — rewrite to canonical 22-slug list.
- `src/data/discover-search-terms.ts` — rekey groups.
- `src/routes/admin.discover-businesses.tsx` — update FB-category map + hard-coded array.
- `src/lib/business-seed.functions.ts`, `src/lib/business-discovery-sync.server.ts`, `src/lib/places.server.ts` — update Google-type → slug maps.
- `src/lib/admin-profile.functions.ts` — broaden validator enum.
- `src/components/admin/edit-profile-dialog.tsx`, `src/routes/signup.tsx`, `src/routes/admin.accounts.tsx`, etc. — auto-pick up new options via `BUSINESS_KIND_OPTIONS`.

## Risk / rollback

- Enum rebuild requires drop-and-recreate with column re-cast; we do it in one transactional migration with the backfill UPDATEs first.
- No data loss: every removed enum value has a 1:1 mapping to the replacement slug.
- If the new `business_types` rows aren't wanted in the public directory yet, we can hide them from `/businesses` nav with a `visible` flag (add column) — but that's optional polish, not part of the merge.
