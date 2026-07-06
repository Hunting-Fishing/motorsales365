## Goal

Every `@365motorsales.com` staff member who has a `staff_referrals` code (e.g. Jocelyn's `jocelynrolda655`) should also be an **accredited Partner Program partner**, so their QR/link signups flow through the same commission pipeline external partners use. Backfill everyone now; auto-accredit new staff going forward.

## What "accredited staff partner" means

For each staff user with a `staff_referrals` row:

1. `staff_referrals.active = true` (internal staff flag stays authoritative).
2. `partner_program_applications` row: auto-created, `status = 'approved'`, `channel_type = 'internal_staff'`, `agreed_terms = true`, `reviewer_id = system`, notes = "Auto-accredited: 365 Motorsales internal staff".
3. `partner_program_partners` row: `active = true`, `referral_code = <same code as staff_referrals.referral_code>`, `display_name = profile.full_name`, linked to the application above.
4. Same code powers both `/r/<code>` staff attribution and Partner Program commission events — no dual codes.

## Migration (backfill + trigger)

New migration `accredit_365_staff_partners.sql`:

- **Backfill**: for every `auth.users` row where email ends with `@365motorsales.com` AND a `staff_referrals` row exists, insert the application + partner rows if not already present (idempotent via `ON CONFLICT (referral_code) DO NOTHING` on partners, and a lookup guard on applications).
- **Trigger function** `public.auto_accredit_staff_partner()` (SECURITY DEFINER):
  - Fires `AFTER INSERT OR UPDATE OF staff_user_id, referral_code, active ON public.staff_referrals`.
  - If the linked auth user's email ends with `@365motorsales.com` and `active = true`, upsert the application + partner rows using the same shape as backfill.
- **Also** trigger on `auth.users` email confirmation for staff domain — if a `staff_referrals` row already exists for that user, run the same upsert. (Covers the "staff signs up after their referral row was pre-created" case.)
- No changes to `affiliate_commission_rules`; existing rules apply because the partner code is now registered in `partner_program_partners`.

## Attribution wiring check

Confirm during implementation that the signup-attribution path (whatever writes `user_referrals` / commission events on `/r/<code>` visits) already looks up `partner_program_partners.referral_code`. If it only checks `staff_referrals`, add a parallel lookup so a staff code produces both:

- a `user_referrals` row with `referred_by_staff_id` (existing behavior), and
- a `partner_program_commission_events` row against the matching `partner_program_partners.id` (new behavior).

Details will be finalized after reading the current referral-resolve function during build.

## Admin UI

Small addition to `/admin/users` and `/admin/staff` (or wherever staff are listed):

- Show a "Partner ✓" badge next to any staff row that has a matching `partner_program_partners` entry.
- On the referral column already added in `/admin/users`, append `(accredited partner)` when true.

## Out of scope

- No changes to payout rules, commission math, or Partner Program public flow.
- No changes to external (non-staff) partner applications.
- No new UI for staff to "apply" — accreditation is automatic and admin-controlled.

## Files touched

- New migration under `supabase/migrations/` (backfill + triggers).
- `src/routes/admin.users.tsx` — add "Partner ✓" badge in referral column.
- Possibly one small edit to the referral-resolution server function (confirmed during build).
