## Plan

Fix the marketplace messaging flow so listing messages behave like a reliable Messenger-style inbox.

### What will change

1. **Stabilize message saving**
   - Update the inbox reply flow to immediately add successfully inserted messages to local chat state.
   - Keep the database reload as a backup so history stays in sync after sends, replies, and real-time events.
   - Use the returned saved message row instead of assuming real-time will always arrive instantly.

2. **Fix message notifications**
   - The backend message notification trigger has already been repaired so new message notifications always include the required `messages` category and no longer fail with the `category` null error.
   - Confirm the notification rows are linked to `/dashboard/messages` for both buyer and seller.

3. **Repair mobile back behavior**
   - Stop auto-opening the first conversation on mobile after the user taps the back arrow.
   - Keep desktop behavior convenient by auto-selecting the latest conversation only on larger screens.
   - If an active conversation disappears, safely return mobile users to the conversation list.

4. **Improve real-time inbox refresh**
   - Memoize the inbox load function so real-time subscriptions don’t keep using stale closures.
   - Keep message, group message, and group member subscriptions refreshing the same current inbox state.

### Technical notes

- Main frontend file: `src/routes/dashboard.messages.tsx`
- Backend trigger fixed: `public.tg_notify_message_recipient()`
- No new tables are required.
- This does not change fees, privacy data collection, or policy pages.