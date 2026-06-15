The answer is: **it should show sign up/sign in when the person is not signed in**, but the current failure is mainly a routing problem.

Right now `/dispatch/join?...` and likely `/dispatch/checkout?...` are matching under the `/dispatch` parent route, but the `/dispatch` route renders the landing page instead of rendering its child route. That is why picking Solo, Team, or Unlimited appears to bring you back to the same page.

Plan:

1. **Fix the `/dispatch` route structure**
   - Convert `src/routes/dispatch.tsx` into a proper parent/layout route that renders child pages with `<Outlet />`.
   - Move the current Dispatch pricing/landing content into a new `/dispatch` index route.
   - This will allow `/dispatch/join` and `/dispatch/checkout` to actually display their own pages.

2. **Make the unsigned-user path obvious**
   - Ensure `/dispatch/join?priceId=...` shows a clear tow-company signup gate when no user is signed in:
     - “Create tow company account”
     - “I already have an account”
   - Preserve the selected plan through signup/login so they return to the same tow onboarding step.

3. **Make the signed-in path complete**
   - If signed in, `/dispatch/join` should show the tow company/provider profile form.
   - After submitting that form, send the user to `/dispatch/checkout?priceId=...`.
   - The checkout page should show the embedded payment form for the selected Solo, Team, or Unlimited plan.

4. **Preserve redirects through auth**
   - Verify email/password signup, login, and Google auth continue to carry the selected Dispatch plan back into the tow signup flow.
   - Fix any remaining generic redirects that send service providers to the normal business flow instead of Dispatch onboarding.

5. **Keep provider dashboard gated**
   - Tow/Dispatch dashboard links remain hidden until the user has created a tow provider profile.
   - Dispatch tools remain locked until the subscription is active.

6. **Validate the flow**
   - Test unauthenticated plan click: `/dispatch` → plan → `/dispatch/join` signup gate.
   - Test signed-in profile path: join form → checkout page.
   - Confirm `/dispatch/checkout` no longer shows the landing page.