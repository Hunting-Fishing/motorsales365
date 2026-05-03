## Goal

When a provider declines a **direct** tow request from `/dashboard/tow`, prompt for an optional reason and send that reason as an inbox message to the requester (in addition to marking the request `cancelled`).

## Changes

**`src/routes/dashboard.tow.tsx`**

1. Add a small reason dialog (shadcn `Dialog` + `Textarea`) triggered by the existing **Decline** button on direct requests.
2. Replace the current direct-decline path:
   - Open dialog → user types optional reason → confirm.
   - Update `tow_requests.status = 'cancelled'` for that id.
   - Insert a `messages` row to the requester:
     - `sender_id`: current user, `recipient_id`: `r.requester_id`
     - `listing_id`: `r.listing_id` if present (RLS on messages doesn't require it, but keeps the thread linked)
     - `body`:
       - With reason: `"I'm unable to take your tow request for \"<vehicle_summary>\". Reason: <reason>"`
       - Without reason: `"I'm unable to take your tow request for \"<vehicle_summary>\"."`
   - Toast "Request declined" and reload.
3. Broadcast "Hide" action stays unchanged (no requester notification — the request remains open for other providers).

## Notes

- No database migration needed — uses existing `messages` and `tow_requests` tables and current RLS (sender = `auth.uid()` is satisfied).
- The requester will see the decline message in `/dashboard/messages` thanks to the existing inbox flow.
