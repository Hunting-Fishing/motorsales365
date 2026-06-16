## Diagnosis

The signup form actually DID save everything. Verified for `dimensionalfutures@gmail.com`:
- `auth.users.raw_user_meta_data` contains `business_name: "365 TOWING TEST"`, `business_kind: "towing"`, `phone: "+639696063830"`, `business_address: "#18 Estancia"`, region/province/city, postal `2912`, etc.
- The `handle_new_user` trigger copied them into `public.profiles` (`business_name`, `business_kind`, `business_address`, `business_city`, `business_region`, `phone`, `phone_e164`, `signup_intent`, `postal_code`, `full_name`, etc. all populated).

What the user is actually seeing: after verifying email, service_provider/business intents land on `/businesses/submit`, and **that form is blank** — it does not read from the profile the signup just populated. So it feels like nothing was saved.

There is no data-loss bug. There is a hand-off bug: the directory submit form ignores the profile data already collected at signup.

## Fix (single route: `src/routes/businesses.submit.tsx`)

Pre-fill the directory submit form from `public.profiles` on mount, once the user is loaded.

### Add a one-shot profile prefill effect

After the existing `useEffect` that loads `types`/`tags`, add a `useEffect` keyed on `user?.id` that, when a user is present and the form is still empty:

1. Calls `supabase.from("profiles").select(...)` for the current user, requesting:
   `business_name, business_kind, business_address, business_city, business_region, business_province, business_postal_code, phone, phone_e164, street_address, postal_code, signup_city, signup_region, signup_province`.
2. Populates the existing state setters when the field is currently empty (never overwrite a value the user has already typed):
   - `name` ← `business_name`
   - `typeSlug` ← `business_kind` (only if it matches an entry in `BUSINESS_KIND_OPTIONS`)
   - `streetAddress` ← `business_address` || `street_address`
   - `postalCode` ← `business_postal_code` || `postal_code`
   - `loc` ← `{ region: business_region ?? signup_region, province: business_province ?? signup_province, city: business_city ?? signup_city, barangay: null }` (only if `loc.city` is currently null)
   - `phoneNational` + `phoneIso` ← derived from `phone_e164` (use existing `buildE164` helpers in reverse: strip leading `+63` → set iso `PH` and national digits; otherwise leave blank — do NOT crash on unparseable values)
   - `email` ← `user.email` if empty (this one we know is correct)
3. Guard with a local ref or boolean so the prefill only runs once per mount, even if `user` re-renders.

### Small follow-through cleanups

- Wrap each `setX` in an `if (!currentValue)` check so re-renders don't reset user edits.
- If `business_kind` exists in profile but isn't in `BUSINESS_KIND_OPTIONS`, skip silently (don't show a stale option).
- No DB schema changes, no migration, no edits to signup or verify-email — those are already correct.

### Verify

After change, sign in as the test user, visit `/businesses/submit`, confirm name, type, phone, street, city/region, and postal all appear pre-filled and are editable.
