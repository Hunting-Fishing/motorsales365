## Part 1 — Fix towing services page filters

Audit found three bugs that make the filters effectively non-functional:

1. **Province filter throws silently.** `listings.province` column does not exist (only `region` and `city`). `q.eq("province", province)` returns an error and zero rows whenever a province is picked.
2. **Wrong data source.** Real tow providers live in the `businesses` table (`type_slug='towing'`), not `listings`. The grid currently queries `listings` with `category_slug='towing'` — which is essentially empty. So filters appear broken even when "matching" providers exist on the site.
3. **24/7 flag lives on `provider_tow_rates`, not `listings.attributes`.** Toggling 24/7 filters on a field that providers never set.

**Fixes:**

- Rewrite the grid query in `src/components/towing/towing-services-page.tsx` to source from `businesses` (joined with `provider_tow_rates` via `owner_id`) instead of `listings`:
  - `region` / `province` / `city` → `businesses.region/province/city` (province exists there).
  - `24/7` → join `provider_tow_rates.available_24_7 = true`.
  - `Verified only` → `businesses.verification_status = 'verified'` (or `is_verified=true`, whichever the table actually has).
  - `Accepted payments` → check `businesses.attributes->'payments'` (add this if missing) and **also** `attributes.payments` on each provider's owner profile for backward compat.
  - `Service chips` → match against `businesses.attributes->'services'` (array). Keep the keyword-mapping fallback for legacy rows.
- Replace `ListingCard` rendering with a new lightweight `TowProviderCard` (or reuse the card style from `FeaturedTowProviders`) so the grid renders business profiles, not vehicle listings.
- Wire empty-state copy and "promoted" section to the new `subscription_tier` (`featured`/`premium`/new `dispatch_*` tiers from Part 2).
- Verify by seeding 2–3 sample tow businesses (or use existing) and toggling every filter combination in the preview.

## Part 2 — 365 Dispatch (Automated Dispatcher subscription)

Three new monthly plans for towing providers to join the nationwide auto-dispatch network. Routing prefers Nearest → Best rating → Fastest historical ETA, with a 5-minute window where matched providers can see and accept the job before it broadens.

### Pricing tiers (subscription_plans rows, type='dispatcher')

| Plan | Price/mo | Coverage | Max active jobs | Priority |
|---|---|---|---|---|
| Dispatch Starter | ₱499 | Home region only | 3 | Standard |
| Dispatch Pro | ₱1,499 | Multi-region (up to 4) | 10 | High |
| Dispatch Fleet | ₱2,999 | Nationwide | Unlimited | Top |

Direct-request jobs (user picks the provider by name in the form) bypass dispatch and go straight to that provider regardless of tier.

### Database changes (one migration)

- Add to `provider_tow_rates`: `dispatch_enabled boolean`, `dispatch_plan text`, `dispatch_regions text[]`, `dispatch_max_jobs int`, `avg_response_sec int`, `avg_rating numeric`.
- Add to `tow_requests`: `dispatch_status text` (`open` | `matched` | `accepted` | `expired` | `direct`), `dispatch_window_ends_at timestamptz`, `requested_provider_id uuid` (for direct picks), `matched_provider_ids uuid[]`.
- New table `dispatch_subscriptions` (user_id, plan, status, current_period_end, stripe_subscription_id, environment) — same shape as existing `business_subscriptions` so the Stripe webhook can populate it.
- Insert three rows into `subscription_plans` with `stripe_lookup_key='dispatch_starter_monthly' | 'dispatch_pro_monthly' | 'dispatch_fleet_monthly'`.
- Enable Realtime on `tow_requests` so dispatched providers see new jobs live.
- Standard GRANT + RLS: providers read/update only their own dispatch row; tow_requests visible to requester, requested provider, and any provider in `matched_provider_ids`.

### Auto-dispatch engine

- **Trigger** `tg_dispatch_on_tow_request` (AFTER INSERT on `tow_requests`):
  - If `requested_provider_id IS NOT NULL` → set `dispatch_status='direct'`, notify only that provider, exit.
  - Otherwise compute eligible providers: `dispatch_enabled=true`, current `dispatch_subscriptions.status='active'`, pickup region in `dispatch_regions` (or 'nationwide'), under `dispatch_max_jobs`.
  - Rank by tier priority → distance proxy (same city > same province > same region) → `avg_rating` DESC → `avg_response_sec` ASC.
  - Take top 5, write into `matched_provider_ids`, set `dispatch_status='matched'`, `dispatch_window_ends_at = now() + 5 min`.
- **pg_cron job** every minute: any `dispatch_status='matched'` past its window with no accept → re-rank and broaden (next 5, then nationwide), or mark `expired` after 3 expansions.
- **Accept flow:** server fn `acceptDispatchedJob` — first provider to call wins; sets `provider_id`, `dispatch_status='accepted'`, status='assigned'; others see it close in realtime.

### UI / surfaces

- **`/dashboard/dispatch`** (new, under `_authenticated/`): live queue of matched jobs (realtime), Accept/Decline, in-progress jobs, completed history, current plan + active-jobs gauge. Email notification on match using existing email infra (no SMS for v1 — in-app + email is the simplest "professional" path).
- **`/dispatch`** (new public landing): pitch page for "365 Dispatch — Nationwide Tow Network", plan comparison table, "Join the network" CTA → Stripe Checkout.
- **Emergency form** (`towing-services-page.tsx`): add optional "Request a specific provider" combobox (searches `businesses` where `type_slug='towing'`) → populates `requested_provider_id`.
- **Provider settings**: on `/dashboard/tow`, add a "365 Dispatch" card → toggle `dispatch_enabled`, pick covered regions (capped by plan), upgrade/manage subscription via Stripe Customer Portal.
- **Sidebar nav**: add "365 Dispatch" link in `dashboard.tsx` (only shown when user is a tow provider or has dispatch subscription).

### Stripe wiring

- Reuse existing `createCheckoutSession` / webhook flow. Webhook recognizes the new `lookup_key`s and writes to `dispatch_subscriptions` (mirroring `business_subscriptions`).
- Add `dispatch_*` lookup keys to the tier-mapping object used by the subscription gate.

### Policy / compliance

- Update `/terms` with a "365 Dispatch Network" section (subscription model, cancellation, provider obligations to respond within window, refund policy) and bump "Last updated".
- Update `/privacy` if location data sharing semantics change (we forward pickup region/city to matched providers).

### Out of scope (v1)

- SMS push (in-app realtime + email only).
- Live GPS tracking of providers (manual ETA only).
- Bidding UI on dispatched jobs (existing `tow_bids` stays for non-dispatch requests).
- Multi-provider fleet seats under one dispatch subscription (single-user for now; revisit with org/staff later).