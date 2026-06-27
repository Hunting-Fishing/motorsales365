
## Goal

Anyone whose email ends in `@365motorsales.com` must be created as a **365 Staff** account. Private seller, business, and any future account types are disabled (greyed out) in the UI and rejected on the server.

## Scope of changes

### 1. `src/components/admin/add-user-dialog.tsx` (UI lock-in)
- Derive `isStaffDomain` from the composed email (`enforceDomain === "@365motorsales.com"` OR the typed email ends with that domain).
- When `isStaffDomain` is true:
  - Force `accountType` state to `"staff"` via an effect.
  - In the Account Type selector, render `private` and `business` (and any future options) as disabled with a tooltip/help text: "Locked — @365motorsales.com emails are always 365 Staff accounts."
  - Hide/disable the Business tab content so business-only fields can't be filled.
  - Show a small amber notice at the top of the Identity tab: "This email domain is reserved for 365 Staff. Account type is locked to Staff."
- Keep existing `enforceDomain` username + suffix UI unchanged.

### 2. `src/routes/api/admin/create-user.tsx` (server enforcement — authoritative)
- After composing the final email, compute `isStaffDomain = email.toLowerCase().endsWith("@365motorsales.com")`.
- If `isStaffDomain`:
  - Override `account_type` to `"staff"` regardless of what the client sent.
  - Ignore `seller_type`, `business_name`, `business_kind`, `mark_verified`, and business address fields.
  - Ensure at least a default staff role is assigned if `roles` is empty (e.g. keep current behavior, no auto-elevation to admin).
- If a non-staff `account_type` is explicitly sent with a `@365motorsales.com` email, return a 400 with a clear message rather than silently coercing — pick one behavior; recommend **silent coerce + log** to avoid breaking the admin form, and surface a toast hint client-side.

### 3. Self-signup path (public auth)
- Check `src/routes/auth.*` / signup handler. If users can self-register, add the same domain guard server-side so a stranger can't claim a `@365motorsales.com` address and become staff. Two options:
  - **Block self-signup** for `@365motorsales.com` (recommended) — only the admin Create-User flow can mint these accounts. Show "This domain is reserved. Ask a 365 admin to create your account."
  - OR allow signup but force `account_type=staff` with **zero roles** until an admin grants them. No automatic role grants from email domain (per security guidance — email must be verified, and role grants still require admin action).

I'll recommend **block self-signup** for simplicity and safety.

### 4. Edit flow (`src/components/admin/edit-profile-dialog.tsx`)
- If the profile's email ends in `@365motorsales.com`, lock the `account_type` field to Staff (disabled select) with the same helper note. Prevents an admin from later flipping a staff account to "business".

### 5. Existing data sweep (one-off)
- Run a migration/data update: any existing `profiles` row whose auth email ends in `@365motorsales.com` and whose `account_type` is not `staff` → set to `staff`, clear `seller_type`/business fields. Report count to the user before applying.

## Out of scope
- No changes to role assignment logic (admin/moderator/support/advertising stay manually granted).
- No changes to the `@365motorsales.com` suffix UI built last turn.
- No new tables.

## Technical notes
- Domain check is a single helper: `const STAFF_DOMAIN = "@365motorsales.com"; const isStaffEmail = (e: string) => e.trim().toLowerCase().endsWith(STAFF_DOMAIN);` — colocate in `src/lib/staff-domain.ts` so client + server import the same constant.
- Server is the source of truth; UI lock is UX only.
- Coercion on the server should be logged to `admin_audit_log` when client submitted a different `account_type`.

## Open questions (please confirm before I build)

1. **Self-signup**: block `@365motorsales.com` entirely on the public signup page, or allow with `account_type=staff` and no roles until granted?
2. **Existing rows**: do you want me to scan and auto-convert any existing non-staff `@365motorsales.com` accounts as part of this change?
3. **Edit dialog**: lock the account-type selector for staff-domain emails (recommended), or leave it editable for admins?
