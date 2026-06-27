## Goals
1. Fix Edit user profile dialog showing blank fields after creating a 365 staff user.
2. Add a Personal email field (separate from the staff @365motorsales.com login email) on both Create and Edit.
3. Make the Create form's Email field a username box with a fixed `@365motorsales.com` suffix so admins type only the local part.

## Root cause (#1)
`admin.staff-365.tsx` passes `Staff365Row` to `EditProfileDialog`. That row only contains `id, email, full_name, roles, …` — no first/last name, phone, address, or business fields. The dialog's `useEffect` seeds the form from those missing properties, so every tab beyond "Identity → Full name" appears empty even when Create saved the data correctly.

## Changes

### A. Database
- New migration: add `profiles.personal_email text` (nullable, lower-case index). No grant changes needed (column inherits table grants).

### B. Create-user API (`src/routes/api/admin/create-user.tsx`)
- Add `personal_email` to the Zod body schema and copy it into the profile patch.

### C. Profile update server fn (`src/lib/admin-profile.functions.ts`)
- Add `personal_email` to `ProfilePatch` schema so the Edit dialog can save it.

### D. Staff list (`src/lib/admin-staff-list.functions.ts`)
- Extend the `profiles` select to include `first_name, last_name, phone, personal_email, street_address, postal_code, signup_city, signup_region, signup_province, business_name, business_kind, business_address, business_region, business_province, business_city, business_postal_code, seller_type, verification_status, avatar_url`, and expose them on `Staff365Row`.
- This is the simplest fix and ensures the Edit dialog hydrates from the same row already rendered in the list.

### E. AddUserDialog (`src/components/admin/add-user-dialog.tsx`)
- Replace the `Email *` Input with a split control when `enforceDomain` is set:
  - Left: `username` text input (lowercased, strips non `[a-z0-9._-]`)
  - Right: muted suffix chip `@365motorsales.com`
  - On submit, compose `email = `${username}${enforceDomain}``.
  - When `enforceDomain` is not set, keep current full-email Input.
- Add a new "Personal email" field on the Identity tab (optional, validated as email if filled), included in the POST body.

### F. EditProfileDialog (`src/components/admin/edit-profile-dialog.tsx`)
- Extend `EditableUser` type and the `form` state with `personal_email`.
- Add a "Personal email" input next to the existing "Email (change auth email)" field.
- Include `personal_email` in the diff-and-save payload.

## Out of scope
- Cloudflare Email Routing automation (still a manual step, message kept).
- No changes to RLS, role policies, or non-staff create flows.