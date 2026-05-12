## What's already shipped

- **Tables** — `staff_referrals`, `qr_scans`, `referral_visits`, `user_referrals`, `staff_promotions` with RLS for admin / sales / self-read.
- **RPC** `record_qr_scan` with per-visitor dedupe (one credited scan per device).
- **Signup trigger** `attach_signup_referral` writes first-touch credit on new auth users.
- **Storage** public `qr-codes` bucket.
- **Admin page** `/admin/referrals`: create/edit/delete staff QR, auto-generate PNG, copy link, download QR, KPI cards (codes / visitors / signups / conversion), top performers bar, per-row stats.
- **Public landing** `/r/$code`: scan recording, "new vs repeat" badge with tooltip, per-device visit history, active promotions list.
- **Signup form** reads `mref_credit` cookie + visible "Have a referral code?" field, passes to user metadata.
- **Promotions dialog** (admin) — list / create / toggle active / delete.

## What's still missing

### 1. Staff personal dashboard (planned, not built)
New route `src/routes/staff.referral.tsx` for staff to self-serve:
- Their QR (download + print poster), referral URL with copy.
- Stats: scans, unique visitors, credited signups, conversion %, 7/30/90-day filter.
- Read-only list of their attached promotions.
- Visible only when the signed-in user's email matches a `staff_referrals.email` row (RLS already supports this).
- Add nav entry in `src/routes/dashboard.tsx` shown conditionally.

### 2. Edit promotions
Current `PromoDialog` only creates / toggles / deletes. Add an inline edit form (title, description, kind, percent_off / flat_amount_php, applies_to, starts_at, ends_at, terms).

### 3. Admin reporting polish
- Date-range filter (7 / 30 / 90 / all) on `/admin/referrals`, filtering the `qr_scans` and `user_referrals` aggregates.
- CSV export button (staff rows + stats).
- Add "Listings by referred users" metric: join `user_referrals.user_id` → `listings.user_id`.

### 4. QR regeneration on code change
When admin edits `referral_code`, the old PNG at `<old_code>.png` is orphaned. Either:
- Delete the old object before re-uploading, or
- Key storage path by `staff_referral_id` (`<id>.png`) so renames are safe.

### 5. Printable poster
"Download poster" action that renders an A4 PDF (or print-ready PNG) with the QR, staff name, code, and a tagline — useful for physical placement. Use `qrcode` + a simple canvas/SVG template.

### 6. Storage RLS for `qr-codes`
Bucket is public-read but currently has no explicit write policies. Add admin-only insert/update/delete on `storage.objects` for `bucket_id = 'qr-codes'` so non-admins can't overwrite QR PNGs.

### 7. Promo redemption tracking (optional, was deferred)
Add `referral_redemptions` table to log when a credited signup uses an attached `staff_promotions` row at checkout — needed before any auto-discount wiring on `subscriptions` / `payments`.

### 8. Verification pass
Run the scenarios from `.lovable/plan.md` §9:
- Anon scan → cookie + scan row + promos visible.
- Sign up in same browser → `user_referrals.credited_referral_code` set, admin shows +1.
- Scan two codes → first-touch sticks.
- Deactivate code → scans logged, no credit.
- `./scripts/verify-security.sh` — add `record_qr_scan` + `attach_signup_referral` to the SECURITY DEFINER allow-list with reason comments.

## Suggested build order

1. Storage RLS on `qr-codes` + fix QR rename orphaning (quick wins, ~1 step).
2. Edit-promotion form + date-range filter + CSV export (admin UX).
3. Staff personal dashboard `/staff/referral`.
4. Printable poster.
5. Optional: `referral_redemptions` table + verification pass.

Want me to implement these in that order, or pick a subset to start with?