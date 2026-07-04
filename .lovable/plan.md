## Problem

Jocelyn's DB row (`profiles` for `jocelyn.roldan@365motorsales.com`) has `phone`, `phone_e164`, `personal_email`, `street_address`, `postal_code`, `signup_intent` all `NULL`. The Edit User Profile dialog is correctly rendering what's stored — the data was never persisted at creation time.

Root cause: `src/routes/api/admin/create-user.tsx` runs the post-create `profiles.update(profilePatch)` **without checking `error` and without logging which fields were sent**. If the update ever fails, or if an admin submits a tab with empty fields, we get a silent success. The audit log only records `{email, new_user_id, account_type, roles}` — we can't tell after the fact whether phone/personal_email/address were actually posted. The Edit dialog's save path (`admin-profile.functions.ts`) already persists these columns correctly, so the write layer works — only the create path is unobservable.

## Fix — Code (harden Create User)

**File:** `src/routes/api/admin/create-user.tsx`

1. Check the result of `sb.from("profiles").update(profilePatch)`:
   - On error: audit-log `outcome:"error"` with `error_message: "Profile patch failed: <msg>"` and the list of attempted keys, and return HTTP 207 with `{ ok: true, userId, warning: "Profile fields not saved: <msg>" }` so the client can toast the warning (user is created, but admin knows to reopen and re-save).
2. Extend the successful `target_summary` on the audit log to include `patched_fields: Object.keys(profilePatch)` and boolean flags `{ had_phone, had_personal_email, had_street_address, had_business_address }` — this way every future creation records exactly what was written, without logging PII values.
3. Log a second `outcome: "allowed"` audit entry (or extend the existing one) that always includes `patched_field_count` so we can spot future silent-empty submissions.

**File:** `src/components/admin/add-user-dialog.tsx`

4. On the response, if `data.warning` is present, `toast.error(data.warning)` instead of the silent success toast — surfaces any partial failure to the admin at creation time.
5. Small UX guard: if all Address-tab fields and Phone are empty when the admin clicks Create, show a non-blocking confirm ("You didn't enter phone or address for this user. Create anyway?") — prevents accidental empty profiles going forward.

No schema changes. No changes to the trigger, RLS, or Edit dialog.

## Fix — Data (backfill Jocelyn)

I'll ask again in one prompt for her actual values (phone, personal email, street address, city, province, region, postal code) and then run a single `UPDATE public.profiles SET ... WHERE id = '9bf7f511-1283-49bd-b8c9-1cd970723983'` via the insert tool. Phone will be normalized to E.164 the same way the create-user route does.

If you'd rather fix her via the Edit dialog yourself, the "Edit User Profile" modal you showed already saves these fields correctly — just type them in and Save.

## Verification

- Re-query `profiles` for Jocelyn after the data patch to confirm all four fields are populated.
- Create one throwaway test user through Add User with phone + personal email + address filled → confirm `route_audit_log.target_summary` now contains `patched_fields` and the flags.
- Create one throwaway test user with those fields left blank → confirm the confirm-dialog appears; if forced through, confirm the audit row shows `patched_field_count` reflecting only the fields sent.
