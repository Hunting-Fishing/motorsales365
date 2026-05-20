# Staff seller-type simulator

Today the Sandbox lets admins simulate **roles** (admin / sales / support / …). This plan adds a parallel **seller-type simulator** so support, sales, advertising, and moderator reps can preview exactly what a Private seller, Dealer, Repair shop, or Insurance account sees — to walk users through their screens.

Like the role simulator, it's **UI-only**: nothing is written to the database, RLS is unchanged, and the user's real profile is untouched. Sticky per device via localStorage.

## What changes

### 1. Auth context (`src/hooks/use-auth.tsx`)
- Load `profile.seller_type` after sign-in (alongside roles) → expose as `realSellerType`.
- Add `simulatedSellerType: SellerType | null` state, persisted in `localStorage` under `sandbox.sellerType`.
- Expose `effectiveSellerType = (isStaff && simulatedSellerType) || realSellerType || "private"`.
- Add setter `setSimulatedSellerType(next)`.
- Gate by **isStaff** (any staff role), not just admin, so sales/support/advertising reps can use it. RLS is unaffected, so this is safe.

### 2. Sandbox page (`src/routes/admin.sandbox.tsx`)
- New "Seller-type simulator" section above feature flags.
- Pill buttons: Private / Dealer / Repair shop / Insurance + "Reset".
- Show real vs effective seller type, with the same "UI only — RLS unchanged" disclaimer.
- The existing Sandbox route is already under `/admin/*`; widen its guard to allow any staff role (currently the `/admin` layout already lets non-admin staff in for the sections they own — verify and adjust if needed).

### 3. Sandbox banner (`src/components/sandbox-banner.tsx`)
- Already shows the simulated role. Extend it to also show "viewing as **Dealer**" when `simulatedSellerType` is set, with its own "Exit" chip.
- Show banner when **either** simulation is active, and when the user is staff (not only `realIsAdmin`).

### 4. Quick-switch in site header (`src/components/site-header.tsx`) — staff only
- Small dropdown in the header (visible only when `isStaff`) labeled "View as: {effectiveSellerType}" with the 4 options + "My account".
- Lets a rep flip views on any page without navigating to `/admin/sandbox`.

### 5. Consumers that gate by seller type — switch to `effectiveSellerType`
Replace direct `profile.seller_type` reads with `effectiveSellerType` from `useAuth()` in the spots that drive **what the user sees** (not what gets saved):
- `src/routes/dashboard.tsx` and `src/routes/dashboard.index.tsx` — nav items and welcome panel that branch on private vs dealer/repair_shop/insurance.
- `src/routes/dashboard.profile.tsx` — section visibility (business fields, verification CTA). Saves still write the **real** profile; visibility uses effective.
- `src/routes/sell.tsx` — defaulting the seller-type radio + which fields/limits are visible.
- `src/routes/dashboard.businesses.tsx`, `src/routes/dashboard.verification.tsx`, `src/routes/dashboard.billing.tsx` — show/hide based on effective type.
- `src/components/site-header.tsx` — any seller-type-dependent menu entries.

Spots that are **not** changed (must keep using the real profile):
- All writes (`sell.tsx` submit, profile updates, `api/admin/create-user.tsx`, `edit-user-dialog.tsx`).
- Anything driven by RLS or server functions — they always run as the real user.
- Public pages that render another user's profile (`seller.$id.tsx`, `listing.$id.tsx`, `listing-card.tsx`).

## Technical notes

- New type: `export type SellerType = "private" | "dealer" | "repair_shop" | "insurance";` in `use-auth.tsx`.
- LocalStorage key: `sandbox.sellerType`. Cleared on sign-out (same place roles cleanup happens).
- When `realSellerType` changes (profile updated), keep the simulated value; user explicitly resets it.
- Audit log: no entries — this is local, view-only.
- No DB migration, no schema changes, no new server functions.

## Out of scope

- Simulating verification status, business_kind, plan tier, or feature flags per seller type. (Easy to add later with the same pattern if needed.)
- Impersonating a specific user account. That's a much bigger security surface and not what was asked.

## Verification

1. Sign in as a sales rep → header shows "View as: Private". Switch to Dealer → dashboard nav and Sell flow render the dealer view, sandbox banner shows the simulation.
2. Reset → views return to the rep's real account immediately.
3. Try to **save** the Sell form while simulating Dealer → submitted row still uses the rep's real `seller_type` (no accidental writes).
4. Sign in as a regular `user` (no staff role) → no simulator UI, no banner, behaviour unchanged.
