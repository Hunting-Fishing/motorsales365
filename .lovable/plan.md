## Goal
After signup, instead of dumping the user on the Sign in page, show a clear "Pending Email Verification" screen. Once they click the verification link in their email, they're automatically signed in and the account unlocks.

## Why it's happening now
Supabase Auth requires email confirmation (correct — we don't want to disable that). When confirmation is required, `supabase.auth.signUp()` does **not** return a session. The code then calls `navigate({ to: POST_SIGNUP_ROUTE[intent] })` which points at `/dashboard/...` — a protected route — so the `_authenticated` guard bounces them to `/login`. That's the "redirected to Sign in" behavior you saw.

The email click *does* sign them in (Supabase exchanges the recovery/verify token for a session on the redirect URL), but our app has no dedicated landing for that moment, and meanwhile the signup tab is sitting on `/login` looking broken.

## Plan

### 1. Add a `/verify-email` route (public)
A friendly pending screen shown immediately after signup:
- Headline: "Check your email to activate your account"
- Shows the email address used, with a "Resend verification email" button (calls `supabase.auth.resend({ type: 'signup', email })`, throttled).
- Explains what they can/can't do until verified.
- Detects via `onAuthStateChange` when a session appears (i.e. they clicked the link in another tab or returned to this one) and auto-redirects to the correct post-signup dashboard route based on their stashed `signup_intent`.
- "Wrong email? Start over" link back to `/signup`.

### 2. Update signup submit flow (`src/routes/signup.tsx`)
- After successful `signUp()`, check whether a session was returned:
  - **No session (verification required, expected path):** navigate to `/verify-email?email=…&intent=…` instead of the dashboard. Stash pending profile as today.
  - **Session present (edge case — confirmations disabled):** keep current behavior, go straight to dashboard.
- Same change for Google OAuth path is not needed (OAuth returns a session immediately).

### 3. Handle the verification click landing
Supabase's verify link currently redirects to `window.location.origin` (root). Two small touches:
- Change `emailRedirectTo` to `${window.location.origin}/verify-email` so the user lands back on the pending screen, which already listens for the new session and forwards them to their dashboard.
- In `/verify-email`, on mount, run `maybeApplyPendingSignup()` (already exists in `use-auth`) so business address / kind / phone normalization is persisted to the profile right when they become live.

### 4. Light "pending verification" gating (optional, recommended)
On the dashboard, if `user.email_confirmed_at` is null, show a top banner: "Verify your email to publish listings / go live." For service providers and businesses this matches the existing "not live yet" messaging. No new routes — just a banner in `dashboard.tsx` layout.

### 5. Polish
- Login page: if a user tries to sign in but `email_confirmed_at` is null, show a clear toast linking back to `/verify-email?email=…` with a resend button instead of the generic "Invalid login credentials" / "Email not confirmed" error.

## Files to touch
- **new** `src/routes/verify-email.tsx` — pending screen + resend + auto-forward on session.
- **edit** `src/routes/signup.tsx` — branch on `data.session`; redirect to `/verify-email`; update `emailRedirectTo`.
- **edit** `src/routes/login.tsx` — friendlier "email not confirmed" handling.
- **edit** `src/routes/dashboard.tsx` (or shared dashboard shell) — top banner when `email_confirmed_at` is null.

## What we are NOT doing
- Not enabling auto-confirm (would skip verification — you don't want that).
- Not changing the DB trigger or profile schema — already correct from the previous pass.
- Not changing what data is captured at signup.

## Confirm before I build
Sound right? Specifically: keep email verification required, add the pending screen + auto-login on link click, and gate "go live" on `email_confirmed_at`?