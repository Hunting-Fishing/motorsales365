# Partner/Influencer disclosure audit

I re-read every file we touched for the Partner Program disclosure work (`influencer-disclosure.tsx`, `partner-program.tsx`, `partner-program.apply.tsx`, `dashboard.partner-program.tsx`, `qr-landing-content.tsx`, `dashboard.promoter-resources.tsx`, `partner-program.functions.ts`). It's wired in the right places, but there are three real issues to fix and one nice‑to‑have.

## Issues found

1. **QR landing shows a generic disclosure even though we know the partner.** `src/components/qr-landing-content.tsx` renders `<InfluencerDisclosure className="mb-4" />` and `<InfluencerDisclosure variant="footer" />` with no `partnerName`, so visitors see *"This link is shared by an independent partner…"* instead of *"Maria is an independent partner…"*. The referral code loads the partner record already — we should pass its display name through.

2. **Partner dashboard has two overlapping disclosure blocks.** `dashboard.partner-program.tsx` renders a full banner at line 74 and then the "Disclosure verification" card (which itself contains a banner preview) directly below. Feels doubled. Keep the verification card (it's the useful one) and demote the top block to a one‑line reminder, or drop it entirely.

3. **Copy‑paste ad templates in `/dashboard/promoter-resources` don't include the required disclosure.** Every template in `AD_EXAMPLES` (FB posts, SMS, WhatsApp, email signature, card back) ships without the *"I may earn a commission…"* line. Partners who paste these are technically posting non‑compliant copy. The Partner Program memory rule requires the disclosure snippet on every shared post.

## Nice‑to‑have

4. Promoter‑resources page also has no reminder/link back to `/partner-program/terms` or the disclosure snippet card — add a small compliance strip at the top so partners know it's required before they grab templates.

## Changes

### `src/components/qr-landing-content.tsx`
- After the partner record loads (already fetched by `code`), capture `partner.display_name` (or existing equivalent field) into local state.
- Pass `partnerName={displayName}` to both the top banner (line 432) and the footer (line 813). When `displayName` is still null (loading / not found), keep the generic fallback the component already handles.

### `src/routes/dashboard.partner-program.tsx`
- Remove the standalone `<InfluencerDisclosure className="mt-4" ... />` + the paragraph beneath it (lines 74–82). The "Disclosure verification" card already shows all three variants and the copy‑ready snippet, so the top block is redundant.
- Leave the amber "Disclosure reminder" card at the bottom as the single call‑to‑action.

### `src/routes/dashboard.promoter-resources.tsx`
- Append the disclosure line to each template body so pasted copy is compliant by default:
  - FB / community / WhatsApp / Messenger posts: add a final line `Disclosure: I may earn a commission if you sign up through my 365 Motor Sales link. #365MotorSalesPartner`.
  - SMS/Viber: append `(I may earn a commission.)` (keeps it short for 160 chars).
  - Email signature: add `(Affiliate link — I may earn a commission.)` under the URL.
  - Business card back: no change (physical print, disclosure lives on the landing page).
- Add a compact amber notice above the `Tabs` block: "Disclosure required — every post using your link must include the snippet below" with a link to `/partner-program/terms` and the copy‑snippet button reused from the dashboard.

### No changes needed
- `src/components/influencer-disclosure.tsx` — component API is fine.
- `src/routes/partner-program.tsx` / `partner-program.apply.tsx` — hero placement is correct.
- Server functions and DB schema — no changes.

## Verification

- Load `/r/<some active code>` in the preview and confirm the banner reads *"Disclosure: <Partner name> is an independent partner…"* instead of the generic wording.
- Open `/dashboard/partner-program` and confirm only the verification card + bottom reminder remain (no duplicate top banner).
- Open `/dashboard/promoter-resources`, copy the FB long post, and confirm the pasted text ends with the disclosure line and hashtag.
- Run `bun run build:dev` to make sure nothing regressed.
