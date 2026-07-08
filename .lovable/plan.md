## Goal
Verify that the signup flow works end-to-end by creating a real new user against the running preview, exercising the same code path a real visitor hits.

## Approach
Drive the live preview at `http://localhost:8080/signup` with Playwright (headless Chromium) to submit a buyer signup with a synthetic email, then verify:

1. Client-side: form submits without validation errors, browser navigates to `/verify-email?email=...` (the post-signup destination for unverified accounts).
2. Server-side: `POST /api/public/auth/signup` returned `200 { ok: true, needs_verify: true, user_id }`.
3. DB-side (via `supabase--read_query`): a `profiles` row exists for `user_id` with `signup_intent='buyer'`, correct name, phone, region, and `signup_source='direct'`.
4. Repeat once for `business` intent to confirm the segmented control + business fields path also creates a profile with `business_name` / `business_kind` populated.

Both accounts use `@365motorsales-smoke.example` emails so they're clearly test data and never receive real mail.

## Steps
1. Write `/tmp/browser/signup-live/run.py` — Playwright script:
   - Desktop viewport 1280x1800.
   - Fill buyer form (email, password, first/last name, PH mobile, region, street, postal), check terms, submit.
   - Screenshot before submit + after redirect.
   - Capture the `/api/public/auth/signup` network response JSON.
   - Repeat with intent=Business/Dealer, filling business_name/kind/address/postal.
   - Print both `user_id`s.
2. Run it, view screenshots to confirm the redirect to `/verify-email`.
3. `supabase--read_query` to confirm both `profiles` rows exist with the expected fields.
4. Report pass/fail per case with user_ids and any error details.

## Non-goals
- No code changes. This is a verification run only.
- Not clicking a real verification link (would require inbox access); we only assert the signup endpoint + profile row, matching what `scripts/smoke-signup-matrix.mjs` already validates in CI.
- No cleanup of the created test users in this run (they're unverified, marked `.example`).
