# Pause & Pivot: Handoff Doc + Messaging/Chat Overhaul

## Part 1 — Migration handoff file

Create `docs/SHOP_MANAGER_MIGRATION_STATUS.md` capturing where the `shop_manager` schema pull stopped so we can resume later:

- **Done:** 22 enums, 138 tables, 153 FKs, RLS enabled on all 138, GRANTs to `authenticated` + `service_role`.
- **Remaining:**
  - `06_policies_01–03.sql` (1,195 lines of RLS policies) — not yet applied. Currently only `service_role` can read/write.
  - Wire scoped policies per module as UI is built (work orders → customers → invoices → parts inventory → …).
  - Frontend surfaces (routes/components) that consume `shop_manager.*` tables — none exist yet.
  - Data seeding / demo shop.
- **File locations:** `/mnt/documents/curated/06_policies_0{1,2,3}.sql`.
- **Resume recipe:** verify counts via `SELECT count(*) FROM pg_policies WHERE schemaname='shop_manager'` (currently 0), then apply policy chunks in order.

## Part 2 — Messaging / Chat / Notifications diagnosis

Current state discovered:

- Two parallel messaging systems coexist:
  - `public.messages` — 1:1 listing/DM messages (Marketplace inbox).
  - `public.chat_threads` + `chat_thread_members` + `chat_thread_messages` — group chat used by `/dashboard/messages`.
- Tow requests write `tow_requests` with `provider_id = null` and a `matched_provider_ids[]` array. **There is no trigger that inserts a `user_notifications` row for matched providers**, so the provider business never gets an in-app ping. `NotificationsListener` works — it just receives nothing for tow.
- Nothing links a business's employees/team to a shared inbox. `chat_threads` are ad-hoc groups; there is no "business workspace" thread auto-populated with all `business_staff` / `organization_members`.
- `dashboard.messages.tsx` only surfaces threads the current user is already a member of — team members can't see other teammates' customer conversations.

## Fixes to ship

### A. Tow request notifications (backend)
1. DB trigger `notify_tow_matched_providers` on `INSERT` / `UPDATE OF matched_provider_ids` of `tow_requests`:
   - For each `uuid` in `matched_provider_ids`, insert a `user_notifications` row (`type='tow_request'`, title, body with pickup city + vehicle, `link_url=/dashboard/dispatch?request=<id>`).
   - On `UPDATE status`, notify the customer (`user_id`) and, when accepted, the winning `provider_id`.
2. If provider is a business owner, also notify every `business_staff` member with `role in ('owner','manager','dispatcher')` via `user_notifications`.
3. Verify realtime: `user_notifications` is already published; `NotificationsListener` will pop toasts automatically.

### B. Business team inbox (new)
1. Migration: add `chat_threads.business_id uuid references businesses(id)` + `kind text` ('team' | 'group' | 'customer').
2. Trigger `ensure_business_team_thread`: when a business is created OR a `business_staff` row is added, upsert a `kind='team'` thread for that `business_id` and add the user as a member. Removing staff removes membership.
3. RLS on `chat_thread_members` + `chat_thread_messages`: allow read/write when `auth.uid()` is an active `business_staff` of the thread's `business_id`, so the whole team sees the thread automatically.
4. `/dashboard/business/$businessId/inbox` route (or a "Team" tab inside `dashboard.messages`) that lists:
   - Team thread (all staff, always pinned).
   - Customer DMs where `recipient_id = business.owner_id` — expose to staff via a view `business_customer_messages` gated by `is_business_member(auth.uid(), business_id)`.

### C. Marketplace/DM fix
- Ensure `messages` inserts also fan out a `user_notifications` row to the recipient (trigger `notify_new_message`) so widgets and bell agree even when the recipient tab is closed.
- Fix `FloatingMessageWidget` to hydrate from `messages` filtered by `(sender=me OR recipient=me) AND listing_id` (bug: only showing outbound previously).

### D. UI
- `/dashboard/messages`: add left-rail sections **Team**, **Customers**, **Marketplace**, using `FolderTabs`.
- Empty-state CTAs: "Invite teammates" (links to `/dashboard/business/$id/staff`) when team thread has 1 member.
- Toast + red-dot count on the sidebar `Messages` and `Dispatch` items driven by `useUserNotifications` counts filtered by `type`.

## Technical details

- Files to add/edit: `docs/SHOP_MANAGER_MIGRATION_STATUS.md`, new migration `add_business_team_messaging`, new migration `notify_tow_and_messages`, `src/routes/dashboard.messages.tsx`, `src/components/messaging/*`, `src/lib/business-inbox.functions.ts`, `src/hooks/use-user-notifications.ts`.
- No changes to `shop_manager` schema in this phase.
- Realtime: rely on existing `user_notifications` publication + add `chat_threads`, `chat_thread_messages` to `supabase_realtime` if not already.

## Out of scope (call out to user)
- Voice/video calls, read receipts per-member, and message search across team inbox — can follow later.
- Migrating existing marketplace `messages` rows into `chat_threads` — keeping two tables for now.

Confirm and I'll build.
