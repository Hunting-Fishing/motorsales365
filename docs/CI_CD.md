# CI/CD for 365 MotorSales

This document describes the GitHub Actions pipeline, every secret and variable it
needs, the one-time setup, and the launch sequence.

## 1. How the site is built and served

| Item                 | Value                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosting              | Cloudflare Worker **`motorsales365`** (Workers + static assets), account `jordilwbailey` (`f9e6e6f25d99d98a6395668cd9575509`)                                                                                                                                                                                                                                                                            |
| Domains              | `https://www.365motorsales.com` (canonical) and `https://365motorsales.com` (Cloudflare zone, custom domains on the Worker). `workers_dev` is off; preview URLs are on (`*-motorsales365.jordilwbailey.workers.dev`).                                                                                                                                                                                    |
| Build                | `npm ci --legacy-peer-deps && npm run build` (Vite + TanStack Start + Nitro, Cloudflare preset). Output: `.output/public` (assets) and `.output/server` (Worker, `wrangler.json`). The build also writes `.wrangler/deploy/config.json` so a plain `wrangler deploy` picks up the built config.                                                                                                          |
| Package manager      | **npm** (`package-lock.json`). The bun lockfiles are not used by any build.                                                                                                                                                                                                                                                                                                                              |
| Build-time config    | The committed `.env.production` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_PAYMENTS_CLIENT_TOKEN`, Maps browser key). They are public, browser-visible values. No GitHub secret is needed to build.                                                                                                                                                        |
| Runtime config       | Worker secrets/variables set in Cloudflare (Worker → Settings → Variables and Secrets). `keep_vars: true` in `wrangler.jsonc` means deploys never delete them. The pipeline does not manage them.                                                                                                                                                                                                        |
| Database             | Supabase project `wjxaajgvddtrxxtocxen`                                                                                                                                                                                                                                                                                                                                                                  |
| Edge functions       | None. `supabase/functions/` does not exist; all server logic is TanStack server functions/routes inside the Worker, deployed with the app.                                                                                                                                                                                                                                                               |
| Deploy trigger today | **Cloudflare Workers Builds** (Git integration on the Worker): every push to `main` builds and deploys production; other branches get preview versions and a "Workers Builds: motorsales365" check on the commit. Every `main` build since 2026-09-10 has failed because of the corrupted generated files that PR #6 fixes, so production still serves the last good build from 2026-09-10 (`a6d6817a`). |

## 2. Workflows

| File                 | Trigger                                                                                             | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`             | pull requests, manual, and called by `deploy.yml` on every push to `main`                           | Five parallel jobs: **Typecheck** (`tsc --noEmit`), **Unit tests** (full vitest suite checked against a quarantine list, plus an explicit Parts RLS coverage check), **Build** (`vite build` + Worker bundle check + `wrangler deploy --dry-run`, no credentials), **ESLint (changed lines only)**, **Parts adversarial RLS suite** (`scripts/test-parts-rls-adversarial.sh --local` in a disposable `postgres:17` service container). The npm cache and the Vite/Nitro cache (`node_modules/.cache`) are cached. |
| `deploy.yml`         | push to `main`, pull requests, manual                                                               | On `main`: runs `ci.yml`, detects `supabase/migrations/**` changes, runs `migrations.yml` if needed, then deploys production (Environment `production`, manual approval), then runs a smoke test. On PRs: uploads a **preview version** (`wrangler versions upload --preview-alias pr-<n>`, no production traffic) and comments its URL. Deploy steps act only when the variable `DEPLOY_VIA_ACTIONS=true`, so the pipeline never races Workers Builds.                                                           |
| `migrations.yml`     | called by `deploy.yml` when migrations change; manual (`staging-only` or `staging-then-production`) | **Staging**: link, `supabase db push --dry-run` (lists pending migrations in the job summary), apply, then run the adversarial RLS suite against staging. **Production** (Environment `production`, approval): dry run, `supabase db push`. Then calls `supabase-types.yml`. Refuses when more than `MAX_PENDING_MIGRATIONS` (default 10) migrations are pending, because that means the remote history does not match the repo.                                                                                  |
| `supabase-types.yml` | daily 03:17 UTC, manual, after production migrations                                                | `supabase gen types typescript --project-id wjxaajgvddtrxxtocxen --schema public`. If `types.ts` changed, it opens or updates a PR from branch `automation/supabase-types`. The PR description reports whether `tsc` still passes. Read-only against Supabase.                                                                                                                                                                                                                                                    |

