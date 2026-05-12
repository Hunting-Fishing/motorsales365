## Plan: Staff QR Referral Tracking + Promo Linking

Build a complete staff referral system in admin, with each staff member tied to a personal QR code (keyed by company email), durable first-touch attribution on signup, and the ability to attach special promotions/offers/rates to each staff code.

### 1. Database (new migration)

New tables (all RLS-enabled, indexed on referral_code, staff_user_id, visitor_id):

- `staff_referrals` — one row per staff QR profile.
  - `staff_user_id` (FK to profiles.id, nullable for non-account staff), `email` (company email, unique), `full_name`, `phone`, `referral_code` (unique, slug), `qr_storage_path`, `active` (bool), `notes`.
- `referral_visits` — durable visitor record.
  - `visitor_id` (uuid, client-issued), `first_referral_code`, `last_referral_code`, `credited_referral_code`, `first_seen_at`, `last_seen_at`, `landing_page`, `user_agent`, `ip_hash`.
- `qr_scans` — append-only event log.
  - `referral_code`, `visitor_id`, `device_type`, `browser`, `country` (optional), `scanned_at`.
- `user_referrals` — credit attached to an auth user on signup.
  - `user_id` (unique FK to profiles), `referred_by_staff_id`, `first_referral_code`, `last_referral_code`, `credited_referral_code`, `signup_date`.
- `staff_promotions` — promos/deals/rates owned by a staff code.
  - `staff_referral_id`, `title`, `description`, `kind` (`promo|deal|rate|incentive|other`), `percent_off` (nullable), `flat_amount_php` (nullable), `applies_to` (text — `listing_fee | subscription | tow | any`), `starts_at`, `ends_at`, `active`, `terms`.
- Optional `referral_redemptions` — log when a referred user redeems a `staff_promotions` row (for reporting).

Enums: `referral_kind` (`promo|deal|rate|incentive|other`).

RLS:
- `staff_referrals`, `staff_promotions`, `referral_visits`, `qr_scans`, `user_referrals`: admin full manage; sales read; the staff member themselves can read their own row + their own promotions + aggregate stats via a SECURITY DEFINER function.
- Public `INSERT` on `qr_scans` and `referral_visits` is allowed via a SECURITY DEFINER RPC `record_qr_scan(code, visitor_id, ua, landing)` — never direct table insert from anon.
- Active `staff_promotions` readable publicly when `active = true` and within date range (so a referred visitor can see the offer attached to their code).

Triggers/functions:
- `tg_set_updated_at` on new tables.
- `on_auth_user_signup_attach_referral()` AFTER INSERT on `profiles`: reads visitor cookie via a `pending_signup_referral` token table OR via the signup form's hidden field passed through user_metadata, then writes `user_referrals` row using **first-touch** attribution (do not overwrite `first_referral_code`).
- `generate_referral_code(full_name)` helper to suggest `juan001`-style slugs.

### 2. Routes & UI

- **`/r/$code` (public)** — `src/routes/r.$code.tsx`. Server loader:
  1. Reads code, validates active.
  2. Calls RPC `record_qr_scan`.
  3. Sets a 90-day first-party cookie `mref_first`, `mref_last`, `mref_credit` (first-touch rule).
  4. Writes the same to `localStorage` client-side, plus a stable `visitor_id`.
  5. Renders a quick landing card ("Referred by {first_name}. Here are their current offers:") listing active `staff_promotions` for that code, then redirects to `/` after a short delay (or to a `?next=` target).
- **`/admin/referrals` (admin + sales)** — `src/routes/admin.referrals.tsx`:
  - Staff list with columns: name, email, code, status, scans (7d/all), unique visitors, signups, listings, conversion %.
  - "New staff QR" dialog → name, company email, phone, auto-suggested code (editable, unique check). On save, generate QR PNG via `qrcode` npm pkg, upload to `qr-codes` storage bucket (new, public), store path.
  - Row actions: edit, deactivate, **Download QR**, **Copy URL**, **Manage promotions**.
  - Promotions drawer — list + create/edit/archive `staff_promotions` rows tied to that staff code.
- **`/staff/referral` (any staff with a `staff_referrals` row keyed by their auth email)** — personal dashboard: their QR, link, scan/signup stats, and a read-only view of promos attached.
- **Signup form (`src/routes/signup.tsx`)** — read `mref_credit` from cookie/localStorage, send as `referral_code` in `signUp` `options.data` (user_metadata) + an optional visible "Have a referral code?" input. Trigger reads it on profile insert.

### 3. Storage

- New public bucket `qr-codes` (read-public, write admin-only via RLS policies).

### 4. Libraries

- `bun add qrcode` (pure-JS, Worker-safe) for server-side PNG generation in a `createServerFn`.
- `bun add nanoid` for `visitor_id` if not already present (fallback to `crypto.randomUUID()`).

### 5. Attribution & cookie rules

- Cookie names: `mref_first`, `mref_last`, `mref_credit`, `mref_vid`. 90-day expiry, `SameSite=Lax`, `Secure`, path `/`.
- First-touch: never overwrite `mref_first` / `mref_credit` if present. Always update `mref_last` + push a row into `qr_scans`.
- Deactivated codes: scan still logged but `credited_referral_code` is not set; show "this code is no longer active" on the landing card.

### 6. Admin/staff security

- Only `admin` can create/edit `staff_referrals` and `staff_promotions`.
- `sales` can read all referral stats.
- A staff member can see only their own row + promotions (matched by `email = auth.jwt().email` OR `staff_user_id = auth.uid()`).
- Public never sees staff email — only the referral code in URLs.

### 7. Reporting (admin)

- Per-staff KPI cards: scans, unique visitors, signups, listings created by referred users (`listings` joined via `user_referrals.credited_referral_code`), conversion %.
- Date range filter (7/30/90/all).
- CSV export.

### 8. Out of scope

- Auto-applying promo discounts at checkout (we surface them on the landing card and admin reporting; wiring them into the actual `subscriptions` / `payments` flow is a follow-up).
- Server-side device-fingerprint dedupe beyond `ip_hash` + `visitor_id`.

### 9. Verification

- Scan `/r/test001` anon → cookie set, row in `qr_scans`, landing card lists active promos.
- Sign up in same browser → `user_referrals.credited_referral_code = test001`, admin dashboard shows +1 signup.
- Scan `/r/test001`, then `/r/test002`, then sign up → first-touch credit stays `test001`, `last_referral_code = test002`.
- Deactivate `test001` → new scans logged but no credit applied.
- Run `./scripts/verify-security.sh` — add new SECURITY DEFINER functions to the allow-list with reason comments.
