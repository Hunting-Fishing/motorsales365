# Signup & QR Capture — Audit, Fix Plan, Regression Suite

## A. Audit findings (as-is)

Full trace in the exploration report. The material defects, grouped by severity:

### A1. QR / referral attribution (highest priority)
1. `qr_lead_captures` rows are inserted with no `user_id`; nothing ever back-fills them after signup. → the pre-signup lead and the resulting account are never linked. (`src/components/qr-lead-form.tsx:78`)
2. QR landing CTA links to `/signup` with **no** `?ref=` — referral code lives only in cookie/localStorage. Cleared cookies or a new tab = attribution lost. (`src/components/qr-landing-content.tsx`)
3. Google OAuth path: `referral_code` and `signup_source` are in the localStorage stash but stripped from `PendingSignupPayload`; `applyPendingSignupProfile` never writes them. OAuth signups from a QR silently lose attribution. (`src/lib/signup-pending.functions.ts`)
4. Signup server accepts `referral_code` / `signup_source` in Zod but writes them only to `auth.users.raw_user_meta_data` — never to `profiles`, never to `user_referrals`. No `user_referrals` insert in the app-layer signup path at all.

### A2. Form → server field capture gaps
5. `barangay` collected by `LocationPicker` but never sent (dropped in `setLocation` restore).
6. `personal_email` written to `profiles` only on the OAuth pending-apply branch; email/password path silently omits it.
7. Signup route `.update(profilePatch)` on `profiles` doesn't check row count; if the auth-trigger insert hasn't landed, the update silently no-ops.

### A3. Intent / flow completeness
8. `POST_SIGNUP_ROUTE` covers `buyer | business | service_provider` — matches client/server enums. No missing intent branch, but no signup path creates the downstream `organizations` / `businesses` / `user_roles` rows; those are deferred to `/businesses/submit`, which is fine as long as that redirect isn't lost.
9. Invite flow: `/invites/$token` links to `/signup?invite=…&email=…`, but `/signup` `validateSearch` ignores both. Post-signup the user is dropped on the dashboard and must re-navigate to the invite manually.
10. `/partner-program/apply` has no auth guard — anonymous submits fail silently.

### A4. Route hygiene
11. `/signup` has no `errorComponent` / `notFoundComponent`.
12. `/api/public/auth/signup` has no `OPTIONS` handler and no `Access-Control-*` headers (fine for same-origin browser, breaks for subdomain / native / partner).

---

## B. Fix plan

Grouped so each phase is independently shippable. All server work uses `createServerFn` (for app callers) or the existing `/api/public/auth/*` route (for the signup POST). No changes to auto-generated Supabase files.

### B1. Strict QR → user attribution (per your choice)

**Schema (single migration, one approval):**
- `qr_lead_captures`: add `user_id uuid null references auth.users(id) on delete set null`, index on `(user_id)`.
- `qr_scans`: add `visitor_id text` index if not present; add `user_id uuid null` with FK + index (currently scan is anonymous).
- New `signup_attribution` table — durable server-side attribution keyed by `visitor_id` (opaque anon id already generated on QR landing). Columns: `visitor_id pk`, `qr_scan_id`, `qr_code`, `qr_lead_capture_id`, `referral_code`, `signup_source`, `first_seen_at`, `last_seen_at`, `linked_user_id`, `linked_at`. RLS: `service_role` all; `authenticated` select-own by `linked_user_id`; anon insert/update via SECURITY DEFINER RPC only.
- New SECURITY DEFINER function `link_signup_attribution(_visitor_id text, _user_id uuid)` that: back-fills `qr_lead_captures.user_id`, `qr_scans.user_id`, `signup_attribution.linked_user_id`, and inserts a `user_referrals` row when `referral_code` is present and no row exists for `_user_id` yet.
- GRANTs per Cloud rules.

