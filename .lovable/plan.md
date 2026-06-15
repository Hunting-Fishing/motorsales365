## Goal
Make `/dispatch/join` reliably move towing companies through the required flow:

```text
Pick Dispatch plan → sign up / sign in → complete tow company profile → payment checkout → provider dashboard unlocks
```

## What is currently broken
- `/dispatch/join` redirects unauthenticated users, but the signup/verify/login flow loses the Dispatch redirect and sends service providers to `/businesses/submit` instead of back to `/dispatch/join`.
- The join page shows only a loading state while redirecting, so it feels stuck and does not clearly ask the user to sign up or sign in.
- Google signup/sign-in does not preserve the Dispatch redirect.
- Checkout sessions do not explicitly tag Dispatch payments as `kind: dispatch`, even though the payment webhook expects that metadata.
- `/dashboard/tow` still queries provider tools before fully enforcing Dispatch-provider status, and the dashboard layout calls the provider hook conditionally after an early return.
- `/tow` has provider CTAs that still point toward generic listing/business flows instead of the paid Dispatch signup flow.

## Implementation plan
1. **Make Dispatch join auth explicit**
   - Update `/dispatch/join` so unauthenticated users see a clear “Create account / Sign in” gate instead of just “Loading…”.
   - Both buttons will preserve the selected `priceId` and return to `/dispatch/join?priceId=...`.
   - Keep the provider profile form visible only after auth is ready and the user is signed in.

2. **Preserve redirect through signup and email verification**
   - Update `/signup` so `emailRedirectTo` includes the safe `redirect` parameter.
   - Update `/verify-email` to accept and preserve `redirect`.
   - After verification, send service providers back to the Dispatch join page when that redirect exists.
   - Update “Already verified? Sign in” and resend-verification links to keep the Dispatch redirect.

3. **Preserve redirect through login and Google auth**
   - Update login/signup Google OAuth calls to include a redirect URI that carries the Dispatch target.
   - Update signup’s “already signed in” and “signup completed immediately” logic to prefer the safe redirect.
   - Ensure `/login?redirect=/dispatch/join?...` returns the user to Dispatch join, not the generic dashboard.

4. **Fix Dispatch checkout activation metadata**
   - Update checkout session creation so Dispatch price IDs attach `kind: dispatch` metadata to both the checkout session and subscription data.
   - This ensures the existing payment webhook writes to `dispatch_subscriptions` and toggles Dispatch provider access after successful payment.

5. **Tighten Tow/Dispatch dashboard gating**
   - Fix the dashboard layout hook ordering so provider status is checked consistently.
   - Ensure `/dashboard/tow` blocks non-Dispatch providers before provider data loads or blank tools render.
   - Keep prior/history access behavior for registered providers, while inactive/unpaid providers get subscription CTAs for new jobs.

6. **Clean up `/tow` provider CTAs**
   - Change provider-facing CTAs on `/tow` from generic “list your company” paths to the Dispatch plan/signup path.
   - Update outdated copy mentioning old pricing so it matches the ₱250/₱500/₱1,000 Dispatch tiers.

## Validation
- Test the plan button → `/dispatch/join` → unauthenticated gate → `/signup` → back to `/dispatch/join` flow.
- Test `/login?redirect=/dispatch/join?...` returns to the join page.
- Confirm provider profile submit routes to `/dispatch/checkout`.
- Confirm checkout errors show visibly if payment cannot load.
- Confirm non-provider users do not see Tow/Dispatch dashboard nav or blank provider dashboards.