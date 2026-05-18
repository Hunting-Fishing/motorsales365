## Goal

Replace the generic `/signup` form with a purpose-built flow that lets users pick **what kind of account** they want before filling in the form, so the rest of the product (dashboard CTAs, onboarding, listing flow) can adapt to who they are.

## Account types (top of page, 4 icon cards in a grid)

| Card | Icon | Sub-text | Maps to |
|------|------|----------|---------|
| **Buyer / Browser** | Search | "Browse listings, save favorites, message sellers" | `seller_type = private`, `signup_intent = 'buyer'` |
| **Private seller** | Tag | "Sell your own vehicle, equipment or parts" | `seller_type = private`, `signup_intent = 'private_seller'` |
| **Business / Dealer** | Building2 | "Dealership, parts shop, rental — listed in Businesses directory" | `seller_type = business`, `signup_intent = 'business'` |
| **Service provider** | Wrench | "Towing, repair, body shop, carwash, salvage" | `seller_type = business`, `signup_intent = 'service_provider'` |

Selection is required before submit. One card is highlighted at a time (ring + bg tint via design tokens). Pre-select from `?type=` query param if present (so we can deep-link from CTAs like "List your business").

## Page layout (single page, card-grid on top, form below)

```text
┌─────────────────────────────────────────────────┐
│  Create your 365 MotorSales account             │
│  Pick what brings you here — we'll tailor it.   │
├─────────────────────────────────────────────────┤
│ [Buyer] [Private] [Business] [Service]          │   ← required, 4-up on md+, 2-up on mobile
├─────────────────────────────────────────────────┤
│ Full name                                       │
│ Email                                           │
│ Phone (optional, PH format)                     │
│ City / Town          [+ region auto from city]  │
│ Password                                        │
│                                                 │
│ ─ if Business or Service ─                      │
│   Business name                                 │
│                                                 │
│ [ Create account ]                              │
│ ─── or ───                                      │
│ [ Continue with Google ]                        │
│                                                 │
│ Terms · Privacy · Already have an account?      │
└─────────────────────────────────────────────────┘
```

- City uses the existing `LocationPicker` (PSGC-aware, already in the codebase) reduced to city level; region/province are derived from the PSGC pick, no extra typing.
- "Phone" stays optional at signup; verification still happens later in dashboard.
- For Business / Service, an inline **Business name** field appears (no full business profile here — that still happens on `/businesses/submit`).
- Google OAuth keeps working; the selected card is stashed in `localStorage` (`signup.intent`) before the OAuth redirect, then consumed on return so the chosen intent still saves to the profile.

## Post-signup routing

- Buyer → `/dashboard`
- Private seller → `/sell` (pre-empts "now go list something")
- Business → `/businesses/submit?prefill=1` (passes business name + city)
- Service provider → `/businesses/submit?prefill=1&service=1` (same form, service-tag tab pre-opened)

## Data model

Migration adds two nullable columns to `profiles`:

- `signup_intent text` — one of `buyer | private_seller | business | service_provider`
- `signup_city text` — denormalized PSGC city label for analytics / pre-fill (region/province also written to existing business_* fields when business/service is chosen)

Existing `seller_type` continues to be the source of truth for listing UI; `signup_intent` is the finer-grained marketing/onboarding signal. No RLS changes — `profiles` already has correct policies.

## Files to add / change

- **edit** `src/routes/signup.tsx` — new layout, card grid, conditional business-name field, intent → routing logic, OAuth intent persistence.
- **new** `src/components/signup/account-type-card.tsx` — single icon-card component (icon, label, description, selected state) using design tokens.
- **new** `src/components/signup/account-type-grid.tsx` — the 4-card grid + selection state.
- **edit** `src/hooks/use-auth.tsx` — after first sign-in, if `localStorage.signup.intent` exists, write it (+ city) to the user's profile row once, then clear it. Keeps Google OAuth flow honest.
- **migration** add `signup_intent` and `signup_city` to `profiles`.

## Out of scope

- Full business profile creation (still on `/businesses/submit`).
- Phone OTP verification at signup (stays in dashboard).
- Role-based admin/staff signup (admins are still provisioned via admin tools).
