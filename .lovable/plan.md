## Goal

Stop the "₱2 placeholder" trick that's common on FB-style listings, and make every car card instantly tell buyers (1) what the price actually means and (2) who is selling it — using game-style rarity borders.

---

## 1. Honest pricing (new fields on `listings`)

Add columns to `public.listings`:

- `price_kind` enum: `asking` | `monthly` | `down_payment` | `starting_bid` (default `asking`)
- `negotiable` boolean (default false)
- `price_hidden` boolean (default false) — for "Send a message for price"; requires a real reserve price still stored
- `registration_status` enum: `registered` | `unregistered` | `for_transfer` | `unknown`

Validation rules (client + server):

- For vehicle categories (car / motorcycle / truck / equipment), `price_php` must be ≥ a per-category floor (e.g. car ≥ ₱20,000, motorcycle ≥ ₱5,000, monthly/DP ≥ ₱1,000). Reject values like ₱1 / ₱2 / ₱123 with a clear inline error.
- If `price_kind = monthly` or `down_payment`, the label MUST render with that suffix everywhere — no bare number.
- Title cannot contain the real price in a way that contradicts `price_php` (regex sweep for "₱ … M / K") — soft warning, not block.

User Score impact:

- Each "abuse-priced" listing (flagged by rule or by reports) decrements the seller's existing reputation/score. Three strikes in 30 days → new listings auto-go to `pending_review` instead of `active`.

---

## 2. Seller-tier rarity borders (game-style)

Derive a single `seller_tier` from existing data (no new auth needed):

| Tier | Border | Glow | Who |
|---|---|---|---|
| Unverified | thin grey | none | new account, no verification |
| Private (verified) | white | subtle | ID-verified private seller |
| Power seller | blue | soft blue | private seller with ≥ N sold / good score |
| Business | green | green | business profile linked |
| Dealership | gold | gold shimmer | verified dealership / org with active subscription |
| Featured / Boosted | dual gold + orange ring | animated | active boost OR top plan |
| Penalty | red dashed | none | score below threshold — warning to buyers |

Implementation:

- A `getSellerTier(listing)` helper in `src/lib/listing-tier.ts` returns `{ tier, borderClass, ringClass, label }` from `seller_type`, `organization_id`, verification flags, and reputation.
- Add tier tokens to `src/styles.css` (`--tier-gold`, `--tier-gold-glow`, etc.) so colors live in the design system, not ad-hoc Tailwind.
- `ListingCard` wraps its root in a `<div className={cn("rounded-xl p-[2px]", tier.borderClass)}>` for a true 2-color frame (outer ring + inner border) on premium tiers.

---

## 3. Pricing & status widgets on the card face

Small pill row pinned to the bottom-left of the photo (or top-right corner for the most important one):

- `Negotiable` (blue)
- `Monthly ₱X,XXX/mo` (purple) — replaces the big price
- `Down payment ₱X` (orange)
- `Registered` (green check) / `Unregistered` (amber) / `For transfer` (grey)
- `Private seller` / `Business` / `Dealership` (matches border color)
- `Verified ID` (small shield)

Pills are a single `<ListingBadges listing={l} />` component used by card, detail page, and search results so they stay consistent.

---

## 4. Listing form (`/sell` and `/listing/$id/edit`) updates

- Price input grows a segmented control: **Asking / Monthly / Down payment** + a **Negotiable** checkbox.
- Inline helper: "Real asking price only. Placeholder prices like ₱1 or ₱2 lower your seller score."
- Registration status dropdown for vehicles.
- "Hide price, ask buyers to message" toggle (still requires real `price_php` saved server-side).

---

## 5. Browse / filter

Add filters: price kind (asking only / include monthly / include DP), negotiable, registration status, seller tier (private / business / dealership / verified only). Default browse hides `price_kind != asking` from the main price sort so cheap monthly amounts don't dominate the cheapest-first sort.

---

## 6. Out of scope (separate follow-ups)

- New verification flows (we reuse existing verification + business/org data).
- Animations beyond a simple CSS shimmer on gold tier.
- Auctions UI — `starting_bid` enum value is reserved for later.
- Terms/Privacy edits — none of this changes data collection or fees, so no policy sync needed.

---

## Technical notes

- One migration: new enum types, new columns with safe defaults, plus a trigger that writes to `listing_price_history` when `price_php` or `price_kind` changes.
- Server-side validation in `src/lib/listing-payment.functions.ts` (or wherever listing create/update lives) using a shared Zod schema also imported by the client form.
- `getSellerTier` is pure and lives in `src/lib/listing-tier.ts`; covered by a small Vitest spec.
- Tier border colors are added in `src/styles.css` under `@theme inline` so Tailwind classes like `ring-tier-gold` work.
- No changes to `/terms` or `/privacy` (per project memory check: this only affects how price is displayed/validated, not fees, payments, or data handling).
