## Goal
Add a Playwright e2e spec that, for each of `buyer`, `business`, and `service_provider`:
1. Signs up via `POST /api/public/auth/signup` (real code path).
2. Auto-confirms the account (email delivery isn't available in CI) using the Supabase Admin API.
3. Signs in through the UI at `/login`.
4. Confirms the user lands on the correct destination for that intent.

## Landing destinations (verified from code)
- `buyer` → `/dashboard` (login always routes here).
- `business` / `service_provider` → `/businesses/submit` (per `POST_ROUTE` in `src/routes/verify-email.tsx`).

Because `/login` sends everyone to `/dashboard`, intent-based routing lives on `/verify-email`. After signing in, the test navigates to `/verify-email?intent=<intent>&email=<email>`; the page detects `email_confirmed_at` and forwards to the intent's dashboard. This mirrors the real flow: after clicking the verification link, users land back on `/verify-email` where the auto-forward fires.

## New file
`e2e/signup-login-lands-on-dashboard.spec.ts`

Test structure:
- One `test()` per intent, tagged `@post-deploy` so it runs in the same lane as the other signup smoke specs.
- Skip cleanly (`test.skip`) when `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_URL` env vars are not present, matching `scripts/smoke-signup-matrix.mjs` gating.
- Each test:
  1. Synthesizes a `+timestamp-nonce@365motorsales-smoke.example` email and strong random password.
  2. `fetch('/api/public/auth/signup', …)` with the right intent-specific body (buyer uses personal address; business/service_provider use business address + `business_kind: "repair_shop"`). Asserts `200 { ok, user_id, needs_verify: true }`.
  3. Calls Supabase Auth Admin `PUT /auth/v1/admin/users/{user_id}` with `{ email_confirm: true }` to mark the email verified.
  4. Drives `/login`: fills email + password, submits, waits for either `/dashboard` (buyer) or navigates to `/verify-email?intent=…&email=…` and waits for `**/businesses/submit` (business/service_provider).
  5. Asserts the final `page.url()` matches the expected destination and a stable landmark is visible on the page (e.g. `getByRole('heading')` on `/dashboard` for buyer, the submit-business form heading for business/service_provider).
  6. Screenshots to `test-results/signup-login/{intent}.png` for debug.
- After all cases, best-effort cleanup: `DELETE /auth/v1/admin/users/{user_id}` for each created user (wrapped in try/catch so a failure doesn't fail the suite).

## Test infra changes
- Extend `playwright.config.ts` `webServer` only if not already covering `http://localhost:8080` — check first; likely no change needed.
- Add a short helper `e2e/helpers/supabase-admin.ts` (test-only) exporting `adminFetch(path, init)` that bails when the service role key is missing. Keeps admin creds out of the spec body.

## Non-goals
- No production code changes.
- No actual email delivery / real verification-link click; the admin `email_confirm: true` shortcut is what our other smoke tests use and is documented as safe for test users.
- Not asserting profile columns — that's covered by `scripts/smoke-signup-matrix.mjs`.
