## Finish the messaging system — Messenger-style widget + polished inbox

### Problems observed
1. The floating message widget on the listing page is **send-only**. Once you send a message, nothing appears — no chat history, no confirmation of past messages, no seller replies.
2. Console errors when opening the widget (400 Bad Request from a listing-related query + ERR_CACHE_OPERATION_NOT_SUPPORTED from the service worker cache).
3. The `/dashboard/messages` inbox row shows only the raw last message body (`"3rd message"`, `"hi"`) with **no "You:" / sender prefix** and **no total message count**.
4. No visible new-message notification affordance on the listing page itself.

### What I'll build

**1. Turn the floating widget into a mini-Messenger (`src/components/listing/floating-message-widget.tsx` + `src/routes/listing.$id.tsx`)**
- Load the full DM thread for `(listing_id, buyer_id ↔ seller_id)` when the widget opens, ordered oldest→newest.
- Render a scrollable transcript: my bubbles right-aligned (primary), seller bubbles left-aligned (card), with timestamps, day dividers, and attachment previews (image / video / gif) using the existing `attachment-bubble`.
- Auto-scroll to bottom on open / new message; show "Seller replied" toast + unread pill on the launcher when a new inbound message arrives while the widget is closed.
- Subscribe to Supabase Realtime for INSERTs on `messages` filtered to this listing + these two users, so both sides see live updates.
- Optimistic append on send (using the row returned from `.insert().select().single()`), matching the pattern already in `dashboard.messages.tsx`.
- Mark inbound messages `read_at = now()` when the widget is open, and call the existing `mark_message_notifications_read` helper so the bell badge clears.
- Empty state: friendly "Start the conversation with {seller}" prompt above the composer.
- Header gets an unread dot + "typing…"-style presence hint driven by realtime.

**2. Fix the console errors**
- Investigate the 400 Bad Request on the listing route (likely a stale selected column or PostgREST filter on `messages` / `favorites`). Reproduce, then tighten the query.
- The service-worker `ERR_CACHE_OPERATION_NOT_SUPPORTED` is a known Chromium warning triggered by our SW caching a redirected/opaque response; add a `try/catch` around the `cache.put` in `public/sw.js` and skip `cache: no-store` requests so it stops spamming the console.

**3. Polish the inbox row (`src/routes/dashboard.messages.tsx`)**
- Prepend `"You: "` / `"{Name}: "` to the DM `last_body` (already done for group threads on line 392, mirror it for DMs at lines 337–368).
- Show a **total message count** pill next to the timestamp (`💬 3`), plus keep the existing bold unread count.
- Add a read/unread checkmark tick (single = sent, double = read) on the last row when it was mine, Messenger-style.
- Improve the active-conversation header to show the listing thumb + price + status badges (already partial) and a "View listing" link, so context is always obvious.
- Small visual pass: rounded bubbles with tails, softer surface, sticky day dividers, and improved empty state artwork.

**4. Notifications tie-in (no schema changes)**
- Re-use the existing `user_notifications` `messages` category + `NotificationsListener`. Add a small "New message from {name}" line under the floating launcher when the widget is closed and a realtime insert arrives.
- When the widget or an inbox thread is opened, immediately clear that thread's notifications via `mark_message_notifications_read`.

### Out of scope (call out only)
- No DB schema migrations — everything runs on the existing `messages`, `message_threads`, and `user_notifications` tables.
- No changes to fees, policy pages, or Terms — this is UI + realtime plumbing only.

### Files touched
- `src/components/listing/floating-message-widget.tsx` (major expansion)
- `src/routes/listing.$id.tsx` (load thread, realtime, unread tracking)
- `src/routes/dashboard.messages.tsx` (row preview, counts, read ticks, header polish)
- `public/sw.js` (guard cache.put)
- Possibly a new small helper `src/hooks/use-listing-thread.ts` to keep the widget clean.