Every job that needs secrets checks for them first. If they are missing, the job
skips with a `notice` that names the missing secret. It does not fail.

A safety rule in `deploy.yml`: if a release changes `supabase/migrations/**` and
production migrations were not applied (not configured, skipped, or failed), the
production deploy **fails**. Code never ships ahead of its schema.

### Test and lint policy

- **Vitest quarantine** (`scripts/ci/vitest-quarantine.json`): the full suite always
  runs. `scripts/ci/check-vitest-results.mjs` fails the build on any failure that is
  not listed, including a test file that fails to load. Listed failures are reported
  in the job summary. A listed test that starts passing raises a warning so it can be
  removed. We chose this over `continue-on-error` or skipping the tests because it
  keeps all 10 known failures visible and still catches every new failure. The 10
  entries are the failures on `main` as of 2026-09-28 (admin-nav snapshot, five auth
  toast/refresh tests, two associate-role-boundary tests, two signup-validation
  tests).
- **ESLint** (`scripts/ci/eslint-changed-lines.mjs`): lints only the files a change
  touches, and fails only on errors on added or modified lines. New files are linted
  in full. The ~13.8k existing errors (mostly Prettier formatting) are counted but
  never block. `npx eslint --fix <file>` fixes most of them.
- The Parts adversarial suite and the coverage check skip with a notice until PR #5
  (which adds them) is on the branch. After that they are hard gates.

## 3. Secrets and variables

Add these under **Settings → Secrets and variables → Actions**.

