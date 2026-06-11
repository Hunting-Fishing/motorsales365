## Car Listing Page — Audit & Cleanup Plan

Scope: `src/routes/listing.$id.tsx` (the public car ad detail page). The editor (`listing.$id.edit.tsx`) is out of scope for this pass.

### What the audit found

Going section-by-section, these are real duplicates or UX issues. Nothing unique gets removed — only the second/third copy of the same control collapses into the first.

**1. Service CTAs appear up to 3× each.** Insurance, financing, inspection, OR/CR, and title transfer all show up in:
  - `ServiceStrip` (above-the-fold strip, line 562)
  - `QuoteRequestCta` sidebar card (insurance + financing again, line 758)
  - "Buyer safety add-ons" aside (inspection again, line 661)
  - "Services for this vehicle" sidebar grid (all 5 again, line 877)

  Result: insurance = 3 entry points, inspection = 3, financing = 2, OR/CR = 2, title transfer = 2.

**2. View count shown twice.** Engagement bar (line 539) and footer meta row (line 701).

**3. "Save listing" shown 3×.** Engagement bar pill (line 551), sidebar action button (line 846), and the favorite toggle in the engagement bar — same action, three buttons.

**4. Dealer subscription badge shown twice.** Title block (line 482) and seller card (line 794).

**5. Specifications header.** Already collapsible; fine — but the empty `{/* */}` gap (lines 628–630) and the gap before Description add visual noise on mobile.

**6. Sidebar density.** The right rail stacks: QuoteRequestCta → Ad → Seller card (with 5+ buttons) → Services grid (5 buttons) → Message box. On a 1015px viewport it's a wall of buttons.

**7. Gallery.** Single active thumbnail, no swipe/keyboard nav, no counter ("3 / 12"), no fullscreen/lightbox. Videos render as 96×64 inline `<video controls>` — awkward.

**8. Pricing block visually competes.** Headline price, `PricingWidget`, and `ListingBadges` all stack right of the title with no hierarchy — three "price-ish" components in a row.

**9. Report link buried in a 4-item meta row** with bullet separators; doesn't read as actionable.

**10. Mobile layout.** Engagement bar wraps to 3 lines; sticky sidebar collapses below content and the user has to scroll past everything to reach Call/WhatsApp.

### Proposed changes (UI/UX only, no business-logic changes)

**A. Consolidate service CTAs into ONE sidebar card**
- Keep `ServiceStrip` above the fold (it's the highest-converting entry).
- Sidebar "Services for this vehicle" card stays as the canonical detailed list (all 5 services in one grid).
- Remove `QuoteRequestCta` from the sidebar (its insurance + financing are already in both the strip and the services card). The component file stays — other pages may use it.
- Remove the standalone "Before you pay — buyer safety add-ons" aside; fold its copy ("Optional OR/CR review, seller ID verification, pre-purchase mechanic inspection — from ₱99") as a one-line subhead under the "Services for this vehicle" card so the value prop is preserved.
- Net: each service has exactly one above-the-fold entry (strip) and one detailed entry (sidebar card). Zero functionality lost.

**B. Dedupe engagement controls**
- Engagement bar keeps: Views, Likes, Save (single source of truth for Save).
- Remove the duplicate "Save listing" button from the sidebar action stack — Call / WhatsApp / QR / Tow stay.
- Remove the duplicate "views" line in the footer meta row (keep "Listed <date>" and Report).

**C. Dedupe dealer badge**
- Show `DealerSubscriptionBadge` only in the seller sidebar card (where it's contextual).
- Title block keeps the seller-type badge + Verified + Featured boost — but drops the dealer plan chip.

**D. Pricing block hierarchy**
- Group price + monthly/down (`PricingWidget`) into a single right-aligned block with the headline on top, financing terms underneath, and badges (`ListingBadges`) below that with smaller text — clear primary/secondary/tertiary tiering.

**E. Sidebar order & sticky behavior**
- New stack: Seller card (with Call / WhatsApp / Message-trigger / QR / Tow) → Services for this vehicle → Ad carousel → (Message inline form moved into a collapsible inside seller card, since Call/WhatsApp are the primary paths and the textarea takes vertical space).
- Sticky behavior unchanged; the smaller stack means Call/WhatsApp stay above the fold on a 1080-tall viewport.

**F. Gallery polish**
- Add prev/next arrows + photo counter "3 / 12" overlay.
- Click cover → lightbox (`Dialog` with full-size image, swipe + arrow-key nav). Videos open in the same lightbox.
- Thumbnails stay; videos get a play-icon poster instead of an inline `<video controls>` chip.

**G. Report visibility**
- Move "Report listing" out of the bullet-separated meta row into a small ghost button at the bottom of the seller card (next to the existing `ListingActionsMenu`). Footer meta row becomes "Listed <date> · <view count> views".

**H. Mobile**
- Engagement bar: icon-only on `<sm` (Views icon + count, Heart, Bookmark) to keep it one line.
- Add a sticky bottom action bar on mobile only: [Call] [WhatsApp] [Message] — mirrors the sidebar so mobile users don't have to scroll.

### Out of scope
- `listing.$id.edit.tsx` (seller-side editor, recently revised)
- Backend/RPC changes, pricing/policy changes
- Tow form, Specifications data shape, NeededPartsRail, AffiliatePartsSection, BuyerDocumentChecklist — all stay as-is
- `QuoteRequestCta` component itself (only removed from this one page)

### Files touched

- `src/routes/listing.$id.tsx` — all the above edits
- new: `src/components/listing/gallery-lightbox.tsx` — lightbox dialog
- new: `src/components/listing/mobile-action-bar.tsx` — sticky bottom bar (mobile only)

### Risk

Low. No data model, no server functions, no policy changes. Removed elements are all duplicates of controls that exist elsewhere on the same page. If any removal turns out to be wrong, it's a one-line revert.
