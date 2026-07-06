## What's actually going on (verified in DB)

The user in the screenshot is `jordilwbailey@gmail.com` (id `a3999f39…`, owner of business "Test Tow Company"). I pulled their real records:

**`profiles` row — what IS populated:**
`first_name=365`, `last_name=MotorSales`, `full_name=365 MotorSales`, `phone_e164=+639696063830`, `signup_intent=business`, `business_address=#18 Estancia`, `business_postal_code=2912`, `avatar_url`, `verification_status=verified`, `is_founding_member=true`.

**`profiles` row — what is NULL** (this is exactly the 9 fields the banner lists):
`personal_email`, `signup_region`, `signup_province`, `signup_city`, `business_name`, `business_kind`, `business_region`, `business_province`, `business_city`.

**`businesses` row for the same user (the "completed form"):**
`name="Test Tow Company"`, `type_slug=towing`, `region="Ilocos Region (I)"`, `province="Metro Manila"`, `city="Piddig"`, `phone`, `email`.

**Root cause:** the profile form for business users saves the business identity into the `businesses` table (correct — that's the source of truth). The `profiles.business_name / business_kind / business_region / business_province / business_city` columns are legacy duplicates that never get written by that flow. The completeness banner reads only `profiles.*`, so it reports those columns as missing even though the equivalent info exists on `businesses`. The personal fields (`signup_region/province/city`, `personal_email`) are genuinely still empty on this account.

## Fix — Profile completeness banner

`src/components/profile-completeness-banner.tsx`

1. **Also load the user's `businesses` row** (`select("name,type_slug,region,province,city,barangay").eq("owner_id", userId).limit(1)`).
2. When `signup_intent` is business/service_provider, treat each `business_*` field as satisfied if EITHER the profile column OR the corresponding column on the owned business row is populated:
   - `business_name` ← `profile.business_name || biz.name`
   - `business_kind` ← `profile.business_kind || biz.type_slug`
   - `business_region` ← `profile.business_region || biz.region`
   - `business_province` ← `profile.business_province || biz.province`
   - `business_city` ← `profile.business_city || biz.city`
3. Leave the personal fields (`signup_region/province/city`, `personal_email`, phone) untouched — those are legitimately missing on this account and the banner should still surface them.
4. Keep the existing `is_staff_account` short-circuit as-is (per user's request, do NOT add an admin exemption).
5. Update the `HASH_FOR` map so that when only `business_*` fields remain, "Edit profile" targets the business location section on `/dashboard/profile` (already `field-business_location`).

**Behavior after fix, for this specific user:** banner drops from 9 → 4 missing (personal email, signup region, signup province, signup city). Once they fill those, banner disappears.

## Fix — "All Regions / Full Philippines" option in every region picker

Sentinel: store the literal string `"All Philippines"` in the region column (existing schema is text; no migration needed).

**Shared (`src/lib/psgc.ts`):**
- Export `ALL_PH_REGION = "All Philippines"`.
- Prepend it to `REGION_OPTIONS` so it's the first choice in every dropdown/combobox.
- `provincesOf("All Philippines")` and `citiesOf("All Philippines", …)` return `[]` (province/city selects auto-disable with helper text "Nationwide — no province needed").
- `findRegionByLabel("All Philippines")` returns a synthetic region so nothing crashes.

**Pickers that get the new option automatically via `REGION_OPTIONS` / `PSGC`:**
- `src/components/location-picker.tsx` (main combobox picker used across dashboard/profile, signup, business edit, verification, sell, dispatch, admin dialogs)
- `src/components/businesses/location-drilldown.tsx`
- `src/components/admin/ph-location-picker.tsx`
- `src/components/businesses/suggest-location-dialog.tsx`

When Region = All Philippines: force `province/city/barangay = null`, disable those inputs, show "Serves the entire Philippines."

**Left as-is:** `src/components/businesses/map-filter-bar.tsx` — that's a radius/distance filter, "All Philippines" doesn't apply.

**Filter/search behaviour** (list views must show nationwide businesses under every region filter): update the WHERE to `region.eq.<selected> OR region.eq."All Philippines"` in `src/routes/businesses.index.tsx`, `src/routes/browse.$category.tsx`, and the admin list routes.

**Signup & validation:** in `src/routes/signup.tsx`, `src/routes/api/public/auth/signup.tsx`, and `src/__tests__/signup-validation.test.ts`, skip province/city required-checks when region = All Philippines and add a passing case.

**Forms that must accept nationwide submit** (province/city no longer required when region = All Philippines): `dashboard.profile.tsx`, `businesses.submit.tsx`, `dashboard.businesses_.$id.edit.tsx`, `admin` add/edit user dialogs, `sell.tsx`, `dashboard.dispatch.tsx`, `dashboard.verification.tsx`.

**Not touched:** reverse-geocode ("Use my location") still resolves to a specific region; never auto-picks All Philippines. No DB migration. No backend function changes.