**Server:**
- `record_qr_scan` RPC: also upsert into `signup_attribution` (`visitor_id`, `qr_scan_id`, `qr_code`, `first_seen_at`).
- `QrLeadForm` insert: capture returned `id` and upsert into `signup_attribution` (`qr_lead_capture_id`).
- `/api/public/auth/signup` (`src/routes/api/public/auth/signup.tsx`):
  - Accept `visitor_id` in Zod (already stashed as opaque token).
  - After successful `auth.users` insert + profile update, call `link_signup_attribution(visitor_id, user.id)` via `sbAdmin.rpc`. Row-count assert: if `visitor_id` present but no `signup_attribution` row exists, log a `signup_failure_events` row with `reason='qr_attribution_missing'` (soft-fail, don't block signup).
  - Write `referral_code` and `signup_source` into `profiles` (new columns / existing if present — audit `profiles` schema first via `supabase--read_query` before the migration).

**Client:**
- `QrLandingContent`: append `?ref=<code>&vid=<visitor_id>` to every "Create account" CTA. Belt-and-braces alongside cookie/localStorage.
- `signup.tsx`:
  - Read `vid` from URL (or from `qr_visitor_id` cookie) and include in the submit payload.
  - `validateSearch` gains `invite`, `email`, `vid` — pass through the OAuth `redirect_uri` stash so they survive the round-trip.
  - Email/password path: also include `personal_email`, `barangay` in the payload; extend server Zod + `profilePatch`.
- `signup-pending.ts`: stop stripping `ref_code`, `signup_source`, `visitor_id` from `PendingSignupPayload`; `applyPendingSignupProfile` writes them and calls `link_signup_attribution`.
- `use-auth.tsx`: on `SIGNED_IN`, after `applyPendingIfAny`, call a new server fn `linkPostAuthAttribution({ visitorId })` that runs the same RPC — covers OAuth signups where the localStorage stash was cleared but the `qr_visitor_id` cookie survived.

### B2. Form-field capture parity
- Extend Zod + `profilePatch` for `personal_email`, `barangay`. Detect + assert row count on the `.update` — if 0 rows, retry once after `select(id)` confirms the profile trigger fired; still 0 → hard 502 + `signup_failure_events`.
- Fix `setLocation` restore to preserve `barangay`.

### B3. Invite / partner / hygiene
- `/signup` `validateSearch`: add `invite`, `email`, `vid`. On post-signup redirect, if `invite` present → `/invites/$token`.
- `/partner-program/apply`: add `beforeLoad` auth guard, redirect to `/signup?type=business&redirect=/partner-program/apply`.
- `/signup`: add `errorComponent` and `notFoundComponent`.
- `/api/public/auth/signup` and `/api/public/auth/signup-failure-log`: add `OPTIONS` handler and `Access-Control-*` on every response (including error paths), matching the existing SF-refID pattern.

---

## C. Regression tests (both layers)

### C1. Live HTTP smoke — `scripts/smoke-signup-matrix.mjs`
Per-intent matrix + QR paths:

| Case | POST payload highlights | Assertions (via admin server fn read) |
|---|---|---|
| `buyer` manual | intent=buyer, no biz fields | profiles row updated (all fields), no qr_lead_captures link expected |
| `business` manual | intent=business, biz_* fields | profiles row updated + business_* columns set |
| `service_provider` manual | intent=service_provider | same as business |
| `buyer` + referral | `referral_code=X`, `signup_source=link` | `user_referrals` row created with referrer resolved from code; profiles.referral_code=X |
| `buyer` + QR | `visitor_id=V` seeded by fake `/qr/scan` call first, then signup | qr_lead_captures.user_id, qr_scans.user_id, signup_attribution.linked_user_id all = new user id |
| `business` + QR + referral | both `vid` and `ref_code` | same as above + user_referrals row |
| invite path | `invite=<real token>`, `email=<invited email>` | organization_members row after auto-accept |
| duplicate email | same email twice | second call → 409, first ref-id present |
| missing required biz field | intent=business w/o business_name | 422 with field_validation_failed |

Runner adds each case to the existing `smoke-signup-diagnostics.mjs` aggregation so status × signature buckets keep working.

### C2. Playwright E2E — `tests/e2e/signup/*.spec.ts`
Focus on flows where HTTP-only misses the real bug (redirects, OAuth round-trip, cookie/localStorage survival):

- `manual-signup.spec.ts` — visit `/signup?type=<intent>`, fill form, submit, assert redirect to expected `POST_SIGNUP_ROUTE`.
- `qr-to-signup.spec.ts` — GET `/r/<code>`, wait for scan RPC to fire, click "Create account" CTA, verify URL carries `?ref=&vid=`, complete form, assert DB link via authenticated admin fetch.
- `qr-oauth-signup.spec.ts` — same as above but click "Continue with Google". Mocks `lovable.auth.signInWithOAuth` to synchronously seed a Supabase session (helper exposed on `window.__test__` in test build) and asserts `link_signup_attribution` still fires and `signup_attribution.linked_user_id` is set — proving cookie survival across the fake OAuth bounce.
- `invite-signup.spec.ts` — visit `/invites/<token>` anonymous → click Create account → complete → assert lands back on `/invites/<token>` and org membership added.
- `qr-new-tab.spec.ts` — scan in tab A, open `/signup` in a fresh tab B with `?vid=<same visitor_id>`, complete → assert attribution links.

E2E runs against local dev server; smoke runs against preview/prod URL (`stack_modern--invoke-server-function` path). Both wired into `package.json` under `test:signup:e2e` and `smoke:signup:matrix`.

---

## D. Rollout order

1. Read current `profiles` schema + confirm which of `referral_code`, `signup_source`, `personal_email`, `barangay` already exist; adjust migration accordingly.
2. Ship migration B1 (schema + RPC + GRANTs) — one approval.
3. Ship server changes (`signup.tsx` route, `signup-pending.functions.ts`, new `linkPostAuthAttribution` server fn).
4. Ship client changes (QR landing CTAs, `/signup` validateSearch + payload, invite/partner guards, error boundaries, CORS).
5. Add smoke matrix + Playwright specs; run both against preview.
6. Verify via smoke output that every case bucket lands in the expected DB state; screenshot the successful QR→signup Playwright run.

## E. Out of scope (call out, don't build)
- Building a full welcome-email pipeline from the unused templates (`signup-welcome.tsx`, `signup.tsx`) — flagged, needs its own decision.
- Backfill of historical `qr_lead_captures` rows to their eventual signups — the join key doesn't exist for past rows; leave a note in the migration.
- Role assignment at signup (`user_roles`) — currently done by admin tooling; audit confirms no app-layer signup path writes it. Leave as-is unless you want a default role assigned on account creation.
