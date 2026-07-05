## Goal

Show a "Complete your profile" banner at the top of the dashboard listing the exact NULL/empty profile fields for the signed-in user, with a single button that jumps to `/dashboard/profile` focused on the first missing field.

## Where

- New component: `src/components/profile-completeness-banner.tsx`.
- Mount at the top of `MyListings` in `src/routes/dashboard.index.tsx` (the `/dashboard` landing view). Nothing else on that page changes.

## What counts as "missing"

Empty string, `null`, or whitespace-only. Requirements depend on `profiles.signup_intent` (fallback to `seller_type`):

**All account types**
- `first_name`, `last_name`
- `phone_e164` (falls back to `phone`)
- `personal_email`
- `signup_region`, `signup_province`, `signup_city`

**Buyer (`buyer` / private)**
- `street_address`, `postal_code`

**Business / Service provider (`business` / `service_provider`, or `seller_type` in `dealer`/`repair_shop`/`insurance`)**
- `business_name`, `business_kind`
- `business_address`, `business_postal_code`
- `business_region`, `business_province`, `business_city`

Staff accounts (`is_staff_account = true` or `@365motorsales.com` email) skip the banner entirely.

## Banner UX

- Fetches the profile once via `supabase.from("profiles").select(...).eq("id", user.id).maybeSingle()` inside the component (dashboard already uses direct client reads).
- Hidden while loading and hidden if no fields are missing.
- Card style: amber/warning surface, `AlertCircle` icon, heading "Complete your profile", one-line explainer ("These fields are still empty — add them so buyers and sellers can reach you.").
- Missing fields render as a compact 2-column bullet list using friendly labels (e.g. `phone_e164` → "Mobile number", `business_kind` → "Business category").
- Primary button "Edit profile" → `<Link to="/dashboard/profile" hash="field-<first-missing>">`. Secondary text link "Not now" collapses the list for the session via `sessionStorage` (banner still visible next login).
- Live count in the heading: "Complete your profile — 4 missing".

## Small profile-page assist

- In `src/routes/dashboard.profile.tsx`, add matching `id="field-<key>"` wrappers around the inputs for the fields above (phone, personal_email, street_address, postal_code, business_name, business_kind, business_address, business_postal_code, business/signup region/province/city) so the hash from the banner scrolls to the right row. No logic change to the form.

## Verification

- Log in as Jocelyn (known blanks): banner shows Mobile, Personal email, Street address, City, Region, Province; "Edit profile" scrolls to Mobile.
- Fill and save one field → banner recomputes on next dashboard visit and drops it from the list.
- Log in as a fully populated user → banner does not render.
- Log in as a staff account → banner does not render.