| Name                                    | Kind / scope                           | Required for                 | Where to get it                                                                                                                                                                                                                  |
| --------------------------------------- | -------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`                  | Repo secret (**already present**)      | deploy, previews             | Cloudflare → My Profile → API Tokens → "Edit Cloudflare Workers" template, scoped to the account. Confirm it has _Workers Scripts: Edit_ on the account.                                                                         |
| `CLOUDFLARE_ACCOUNT_ID`                 | Repo secret (**already present**)      | deploy, previews             | Cloudflare dashboard → Workers & Pages → right sidebar (`f9e6e6f25d99d98a6395668cd9575509`)                                                                                                                                      |
| `SUPABASE_ACCESS_TOKEN`                 | Repo secret                            | types, migrations            | supabase.com → Account → Access Tokens → Generate                                                                                                                                                                                |
| `PRODUCTION_DB_PASSWORD`                | **Environment secret of `production`** | production migrations        | Supabase → project `wjxaajgvddtrxxtocxen` → Project Settings → Database → Database password (reset it if unknown and update any tools that use it)                                                                               |
| `STAGING_PROJECT_REF`                   | Repo secret                            | staging migrations           | The staging project's ref (from its dashboard URL)                                                                                                                                                                               |
| `STAGING_DB_PASSWORD`                   | Repo secret                            | staging migrations           | Staging project → Project Settings → Database                                                                                                                                                                                    |
| `STAGING_DB_URL`                        | Repo secret, optional                  | adversarial suite on staging | Only needed if the automatic pooler URL does not work. Use the session-pooler connection string (port 5432) from staging → Connect.                                                                                              |
| `TYPES_PR_TOKEN`                        | Repo secret, optional                  | types PR triggers CI         | Fine-grained PAT for this repo with _Contents_ and _Pull requests_ read/write. Without it, the types PR is opened by `GITHUB_TOKEN` and CI will not start on it automatically (push an empty commit or close and reopen the PR). |
| `DEPLOY_VIA_ACTIONS`                    | Repo **variable**                      | deploy, previews             | Set to `true` once Workers Builds production deploys are turned off (see §5)                                                                                                                                                     |
| `ALLOW_PROD_MIGRATIONS_WITHOUT_STAGING` | Repo variable, optional                | migrations                   | `true` lets production migrations run when staging is not configured. The adversarial suite still runs in CI on a throwaway database.                                                                                            |
| `MAX_PENDING_MIGRATIONS`                | Repo variable, optional                | migrations                   | Default `10`                                                                                                                                                                                                                     |
| `PRODUCTION_PROJECT_REF`                | Repo variable, optional                | migrations, types            | Default `wjxaajgvddtrxxtocxen`                                                                                                                                                                                                   |

Runtime secrets such as the service-role key, Stripe, email, Maps, and AI keys stay
on the Cloudflare Worker and are not GitHub secrets.

## 4. GitHub settings (one time)

1. **Environment**: Settings → Environments → New environment `production`.
   - Required reviewers: yourself (and any co-owner). Prevent self-review can stay off for a solo owner.
   - Deployment branches: _Selected branches_ → `main`.
   - Add environment secret `PRODUCTION_DB_PASSWORD`.
2. **Actions permissions**: Settings → Actions → General → Workflow permissions → tick
   _Allow GitHub Actions to create and approve pull requests_ (needed for the types PR).
3. **Branch protection** for `main` (Settings → Branches or Rulesets), after the first CI
   run so the check names exist. Require: `Typecheck (tsc --noEmit)`,
   `Unit tests (vitest + quarantine)`, `Build (vite build, Cloudflare Worker bundle)`,
   `ESLint (changed lines only)`, `Parts adversarial RLS suite (throwaway Postgres)`.
4. **Workflow scope**: pushing `.github/workflows/*` from the CLI needs
   `gh auth refresh -s workflow`.

## 5. Moving production deploys from Workers Builds to Actions

With Workers Builds on, every push to `main` goes live as soon as Cloudflare builds
it: before CI, and before migrations. Recommended switch:

1. Cloudflare → Workers & Pages → `motorsales365` → Settings → Build: turn off
   builds for the production branch (`main`). You can keep non-production branch
   builds for previews, or disconnect the repository entirely and let `deploy.yml`
   produce previews.
2. Set the repo variable `DEPLOY_VIA_ACTIONS=true`.

Custom domains are attached to the Worker, not to the deploy method. `wrangler deploy`
from Actions uses the same config Workers Builds uses, so the domains and runtime
secrets are unaffected.

Rollback: Cloudflare → Worker → Deployments → roll back, or
`npx wrangler rollback --name motorsales365`.

## 6. Staging Supabase project

The migrations in this repo are **not a complete history**. When replayed onto an
empty database, 47 of 413 files fail, because some objects were created outside
migrations. A staging project therefore has to be seeded from production's schema,
not built from the migrations:

```bash
# Read-only dump of production schema and migration history
supabase link --project-ref wjxaajgvddtrxxtocxen
supabase db dump --linked -f /tmp/prod-schema.sql                      # schema only
supabase db dump --linked --data-only --schema supabase_migrations -f /tmp/prod-history.sql
# Restore into the new staging project
psql "<staging session-pooler URL>" -f /tmp/prod-schema.sql
psql "<staging session-pooler URL>" -f /tmp/prod-history.sql
```

After that, `migrations.yml` applies only the new migrations to staging, the same
ones production will get. Re-seed occasionally so staging does not drift.

## 7. One-time setup checklist

- [ ] `gh auth refresh -s workflow` (only if pushing workflows from the CLI)
- [ ] Merge PR #6, then this PR (see §8)
- [ ] Create Environment `production` with required reviewers, restricted to `main`
- [ ] Add `SUPABASE_ACCESS_TOKEN` (repo) and `PRODUCTION_DB_PASSWORD` (environment)
- [ ] Allow Actions to create pull requests
- [ ] Staging: create the project, seed it (§6), add `STAGING_PROJECT_REF` and `STAGING_DB_PASSWORD`. Or set `ALLOW_PROD_MIGRATIONS_WITHOUT_STAGING=true` for now
- [ ] Turn off Workers Builds production deploys and set `DEPLOY_VIA_ACTIONS=true` (§5)
- [ ] Run **Supabase types** manually once, and review and merge its PR (it replaces the reconstructed `types.ts`)
- [ ] Add branch protection for the CI checks

## 8. Launch sequence

1. **Before merging anything**, do §5 (turn off Workers Builds production deploys,
   set `DEPLOY_VIA_ACTIONS=true`) and §4.1. If Workers Builds stays on, merging #6
   deploys production immediately, and merging #5 would ship code that expects
   migration `20260927090000` before that migration is applied.
2. Merge **#6** (repairs `main`). No workflows exist on `main` yet, so nothing runs.
3. Merge **this PR**. `deploy.yml` runs CI, finds no migration changes, and waits for
   approval. Approve it to publish the repaired app (the first deploy since
   2026-09-10).
4. Pre-flight the database: run **Migrations** manually with `staging-only`, or check
   production history with `supabase migration list`. If production reports many
   pending migrations, reconcile the history before continuing.
5. Update #5 onto `main` so it gets the full CI, including the RLS suite. Merge
   **#7 into #5's branch** (its base), then merge **#5** into `main`. One release then
   carries both migrations (`20260927090000`, `20260927120000`): staging apply and
   adversarial suite, then **approve** production migrations, then types PR, then
   **approve** deploy.
6. Merge the automated types PR when it appears.

After setup, a normal release needs one approval, or two when it includes
migrations.
