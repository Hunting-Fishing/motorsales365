# Finish security for staff, users, businesses, tiers + Advertiser intake

The four chips you saw are minor follow-ups. The bigger gap is that the project only has three roles (`admin`, `user`, `sales`) and no structured way for advertisers to ask about ad space. This plan finishes the role model, tightens RLS around tiers and business accounts, and adds an Advertiser inquiry flow.

## 1. Expand staff roles

Extend the `app_role` enum so different staff can do different jobs without all getting full admin:

- `admin` — full access (existing)
- `moderator` — review listings, reports, verifications; cannot change billing/roles
- `support` — read‑only across users + listings + messages; can add notes; cannot change billing/roles
- `sales` — Accounts console (already used) — keep; can change plan/discount/comp/notes/pause; cannot grant roles
- `advertising` — new; manages the Advertiser inquiry inbox + ad placements
- `user` — default end user (existing)

Add helper SQL functions so RLS reads stay simple:
- `is_staff(uid)` → true for any non‑`user` role
- `can_moderate(uid)` → admin or moderator
- `can_support(uid)` → admin, moderator, support, sales

## 2. Tighten existing RLS using the new roles

Replace blanket `has_role(uid,'admin')` on read-only admin surfaces with the narrower helpers so support/moderator can do their jobs without being admins:

- `listings`, `reports`, `verification_requests`, `messages` (admin view), `account_audit_log` → readable by `can_support`
- `listings` moderation actions (status change, takedown) → `can_moderate`
- `subscriptions`, `payments`, `pricing_settings`, `subscription_plans`, `user_roles` → **admin only** (unchanged)
- `account_audit_log` inserts from the Accounts console → allow `admin` + `sales` (current behavior, just made explicit)

## 3. Business accounts + tier-level checks

Today tier is inferred ad‑hoc from `subscriptions` joined to `subscription_plans`. Add a single source of truth so policies/UI stop duplicating the join:

- New SQL function `current_plan_tier(uid)` returning the plan name (`Free`/`Bronze`/`Silver`/`Gold`/`Platinum`/`Business`) for the user's active, non-expired subscription, falling back to `Free`.
- New SQL function `is_business_account(uid)` → `verification_status='verified'` AND `business_kind IN ('dealer','repair_shop','insurance')`.
- Use these in:
  - Free-listing quota trigger (already exists) — keep, but switch the bypass check to `current_plan_tier(uid) <> 'Free'`.
  - Featured/boost eligibility on `promotions` — only `Silver`+ can create paid boosts.
  - Business-only listing categories (e.g. dealer inventory bulk upload) — gated by `is_business_account`.

No data migration is needed — existing rows keep working; this is just consolidating the rules.

## 4. Advertiser inquiry channel ("buy ad space")

New public-facing intake so brands/agencies can ask about ad placements, plus a staff inbox for the `advertising` role.

New table `ad_inquiries`:
- contact name, company, email, phone (optional)
- desired placement (enum: `homepage_banner`, `category_banner`, `listing_sidebar`, `newsletter`, `other`)
- budget range, start date, message
- status (`new` / `in_review` / `quoted` / `won` / `lost` / `spam`)
- assigned_to (staff uid), internal_notes
- created_at / updated_at

RLS:
- **Anyone (anon + authenticated)** can INSERT (rate-limited via a simple per-IP/email check at the form level).
- **Submitter** can read their own inquiry only if signed in (matched by email on the auth user).
- **Staff with `admin` or `advertising`** can read/update all.
- No one can DELETE except `admin`.

New table `ad_inquiry_messages` (threaded replies between staff and the advertiser, reusing the same RLS pattern), so advertisers and staff can keep the conversation in one place instead of email tag.

## 5. UI surfaces

Frontend (presentation only, no business logic beyond wiring):

- **Public "Advertise with us" page** at `/advertise` — short pitch + inquiry form posting to `ad_inquiries`. Linked from footer.
- **Contact CTA on homepage / footer**: "Buy ad space" → `/advertise`.
- **Admin → Advertising inbox** at `/admin/advertising` — list, filter by status, open thread, reply, change status, assign. Visible to `admin` and `advertising` roles.
- **Admin → Roles tab** on `/admin/users` — admin can grant/revoke any staff role (chips for moderator / support / sales / advertising / admin). Already partly present for admin role; extend to all new roles.
- **Sidebar visibility** in `/admin` adapts to role using the new helpers (support sees Users/Listings/Reports read‑only; moderator adds takedown actions; advertising sees only the Advertising inbox; sales sees Accounts; admin sees everything).

## 6. Security verification

- Extend `scripts/verify-security.sh` allow-list with any new `SECURITY DEFINER` helpers (`is_staff`, `can_moderate`, `can_support`, `current_plan_tier`, `is_business_account`) — each declared `STABLE` with `SET search_path = public`, EXECUTE granted only to `authenticated`.
- Update `docs/SECURITY.md` to document them.
- Re-run the Supabase linter; expected warnings remain the same two intentional ones (`has_role`, `increment_listing_view`) plus any new authenticated‑only definer helpers we add (which the script will accept).

## Technical notes

- Enum changes in Postgres can't drop values, so we only ADD: `ALTER TYPE app_role ADD VALUE 'moderator'`, etc. Done in a single migration before any policy uses them.
- All new helpers are `SECURITY DEFINER STABLE SET search_path = public`, with `EXECUTE` revoked from `PUBLIC`/`anon` and granted to `authenticated` only (same hardening pattern already in the codebase).
- `ad_inquiries` INSERT-from-anon is intentional and noted in `@security-memory` so the scanner doesn't re‑flag it.
- No edits to `auth`, `storage`, `realtime`, `supabase_functions`, or `vault` schemas.

## Out of scope (call out if you want them next)

- Ad serving / impression tracking (this plan only handles the *inquiry* pipeline).
- Paying for ad space online (Stripe/Paddle checkout for ads).
- Public advertiser self-serve dashboard beyond reading their own inquiry thread.
