## Add User feature + Admin tab info tooltips

### 1. "+ Add User" button (Admin → Users and Admin → Accounts)

Add a button at the top of both `/admin/users` and `/admin/accounts` that opens a modal to create a fully-active user. The modal collects:

- Email (required)
- Full name
- Temporary password (auto-generated, with copy button; admin can regenerate)
- Account type: **Staff** or **Business/Customer**
- If Staff → multi-select roles (admin, moderator, support, sales, advertising)
- If Business → seller_type (private/dealer/repair_shop/insurance) + business name; option to mark verified
- Send welcome/invite email toggle (default on)

### 2. Backend: server function for provisioning

Because creating an `auth.users` row requires the service role, add a TanStack server function:

- `src/lib/admin-users.functions.ts` → `createAdminUser` server fn
  - Middleware: `requireSupabaseAuth` + verify caller has `admin` role
  - Uses `supabaseAdmin` (service role) to:
    1. `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`
    2. The existing `handle_new_user` trigger creates the profile + default `user` role
    3. Insert any additional roles into `user_roles` (triggers `tg_create_staff_referral` automatically — staff get a QR row)
    4. If business: update profile `seller_type`, `business_name`, `business_kind`, optionally `verification_status='verified'`
    5. Optionally enqueue invite email via existing `enqueue_email`
  - Returns `{ userId, tempPassword }`

No DB migration needed — reuses existing tables, RLS, and triggers. Roles go through `user_roles`, so RLS policies (`has_role`, `can_moderate`, etc.) work immediately.

### 3. Frontend wiring

- `src/components/admin/add-user-dialog.tsx` — reusable dialog component
- Mount in `admin.users.tsx` and `admin.accounts.tsx` headers
- After success: toast with temp password (copyable), refresh the list

### 4. Info tooltips on every admin tab

Add a small `(i)` info icon next to each nav item in `src/routes/admin.tsx` using the existing `Tooltip` component, with a one-line description, e.g.:

- Overview — "Snapshot of platform health and KPIs"
- Accounts — "Manage customer & business subscriptions, plans, discounts"
- Users — "Create staff/business accounts and assign roles"
- Staff QR Referrals — "QR codes & referral codes for staff and admins"
- Verifications — "Approve business verification requests"
- Reports — "User-submitted reports of listings or messages"
- …(one line per tab)

Also add a header info banner on the Users and Accounts pages explaining the difference:
- **Users** = create/manage all accounts and assign roles
- **Accounts** = subscription, billing, and account-status management

### Technical notes

- Use existing `supabaseAdmin` from `src/integrations/supabase/client.server.ts`.
- Use `useServerFn` to invoke from the dialog (auth-protected, called from a component, not a loader).
- Temp password: 16-char random via `crypto.getRandomValues`.
- No schema/RLS changes — relies on existing `handle_new_user`, `tg_create_staff_referral`, and `user_roles` setup.