
## Messenger v2 — folders, power actions, Sold auto-tag

Build a competitive, user-friendly inbox on top of the existing `messages` / `message_threads` / `user_notifications` tables. No breaking schema changes — additive columns + one small table.

### 1. Schema additions (single migration)

Add per-thread state so folders/power actions work for both DMs and group threads.

```text
messages
  + starred_by       uuid[]  default '{}'         -- per-message star
  + is_offer         boolean default false        -- structured offer bubble
  + offer_amount     numeric(12,2)                -- optional (nullable)
  + offer_currency   text default 'PHP'
  + offer_status     text                         -- pending|accepted|declined|countered|expired
  + system_kind      text                         -- null | 'listing_sold' | 'listing_relisted'

message_thread_state  (NEW — per user, per "conversation key")
  user_id            uuid
  scope              text        -- 'dm' | 'group'
  key                text        -- dm: "<other_user>:<listing_id|''>"  ; group: thread_id
  starred            bool  default false
  archived           bool  default false
  muted              bool  default false
  spam               bool  default false
  color_label        text                       -- 'red'|'orange'|'green'|'blue'|'violet'|null
  last_read_at       timestamptz
  PK (user_id, scope, key)

quick_replies         (NEW — per user)
  id uuid pk, user_id uuid, title text, body text, sort_order int, created_at

message_search_index  -- not a new table; add a Postgres GIN index on messages(body) via to_tsvector('simple', body) for global search
```

All new tables get RLS + GRANTs scoped to `auth.uid()`.

Derived "folder" is computed in the loader, not stored, using:
- **Unread** — `unread_count > 0`
- **Buying** — `listing.user_id != me` on the thread's listing
- **Selling** — `listing.user_id == me`
- **Sold** — listing.status = 'sold' (auto)
- **Starred / Archived / Spam** — from `message_thread_state`
- **Blocked** — `user_blocks` between me and other party

### 2. Sold auto-tag + system message

Trigger `after update on listings when new.status='sold' and old.status<>'sold'`:
- Insert a `messages` row per active thread on that listing with `system_kind='listing_sold'`, `sender_id = seller`, `body = 'This listing was marked sold. Thanks!'`.
- Push a `user_notifications` row (category `messages`) to each buyer.
- Buyer inbox row auto-appears under Sold via the derived folder rule (no data move).

Reverse trigger on relist (status back to `active`) posts `system_kind='listing_relisted'`.

### 3. Inbox UI — 2-pane + top folder tabs (`src/routes/dashboard.messages.tsx`)

Top bar tabs (sticky under the page header, scrollable on mobile):
```text
All · Unread · Buying · Selling · Sold · Starred · Archived · Spam
```
Each tab shows a live count pill. State persisted in URL search param `?f=unread`.

Left list (existing) gains:
- Per-row swipe/hover action strip: **Star · Mute · Archive · Mark unread · Move to Spam**.
- Optional colored dot (color label) at the left edge of the row.
- Total-messages pill + ✓✓ ticks (already in place).
- Right-click / long-press = context menu with the same actions + "Apply label".

Right chat pane gains:
- Header actions: Star thread, Mute, Archive, Mark unread, Block, View listing.
- **Inline Make Offer** button in the composer → opens a small popover (amount + optional note) → posts a message with `is_offer=true`. Seller sees Accept / Decline / Counter buttons rendered inside that bubble; state stored on the same row (`offer_status`). Accepted offers post a system message and can deep-link to checkout later.
- **Quick replies** button next to the composer → dropdown of the user's saved templates + "Manage" link that opens a small dialog to add/edit/delete.
- **System messages** render as centered pill bubbles (e.g. "🏷 Listing marked sold").

### 4. Global search

New page `/dashboard/messages/search?q=...` (also inline search box above the folder tabs):
- Server fn `searchMyMessages({ q, folder?, limit, cursor })` using the new GIN index on `messages.body`, scoped to threads the user participates in.
- Result rows link into the thread with the matched message highlighted and scrolled into view (existing scroll pattern).

### 5. Server functions (new file `src/lib/messaging-inbox.functions.ts`)

- `listMyConversations({ folder, q?, cursor })` — returns DM + group rows already merged, with `folder` counts for the tab bar in one payload.
- `setThreadState({ scope, key, patch })` — toggle star/mute/archive/spam/color.
- `markThreadUnread({ scope, key })` — clears `last_read_at`.
- `starMessage({ id, on })`.
- `sendOffer({ thread scope+key, amount, currency, note })`.
- `respondToOffer({ message_id, action: accept|decline|counter, counter_amount? })`.
- `listQuickReplies` / `upsertQuickReply` / `deleteQuickReply`.
- `searchMyMessages({ q, folder?, cursor })`.

All go through `requireSupabaseAuth`; existing bearer middleware already wired.

### 6. Floating widget parity (`src/components/listing/floating-message-widget.tsx`)

- Header gets Star / Mute / Block / Archive icons.
- Composer gets Quick Reply and Make Offer buttons (same primitives).
- If the listing is later marked sold, the widget shows the "listing_sold" system bubble at the top of new messages and switches Send button to "Reopen listing to reply" (still sendable — sellers often finalize post-sale).

### 7. Notifications

- Reuse `user_notifications` category `messages`. Muted threads suppress the insert via the existing `tg_notify_message_recipient` trigger (skip when `message_thread_state.muted = true` for the recipient).
- Blocked and spam-flagged threads suppress notifications entirely.

### Out of scope (call out only)
- No changes to fees, Terms, or Privacy.
- No new payment integration for offers — the Accept button just records intent for now and links to the existing listing/checkout.

### Files touched
- `src/routes/dashboard.messages.tsx` — top tab bar, folder logic, row actions, context menu, system bubbles, offer/quick-reply UI, header actions.
- `src/components/listing/floating-message-widget.tsx` — parity actions.
- New: `src/components/messaging/{folder-tabs,row-actions,offer-bubble,quick-replies-menu,label-picker,system-bubble}.tsx`.
- New: `src/lib/messaging-inbox.functions.ts`.
- New: `src/routes/dashboard.messages.search.tsx` (or inline search — will pick during build).
- One migration adding columns, `message_thread_state`, `quick_replies`, GIN index, and the sold/relist triggers, all with RLS + GRANTs.
