# 365 MotorSales — Standalone Cutover Inventory

Read-only inventory. No source or target changes were made. No secret values are shown.
Source: Lovable Cloud backend (`jfjrnjyroxvlydajvndl`). Target: user-owned Supabase (`wjxaajgvddtrxxtocxen`).

Legend: **[M]** already migrated · **[C]** needs new credential/configuration · **[R]** needs code replacement · **[X]** Lovable-only, remove

---

## 1. Scheduled jobs (pg_cron)

`cron.job` and `vault.secrets` are not readable by the audit role (permission denied), so the live job list below is reconstructed from repo migrations plus the `public.internal_cron_tokens` registry. All jobs must be re-created in the target after cutover, because pg_cron jobs are not part of table data.

| Job name | Schedule | Calls | Class |
|---|---|---|---|
| `refresh-lazada-prices` | `0 */6 * * *` | POST `{app_url}/api/public/hooks/refresh-lazada` | **[C]** re-schedule + new token |
| `refresh-fx-rates` | `0 3 * * *` | POST `{app_url}/api/public/fx/refresh` | **[C]** |
| `ops-alerts-digest` | `*/15 * * * *` | POST `{app_url}/api/public/hooks/ops-alerts-digest` | **[C]** |
| `signup-failure-alerts` | `*/5 * * * *` | POST `{app_url}/api/public/hooks/signup-failure-alerts` | **[C]** |
| `cleanup-unverified-users` | `17 * * * *` | in-DB SQL (deletes unconfirmed `auth.users`) | **[C]** |
| `expire-stale-pending-sales` | `0 2 * * *` | in-DB function | **[C]** |
| `process-email-queue` | per email-infra migration | `net.http_post` → Lovable email queue endpoint | **[X]/[R]** |
| tokens registered but scheduled outside migrations: `discover_sync`, `parts_wanted_digest`, `shop_automation_run`, `recompute_tiers`, `quarterly_bonuses`, `annual_bonuses` | unknown (live `cron.job` unreadable) | matching `/api/public/hooks/*` routes | **[C]** confirm + re-schedule |

Dependencies: `pg_cron`, `pg_net`, `pgmq`, `supabase_vault`, `pg_trgm` must be enabled in the target. Jobs read the callback base URL from `public.site_settings.app_url` — **[C]** update to the new production host, and re-issue every row in `public.internal_cron_tokens` (`x-cron-token` values) so old Lovable tokens stop working.

---

## 2. Runtime secrets / env vars (names only)

Supabase binding — **[C]** all repointed to the new project:
`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SUPABASE_PROJECT_ID`, `SHOP_MANAGER_SUPABASE_URL`, `SHOP_MANAGER_SUPABASE_SERVICE_ROLE_KEY`

Third-party — **[C]** re-enter in the new hosting environment (values are reusable, bindings are not):
`STRIPE_LIVE_API_KEY`, `STRIPE_SANDBOX_API_KEY`, `PAYMENTS_LIVE_WEBHOOK_SECRET`, `PAYMENTS_SANDBOX_WEBHOOK_SECRET`, `VITE_PAYMENTS_CLIENT_TOKEN`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_BROWSER_KEY`, `GOOGLE_MAPS_TRACKING_ID`, `FIRECRAWL_API_KEY`, `GIPHY_API_KEY`, `INVOLVE_ASIA_API_KEY`, `INVOLVE_ASIA_API_KEY_NAME`, `INVOLVE_ASIA_API_SECRET`, `INVOLVE_ASIA_AFFILIATE_ID`, `AMAZON_ASSOCIATE_TAG`, `SIGNUP_AUDIT_SALT`, `SITE_URL` / `VITE_SITE_URL`, `PUBLIC_SITE_ORIGIN` / `VITE_PUBLIC_SITE_ORIGIN`

Lovable-only — **[X]** remove with the code that reads them:
`LOVABLE_API_KEY` (AI Gateway + connector gateway + email), `LOVABLE_SEND_URL`, `LOVABLE_PROJECT_ID`, `LOVABLE_PREVIEW_HOST`, `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`, `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID`, `AGW_TOKEN`, `__LOVABLE_*`, `LOVABLE_ASSETS_*`, `LOVABLE_BROWSER_*`

Migration-only — **[X]** delete after cutover: `TARGET_SUPABASE_URL`, `TARGET_SUPABASE_SERVICE_ROLE_KEY`, plus the temporary routes in §9.

---

## 3. Google / Auth provider configuration — **[C]**

- Auth users, password hashes, identities and MFA: **[M]**.
- Google OAuth client: create/repoint in the target project; add redirect `https://<target-ref>.supabase.co/auth/v1/callback` and site/redirect allowlist for `365motorsales.com`, `www.365motorsales.com`.
- Site URL + additional redirect URLs, email confirmation on, no anonymous sign-ups, JWT expiry, SMTP (see §5) all need re-entry — auth *settings* were not migrated with data.
- **[R]** `src/integrations/lovable/index.ts`, `src/routes/login.tsx`, `src/routes/signup.tsx` use `lovable.auth.signInWithOAuth` (`@lovable.dev/cloud-auth-js`); replace with `supabase.auth.signInWithOAuth`.
- **[X]** `src/integrations/supabase/previewAuthStorage.ts` (Lovable preview-host session sharing) and `src/routes/[.well-known]/*`, `src/routes/[.mcp]/*`, `src/routes/mcp.ts`, `src/lib/mcp/*` (`@lovable.dev/mcp-js`, Lovable JWKS).

