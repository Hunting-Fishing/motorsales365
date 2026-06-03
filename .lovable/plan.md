## Launch readiness — remaining fixes

Two items from the audit are still open. The other eight are confirmed done (including #5 garage persistence, which already syncs to Supabase via `garage.functions.ts`).

### Fix 1 — Proxy remaining client-side Nominatim calls

Three browser-side `nominatim.openstreetmap.org` fetches still bypass our server proxy. Move them through existing/new public API routes so we keep one User-Agent, one rate limit, and one place to swap providers later.

**New server route: `src/routes/api/public/reverse-geocode.ts`**
- `GET ?lat=&lng=` → calls Nominatim `/reverse` with our UA, returns `{ address: {...}, displayName }`.
- Validates lat ∈ [-90,90], lng ∈ [-180,180]; clamps `zoom` to 1–18 (default 18).
- 5-minute `Cache-Control: public, max-age=300`.
- On failure returns `{ error }` with appropriate status — never throws to client.

**Update `src/routes/businesses.submit.tsx`**
- `reverseGeocode()` (L220): fetch `/api/public/reverse-geocode?lat=...&lng=...&zoom=18` instead of nominatim directly.
- `geocodeAddress()` (L270): fetch `/api/public/geocode?q=...` (existing route already wraps `geocodeAddress` in `places.server`).

**Update `src/components/location-picker.tsx`**
- `useMyLocation()` (L175): fetch `/api/public/reverse-geocode?lat=...&lng=...&zoom=12`.

After these edits, `rg "nominatim.openstreetmap.org" src/` should only match the two server files (`places.server.ts`, `api/public/geo-search.ts`, new `reverse-geocode.ts`) and the privacy disclosure copy.

### Fix 2 — Webhook alerting on silent error branches

Today both webhook handlers only `console.error`. On a Cloudflare Worker, those logs are best-effort — a payment misroute or auth-email-enqueue failure can pass unnoticed until a user complains. Add a tiny alert helper that posts to a Slack/Discord-style webhook (whichever the user already uses; defaults to Slack-shaped incoming webhook payload).

**New helper: `src/lib/alerting.server.ts`**
- `export async function alertOps(event: string, details: Record<string, unknown>): Promise<void>`
- Reads `process.env.OPS_ALERT_WEBHOOK_URL` at call time (server-only). If unset → no-op + single `console.warn`.
- Posts `{ text: "[365MS][${env}] ${event}", attachments: [{ title, text: JSON.stringify(details, null, 2).slice(0,3500) }] }`.
- Swallows fetch errors (logs them) so alerting never crashes the caller.
- Adds in-memory dedupe: same `event` key suppressed for 60s to avoid storm.

**Wire into `src/routes/api/public/payments/webhook.ts`**
Call `alertOps` at every `console.error` site that represents a real failure (not just bad-shape data we'd reject anyway). Specifically:
- L498 signature verification failed → `alertOps('payments.webhook.signature_invalid', { err })`
- L505 handler error → `alertOps('payments.webhook.handler_error', { type: event.type, id: event.id, err })`
- L39 plan_id unresolved → `alertOps('payments.subscription.plan_unresolved', { sub: sub.id })`
- L92, L115 business sub missing metadata / plan not found → same pattern
- L223 boost session missing metadata
- L289, L308 listing_payment missing metadata / owner mismatch
- L381 course session missing metadata

**Wire into `src/routes/lovable/email/auth/webhook.ts`**
- L53 missing `LOVABLE_API_KEY` → `alertOps('email.auth.config_missing', {})`
- L84 webhook verification failed → `alertOps('email.auth.verify_failed', { err })`
- L133 missing Supabase env → `alertOps('email.auth.supabase_env_missing', {})`
- L166 enqueue failure → `alertOps('email.auth.enqueue_failed', { run_id, emailType, err })`

**Secret request**
After plan approval, in build mode I'll call `add_secret` for `OPS_ALERT_WEBHOOK_URL` so the user can paste their Slack incoming webhook URL. Until they paste it, `alertOps` is a no-op (safe to merge).

### Out of scope
- No DB migrations.
- No UI changes (alert delivery is server-side only).
- Not switching providers (Google Places stays a future swap; the proxy makes it a one-file change).
- Not touching the Lovable email **queue process** route — it's not in the requested list and already retries via pgmq.

### Files touched
- new `src/routes/api/public/reverse-geocode.ts`
- new `src/lib/alerting.server.ts`
- edit `src/routes/businesses.submit.tsx` (two fetches)
- edit `src/components/location-picker.tsx` (one fetch)
- edit `src/routes/api/public/payments/webhook.ts` (~8 alert call sites)
- edit `src/routes/lovable/email/auth/webhook.ts` (~4 alert call sites)
- request secret `OPS_ALERT_WEBHOOK_URL`

### Verification
- `rg "nominatim.openstreetmap.org" src/` → only server files + privacy copy.
- Manually trigger Stripe webhook with bad signature in preview → Slack receives alert.
- Confirm published build still compiles.