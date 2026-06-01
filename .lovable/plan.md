## Phase 1 (P0) — remaining items

Continuing from the email templates + triggers + business_kind enum sync already shipped. Four items left to close out Phase 1.

### 1. Resolve `business_kind` type-cast errors in verification
- `dashboard.verification.tsx` now renders all 21 options from `BUSINESS_KIND_OPTIONS`, but TS still narrows `business_kind` to the old 4-value union in places.
- Fix the form state + insert payload to type as `Database["public"]["Enums"]["business_kind"]` (regenerated after the enum migration) and drop any `as any` casts.

### 2. Branch `CatalogPicker` by business type
- `src/components/business/service-catalog-picker.tsx` currently always loads `FUEL_STATION_CATALOG`.
- Add a `typeSlug` prop. Map:
  - `fuel_station` → existing fuel catalog
  - everything else → generic "Add custom service" panel (name + price + duration + description), backed by the same `services` table shape.
- Update call sites in `dashboard.businesses_.$id.edit.tsx` and `businesses.submit.tsx` to pass `typeSlug`.

### 3. `submitBusiness` server function
- New file: `src/lib/businesses.functions.ts` (createServerFn, `requireSupabaseAuth`).
- Zod-validate the full submit payload (name, type_slug, contact, location, hours, photos[], services[]).
- Slug generation loop: slugify(name) → check `businesses.slug` uniqueness → append `-2`, `-3`… until free (max 50 tries).
- Insert business row owned by `auth.uid()` with `status='pending'`.
- Insert child rows (hours, services, photos) in same handler.
- Enqueue `business-submitted` email (already wired via DB trigger — handler just returns).
- Replace the raw `(supabase as any).from('businesses').insert(...)` block in `src/routes/businesses.submit.tsx` with `useServerFn(submitBusiness)` + friendly slug-collision error toast.

### 4. "Location" tab in business editor
- New tab in `src/routes/dashboard.businesses_.$id.edit.tsx` between Profile and Hours.
- Reuses `LocationPicker` from submit flow.
- Editable fields: `street_address`, `city`, `province`, `region`, `postal_code`, `lat`, `lng`, plus map marker drag.
- Save via existing `updateBusiness` server fn (extend allowed columns).

### Files touched
- create `src/lib/businesses.functions.ts`
- edit `src/components/business/service-catalog-picker.tsx`
- edit `src/routes/businesses.submit.tsx`
- edit `src/routes/dashboard.businesses_.$id.edit.tsx`
- edit `src/routes/dashboard.verification.tsx` (type cleanup only)
- edit `src/lib/business-pages.functions.ts` (if `updateBusiness` needs new allowed fields)

### Out of scope (Phase 2)
Editable core ProfileTab fields, AlertDialog swaps, Google OAuth stash, tier gates, pending-upgrade affordance, Stripe portal link, dead `private_seller` removal, hours-completeness check, partial-day booking exceptions.

Approve to switch to build mode and ship items 1–4 in that order.
