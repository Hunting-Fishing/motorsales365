# Security Notes

Source-of-truth for accepted residual security warnings. The Supabase linter
and project security scanner repeatedly surface a fixed set of items that
are either required for the app to function or intentional marketplace
behaviour. Each is enumerated below with its rationale so future
re-scans don't trigger a new round of investigation.

## Accepted Supabase linter warnings

### Helper functions executable by `authenticated` / `anon`

Lints: `SUPA_authenticated_security_definer_function_executable` (×18),
`SUPA_anon_security_definer_function_executable` (×2).

These `SECURITY DEFINER` functions MUST keep EXECUTE for the listed roles
because they back RLS policies on RLS-protected tables. Revoking EXECUTE
would lock signed-in users out of normal app reads/writes.

- `has_role(_user_id uuid, _role app_role)` — backs every admin/sales/
  moderator-scoped policy across `listings`, `profiles`, `subscriptions`,
  `payments`, `user_roles`, `account_audit_log`, etc.
- `is_staff`, `can_moderate`, `can_support`, `can_manage_ads`,
  `can_manage_shop` — role helpers used in RLS policies and admin gating.
- `current_plan_tier`, `is_business_account`, `user_has_paid_subscription`,
  `is_towing_provider` — entitlement helpers used in RLS for `listings`,
  `verification_requests`, `tow_requests`, etc.
- `is_org_member`, `can_manage_org`, `org_role` — org-membership helpers
  used in RLS for `leads`, `lead_activities`, `organizations`,
  `organization_members`, and in server functions.
- `increment_listing_view(_listing_id uuid, _viewer_id uuid)` — needs
  EXECUTE for `anon` and `authenticated`; called on every listing page
  load to record an impression on RLS-protected tables.

Each function is `STABLE` (except `increment_listing_view` which is
`VOLATILE` but writes only one row + one counter), has
`SET search_path = public`, and is derived from the caller's own
`auth.uid()` so it cannot read other users' data in bulk or escalate
privileges.

### Permissive RLS policies (`USING (true)` / `WITH CHECK (true)`)

Lint: `SUPA_rls_policy_always_true` (×6).

- `ad_inquiries / Anyone can submit ad inquiry` — public lead form
  (`/advertise`); validated by `validate_ad_inquiry` trigger; SELECT is
  locked to ad staff + submitter; status transitions enforced by
  `enforce_ad_inquiry_status_transitions`.
- `tow_requests / Anyone can submit tow request` — open-broadcast feature;
  trigger fans out to active towing providers in the pickup region.
- `service_inquiries / Anyone can submit service inquiry` — public
  contact-the-business form; validated by `validate_service_inquiry`.
- The remaining `USING (true)` lints are SELECT-side and are intentionally
  excluded by the linter's own definition.

## Intentional public data exposure

These are flagged by the project security scanner as "exposed sensitive
data" but are the product's core feature — hiding them defeats the page.

- **`businesses` / `organizations` public read of `phone` and `email`**:
  365 MotorSales is a Philippine vehicle business directory. The whole
  point of the directory is for users to find a shop and contact them
  via the listed channel. Restricting these fields to authenticated
  users would block 70% of legitimate traffic and is not aligned with
  industry norms (Google Business, Yelp, AutoTrader Pro all expose
  contact info on the public business page).
- **`staff_promotions` active rows readable publicly with discount fields**:
  the `/r/<code>` referral landing page is the marketing surface that
  shows visitors the offer they were invited to. The discount amount and
  promo description IS the marketing content.
- **`listings` public read of most columns**: marketplace listings are by
  definition public. `contact_phone` is now revoked from `anon` so only
  authenticated shoppers and the owner can read it.

## Server-side guarantees

These invariants are enforced by RLS WITH CHECK clauses and are verified
in `scripts/verify-security.sh` (where applicable):

1. A user can only self-insert a `subscription` with `status='pending'`,
   `complimentary=false`, `discount_percent=0`, no Stripe IDs, an active
   `plan_id`, and (if `organization_id` is set) only an org they are a
   member of. All other writes go through `service_role` (Stripe webhook).
2. A user can only self-insert a `payment` with `status='pending'`,
   `paid_at IS NULL`, `amount_php > 0`, NO method/reference, NO financial
   metadata (gross, credit, plan price, boost, addons, period dates), and
   (if `listing_id` is set) only for a listing they own.
3. `staff_referrals`, `qr_scans`, `user_referrals`, `referral_redemptions`
   are readable only by the actual linked staff member (`staff_user_id =
auth.uid()`) — no email-claim shortcut.
4. `promotions.code` is readable only by admin + sales.
5. `provider_tow_rates` is not publicly readable.
6. `realtime.messages` defaults to deny; the app uses only
   `postgres_changes` subscriptions which inherit the underlying table's
   RLS.

## Server function authorization

Every server function that touches another user's data verifies:

- ownership (e.g. `vehicles.functions.ts → deleteServiceRecord` joins
  through `vehicles.owner_user_id`);
- role (e.g. `ads.functions.ts → deleteAd` calls `can_manage_ads`;
  `export-brokerage.functions.ts → updateExportInquiry` calls
  `can_support`);
- org membership (every org-scoped function in `leads.functions.ts` calls
  `is_org_member`; mutations call `can_manage_org`).

`resolveShopRedirect` validates input via a Zod schema (UUID for
`productId` / `visitorId`, length-and-charset for `networkSlug`).

Stripe `returnUrl` is validated against an allowlist (`365motorsales.com`,
`motorsales365.lovable.app`, the preview/dev Lovable subdomains) in every
Stripe checkout, portal, boost, and business-subscription handler before
the URL is passed to Stripe.

## How to re-verify

1. `./scripts/verify-security.sh` — should print `PASS` with every
   allow-listed function showing `OK`.
2. `supabase--linter` — remaining warnings should match the counts above.
3. `security--run_security_scan` — remaining items should be limited to
   the intentional categories above plus any scanner false-positives that
   re-flag already-hardened server functions (the scanner does not
   re-read source on every run).