---

## 4. Stripe / webhooks

- **[R]** `src/lib/stripe.server.ts` routes all Stripe traffic through `https://connector-gateway.lovable.dev/stripe` with `Lovable-API-Key`; switch to `https://api.stripe.com` with the raw key.
- **[C]** New webhook endpoints in the Stripe dashboard pointing at `/api/public/payment-events` on the new host, for live and sandbox; new signing secrets into `PAYMENTS_*_WEBHOOK_SECRET`.
- **[R]** `ALLOWED_RETURN_ORIGINS` / `ALLOWED_RETURN_HOST_SUFFIXES` in `stripe.server.ts` still allow `motorsales365.lovable.app`, both `project--0738c881-…lovable.app` hosts, `.lovableproject.com`, `.sandbox.lovable.dev`.
- **[C]** Verify product/price IDs referenced by Shop Manager tiers and franchise tiers still resolve under the account in use.
- Other inbound webhooks: `/api/public/hooks/*`, `/api/public/postback.$network` (affiliate postbacks — **[C]** re-register URL with the network).

---

## 5. Email — all Lovable Email

Every send path is Lovable Email and must be replaced (Resend/Mailgun/SES/SMTP):

- **[X]/[R]** `src/routes/lovable/email/queue/process.ts` (`sendLovableEmail`, `LOVABLE_SEND_URL`), `auth/webhook.ts`, `auth/preview.ts`, `transactional/send.ts`, `transactional/preview.ts`, `suppression.ts` (`@lovable.dev/email-js`, `@lovable.dev/webhooks-js`).
- **[R]** `src/lib/email/send.ts`, `src/lib/email/server-enqueue.server.ts` — dispatch layer; keep the queue tables, swap the provider.
- **[X]** `public.email_queue_dispatch()` and `email_queue_wake()` — Lovable-only (`pgmq` + `vault` + `pg_net` → Lovable endpoint). Confirmed excluded from migration.
- **[M]** data: `email_send_log` (104 rows synced), queue/suppression/template tables.
- **[C]** Supabase Auth SMTP + custom auth email templates in the target; new provider API key; sending-domain DNS (SPF/DKIM/DMARC) for `365motorsales.com`.
- Callers to re-verify after the swap: team invites, service inquiries, support tickets (`src/components/support/support-ticket-form.tsx`), organization invites (`src/lib/organizations.functions.ts`), payment events, unsubscribe route `src/routes/email/unsubscribe.ts`.

---

## 6. Google Maps — **[R] + [C]**

Server calls go through the Lovable connector gateway `https://connector-gateway.lovable.dev/google_maps` in: `src/lib/places.server.ts`, `src/lib/tow-geo.functions.ts`, `src/lib/business-seed.functions.ts`, `src/lib/business-discovery-sync.server.ts` (+ `business-discovery-sync.functions.ts`). Replace with direct `maps.googleapis.com` calls using an own Google Cloud key. Browser key/tracking id currently come from `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_*` — **[C]** issue own restricted browser key (referrer allowlist for the new hosts). Leaflet/OpenStreetMap map rendering needs nothing.

---

## 7. Other external APIs

| Dependency | Where | Class |
|---|---|---|
| Firecrawl | `src/lib/business-discover.server.ts`, `facebook-import.server.ts`, `shop.functions.ts` | **[C]** own key (direct API, no code change) |
| Giphy | `src/lib/giphy.functions.ts` | **[C]** |
| Involve Asia | `src/lib/involve-asia.server.ts`, `partner-feed.server.ts` | **[C]** own key/secret/affiliate id; direct API |
| Amazon Associates | `src/lib/shop-url.ts`, `shop.functions.ts`, `monetization-directory.ts`, `admin-reports.functions.ts`, `/api/public/go.$slug` | **[C]** own associate tag |
| Lovable AI Gateway (`ai.gateway.lovable.dev`) | `src/lib/translate.functions.ts`, `vin-decode.server.ts`, `listing-verification.functions.ts`, `qr-ad-classify.functions.ts`, `qr-ad-vision.functions.ts` | **[R]** repoint to OpenAI/Gemini directly + **[C]** own AI key |
| Cloudflare DoH (domain verification) | `src/lib/business-domain.functions.ts` | **[M]** public API, no credential |
| FX rates provider | `/api/public/fx/refresh` | **[C]** confirm key if provider requires one |

