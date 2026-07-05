## Goal

When a user completes signup via Google OAuth, the identity-step values they typed on `/signup` (phone, personal email, street/business address, postal code, region/province/city, business fields) must land in their `profiles` row every time — same guarantee as email/password signup.

## Current gap

`handleGoogle` in `src/routes/signup.tsx` only requires `intent` + `agreed` before redirecting to Google, and `stashPendingProfile` + `maybeApplyPendingSignup` (in `src/hooks/use-auth.tsx`) don't carry `personal_email`, `street_address`, `postal_code`, or `business_postal_code`. Result: OAuth users can skip the identity step entirely, or fill it and still lose those columns.

## Changes

### 1. `src/routes/signup.tsx` — gate OAuth behind full identity validation

- In `handleGoogle`, run the same `issues.length > 0` check the email/password submit uses; block redirect and scroll to the first error field. Show the toast "Please fix N field(s) before continuing with Google."
- Extend `stashPendingProfile` payload with:
  - `personal_email: email.trim() || undefined`
  - `street_address`, `postal_code`, `business_postal_code` (already partially present — confirm all three).
  - Bump the payload with `saved_at: Date.now()` so the applier can prefer newest.
- Post-OAuth navigation: keep `redirect_uri` at `siteOrigin()` (or existing login redirect) — the applier runs on the resulting session.

### 2. `src/hooks/use-auth.tsx` — apply every field, with retry-safe clear

Extend `maybeApplyPendingSignup`:

- Type additions: `personal_email`, `email`, `street_address`, `postal_code`, `business_postal_code`.
- Always set `personal_email` = `pending.personal_email ?? pending.email` when present and the profile's current `personal_email` is empty (avoid clobbering a value the user later corrected).
- Set `street_address` and `postal_code` for buyer intent. For business/service_provider, set `business_postal_code` (fall back to `postal_code`) alongside the existing business_* fields.
- After the `UPDATE`, re-select the profile and verify each required field for the intent is non-empty. Only then `removeItem("signup.pending")`. If any required field is still null (e.g. RLS retry, trigger race), keep the payload and log — the next `onAuthStateChange` invocation retries.
- Wrap the update so a Postgres error doesn't wipe the payload either.

### 3. Belt-and-suspenders server sync

To cover the case where the browser closes before the applier runs, add a small authenticated server function `applyPendingSignupProfile` in `src/lib/signup-pending.functions.ts`:

- Middleware: `requireSupabaseAuth`.
- Input: the same pending payload shape (validated with Zod, stripping unknown keys).
- Handler: `context.supabase.from("profiles").update(...).eq("id", context.userId)` for the same columns; returns `{ applied: string[], stillMissing: string[] }`.
- `maybeApplyPendingSignup` calls this server fn in parallel with the client update — whichever wins, the row is populated; the applier still verifies before clearing.

Rationale: the existing client-side path is already trusted for email/password. Duplicating through a server fn just makes the OAuth round-trip resilient to interrupted returns without adding new user surface.

### 4. Verification

- Sign up via Google as a **buyer** with typed phone / personal email / street / postal / region / province / city → new `profiles` row has all six + intent + first/last name.
- Sign up via Google as a **business** with business_name / business_kind / business_address / business_postal_code / location → all business_* + business_region/province/city populated; buyer street/postal untouched.
- Try Google with the identity step blank → blocked with validation toast, no redirect.
- Close the tab mid-OAuth then re-open the app → server fn applies the pending payload on the next authenticated request; localStorage is cleared only after verification passes.
- Existing email/password signup path unchanged (regression check).

## Not in scope

- No schema changes; all columns already exist on `profiles`.
- No change to `/verify-email` or the consent route.
- No change to sign-in-only Google flow on `/login` (that path has no identity step to persist).
