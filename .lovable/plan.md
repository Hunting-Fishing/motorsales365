# Signup Audit & Proposed Fixes

## What's working well

- **Account type step** is clear, professional, and the "Heads up" note per type sets expectations.
- **Name split** (first/last) is in place on the form and persisted on `profiles` via the trigger.
- **Server trigger `handle_new_user`** runs SECURITY DEFINER and composes `full_name` correctly.
- **Routing after signup** is tailored per intent (`POST_SIGNUP_ROUTE`).
- **Referral code capture** via `getCreditedCode()` is wired.

## Bugs / gaps found

### 1. Data leaks into `business_*` columns for non-business accounts (HIGH)
`handle_new_user` unconditionally inserts `business_region`, `business_province`, `business_city` from the signup location metadata — even for **buyer** / **private_seller**. That pollutes the business directory schema with personal city data and makes the profile-completion "business location" check meaningless.

**Fix:** In the trigger, only populate `business_name/address/region/province/city` when `v_intent IN ('business','service_provider')`.

### 2. `useAuth` fallback is inconsistent with the trigger (MED)
`maybeApplyPendingSignup` in `src/hooks/use-auth.tsx`:
- Sets `seller_type = 'business'` (string), but the trigger sets `'dealer'`. Different values for the same user depending on which path ran.
- Doesn't apply `business_address` (it's stashed but never written) — so Google OAuth signups for business/service_provider lose the address.
- Reads `pending.region/province/city` keys, but the stash writes those same keys — OK, just confirming.

**Fix:** Align `seller_type` to `'dealer'`, apply `business_address`, and only set business_* fields when `is_business` is true.

### 3. Phone is captured raw, never normalized (MED)
`profiles.phone_e164` exists but is never set. The `phone` field is stored as typed, which breaks downstream phone verification and the dashboard "Verified phone" checklist item.

**Fix:** Normalize PH numbers to E.164 in the trigger (simple `+63` prefixing for `09…`/`9…`) and write to `phone_e164` as well as `phone`.

### 4. `signup_province` is collected but dropped for non-business (LOW)
The form's LocationPicker captures region/province/city, but only `signup_city` is stored on `profiles`. There's no `signup_region`/`signup_province` column. Either add them or stop collecting them in the signup payload.

**Fix:** Add `signup_region` and `signup_province` columns to `profiles` (small, non-breaking) so personal-account location is fully captured.

### 5. UX / professionalism polish (LOW)
- No password visibility toggle.
- No confirm-password field; 6-char minimum is below modern norms — bump to 8.
- No explicit "I agree to Terms" checkbox (currently inline implicit consent).
- "Business address" sits before the password field but is optional with a long note — fine, but could move into a collapsible "Business details" subsection so the form feels lighter for personal accounts.
- Empty-state on the form before an account type is chosen: the form is fully visible and the CTA reads "Choose an account type to continue", which is OK but the form could be visually dimmed/disabled until step 1 is done.
- No inline email-format validation feedback (relies on browser default).
- For `service_provider` / `business`, no `business_kind` selector — `profiles.business_kind` stays NULL forever even though it's used by the directory.

## Database changes (single migration)

```text
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS signup_region   text,
  ADD COLUMN IF NOT EXISTS signup_province text;

-- Rewrite handle_new_user:
--   * only fill business_* when intent is business/service_provider
--   * write signup_region / signup_province for personal accounts
--   * normalize PH phone to phone_e164
```

No RLS changes needed (profiles policies already cover insert/update by `auth.uid() = id`).

## Code changes

- `src/hooks/use-auth.tsx` — align `seller_type` to `'dealer'`, apply `business_address`, guard business-only fields behind `is_business`, write `phone_e164`.
- `src/routes/signup.tsx` —
  - Add password visibility toggle, bump `minLength` to 8, add inline strength hint.
  - Add explicit Terms checkbox (required) instead of implicit consent.
  - Add `business_kind` select for business/service_provider (Dealer, Parts, Repair, Towing, Body shop, Carwash, Salvage, Other).
  - Send `signup_region`, `signup_province`, `business_kind` in `options.data` and in the stash payload.
  - Visually dim/disable step 2 form until an intent is selected.
- `src/components/signup/account-type-grid.tsx` — no functional changes.

## Out of scope (call out only)

- Phone OTP verification at signup — keep as post-signup task in dashboard.
- Email change confirmation flow — already handled elsewhere.
- Address geocoding for business — handled in `/businesses/submit`.

---

If you approve, I'll implement all of the above in one pass: one migration + the two file edits.
