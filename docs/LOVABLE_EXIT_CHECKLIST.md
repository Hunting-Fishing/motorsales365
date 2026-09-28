# Lovable exit checklist

Status of the migration off Lovable (hosting, Lovable Cloud backend, AI /
connector gateways, Lovable Emails, auth broker, MCP SDK, build tooling).

**Code:** complete on branch `chore/remove-lovable` — no runtime, build or
dependency references to Lovable remain (see "Verification" below).
**Operations:** the items below can only be done by the account owner in
external dashboards. Until they are done, the features noted will not work
in production after this branch is deployed.

Legend: 🔴 required before/at deploy of this branch · 🟠 required soon after ·
🟢 hygiene / decommission.

---

## Evidence gathered 2026-09-28 (read-only)

| Check | Result |
| --- | --- |
| `www.365motorsales.com` / apex DNS | Cloudflare nameservers (holly/mustafa), Cloudflare anycast IPs 104.21.16.75 / 172.67.166.232 — **not** Lovable's 185.158.133.1 |
| Response headers | `server: cloudflare`, no `x-deployment-id`/Lovable headers; HTML contains no Lovable strings |
| Live JS bundle | Still contains Lovable code (preview-auth broker, `/.lovable/oauth/consent`, `/lovable/email/*`) — goes away when this branch deploys |
| `/__l5e/assets-v1/*` on live domain | 307 → `/businesses` — **all builder-hosted images are broken in production today** (fixed in this branch by self-hosting them) |
| `motorsales365.lovable.app` | Still live (Lovable deployment, `Domain=lovable.app` cookie, `x-deployment-id`), old build pointing at old backend `jfjrnjyroxvlydajvndl` |
| `notify.365motorsales.com` | **NS delegated to `ns3.lovable.cloud` / `ns4.lovable.cloud`** (Lovable Emails sender subdomain) |
| MX / SPF for apex | Cloudflare Email Routing (`route*.mx.cloudflare.net`, `include:_spf.mx.cloudflare.net`) |
| Public DB rows (anon-visible, 294 tables scanned) | No `lovable`, `__l5e` or `jfjrnjyroxvlydajvndl` values; `site_settings.app_url = https://365motorsales.com` |

---

## 1. Cloudflare Worker secrets 🔴

Set on Worker **motorsales365** (Dashboard → Workers & Pages → motorsales365 →
Settings → Variables and Secrets, or `npx wrangler secret put NAME`).
Remove `LOVABLE_API_KEY`, `LOVABLE_SEND_URL`, `LOVABLE_PROJECT_ID`,
`LOVABLE_PREVIEW_HOST` afterwards.

