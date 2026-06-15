## Plan

1. **Make Join & subscribe start the correct flow**
   - Update every Dispatch plan CTA to use a plain, reliable URL like `/dispatch/join?priceId=dispatch_solo_monthly`.
   - If the user is not signed in, send them to signup/login with a redirect back to the same Dispatch join URL, not the generic dashboard.
   - Preserve the selected plan after auth so the user lands on the tow company profile form, then the embedded checkout.

2. **Add Dispatch-aware auth redirects**
   - Update `/login` and `/signup` so `redirect=/dispatch/join?...` is respected after sign-in/sign-up instead of always sending users to `/dashboard`.
   - For Dispatch signup, preselect a service-provider/business account type when coming from the Dispatch join flow.

3. **Require a tow company profile before payment**
   - Keep `/dispatch/join` as Step 1: save tow company/provider details.
   - Update `/dispatch/checkout` so it verifies the signed-in user has completed the Dispatch join profile before rendering checkout; otherwise route them back to `/dispatch/join` with their selected plan.

4. **Lock Dispatch provider dashboard access**
   - On `/dashboard/dispatch`, only show the live queue, accept/pass buttons, coverage settings, and “receive dispatched jobs” toggle when the user has:
     - a Dispatch provider profile, and
     - an active/trialing paid Dispatch subscription that is not expired.
   - If they signed up but have not paid, show a clear “finish subscription” state.
   - If their plan is expired/canceled/past access, keep history accessible but blur/disable new request details and actions.

5. **Separate old tow requests from paid Dispatch access**
   - Update `/dashboard/tow` so unauthenticated/non-provider users cannot act as tow companies just because they can reach the URL.
   - Keep customer/request history visible where appropriate, but gate provider-only open jobs, direct request actions, bidding, and rates behind actual provider status.

6. **Clean up visible dashboard links**
   - Remove or change public “Provider dashboard” links on `/dispatch` so they do not imply free access.
   - Replace them with “Join Dispatch” / “Continue signup” unless the user is already an active Dispatch provider.
   - In the dashboard sidebar/header, show the Dispatch dashboard link only for signed-in users with a provider profile; show subscribe/finish setup CTAs otherwise.

7. **Verification**
   - Check the click path: `/dispatch` plan CTA → auth if needed → `/dispatch/join?priceId=...` → profile submit → `/dispatch/checkout?priceId=...`.
   - Check `/dashboard/dispatch` for three states: no provider profile, profile/no payment, active payment, and expired payment.