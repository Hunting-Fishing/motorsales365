# 365 Motor Sales — Standalone Staging Configuration Gate

This checklist defines the configuration required to test the Lovable-to-standalone migration without committing credential values to Git.

## Safety rules

- Store private values only in the Cloudflare staging Worker secret store or the appropriate provider dashboard.
- Never copy service-role keys, API keys, webhook secrets, SMTP passwords, payment secrets, or OAuth secrets into repository files, Actions logs, issues, or pull-request comments.
- Staging must use the standalone Supabase project `wjxaajgvddtrxxtocxen`.
- Do not configure any Lovable URL, Lovable API endpoint, or Lovable project as a fallback.
- Missing optional provider credentials must disable that capability cleanly.
- Do not activate target cron jobs until the staging smoke-test matrix passes.

## Staging Worker

The migration branch defines an isolated Wrangler environment:

- Worker environment: `staging`
- Worker name: `motorsales365-standalone-staging`
- Supabase target: `wjxaajgvddtrxxtocxen`

Checked-in Wrangler variables are limited to public standalone Supabase client configuration. Private values belong in Worker secrets.

## Tier 1 — required for core standalone runtime

These values are required before staging can be accepted as a complete standalone deployment:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL`
- `PUBLIC_SITE_ORIGIN`

Requirements:

- `SUPABASE_URL` and all Supabase credentials must belong to `wjxaajgvddtrxxtocxen`.
- `SUPABASE_SERVICE_ROLE_KEY` must be a private Worker secret and must never be exposed to client code.
- `SITE_URL` and `PUBLIC_SITE_ORIGIN` must resolve to the isolated staging origin while staging tests are running.

## Tier 2 — transactional email and Auth acceptance

Application email configuration discovered by the standalone environment inventory includes:

- `EMAIL_PROVIDER`
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `TRANSACTIONAL_FROM_EMAIL`
- `EMAIL_QUEUE_CRON_TOKEN`

These are distinct from Supabase Auth SMTP configuration. Before cutover, both application transactional email and Supabase Auth mail delivery must be validated.

Staging acceptance requires:

1. Application transactional email sends without Lovable.
2. Supabase Auth confirmation email delivery succeeds.
3. Supabase Auth password-reset email delivery succeeds.
4. Confirmation/reset callbacks return to an allowed standalone staging URL.
5. No email failure path calls Lovable.

## Tier 3 — payments

Payment configuration names discovered by the environment inventory include:

- `STRIPE_SANDBOX_API_KEY`
- `PAYMENTS_SANDBOX_WEBHOOK_SECRET`
- `STRIPE_LIVE_API_KEY`
- `PAYMENTS_LIVE_WEBHOOK_SECRET`

For staging:

- Prefer sandbox/test credentials for functional verification.
- Do not exercise live charges merely to prove migration readiness.
- Webhook endpoints must target the standalone deployment.
- A missing payment credential must disable or reject that payment mode cleanly; it must never fall back to Lovable.

## Tier 4 — optional/external providers

The application references additional provider configuration including:

### AI

- `AI_API_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`
- `AI_MODEL_TRANSLATE`
- `AI_MODEL_VIN`
- `AI_MODEL_VISION`

### Mapping and enrichment

- `GOOGLE_MAPS_API_KEY`
- `FIRECRAWL_API_KEY`
- `GIPHY_API_KEY`

### Domain/network/provider integrations

- `CUSTOM_DOMAIN_CNAME_TARGET`
- Involve Asia provider configuration values discovered by the environment inventory
- `SIGNUP_AUDIT_SALT`

These capabilities are not permitted to block core migration verification unless they are part of a critical production workflow. Missing optional values must be surfaced as disabled/degraded features rather than routed through Lovable.

## Browser/public environment variants

The repository also references Vite/public variants of some configuration values. Public variants must contain publishable/client-safe values only. No service-role key, provider secret, webhook secret, SMTP password, or payment secret may use a `VITE_`/browser-exposed variable.

## Supabase Auth dashboard gate

The target Supabase project must be checked for:

- production Site URL;
- staging redirect URL(s);
- production redirect URL(s);
- custom SMTP/provider configuration;
- sender identity;
- confirmation email behavior;
- password reset behavior;
- any enabled OAuth provider callback configuration.

Migrating `auth.users` does not migrate or prove these delivery/runtime settings.

## Storage gate

Two known draft videos remain absent because they exceed the current target upload-size allowance. Before final cutover:

- raise the standalone Supabase project's global Storage upload-size limit comfortably above ~91 MB;
- retry the two documented objects in the main migration runbook;
- confirm their object metadata and retrieval from `listing-videos`;
- keep migration/storage helpers until this is reconciled.

## Cron gate

Target cron remains OFF during staging.

Cron may be recreated/activated only after:

1. standalone staging deployment succeeds;
2. critical API/application endpoints pass smoke tests;
3. required provider secrets are confirmed present;
4. scheduled endpoint authentication is validated;
5. logs show no Lovable calls.

## Staging deployment acceptance

Do not promote staging merely because the Worker packages successfully. Required functional checks include:

- homepage and active listings;
- listing detail/media retrieval;
- existing-user login, logout, and refresh;
- confirmation/password-reset mail;
- listing create/edit/delete with RLS;
- image/video upload and retrieval;
- business profile workflows;
- referral/QR attribution;
- Shop Manager critical workflows;
- admin/role gating;
- transactional email;
- safe payment sandbox path;
- cross-tenant RLS negative tests;
- provider/application logs free of Lovable endpoint calls.

## Production cutover gate

After staging passes:

1. Run the final Lovable-source-to-standalone delta synchronization using retained migration infrastructure.
2. Reconcile database/Auth/Storage counts and exceptions.
3. Re-run critical staging tests after the final delta.
4. Recreate only required scheduled jobs.
5. Switch production runtime configuration only after all gates remain green.
6. Keep Lovable intact during the rollback/observation window.
