## Goal

Turn `/dashboard/messages` and the listing `FloatingMessageWidget` into a Facebook-Messenger–style chat: rich conversation list, clear unread state, mark read/unread, image + video attachments, emoji picker, and a Tenor-powered GIF picker. Group chats, video calls, and friend invites are explicitly deferred.

## Backend

**Schema (`messages` table extensions via migration)**
- Add columns: `attachment_url text`, `attachment_type text` (`image` | `video` | `gif`), `attachment_thumb_url text`, `attachment_meta jsonb` (width/height/duration/mime/size).
- Keep `body` optional when an attachment is present (app-level rule; no CHECK to avoid time-dependent issues).
- Backfill unaffected; existing rows keep `attachment_url = null`.

**Storage**
- Create private bucket `message-media` via `storage_create_bucket`.
- RLS on `storage.objects` for `message-media`:
  - INSERT: `auth.uid() = owner` and path starts with `auth.uid()::text || '/'`.
  - SELECT: sender or recipient of any `messages` row whose `attachment_url` points at this object (matched by path).
- Client uploads to `message-media/{userId}/{uuid}.{ext}`, then inserts the message row with a signed URL (1-year) or storage path + resolves signed URLs on read.
- Limits enforced client-side: images ≤10MB (`image/*`), videos ≤50MB and ≤60s (probed via `<video>` metadata before upload); reject otherwise with a toast.

**Read/unread**
- Reuse existing `read_at` column. Add RPC `mark_conversation_unread(p_listing_id uuid, p_other_user_id uuid)` (SECURITY DEFINER, scoped to caller as recipient) that sets `read_at = null` on the last inbound message of that thread — used for the "Mark unread" action.
- Mark-as-read stays as current bulk `UPDATE ... read_at = now()` when opening a thread.

**Tenor GIF picker**
- Request `TENOR_API_KEY` via `add_secret` (Google Tenor v2, free).
- New server fn `src/lib/tenor.functions.ts` with two handlers: `tenorSearch({ q, pos? })` and `tenorTrending({ pos? })` — both call `https://tenor.googleapis.com/v2/{search|featured}` with the key from `process.env`, return `{ results: [{ id, preview, gif, width, height }], next }`. Keeps the key server-only.
- Selecting a GIF stores its Tenor MP4/GIF URL in `attachment_url` with `attachment_type='gif'` (no upload to our bucket needed).

## Frontend

**Composer (shared between `/dashboard/messages` and `FloatingMessageWidget`)**
- New `src/components/messaging/message-composer.tsx` with:
  - Textarea + send button (existing behavior).
  - `+` menu → Photo, Video, GIF.
  - Emoji picker button (use `emoji-picker-react`, lazy-imported).
  - Attachment preview chip above the textarea with remove button and upload progress bar.
- New `src/components/messaging/gif-picker.tsx` — trending on open, search on typing, grid of thumbs, click to attach.
- New `src/components/messaging/attachment-bubble.tsx` — renders image (with lightbox), `<video controls playsInline>` for video, and inline `<img>` for GIFs. Signed-URL resolver hook `useSignedMessageUrl` batches lookups.

**Inbox redesign (`src/routes/dashboard.messages.tsx`)**
- Conversation list rows show: other user avatar, name, listing thumbnail (small square from `listing_media`), last message preview (or "📷 Photo" / "🎬 Video" / "GIF" when attachment-only), timestamp, unread pill.
- Right-click / kebab menu on a row: "Mark as unread", "Mark as read", "Open listing".
- Thread header: avatar, name, listing thumb + title, link to listing.
- Message bubbles render text + attachment via `AttachmentBubble`.
- Composer becomes the new `MessageComposer`.
- Keep existing realtime subscription; refresh signed-URL cache on new inbound rows.

**Floating widget**
- `FloatingMessageWidget` swaps its inline textarea/button for `MessageComposer` (same props: message, setMessage, onSend, sending) so buyers can also send photos/videos/GIFs/emoji from the listing page.

## Dependencies
- `bun add emoji-picker-react` (client-only, lazy-loaded).
- No new package for Tenor — plain `fetch` from a server fn.

## Out of scope (deferred)
- Group chats (needs new participants schema).
- Video/voice calls (needs paid provider).
- Invite friends / share-to-social from inbox.
- Message reactions (can add later on top of same schema — will need `message_reactions` table).

## Technical notes
- Signed URLs use 7-day expiry, refreshed client-side on demand; cache in a `Map<messageId, { url, exp }>`.
- Videos are validated client-side using a hidden `<video>` element to read `duration` before upload; reject if `> 60s` or file size `> 50MB`.
- `attachment_type='gif'` links to Tenor's CDN — no bucket usage, no signed URL needed.
- Notification trigger (`trg_notify_message_recipient`) updated to prefer `body`, otherwise "sent you a photo/video/GIF" based on `attachment_type`.
- Realtime: `messages` already published; no publication change needed. Media bucket doesn't need realtime.

## Files touched
- Migration: extend `messages`, add `mark_conversation_unread` RPC, update notify trigger.
- New: `src/components/messaging/message-composer.tsx`, `gif-picker.tsx`, `attachment-bubble.tsx`, `use-signed-message-url.ts`, `src/lib/tenor.functions.ts`.
- Updated: `src/routes/dashboard.messages.tsx`, `src/components/listing/floating-message-widget.tsx`.
- Secret: `TENOR_API_KEY` via `add_secret`.
- Bucket: `message-media` (private) via `storage_create_bucket` + RLS migration.
