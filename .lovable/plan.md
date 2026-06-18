## Goal

Transform `/r/$code` (currently a compact "Jordi sent you here" card) into a full marketing landing page that captivates visitors and converts them to sign up / browse / partner, while preserving the existing referral attribution, scan-counting, and promos logic.

## Scope

Single file: `src/routes/r.$code.tsx`. No backend, schema, or routing changes. All existing tracking (`record_referral_touch`, scan logging, localStorage visit count, active promos, referral credit semantics) is kept exactly as-is.

## Layout (top → bottom)

1. **Referral credit card (kept at top, as requested)**
   - Existing "Referred by · {staffName} sent you here" card.
   - Keep: counted/repeat-scan chip + tooltip, visit-count info, active promos, and the two primary CTAs (Create an account / Browse listings).
   - Add a third button: **Partner your business with us** → `/businesses` (existing route).
   - Add a small "Contact: {referrer email} mailto" line below the CTAs, using the referring staff member's email pulled from `profiles.email` via the existing referral lookup (extend the current `staff_referrals` query to also fetch the linked profile's email). If no email is available, hide the line — never show a placeholder.

2. **Hero**
   - H1: "365 Motor Sales — The Motor Marketplace Built for the Philippines"
   - Subhead: "Buy. Sell. List. Partner. Learn. Play."
   - Short intro paragraph from the brief.
   - CTAs: "List With 365 Motor Sales" (→ `/listings/new`) and "Partner Your Business With Us" (→ `/businesses`).

3. **Why 365 Is Different** — two-column comparison: "Generic feeds" vs "365 Motor Sales".

4. **What You Can List** — two cards: Vehicle Listings (cars, motorcycles, trucks, vans, heavy/farm/construction equipment, marine) and Business Listings (tire/vulcanizing, car wash, auto/moto repair, aircon, towing, driving schools, insurance, parts, batteries, accessories, wraps, detailing, salvage, equipment service).

5. **Business Network Advantage** — short pitch paragraph.

6. **Coming Soon** — three feature cards: Online Parts Ordering, Shop Management Software, Education + International Skills Training. Each lists the planned bullets from the brief, with a "Coming soon" badge.

7. **Mobile Game Ecosystem** — card with "Earn Freebies & Add Boosts" highlight and bullets.

8. **Built for the Philippines First** — short closer + bullet list of audiences.

9. **Final CTA band** — "Join the 365 Motor Sales Network" with three buttons: List a vehicle, List a business, Browse listings. Repeats the referrer email mailto line.

All copy comes verbatim (lightly tightened) from the user's brief.

## Technical notes

- Keep `SiteLayout` + `TooltipProvider` wrapper. Replace the single `max-w-2xl` container with a wider container (`max-w-5xl`) for the marketing sections; the referral credit card stays `max-w-2xl` centered at the top.
- Add `head()` meta: title "Referred to 365 Motor Sales — Philippines Motor Marketplace", description, og:title/og:description, canonical to `https://365motorsales.com/r/{code}`.
- Extend the `staff_referrals` Supabase select to join the referring profile and read `email` (e.g. `profiles!staff_referrals_user_id_fkey(email, full_name)`). Use it for both the displayed name (existing) and the new contact mailto.
- All styling uses existing semantic tokens (`bg-card`, `border-border`, `text-muted-foreground`, `bg-primary`, etc.). No hardcoded colors.
- Icons from `lucide-react` (already in project).
- No new dependencies, no new routes, no schema changes.

## Out of scope

- Changing referral tracking, scan counting, or promo logic.
- Adding new pages (e.g. dedicated `/partner`).
- Adding `og:image` (will be added separately if user wants).
