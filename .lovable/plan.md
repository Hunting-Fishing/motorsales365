## Plan: Terms & Conditions page + developer rule

### Observations
- A `/terms` route already exists (`src/routes/terms.tsx`) with a short Terms of Service. It is linked from the footer and from the Refund/Privacy pages.
- The user is asking for a dedicated **Terms & Conditions** page — broader than the existing ToS, covering marketplace rules, fees, listings, payments, business directory (hours, services/products catalog, pricing), boosts/subscriptions, refunds reference, user-generated content, data, dispute handling, and Philippine law.
- A standing developer/AI rule should be saved so future changes to related features (pricing, payments, boosts, subscriptions, business directory, services catalog, refunds, data handling) automatically trigger a T&C review/update.

### What to build

1. **New route `/terms-and-conditions`** (`src/routes/terms-and-conditions.tsx`)
   - Built with `SiteLayout` and the same prose styling pattern as `/terms`, `/privacy`, `/refund-policy`.
   - Proper `head()` metadata: title `Terms & Conditions — 365 MotorSales Philippines`, meta description < 160 chars, `og:title`, `og:description`.
   - Single H1, semantic sections, "Last updated" line.
   - Sections:
     1. Introduction & acceptance
     2. Eligibility (18+, PH residents/registered businesses)
     3. Accounts & security
     4. Listings (vehicles, parts, services) — accuracy, ownership, photos
     5. Business directory (verified businesses, hours, opening/closing warnings, services & products catalog, pricing in ₱)
     6. Pricing display & promo pricing rules (fuel ₱/L, ₱/kWh, ₱/item, "From ₱")
     7. Prohibited items & conduct (mirrors guidelines)
     8. Fees, boosts, subscriptions (link to `/pricing`)
     9. Payments & test mode disclosure
     10. Refunds (link to `/refund-policy`)
     11. Buyer–seller transactions disclaimer
     12. User-generated content license
     13. Account suspension & termination
     14. Privacy (link to `/privacy`)
     15. Limitation of liability
     16. Governing law (Philippines, Metro Manila)
     17. Changes to these terms
     18. Contact

2. **Link the new page**
   - Add a footer link in `src/components/site-footer.tsx` (next to the existing Terms link), labeled "Terms & Conditions".
   - Keep `/terms` as-is to avoid breaking inbound links; cross-link the two at the top of each.

3. **Save the developer rule as project memory** (`mem://index.md` Core + `mem://policies/terms-sync`)
   - Core one-liner: "When changing fees, payments, boosts, subscriptions, refunds, business directory, services/products catalog, pricing units, prohibited items, or data handling — also update `/terms-and-conditions` (and `/terms`, `/refund-policy`, `/privacy` if relevant) and bump the Last updated date."
   - Detail file lists the exact triggers, the files to touch, and the "Last updated" convention.

### Technical notes
- Pure frontend/content change; no DB, no server functions, no auth changes.
- Route file naming: `terms-and-conditions.tsx` → `createFileRoute("/terms-and-conditions")`.
- Reuse Tailwind `prose` classes already used by sibling policy pages for visual consistency.
- No new dependencies.

### Out of scope
- No changes to the existing `/terms` content beyond a one-line cross-link.
- No admin UI to edit T&C content (it stays in code).
