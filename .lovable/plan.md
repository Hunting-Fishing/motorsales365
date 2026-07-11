## Changes to `src/routes/listing.$id.tsx`

### 1. Buyer safety checklist at bottom of vehicle ads
- Expand the category gate around `<BuyerDocumentChecklist />` to cover all vehicle-related categories: `cars`, `motorcycles`, `trucks`, `boats`, `heavy-equipment`, `agri`, `atv-utv`, and legacy singular slugs.
- Move the render to the very bottom of the main content column (after the description/parts sections, just before the meta row with views/report).

### 2. Send-a-message floating widget (Messenger-style)
- Remove the sidebar `Collapsible` "Send a message" card.
- Add a new component `src/components/listing/floating-message-widget.tsx`:
  - Fixed bottom-right FAB (above the mobile action bar via `bottom-20 lg:bottom-6`), circular button with `MessageSquare` icon and pulsing accent.
  - Click opens an anchored chat-style popover card (~340px) with header (seller name/avatar), textarea, and Send button.
  - Reuses the existing `sendMessage` handler and `message` state (passed via props) — no business-logic changes.
  - Hidden when `!listing.allow_messages` or when viewing own listing.
  - `MobileActionBar`'s "Message" button opens the same widget instead of scrolling to a textarea.

### 3. View counter — actually record loads
Currently the listing page reads `view_count` but never calls the RPC that increments it, so the counter never moves.
- In the listing route, add a `useEffect` keyed on `listing.id` that calls `supabase.rpc("increment_listing_view", { _listing_id: listing.id, _viewer_id: userId ?? null })` once per mount.
- Guard with a `sessionStorage` key (`viewed:<listing_id>`) so refreshes within the same tab session don't double-count, but every fresh visit/link load counts.
- Skip when the viewer is the listing owner (`user_id === listing.user_id`).
- Fire-and-forget; ignore errors silently.

No schema changes — RPC and table already exist with proper grants.

### Files touched
- `src/routes/listing.$id.tsx` — reorder checklist, remove sidebar message card, add view-tracking effect, wire FAB.
- `src/components/listing/floating-message-widget.tsx` — new.
- `src/components/listing/mobile-action-bar.tsx` — `onMessageClick` now opens widget (prop passthrough unchanged).