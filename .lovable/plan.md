## Business Transfer Workflow

Add the ability for a business owner to transfer ownership of a business to another user, with admin moderation, party confirmations, in‑app notifications, view/contact tracking, and a complete immutable audit log for legal reference.

### Flow

```text
Owner → request transfer → Recipient (accept/decline)
                                ↓ accept
                          Admin review (approve/reject)
                                ↓ approve
                       Ownership transferred + both notified
```

Every state change writes to an append-only history table. Both parties (and admins) get in-app notifications; "viewed" + "contacted" flags are tracked on each notification.

### Database (one migration)

- `business_transfer_requests`
  - `id`, `business_id`, `from_user_id`, `to_user_id`, `to_email` (for invite-style if user not yet on platform — optional v1: required existing user)
  - `status` enum: `pending_recipient | recipient_accepted | recipient_declined | admin_approved | admin_rejected | completed | cancelled | expired`
  - `owner_message`, `recipient_response`, `admin_note`
  - `requested_at`, `recipient_responded_at`, `admin_reviewed_at`, `completed_at`, `expires_at` (default 14 days)
  - `admin_id`
- `business_transfer_history` (append-only)
  - `transfer_id`, `actor_id`, `actor_role` (`owner|recipient|admin|system`), `action`, `from_status`, `to_status`, `note`, `metadata jsonb`, `created_at`
- `notifications` (generic, reusable)
  - `user_id`, `kind` (`transfer_request|transfer_accepted|transfer_declined|transfer_approved|transfer_rejected|transfer_completed|transfer_cancelled`)
  - `title`, `body`, `link_url`, `entity_type`, `entity_id`
  - `viewed_at`, `contacted_at` (set when user clicks the contact CTA)
  - `created_at`
- RLS: owner/recipient see their own transfers; admins see all. History is read-only to parties + admins. Notifications scoped to `user_id`.
- Trigger on `status` change → write history row + insert notifications for the relevant parties.
- On `completed`: update `businesses.user_id` (and `organization_id` ownership if applicable) atomically inside a SECURITY DEFINER RPC `complete_business_transfer(transfer_id)` only callable when status = `admin_approved`.

### Server functions (`src/lib/business-transfers.functions.ts`)

- `requestTransfer({ businessId, toEmail, message })` — owner only
- `respondToTransfer({ transferId, accept, message })` — recipient only
- `adminReviewTransfer({ transferId, approve, note })` — admin only; on approve calls RPC to finalize
- `cancelTransfer({ transferId })` — owner (before admin approval)
- `listMyTransfers()` / `listAdminTransfers()`
- `markNotificationViewed({ id })`, `markNotificationContacted({ id })`

### UI

- **Owner**: button "Transfer ownership" on `/dashboard/businesses/$id/edit` → dialog with recipient email + message.
- **Recipient & Owner**: `/dashboard/transfers` list with status, history timeline, accept/decline/cancel actions.
- **Admin**: `/admin/business-transfers` queue (pending approval) with approve/reject + note; shows full history.
- **Notifications**: bell icon in `site-header` with unread count, dropdown list, "Mark contacted" button (logs contact attempt with timestamp for legal record).

### Audit & legal

- `business_transfer_history` is INSERT-only (no UPDATE/DELETE policy). Captures actor, IP-less but timestamped trail of every action, message, status change. Visible to both parties and admins from the transfer detail page; exportable as JSON via a server fn for legal review.

### Files

- migration: tables, RLS, GRANTs, triggers, RPC
- `src/lib/business-transfers.functions.ts`
- `src/lib/notifications.functions.ts`
- `src/components/notifications/notification-bell.tsx`
- `src/components/businesses/transfer-business-dialog.tsx`
- `src/routes/dashboard.transfers.tsx`
- `src/routes/admin.business-transfers.tsx`
- edits: `src/routes/dashboard.businesses_.$id.edit.tsx` (transfer button), `src/components/site-header.tsx` (bell), `src/routes/admin.tsx` (nav link), `src/routes/dashboard.tsx` (nav link)