---

## 8. Hard-coded Lovable hosts / old project ref

- `.env`, `.env.development`, `.env.production`, `supabase/config.toml` (`project_id = "jfjrnjyroxvlydajvndl"`) — **[C]**.
- `src/lib/stripe.server.ts` allowlist (4 lovable.app origins + 3 suffixes) — **[R]**.
- `src/lib/business-domain.functions.ts` (`.lovable.app`, `motorsales365.lovable.app`) — **[R]**.
- `src/lib/site-config.ts`, `src/components/service-worker-register.tsx`, `src/components/qr-rescue-detector.tsx`, `src/integrations/supabase/previewAuthStorage.ts` — preview-host special cases, **[R]/[X]**.
- `src/routes/lovable/email/auth/preview.ts` (`SAMPLE_PROJECT_URL`) — **[X]**.
- Cron doc comments in `/api/public/fx/refresh`, `hooks/refresh-lazada`, `hooks/discover-sync`, `hooks/ops-alerts-digest`, `hooks/parts-wanted-digest`, `hooks/signup-failure-alerts` embed the `project--0738c881-…lovable.app` URL — **[R]**.
- In-database: `public.site_settings.app_url` and the earlier `cron.schedule` bodies contain the lovable.app URL — **[C]** (current jobs read `app_url`, so one row update plus re-schedule).
- No old-ref string was found inside `src/` code or migration SQL besides `supabase/config.toml`.

---

## 9. Server API routes used by cron or production features

Public (`src/routes/api/public/`): `hooks/refresh-lazada`, `hooks/ops-alerts-digest`, `hooks/signup-failure-alerts`, `hooks/discover-sync`, `hooks/parts-wanted-digest`, `fx/refresh` (all cron-driven, `x-cron-token`); `payment-events` (Stripe webhook); `postback.$network` (affiliate); `auth/signup`, `auth/signup-failure-log`; `geocode`, `reverse-geocode`, `geo-search`, `ip-location`; `go.$slug`; `qr-rescue.$code`, `qr-rescue.log`; `training-partners.$id.click`; `flashcards.content`; `health/*`.
Admin/seller (service-role): `api/admin/create-user`, `api/admin/backfill-profiles`, `api/seller/staff/create|deactivate|reset-password`.
Other: `sitemap.xml`, `api/robots.txt`, `email/unsubscribe`.
**[X]** temporary migration routes to delete at cutover: `api/public/migration-export`, `api/public/migration-target-preflight`, `src/lib/migration-export.server.ts`, and the target-only tables `migration_ingest`, `migration_auth_transfer_keys` plus their helper functions.
**[X]** `src/routes/lovable/email/*`, `src/routes/mcp.ts`, `src/routes/[.mcp]/*`, `src/routes/[.well-known]/oauth-protected-resource`.

---

## 10. Vault secrets used by PostgreSQL functions

`vault.secrets` is not readable by the audit role. From migration SQL the only vault entry is `email_queue_service_role_key`, consumed by `email_queue_dispatch()` / `email_queue_wake()` via `net.http_post`. Since those functions are being dropped from scope, no vault secret needs to be recreated — **[X]**. If any email dispatch is rebuilt in-database, a target-owned secret must be created there; otherwise all secrets live in the application runtime.

## 11. Edge / runtime functions needing independent replacement

No Supabase Edge Functions exist (`supabase/functions/` absent) — all server logic is 141 `createServerFn` modules plus 34 HTTP routes in the app, which move with the code. Independent replacements required: Lovable AI Gateway calls (§7), Lovable Maps connector (§6), Lovable Email (§5), Lovable Cloud Auth OAuth wrapper (§3), Lovable MCP endpoints (§9), Stripe connector gateway (§4), and `email_queue_dispatch()` (§10).

---

## Not inspectable read-only

`cron.job` contents and live schedules, `vault.secrets` names, target auth/SMTP/provider settings, target project-level upload limit (blocks the two 86.5 MB draft videos), and RLS policy text on the target. Supply a read-only role with `cron`/`vault` usage, or paste the target dashboard settings, to close these gaps.
