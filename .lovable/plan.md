## Audit results

Two parallel audits compared every form, server function, route, RLS policy, and GRANT in the four requested areas against the live DB schema. Findings below are grouped by severity. **No code changes yet** — tell me which bucket to tackle and I'll create a focused implementation plan.

---

### 🔴 CRITICAL — security / data integrity

1. **`profiles` SELECT is `USING (true)`** — phone, phone_e164, business_address, postal_code, street_address, names, signup metadata are world-readable to anon via the Data API. A `public_profiles` view exists but the base table is wide open.
2. **`listings` INSERT/UPDATE has no field-level `WITH CHECK`** — `sell.tsx` inserts directly from the browser; a client can self-set `status: 'active'`, any `plan` tier, arbitrary `boost_until`/`expires_at`. Same for UPDATE.
3. **`payments` INSERT lets users self-confirm payments** — `WITH CHECK (auth.uid() = user_id)` only; a user can insert `status: 'completed'`, `amount_php: 0`.
4. **`businesses` UPDATE `WITH CHECK` blocks edits on active/featured rows** — owners are silently locked out of editing their live business page (`status <> 'active' AND featured = false`).
5. **Tow providers cannot accept broadcast requests** — UPDATE RLS requires `auth.uid() = provider_id`, but broadcast rows have `provider_id IS NULL`. Accept silently fails (0 rows, no error).
6. **Profile upsert lets users self-promote** — `dashboard.profile.tsx` upserts the whole object; nothing stops a user from setting `verification_status = 'verified'` or `is_founding_member = true`.
7. **Auth hydration uses `getSession()` not `getUser()`** — `use-auth.tsx:241` reads localStorage without server re-validation.

### 🟠 HIGH — broken flows / missing server validation

8. **`sell.tsx` listing creation is 100% client-side** — no serverFn, no zod, plan/photo limits trivially bypassable.
9. **No explicit GRANTs** on `listings`, `listing_media`, `payments` (rely on implicit Supabase defaults — fragile).
10. **`sell.tsx` contact_phone race** — submits stale `phone` state instead of recomputing E.164 at submit time.
11. **`tow_requests` ALTER columns** (`picked_up_at`, `dropped_off_at`, `completed_at`, `eta_minutes`, `final_price_php`, `completion_notes`) — confirm migration applied or pickup/dropoff flows fail.
12. **`verification_requests.province` / `barangay`** sent by form but added via ALTER — confirm applied.

### 🟡 MEDIUM — data correctness / UX

13. **`business-pages.functions.ts` forwards `patch as any`** — any extra keys reach the DB unchecked; whitelist needed.
14. **`business_tag_links` SELECT `USING (true)`** — leaks pending/rejected business tag associations.
15. **Verification resubmit on `rejected` silently no-ops** — RLS UPDATE allows only `pending|more_info`; toast shows success but nothing saved.
16. **`SellerType` TS enum + `maybeApplyPendingSignup` writes `'dealer'`** — DB enum is `('private','business')` only; writes fail/compare always false.
17. **`business_postal_code` and `referral_code` in signup metadata never read by `handle_new_user`** — silently dropped.
18. **`BUSINESS_KIND_VALUES` (verification form) wider than DB enum** — selecting `towing`/`rental` throws raw DB error.
19. **`condition`, `title`, `description` on listings unbounded** — no zod, no DB CHECK.
20. **`ride_likes` SELECT `USING (true)`** — who-liked-what is public.
21. **Route hygiene** — `listing.$id.edit`, `dashboard.businesses_.$id.edit`, `dashboard.rides_.$id.edit`, `dashboard.tow`, `verification`, `tow.tsx` all lack `loader`/`errorComponent`/`notFoundComponent` and use client `useEffect` auth gates (SSR flash, infinite "Loading…" on bad ids).
22. **`reset-password.tsx`** uses `window.location.hash` detection — fragile vs `onAuthStateChange('PASSWORD_RECOVERY')`. Min length 6 vs signup's 8.

### 🟢 LOW

23. `ride_service_log.photo_url` orphaned column. New-ride form only offers car/motorcycle vs 10-value zod. `category_slug` hardcoded list may diverge from `categories` table. `forgot-password` SMS OTP can create accounts. Misc validator vs constraint nits.

---

## Suggested fix order

I recommend three implementation passes — pick any combination:

- **Pass A — Security hardening** (CRITICAL 1–7 + HIGH 9): tighten RLS + GRANTs; move listing creation into a serverFn; switch profile upsert to a whitelisted serverFn; switch auth hydration to `getUser()`. ~1 migration + 4-5 file edits.
- **Pass B — Form ↔ DB alignment** (HIGH 10–12, MEDIUM 15–18): fix tow accept policy + missing trigger keys + verification enum + resubmit flow + phone race. ~1 migration + 4 file edits.
- **Pass C — Route hygiene + validation** (MEDIUM 13, 19, 21–22 + LOW): add loaders/error boundaries, bound text fields, fix reset-password hash detection. Pure frontend, ~8 files.

**Which pass(es) should I plan in detail and implement?** (Or pick individual numbered items.)
