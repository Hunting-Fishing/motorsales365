## Goal

Make signup fail (with clear inline errors) when phone, email, or address fields are missing for the selected account type — so we don't create another Jocelyn-style profile with blanks.

## Scope

Client-side validation only in `src/routes/signup.tsx`. No schema/API changes. (Admin create-user already has its own guard.)

## Required fields by intent

| Field | Buyer | Business | Service provider |
|---|---|---|---|
| First / last name, email, password, terms, city | required (already) | required (already) | required (already) |
| **Phone (valid E.164)** | **required** | **required** | **required** |
| **Street address** | **required** | required (business street) | required (business street) |
| **Postal code** | **required** | required (business postal) | required (business postal) |
| **Region + Province** | **required** | **required** | **required** |
| Business name + kind | — | required (already) | required (already) |
| Business city / region / province | — | **required** | **required** |

Notes:
- Personal-account users only have one address block (street, postal, city, region, province) — all required.
- Business-like accounts must fill the **business** address block (street, city, province, region, postal); the personal address block stays optional for them since the business profile is what goes live in the directory.
- Phone becomes required for everyone (was optional). Label changes from "Mobile (optional)" → "Mobile".

## Changes in `src/routes/signup.tsx`

1. Extend the `issues` memo:
   - Push `phone` issue when `!phoneNational.trim()` ("Enter your mobile number.") in addition to the existing invalid-format check.
   - Push `region` / `province` issues when missing.
   - For personal accounts (`!isBusinessLike`): require `streetAddress`, `postalCode`.
   - For business-like accounts: require `businessAddress`, `businessCity`, `businessProvince`, `businessRegion`, `businessPostalCode`.
2. Add `errorFor(...)` + `invalidCls(...)` wiring and `id="field-<name>"` anchors to any field that doesn't already have them (region, province, street/postal for personal, business address block).
3. Remove "(optional)" from the affected labels; update the helper line under the business address block ("You can skip the street and postal for now…") to say the address is required to create the account.
4. Update the `useMemo` dependency array to include the new state (`streetAddress`, `postalCode`, `location.region`, `location.province`, `businessAddress`, `businessCity`, `businessProvince`, `businessRegion`, `businessPostalCode`).

## Verification

- Attempt signup as **Buyer** with phone/address blank → submit button stays disabled and Issues panel lists Phone / Street / Postal / Region / Province.
- Attempt signup as **Business** with business address blank → Issues panel lists business street / city / province / region / postal.
- Fill everything → submit succeeds; new profile row has phone_e164, street_address, postal_code, region, province, city populated. Confirm via a quick DB read.
