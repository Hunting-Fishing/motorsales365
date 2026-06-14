## Goal

Make the **Create Employee** dialog on `/admin/staff-365` self-explanatory by adding small info `(?)` icons (tooltips) and one inline help banner that answer the recurring questions:

- Will a confirmation email be sent? (No.)
- How does the employee log in? (Email + the shown temp password.)
- Will the new `@365motorsales.com` address receive mail automatically? (No — Cloudflare routing rule is required first.)
- What's the temp password for / how is it shared?
- What do the roles mean?

No backend changes. Pure UX clarity on a form that's currently silent about all of this.

## Changes

### `src/components/admin/add-user-dialog.tsx`

1. **Add a Tooltip helper** at the top of the file: small `<InfoTip>` component wrapping shadcn `Tooltip` + a `lucide-react` `Info` icon (h-3.5 w-3.5, muted-foreground). Used inline next to field labels.

2. **Dialog description (top of dialog)** — replace the generic line with a 2-line summary:
   - "Creates a fully-active account. The employee can sign in immediately — no confirmation email is sent."
   - "Outbound mail from the app uses **notify.365motorsales.com**. Inbound mail to this address needs a Cloudflare routing rule (see Email Routing tab)."
   - Render the second line in a small `bg-muted/40 rounded-md p-2 text-xs` callout with an `Info` icon, only when `enforceDomain` is set (staff context).

3. **Per-field info icons** (add `<InfoTip>` next to these labels):
   - **Email** — "Used both for sign-in and as the From-recipient address on app emails. For `@365motorsales.com` addresses, make sure a Cloudflare routing rule exists, otherwise the employee can't receive any mail (including password resets)."
   - **First name / Last name** — "Shown across the admin UI and used in email greetings."
   - **Temporary password** — "One-time password. Share it through a secure channel (Signal, password manager, in person). The employee should change it at first sign-in."
   - **Roles** — "Adds extra capabilities on top of the base `user` role. `admin` = full access; `moderator` = listings/users moderation; `support` = tickets; `sales` = leads; `advertising` = ad inquiries."

4. **Staff-domain reminder** (existing "Email must end with @365motorsales.com" text) — keep, but upgrade to include an inline link:
   - "Don't forget to add a Cloudflare Email Routing rule for this address (and a row in the **Email Routing** tab) before sharing it." The "Email Routing" words link to `/admin/staff-365?tab=routing` (`Link` from `@tanstack/react-router`).

5. **Success toast** (after `Create user`) — append: "Add a Cloudflare routing rule for this address so they can receive mail." (Only when `enforceDomain` is set.)

### `src/routes/admin.staff-365.tsx`

- Read the `tab` search param on mount and pass it as `defaultValue` / controlled `value` to `<Tabs>` so the deep-link from the dialog lands on the Email Routing tab. Minimal change: use `useSearch({ strict: false })` + a small `useState` synced with it.

### Tooltip dependency

`@/components/ui/tooltip` already exists (shadcn). No new deps. Wrap the dialog content in a `<TooltipProvider>` if not already provided higher up.

## Out of scope

- No changes to actual Cloudflare routing — that stays in the Cloudflare dashboard.
- No webmail/inbox UI inside the app.
- No changes to `/api/admin/create-user` or the email infra.
- No changes to the general (non-staff) `AddUserDialog` consumers beyond the same tooltips (they get the same `InfoTip` icons; the routing callout only shows when `enforceDomain` is set, so non-staff usage is unaffected visually).

## Acceptance

- Opening Create Employee shows an Info callout explaining outbound vs inbound mail.
- Each labeled field has a `(?)` icon that reveals a tooltip with the explanations above.
- The `@365motorsales.com` reminder includes a clickable link that opens the Email Routing tab.
- The success toast reminds the admin to add the Cloudflare rule.
- No backend/API changes; existing create flow still works.
