## Goal
Resolve the 40 remaining security findings — fix the 5 ERROR-level vulnerabilities and the substantive WARN-level data exposures, then formally ignore the documented noise so the scan ends with **0 errors** and only accepted warnings.

## Errors to fix (5)

1. **`PRIVILEGE_ESCALATION_SUBSCRIPTIONS`** — Rewrite the `subscriptions` INSERT policy to force `status='pending'`, `complimentary=false`, `discount_percent=0`, and `stripe_subscription_id IS NULL` for self-inserts. Privileged inserts continue via `service_role` (webhook) and admin policies.

2. **`PRIVILEGE_ESCALATION_PAYMENTS`** — Rewrite the `payments` INSERT policy to force `status='pending'`, `paid_at IS NULL`, `amount_php > 0`, and block setting `method`/`stripe_payment_id`. Webhooks/admin keep writing via `service_role`.

3. **`STAFF_REFERRAL_EMAIL_IMPERSONATION`** — Drop the email-based SELECT branch on `staff_referrals`; keep only `staff_user_id = auth.uid()` plus the admin policy. Backfill any rows missing `staff_user_id` (already populated by trigger `tg_create_staff_referral`).

4. **`SERVER_FN_MISSING_AUTH` (3 functions)**:
   - `src/lib/vehicles.functions.ts` → `deleteServiceRecord`: verify the record belongs to a vehicle owned by `userId` before delete.
   - `src/lib/export-brokerage.functions.ts` → `updateExportInquiry`: gate with `can_support`.
   - `src/lib/ads.functions.ts` → `deleteAd`: gate with `can_manage_ads`.
   - `src/lib/leads.functions.ts` → 7 functions (`listOrgMembers`, `listOrgLeads`, `getLead`, `assignLead`, `updateLeadStatus`, `addLeadNote`, `getOrgPerformance`): add `is_org_member(userId, orgId)` check at top of each handler. For role-gated writes (`assignLead`, `updateLeadStatus`, `updateMemberRole`), also require `owner`/`admin` org role.

## Warnings to fix (substantive)

5. **`EXPOSED_SENSITIVE_DATA_BUSINESSES` / `_ORGANIZATIONS`** — Create `public.businesses_public` and `public.organizations_public` views (`security_invoker = on`) omitting `phone`/`email`. Restrict the underlying public SELECT policy to authenticated users; repoint anonymous reads in `businesses.index.tsx`, `businesses.$slug.tsx`, map components, and `organizations.functions.ts` to the new views.

6. **`EXPOSED_SENSITIVE_DATA_LISTINGS`** — Add a `public.listings_public` view (security_invoker, omits `contact_phone`). Anonymous reads in `browse.$category.tsx`, `index.tsx`, `seller.$id.tsx`, search/listing-card queries switch to the view; the existing detail-page query stays on the table for authenticated callers only.

7. **`EXPOSED_SENSITIVE_DATA_PROVIDER_TOW_RATES`** — Create `public.provider_tow_rates_public` view without `notes`; restrict table SELECT to authenticated; repoint `tow.tsx` public read.

8. **`EXPOSED_SENSITIVE_DATA_STAFF_PROMOTIONS`** — Create `public.staff_promotions_public` view exposing only marketing-safe fields (`title`, `description`, `applies_to`, `ends_at`); revoke broad public SELECT; repoint `r.$code.tsx` / referral landing reads.

9. **`MISSING_REALTIME_CHANNEL_AUTHORIZATION`** — Add RLS on `realtime.messages` so authenticated users can only subscribe to topics that match their `auth.uid()` (for DM channels) or an org they belong to (for `leads`, `lead_activities`). Topics for `tow_requests`/`tow_bids` scoped to requester/provider IDs encoded in topic names.

## Noise to ignore (documented, behavior-correct)

10. The remaining **6× `SUPA_rls_policy_always_true`**, **2× `SUPA_anon_security_definer_function_executable`**, and **18× `SUPA_authenticated_security_definer_function_executable`** are existing accepted risks (helper functions backing RLS, `increment_listing_view`, `ad_inquiries` public submit). Call `security--manage_security_finding` with `ignore` for each, linking back to `docs/SECURITY.md`. Update `docs/SECURITY.md` to add any new entries (`can_manage_shop`, `user_has_paid_subscription`, `is_towing_provider`) that weren't already there. Update security memory via `security--update_memory`.

## Deliverables

1. **Migration**: policy rewrites (subscriptions, payments, staff_referrals), 5 new `_public` views (security_invoker), revoked broad SELECTs, realtime RLS policies.
2. **Code edits**: 11 server functions hardened (auth/ownership/membership checks), public-facing queries repointed to new views.
3. **Docs**: `docs/SECURITY.md` updated with new accepted-noise rationales; security memory refreshed.
4. **Scanner cleanup**: batch `ignore` the documented findings; rerun `security--run_security_scan` until **0 errors** and only the accepted warning IDs remain.

## Technical notes

- All new views use `WITH (security_invoker = on)` so the caller's RLS applies; this avoids re-exposing data via the view.
- `is_org_member(uid, org)` already exists in `public` (used by `tg_lead_from_message`); the leads functions just need to call it via `supabase.rpc`.
- Subscriptions/payments INSERT tightening will not affect webhook flow because the Stripe webhook handler uses `supabaseAdmin` (`service_role`) which bypasses RLS.
- Realtime RLS is added to `realtime.messages`, not the public `messages` table, so it only governs subscription topic auth — existing app reads/writes are unaffected.
