## Merge ServiceStrip into the sidebar "Services for this vehicle" card

You're right — they offer the exact same 5 inquiries (financing, insurance, OR/CR, title transfer, pre-purchase inspection). Keeping both is duplication. The sidebar card is the better surface (denser, contextual, near the seller actions), so it wins. The top strip gets removed and its only unique value — the prominent "Need inspection or insurance for this car?" hook — moves into the sidebar card as the subheading.

### Changes to `src/routes/listing.$id.tsx`

1. **Remove** the above-the-fold `<ServiceStrip />` block (and its import).
2. **Update the sidebar card** to inherit the strip's stronger hook:
   - Title: "Need inspection or insurance for this car?"
   - Subhead: "Free quotes from vetted PH partners — financing, insurance, OR/CR, title transfer, and a 365-vetted pre-purchase inspection from ₱99. One form, no commitment."
   - Same 5 ServiceInquiryDialog buttons (unchanged).

### Make these listing-page sections collapsible

Wrap each in `<Collapsible>` with a chevron trigger, matching the existing Specifications pattern (open on `md+`, collapsed on mobile by default):

- Services & offerings (tags)
- Description
- Needed parts (NeededPartsRail)
- Affiliate parts (AffiliatePartsSection)
- Buyer document checklist
- Sidebar: Seller card, Services for this vehicle, Send a message

Specifications is already collapsible — no change.

### Out of scope
- `ServiceStrip` component file itself (kept; other pages may use it — verified usage is grep-only this turn).
- Service inquiry flow / backend.
- Ad carousel, gallery, engagement bar (already cleaned up last turn).

### Files touched
- `src/routes/listing.$id.tsx` — remove strip, retitle sidebar card, wrap sections in `<Collapsible>`.

### Risk
Low. No data or business-logic changes. Each collapsible defaults open on desktop so the page reads identically there; mobile gets a tighter, scannable stack.
