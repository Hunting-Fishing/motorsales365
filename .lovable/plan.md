## Admin user management overhaul

Wire up the already-built components and add the remaining pieces so super-admin (`jordilwbailey@gmail.com`) can fully manage users.

### 1. Users page (`src/routes/admin.users.tsx`)
- Add **Create Employee** button next to existing "Add user" — opens `AddUserDialog` with `lockStaff`, `enforceDomain="@365motorsales.com"`, `triggerLabel="Create Employee"`.
- Replace per-row Edit action to open new `EditProfileDialog` (full profile: identity, email, business, address, avatar) instead of the role-only dialog. Keep the existing role/seller-type/verification dialog accessible via a secondary "Roles & verification" menu item.
- Add per-row **Reset password** action that opens `ResetPasswordDialog` (allows reuse of old passwords via admin API).
- Confirm Eye/sign-in-link button renders for all 365motorsales users when viewer is super-admin (already gated correctly — verify after wiring).

### 2. 365 Staff page (`src/routes/admin.staff-365.tsx`)
- New route listing only `@365motorsales.com` users via `listStaff365`.
- Per-row actions: Edit profile, Reset password, Send magic link, Toggle role, Disable/Enable account (`setStaff365Disabled`).
- Add nav link in `src/routes/admin.tsx` sidebar: "365 Staff".

### 3. Create-employee enforcement
- Update `src/routes/api/admin/create-user.tsx` server route to honor `enforceDomain` from request body and reject non-matching emails when set.

### Files
- **Edit**: `src/routes/admin.users.tsx`, `src/routes/admin.tsx`, `src/routes/api/admin/create-user.tsx`
- **Create**: `src/routes/admin.staff-365.tsx`
- **Already created** (just need wiring): `EditProfileDialog`, `ResetPasswordDialog`, `adminSetUserPassword`, `adminUpdateUserProfile`, `listStaff365`, `setStaff365Disabled`, `AddUserDialog` prop additions.

### Security
All new server functions verify caller is `jordilwbailey@gmail.com` via `requireSupabaseAuth` + email check before invoking `supabaseAdmin`.
