## Goal

Add a **"Open Cloudflare Email Routing"** button to the Email Routing panel header on `/admin/staff-365?tab=routing` so admins can jump straight to the actual routing config (the source of truth for inbound mail) without hunting through Cloudflare.

Also add a one-paragraph info banner clarifying that this in-app panel is a **registry** of what's configured in Cloudflare — editing rows here does not change real routing.

## Changes

### `src/components/admin/email-routing-panel.tsx`

1. **Header strip** (above the existing filter row): a small info callout —
   - Icon: `Info` from `lucide-react`.
   - Text: "This is a local registry of who-mails-where. Real inbound routing for `@365motorsales.com` lives in Cloudflare — changes here do not redirect mail. Use the button to manage the actual rules."
   - Styling: `flex gap-2 rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground`.

2. **"Open Cloudflare Email Routing" button**, placed inline with the existing Refresh / Add buttons in the panel header:
   - shadcn `Button` size `sm`, variant `outline`.
   - Icon: `ExternalLink` (lucide).
   - Wraps an `<a>` with `href="https://dash.cloudflare.com/?to=/:account/365motorsales.com/email/routing/routes"` (Cloudflare resolves `:account` after login), `target="_blank"`, `rel="noopener noreferrer"`.
   - Label: "Cloudflare Routing".

3. Existing "Add route" / "Refresh" buttons are untouched.

### Out of scope

- No API call into Cloudflare (would require an API token + secret + edge function — separate decision).
- No webmail / inbox UI inside the app.
- No changes to `email_routes` schema or data.

## Acceptance

- Visiting `/admin/staff-365?tab=routing` shows an info callout explaining the registry-vs-Cloudflare distinction.
- A "Cloudflare Routing" button in the header opens `dash.cloudflare.com/.../email/routing/routes` in a new tab.
- All existing routing-panel functionality (filter, search, add, edit, delete) still works.
