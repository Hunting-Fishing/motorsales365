# Business Workspace Notifications

Make incoming **messages** and **requests** (tow jobs, bookings, inquiries) impossible to miss from anywhere in the business workspace.

## What you'll see

1. **Notification bell in the workspace header** (top-right of `/dashboard/business/$businessId/*`)
   - Red badge with unread count, pulsing dot when count > 0
   - Click → dropdown grouped by type: New Tow Requests, Messages, Bookings, Inquiries
   - Each item links to the right module (dispatch, inbox, bookings)
   - "Mark all read" + per-item dismiss

2. **Live toast popups (sonner)** that fire the moment something new arrives
   - Sound chime (toggleable) + browser Notification API permission prompt on first visit
   - Toast persists until clicked, with "View" action that deep-links to the record
   - Different toast styles per type (red urgent for tow requests, blue for messages)

3. **Sidebar badges** on Dispatch / Inbox / Bookings modules showing per-module unread counts

4. **First-run banner on workspace overview** explaining where notifications live and a button to enable browser notifications

## Technical sketch

**DB / realtime**
- Enable realtime publication on `tow_requests`, `messages`, `business_bookings`, `business_inquiries` (already-existing tables) filtered by `business_id`
- New `business_notification_reads` table (business_id, user_id, entity_type, entity_id, read_at) for unread tracking — with GRANTs + RLS scoped via `is_business_member`
- Server fn `getWorkspaceNotifications(businessId)` returns counts + recent items for the bell

**Frontend**
- `src/components/business-workspace/notification-bell.tsx` — bell + dropdown, uses `useQuery` for initial fetch
- `src/components/business-workspace/notifications-provider.tsx` — single Supabase realtime subscription per business, fans events out via context to:
  - sonner `toast()` calls
  - badge counts (invalidates React Query)
  - optional `new Notification()` browser popup when tab unfocused
- Mount provider + bell inside `dashboard.business.$businessId.tsx` layout so every workspace page inherits it
- Add badge prop to `WorkspaceSidebar` module items in `src/components/business-workspace/sidebar.tsx`

**Mark-as-read**
- Visiting a record auto-marks it read (server fn called from the detail route loader)
- "Mark all read" bulk server fn

## Out of scope (call out, don't build)
- Email/SMS notifications (use existing email pipeline if requested later)
- Mobile push notifications (PWA push requires VAPID setup — flag as Phase 2)
- Cross-business aggregated notifications (this is per-workspace)
