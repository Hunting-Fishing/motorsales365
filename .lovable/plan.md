## Business sign-up & onboarding — audit findings + fix plan

Full audit covered the 15 surfaces of the business owner lifecycle (signup → email verify → verification docs → submit listing → checkout → list dashboard → editor tabs → mini-site → bookings/analytics → emails → tier gating).

Below is the prioritized fix plan. P0 = blocks launch; P1 = important; P2 = polish.

---

### P0 — Launch blockers (do first)

1. **Send the missing lifecycle emails** — owners are currently flying blind at every step.
   - Create templates: `business-submitted`, `business-approved`, `verification-submitted`, `verification-approved`, `verification-rejected`, `booking-status-changed`.
   - Wire `business-archived` / `business-restored` (templates exist but `dashboard.businesses.tsx setStatus` never enqueues them — UI even promises "we'll email you").
   - Add DB triggers (or server-fn enqueues) for: business insert → submitted; business status `pending → active` → approved; verification_requests status changes → submitted/approved/rejected; bookings status change → customer email.

2. **Wrong service catalog for non-fuel businesses.** `CatalogPicker` (`service-catalog-picker.tsx`) hardcodes `FUEL_STATION_CATALOG` and shows fuel grades to repair shops, towing companies, etc. Branch the catalog by `typeSlug` (fall back to a generic "Add custom service" panel when no catalog exists for the type).

3. **No location / map edit post-submission.** `lat`, `lng`, `street_address`, `region/province/city`, `postal_code` are locked at submit time. Add a "Location" tab to `dashboard.businesses_.$id.edit.tsx` with the same `LocationPicker` used at submit.

4. **Raw client insert in `businesses.submit.tsx`.** Replace `(supabase as any).from('businesses').insert(...)` with a `createServerFn` (`submitBusiness`) that validates with Zod, generates a unique slug (collision-check loop), uploads photos to a per-owner path, and returns the new row. Enqueues the `business-submitted` email from the same handler.

5. **Verification `business_kind` mismatch.** `dashboard.verification.tsx` exposes 4 options but signup offers 21. Replace the hardcoded enum with the same `BUSINESS_KINDS` source used at signup so a `towing` / `carwash` / `parts_shop` owner can self-identify correctly.

---

### P1 — Important polish

6. **Make core business fields editable post-submit.** Profile tab in the editor currently can't change `name`, `phone`, `email`, `website`, `type_slug`. Add these to `ProfileTab` (with slug-rename warning).

7. **Replace `window.confirm` with themed dialog** in `dashboard.businesses.tsx` (archive) and `bookings-tab.tsx` (delete). Use existing `AlertDialog`.

8. **Slug collision UX** in `businesses.submit.tsx` — pre-check uniqueness before insert and surface a friendly message ("That URL is taken — try `repair-shop-makati-2`").

9. **Google OAuth drops business fields.** `signup.tsx` business-intent form values aren't stashed before `signInWithOAuth` redirect. Persist them to `localStorage` in `handleGoogle()` the same way email signup does, and replay in `verify-email.tsx` / `use-auth.tsx`.

10. **Tier feature gates missing.** Analytics tab, gallery size, services count, etc. are open to all tiers. Add a small `useBusinessTier(business)` helper and gate the relevant tabs with an upsell card linking to the plan dialog.

11. **Pending business cannot upgrade.** `dashboard.businesses.tsx` only shows the Upgrade CTA when `status === 'active'`. Add explanatory copy + allow plan selection (saved as `pending_plan_slug`) for pending businesses.

12. **No cancel / downgrade UI** in `business-plan-dialog.tsx`. Add a "Manage subscription" link (Stripe customer portal) and surface current renewal date.

13. **Remove dead `private_seller` type** in `signup.tsx`, `verify-email.tsx`, `account-type-grid.tsx`.

14. **Hours editor incomplete-check.** `onboarding-checklist.tsx` flags `hours` as done when the JSON is non-null even if all days are closed. Add a real "has at least one open day" check.

15. **Booking exception editor — partial-day overrides.** Schema supports start/end times but UI only toggles full-day closed. Allow time-range overrides.

---

### P2 — Nice to have

16. Auto-save drafts in the 11-tab editor (per-tab debounce → `business_drafts` table or local).
17. Preview-before-publish toggle (`/dashboard/businesses/{id}/preview`).
18. Public/draft soft-unpublish toggle.
19. Transfer-ownership flow (email-confirmation handoff).
20. Analytics tab: date-range picker + CSV export + clicks/bookings overlay.
21. SEO tab: per-business meta title/description/OG image overrides.
22. Verification form: cancel pending submission; larger mobile-friendly dropzone.
23. `verify-email.tsx`: graceful fallback when `?email=` missing; intent-specific "what's next" copy.
24. `account-type-card.tsx`: always-visible "Popular for Pros" badge + keyboard nav.
25. Tags tab: order category headers based on business type instead of fuel-station-first.
26. `business.checkout.tsx`: loading state + error boundary around Stripe `EmbeddedCheckout`.

---

### Implementation order (suggested)

```text
Phase 1 (P0):
  1. Create 6 missing email templates + registry entries
  2. Add DB triggers / server fn enqueues for each lifecycle event
  3. Wire archive/restore emails into setStatus
  4. submitBusiness server fn + slug collision loop
  5. Verification kind enum sync
  6. Location tab in editor
  7. Branch CatalogPicker by typeSlug

Phase 2 (P1):
  8. Editable core fields in ProfileTab
  9. AlertDialog replacements
 10. Google OAuth stash for business fields
 11. Tier gate helper + upsell cards
 12. Pending-business upgrade affordance
 13. Stripe portal link in plan dialog
 14. Drop private_seller dead type
 15. Real hours-completeness check
 16. Partial-day booking exceptions

Phase 3 (P2 polish): items 16–26 as bandwidth allows.
```

### Reference files

- Signup: `src/routes/signup.tsx`, `src/components/signup/account-type-{card,grid}.tsx`, `src/routes/verify-email.tsx`
- Verification: `src/routes/dashboard.verification.tsx`
- Submit / checkout: `src/routes/businesses.submit.tsx`, `src/routes/business.checkout.tsx`
- Dashboard: `src/routes/dashboard.businesses.tsx`, `src/routes/dashboard.businesses_.$id.edit.tsx`
- Components: `src/components/business-page/*`, `src/components/business/*`, `src/components/business-plan-dialog.tsx`
- Server fns: `src/lib/business-{subscriptions,pages,mini-site,bookings}.functions.ts`
- Emails: `src/lib/email-templates/*`, `src/lib/email-templates/registry.ts`

Approve to proceed with **Phase 1 (P0)** first, or tell me to scope down / re-order.
