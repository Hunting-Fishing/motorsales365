# Fix: Password reset link "loop" / can't reach set-password screen

## Problem

Clicking "Reset Password" in the email lands the user back on `/forgot-password` (or `/reset-password` showing the request form again) instead of the set-new-password form.

## Root cause

The recovery email uses `payload.data.url` from the auth hook. That URL is Supabase's `/auth/v1/verify?...` endpoint, which redirects to `/reset-password?code=...` (PKCE). `exchangeCodeForSession(code)` only succeeds if the matching `code_verifier` is in `localStorage` of the **same browser session** that initiated the reset. It silently fails (or the toast is dismissed) when:

- The email is opened on a different device/browser than where the reset was requested
- The user cleared cookies/storage in between
- Gmail's link scanner pre-fetches the URL, consuming the one-time code before the user clicks

Either way the page falls back to "request" mode → looks like a loop.

## Fix

Switch the recovery email to the `token_hash` flow, which has no per-browser verifier requirement and works from any device.

### Changes

**1. `src/routes/lovable/email/auth/webhook.ts`**
- For `emailType === "recovery"` (and ideally `signup`, `magiclink`, `invite`, `email_change` too for consistency), build `confirmationUrl` ourselves instead of using `payload.data.url`:
  ```
  https://365motorsales.com/reset-password?token_hash=<token_hash>&type=recovery
  ```
  using `payload.data.token_hash` and `payload.data.email_action_type` from the hook payload.
- Keeps `payload.data.url` as a fallback if `token_hash` is absent.

**2. `src/routes/reset-password.tsx`**
- Add handling for `?token_hash=...&type=recovery`:
  ```ts
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (!error) { setMode("set"); window.history.replaceState({}, "", "/reset-password"); }
    else toast.error(error.message);
  }
  ```
- Keep existing PKCE `?code=` and hash `#access_token` branches as fallbacks.
- Improve error visibility: if `exchangeCodeForSession` fails, show a clear toast and an inline message ("This link has expired or was already used — request a new one") with a button back to `/forgot-password`, instead of silently rendering the request form.
- Add second-password confirm field to match the signup flow rule.

**3. No DB / Supabase config changes required.** The auth hook payload already includes `token_hash` and `email_action_type`.

## Verification

- Request a reset from browser A, click the email link in browser B (or incognito) → should land on "Set new password" form.
- Click the same link twice → second click shows clear "expired/used" message, not a silent bounce.
- Update password → redirected to `/dashboard`, signed in with the new password.