| Secret | Where to get it | Used by |
| --- | --- | --- |
| `AI_API_KEY` | Google AI Studio → *Get API key* (aistudio.google.com/apikey), project with Gemini API enabled | translate, VIN decode, QR ad classify/smart-fit, CR/OR verification |
| `AI_BASE_URL` *(optional)* | default `https://generativelanguage.googleapis.com/v1beta/openai`; set for another OpenAI-compatible provider | same |
| `AI_MODEL` / `AI_MODEL_MAP` *(optional)* | only when not using Gemini model ids | same |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console → APIs & Services → Credentials → API key; enable **Places API (New)** and **Geocoding API**; restrict to those APIs (server key, no referrer restriction) | Places import/discovery, tow reverse-geocode |
| `STRIPE_LIVE_API_KEY`, `STRIPE_SANDBOX_API_KEY` | Stripe Dashboard → Developers → API keys (`sk_…`/`rk_…`). The old values were Lovable *connection* keys and will not work against api.stripe.com | all Stripe calls |
| `PAYMENTS_LIVE_WEBHOOK_SECRET`, `PAYMENTS_SANDBOX_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → endpoint signing secret (see §4) | `/api/public/payments/webhook` |
| `RESEND_API_KEY` | resend.com → API Keys (already exists as a repo secret; confirm it is also a Worker secret) | all email |
| `RESEND_WEBHOOK_SECRET` | Resend → Webhooks → endpoint → Signing secret (`whsec_…`) (see §3) | `/api/email/events` |
| `SEND_EMAIL_HOOK_SECRET` | Supabase → Authentication → Hooks → Send Email → generated secret (`v1,whsec_…`) (see §3) | `/api/email/auth-hook` |
| `EMAIL_FROM` *(optional)* | e.g. `365 MotorSales <noreply@365motorsales.com>` (default `motorsales365 <noreply@365motorsales.com>`) | all email |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | standalone project `wjxaajgvddtrxxtocxen` (should already be set; verify they are **not** the old project's) | server |

Verify: `npx wrangler secret list --name motorsales365` shows the names above
and none starting with `LOVABLE_`.

## 2. Supabase Auth (project `wjxaajgvddtrxxtocxen`) 🔴

1. **Google provider** — Authentication → Sign In / Providers → Google: enable,
   paste Client ID/Secret from Google Cloud Console → APIs & Services →
   Credentials → OAuth 2.0 Client (Web). In that Google client add the
   authorized redirect URI
   `https://wjxaajgvddtrxxtocxen.supabase.co/auth/v1/callback` and the
   authorized JavaScript origins `https://www.365motorsales.com`,
   `https://365motorsales.com`. Set the consent-screen app name/logo/domain
   to 365 MotorSales (it previously showed Lovable's broker).
2. **URL configuration** — Site URL `https://www.365motorsales.com`; Redirect
   URLs: `https://www.365motorsales.com/**`, `https://365motorsales.com/**`,
   `http://localhost:8080/**`. Remove any `*.lovable.app` /
   `*.lovableproject.com` entries.
3. **OAuth server (MCP)** — Authentication → OAuth Server: authorization path
   `/oauth/consent` (was `/.lovable/oauth/consent`), site URL as above.
   Re-register any MCP clients if needed.
4. **Emails** — either
   - *(recommended, matches code)* Authentication → Hooks → **Send Email** →
     HTTPS → `https://www.365motorsales.com/api/email/auth-hook`, generate the
     secret, store as `SEND_EMAIL_HOOK_SECRET`; **or**
   - Authentication → Emails → SMTP: Resend SMTP (`smtp.resend.com:465`,
     user `resend`, password = Resend API key) and paste templates.

Verify: sign in with Google on production lands back signed in; "Forgot
password" delivers an email whose link opens `/reset-password`; Supabase →
Auth → Hooks shows successful invocations.

## 3. Email (Resend + DNS) 🔴

1. Resend → Domains → add `365motorsales.com` (or a sending subdomain such as
   `send.365motorsales.com`) and add the SPF/DKIM (and optional return-path
   MX) records it shows in Cloudflare DNS. Keep Cloudflare Email Routing MX
   for inbound.
2. Add DMARC if absent: `_dmarc.365motorsales.com TXT "v=DMARC1; p=none; rua=mailto:…"`.
3. **Remove the Lovable delegation:** delete the `NS` records for
   `notify.365motorsales.com` → `ns3.lovable.cloud` / `ns4.lovable.cloud`.
4. Resend → Webhooks → add `https://www.365motorsales.com/api/email/events`
   with events `email.bounced`, `email.complained`; store the signing secret
   as `RESEND_WEBHOOK_SECRET`.
5. Queue worker cron (Supabase SQL editor; replace `<service_role_key>` with
   a Vault reference, never paste it in source control):

   ```sql
   select cron.schedule(
     'process-email-queue', '* * * * *',
     $$ select net.http_post(
          url := 'https://www.365motorsales.com/api/email/queue/process',
          headers := jsonb_build_object(
            'Content-Type','application/json',
            'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'email_queue_service_role_key')),
          body := '{}'::jsonb) $$);
   ```

   Drop the old Lovable-only `email_queue_dispatch()` / `email_queue_wake()`
   jobs/triggers if they exist in the target.

Verify: `dig NS notify.365motorsales.com` returns nothing Lovable;
submit a support ticket → row in `email_send_log` goes `pending` → `sent`;
Resend dashboard shows delivery; `curl -X POST .../api/email/events` without
signature returns 401.

## 4. Stripe 🔴

Follow `docs/STRIPE_GOLIVE.md` §3–4: real secret keys, webhook endpoints
`https://www.365motorsales.com/api/public/payments/webhook?env=live|sandbox`,
new signing secrets. Uninstall the Lovable Stripe app from both Stripe
accounts (Settings → Installed apps).

Verify: test checkout in sandbox succeeds; Stripe → Webhooks shows 2xx.

## 5. Database follow-ups 🟠

1. Apply migration `20260928090000_rewrite_legacy_hosted_asset_urls.sql`
   (rewrites any `listing_media.url` still on `/__l5e/assets-v1/…` to
   `/demo-listings/…`; no-op otherwise).
2. Run as service role and fix anything returned:

   ```sql
   select 'listing_media' t, count(*) from listing_media where url ~* '(lovable|__l5e|jfjrnjyroxvlydajvndl)'
   union all select 'site_settings', count(*) from site_settings where value::text ~* '(lovable|jfjrnjyroxvlydajvndl)'
   union all select 'cron.job', count(*) from cron.job where command ~* '(lovable|jfjrnjyroxvlydajvndl)';
   ```

   Also search storage-URL columns (avatars, logos, gallery) for
   `jfjrnjyroxvlydajvndl.supabase.co/storage` and re-point to the standalone
   project.
3. Before activating the imported (inactive) cron jobs, confirm each targets
   `https://www.365motorsales.com/...` and uses the standalone anon key /
   internal cron tokens (the historical migrations embed the old project's
   anon JWT and `project--…lovable.app` URLs).

## 6. GitHub 🟢

1. github.com/settings/installations (and the org's installations) →
   **Lovable** GitHub App → Uninstall (or remove this repository).
2. Repo → Settings → Webhooks / Deploy keys: remove any Lovable entries.
3. Repo/Org secrets: remove any `LOVABLE_*`.

Verify: the repo's "Integrations" list no longer shows Lovable and Lovable
can no longer push commits.

## 7. Rotate credentials Lovable had access to 🟠

Lovable Cloud hosted the old backend and injected secrets into its runtime,
so treat these as exposed and rotate:

- Supabase **old** project: service-role key, JWT secret, DB password (or
  simply delete the project — §8).
- Supabase **standalone** project: rotate the service-role/secret keys and
  DB password if they were ever pasted into Lovable (e.g. during the
  migration ingest), then update the Worker secrets.
- Stripe live/sandbox keys and webhook secrets (issued via the Lovable app).
- Google Maps keys issued through the Lovable connector (the browser key
  `AIzaSyBmvJ…` that was committed in `.env` as
  `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` is removed in this branch;
  delete or restrict it in Google Cloud).
- `FIRECRAWL_API_KEY`, `GIPHY_API_KEY`, `INVOLVE_ASIA_*`, `SIGNUP_AUDIT_SALT`
  and any other secret that was stored in Lovable Cloud.
- `LOVABLE_API_KEY` — delete in Lovable workspace settings.

## 8. Decommission Lovable 🟢 (after §1–5 are verified in production)

1. Lovable project → Settings → unpublish / delete `motorsales365.lovable.app`
   (it still serves an old build wired to the old backend — users or
   crawlers can still reach it).
2. Remove any custom domain entries for 365motorsales.com inside Lovable.
3. Export anything still needed from the old Lovable Cloud project
   `jfjrnjyroxvlydajvndl`, then pause/delete it.
4. Cancel the Lovable subscription if no longer used.

Verify: `curl -sI https://motorsales365.lovable.app` no longer returns the
app; `https://jfjrnjyroxvlydajvndl.supabase.co/rest/v1/` no longer responds.

---

## Verification (code)

```sh
npm ci --legacy-peer-deps
npx tsc --noEmit
npm run build
grep -rIil lovable .output/ || echo "no lovable strings in build"
npx wrangler deploy --dry-run
npx vitest run
# Remaining references are history only:
git grep -il -e lovable -e gptengineer -e gpt-engineer -e jfjrnjyroxvlydajvndl
```

Allowed remaining matches: this checklist, `docs/history/*`,
`docs/365_STANDALONE_CUTOVER_INVENTORY.md`,
`docs/365_SUPABASE_MIGRATION_CLOSURE_2026-09-11.md`, and immutable,
already-applied SQL in `supabase/migrations/` and
`supabase/standalone_migration_chunks/` (historical cron bodies and the
reserved slug `lovable`).
