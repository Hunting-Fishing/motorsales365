
## Goal

Give the super-admin (`jordilwbailey@gmail.com`) full control over user accounts from `/admin/users`, plus a dedicated page for managing the 365motorsales staff team.

## 1. Reset Password (per-user)

You said: "let users reuse old passwords if they made mistakes." Interpreting that as — admin should be able to **set the user's password to a specific value** (so if they forgot a new one, you can restore the old one they tell you on the phone, or set any value they choose).

- New server function `adminSetUserPassword({ targetUserId, newPassword })` in `src/lib/admin-password.functions.ts`.
  - Gated to super-admin only (`jordilwbailey@gmail.com` + `admin` role check).
  - Uses `supabaseAdmin.auth.admin.updateUserById(id, { password })` — this bypasses Supabase's "no password reuse" check, so the user can reuse any prior password.
  - Logs to `admin_audit_log` (action `password_reset`, no password value stored).
- New "Reset password" button on every user row → opens a dialog with:
  - A password field (pre-filled with a generated strong password, with regenerate + copy buttons, same UX as Add User).
  - A "Save password" button. On success, shows the password one more time with a copy button and a reminder to share securely.

## 2. Edit User Profile (everything)

Replace the current minimal `EditUserDialog` with a full editor. Tabs inside one dialog:

- **Identity**: full_name, first_name, last_name, phone (auto-normalize to E.164).
- **Email**: change auth email via `supabaseAdmin.auth.admin.updateUserById(id, { email, email_confirm: true })`.
- **Business**: business_name, business_kind, business_address, region/province/city, postal_code.
- **Address**: street_address, postal_code, signup_city/region/province.
- **Avatar**: upload to existing avatars bucket, write `avatar_url` on profile.
- **Roles & access** (existing): staff roles, seller_type, verification_status.

All writes go through a new server function `adminUpdateUserProfile` (super-admin gated) so we can update both `profiles` and `auth.users` atomically and write `admin_audit_log` rows for each changed field.

## 3. Create Employee shortcut

- Add a second button next to "Add user" on `/admin/users`: **"Create Employee"**.
- Opens the existing `AddUserDialog` pre-configured:
  - Account type locked to **Staff**.
  - Email input enforces `@365motorsales.com` (validated client + server side in `/api/admin/create-user`).
  - Default roles: `support` (keep togglable).
- After creation, the new user is automatically added to the 365 Staff list (because filtering is by email domain).

## 4. 365 Staff management page

New route `/admin/staff-365` (also linked from the admin sidebar as "365 Staff").

- Server function `listStaff365({})` (super-admin gated) returns staff with:
  - id, email, full_name, roles, last_sign_in_at, email_confirmed_at, created_at, disabled status.
- Page shows a single table of all `@365motorsales.com` users with row actions:
  - Edit profile (reuses dialog from #2)
  - Reset password (reuses dialog from #1)
  - Sign-in link (existing magic link — keep eye icon here)
  - Toggle roles (admin/moderator/support/sales/advertising chips)
  - Disable / enable account (`supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: '876000h' | 'none' })`)
  - Remove from staff (revoke all staff roles; does not delete the auth user)
- Header shows seat count and a "Create Employee" button (same flow as #3).

## 5. Eye / Sign-in link visibility — is the current gating bad?

Today it only shows when **both**: caller is the super-admin **and** the row's user has `@365motorsales.com`. That's correct security-wise (one-time login as another person is a sensitive action — restricting it to staff impersonation only is right). So we keep that gating, just surface it more reliably:
- On `/admin/users`, the eye continues to appear only on 365 staff rows.
- On `/admin/staff-365`, the eye appears on every row by definition.
- If `listStaffUserIds` ever fails to load, we now log a console warning and show a tiny "staff list not loaded — retry" link in the toolbar so it's obvious why the eye is missing.

## Files

- New: `src/lib/admin-password.functions.ts`, `src/lib/admin-profile.functions.ts`, `src/lib/admin-staff-list.functions.ts`
- New: `src/components/admin/reset-password-dialog.tsx`, `src/components/admin/edit-profile-dialog.tsx` (replaces current edit dialog)
- New: `src/routes/admin.staff-365.tsx`
- Edit: `src/routes/admin.users.tsx` (add Create Employee button + Reset Password button + use new edit dialog + retry hint)
- Edit: `src/components/admin/add-user-dialog.tsx` (accept `lockStaff` + `enforce365Domain` props)
- Edit: `src/routes/api/admin/create-user.tsx` (enforce 365 domain when flagged)
- Edit: `src/routes/admin.tsx` (add "365 Staff" sidebar link)

## Out of scope

- No schema changes — all data already exists in `profiles` / `auth.users` / `user_roles` / `admin_audit_log`.
- Not changing the magic-link/eye gating policy.
- No bulk operations.

After your approval I'll switch to build mode and implement.
