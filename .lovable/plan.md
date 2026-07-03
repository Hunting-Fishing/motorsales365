## Goal

The header "View as" dropdown currently only lets an admin preview seller types (Private seller, Dealer, Repair shop, Insurance). Admins need to also preview the app as an **Advertiser**, **Partner/Influencer (Partner Program)**, and other staff personas (Sales, Moderator, Support, regular user) from the same menu — one click, no need to open the separate Role simulator.

## What changes

Turn the "View as" button into a single unified **Persona switcher** for admins, grouping:

1. **Seller personas** (drives `simulatedSellerType`)
   - Private seller
   - Dealer
   - Repair shop
   - Insurance

2. **Role personas** (drives `simulatedRoles`)
   - Advertiser
   - Partner / Influencer (Partner Program partner)
   - Sales (Junior / Senior / Manager)
   - Moderator
   - Support
   - Regular user (no staff perms)

3. **Reset** — clears both simulated seller type and simulated roles back to the real admin account.

Selecting a persona sets the appropriate simulation flag(s) and closes the menu. The button label reflects the active persona (e.g. "View as: Advertiser").

The existing separate "Role" dropdown can be removed to avoid duplication (all its options move into the unified menu).

## Technical notes

- File: `src/components/site-header.tsx`
  - Replace the two admin dropdowns (seller View-as + Role simulator) with one grouped `DropdownMenu` using `DropdownMenuLabel` + `DropdownMenuSeparator`.
  - Each item calls the correct setter:
    - Seller personas → `setSimulatedSellerType(value)` and `setSimulatedRoles(null)`
    - Role personas → `setSimulatedRoles([value])` and `setSimulatedSellerType(null)`
    - Reset → both setters to `null`
  - "Partner / Influencer" persona: since there is no dedicated `AppRole` for partner, simulate it by setting `simulatedRoles` to `["user"]` **and** flipping a new local `simulatedPersona: "partner" | null` that gates partner-only UI. Simplest first pass: use the existing `advertising` role plus a `data-persona="partner"` marker; if a real partner flag is needed later, we can add `simulatedIsPartner` to `useAuth`.
- No DB or RLS changes. This is UI-only — the orange sandbox banner already reads "UI only — RLS unchanged."
- No changes to `src/hooks/use-auth.tsx` unless we add `simulatedIsPartner` (optional; called out above).

## Out of scope

- Server-side role impersonation (still UI-only).
- Adding a real `partner`/`influencer` value to the `AppRole` enum.
