## Goal

Replace the single "Full name" field on the admin Add User dialog with two fields — **First name** and **Last name** — wherever the dialog is used (365 Staff and the general admin Users page). No changes to the two-account model: Billy gets two unrelated accounts under two different emails (e.g. `billy.b@365motorsales.com` for staff, his personal email for personal use), and he signs out / signs in to switch.

## Confirmation-email behavior (no change needed)

The admin Create User route (`src/routes/api/admin/create-user.tsx`) already calls `auth.admin.createUser` with `email_confirm: true`, so creating `billy.b@365motorsales.com` will **not** send a confirmation email — the account is pre-verified and ready to sign in with the temporary password.

## Changes

### 1. `src/components/admin/add-user-dialog.tsx`
- Replace `fullName` state with `firstName` and `lastName` state.
- Replace the single "Full name *" input with two side-by-side inputs: **First name *** and **Last name *** (grid `grid-cols-2 gap-3`).
- Validation: require both first and last to be non-empty.
- On submit, send `full_name: \`${firstName.trim()} ${lastName.trim()}\`` to `/api/admin/create-user` so the backend, profile row, and `user_metadata.full_name` keep working unchanged.
- Reset both fields in `reset()`.

### 2. No backend changes
The API route and profile schema continue to store `full_name`. First/Last is purely a UI concern for now.

### 3. No other call sites need updating
`AddUserDialog` is used by `src/routes/admin.staff-365.tsx` and the general admin users page; both consume it as a black box with `onCreated` only, so the split is transparent to them.

## Out of scope (per your choice "C")

- No `linked_user_id` or account-switcher UI.
- No "act as personal seller" mode on the staff account.
- Billy will just have two separate accounts; to swap he signs out and signs in with the other email.

## Acceptance

- Opening "Create Employee" on `/admin/staff-365` shows First name and Last name side by side instead of one Full name field.
- Submitting with "Billy" + "Bailey" creates the user with `full_name = "Billy Bailey"` in `profiles` and in auth metadata.
- Creating `billy.b@365motorsales.com` produces no confirmation email and the account can sign in immediately with the shown temp password.
- The general admin Add User dialog (non-staff) shows the same split.
