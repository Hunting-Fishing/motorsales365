# Vehicle catalogue import operations

The owner confirmed on 6 November 2026 that API Ninjas and Data & APIs credentials were added and that verbal permission to store/cache was obtained. This records the owner's statement; it is not an independent confirmation from either provider. The permission note is retained in the private controls table.

## Where imports run

GitHub Actions workflow **Import Asian vehicle catalogue** runs on the main branch, on manual dispatch, and daily at 02:17 UTC / 10:17 Asia/Manila. GitHub scheduling can be delayed. A change to the import workflow on main also starts one bounded run. A single concurrency group prevents overlapping runs. Pull requests cannot start the credential-bearing job.

Keys are read from `API_NINJAS_API_KEY` and `DATAANDAPIS_API_KEY` secrets. They are sent only in headers to their corresponding official API. GitHub authenticates to the catalogue ingress using a short-lived OIDC token. The ingress verifies the RS256 signature using GitHub's public keys, audience, expiry, owner/repository IDs, main branch, exact import workflow path and allowed event. Both documented legacy/immutable subject formats are bound to this repository. No database key is provided to GitHub's import job.

The ingress only permits the two catalogue RPCs, a connectivity query and restricted failure-status updates. It cannot read customer tables or the raw response cache, increase budgets or enable a paused provider. Its server-side database key never leaves Supabase. The platform's Supabase-JWT check is disabled only for this new endpoint because its own GitHub OIDC verification runs before every operation. Missing or invalid identity returns 401. Local administrative use of sync.mjs still accepts a project-checked database key. Secrets and response bodies are never printed or uploaded to public GitHub artifacts.

## Initial pace

Until the actual account allowances are known, each provider has an application-imposed ceiling of **8 requests per UTC day and 240 per UTC calendar month**, with a minimum 10-second gap. These are conservative application controls, not a claim about the provider's plan or remaining balance. Other applications using the same keys consume their own quota. Provider limits may stop a run earlier.

Failed requests also consume the local budget. HTTP 429 honours Retry-After (at least one minute); absent or invalid retry information pauses for 24 hours. Authentication, entitlement, payment and endpoint errors disable that provider rather than repeatedly retrying. No plan purchase, automatic upgrade or limit bypass is implemented. Raise limits only after checking the account dashboard and the provider's allowed rate/token cost.

The queue begins with 31 Asian/Philippine brand queries per provider. One page per brand is fetched before cycling back through unfinished brands, prioritising early coverage checks. RUSCO is included as a coverage probe; a motorcycle API is not expected to establish rebuilt-truck engine history. An empty result completes that provider query with zero cached rows, not proof that the brand does not exist.

## Storage and resuming

- `vehicle_catalog_raw_pages`: private JSON response cache, source URL without credentials, fetched timestamp, checksum and row accounting.
- `vehicle_catalog_entries`: normalized make/model/year/engine observations, initially `status=review` and `market=ZZ`. Unknown markets never silently become Philippine compatibility claims.
- `vehicle_catalog_import_jobs`: next page and completion state for each provider/brand.
- `vehicle_catalog_import_requests`: durable request accounting, including failed/reserved requests.
- `vehicle_catalog_import_controls`: enabled state, request limits, next allowed time, safe error message and permission note.

Only the service role can access the new cache and control tables. Raw responses, normalized entries and the page checkpoint commit atomically. Restarting does not replay successful pages. Duplicate normalized identities are ignored, preserving existing reviewed/published observations. Invalid rows remain available in the private raw response and are counted; a missing year is never fabricated. Repeated nonempty pages stop the provider so a subscription restriction cannot silently produce a false complete dataset.

For now this fetches paginated motorcycle-list responses and their returned engine/specification fields. It does not claim to have downloaded every detail endpoint, image file, automobile, engine code or Asian market variant. Detail enrichment and other vehicle-category importers are separate work.

## Monitoring

Open repository Actions, choose **Import Asian vehicle catalogue**, then inspect the latest run. Logs show only provider, requested make, page, cached/inserted/invalid counts and stop reason. A technically successful workflow can still report a provider as blocked or paused; check these status lines and the private controls table.

Read-only database checks:

```sql
select source_key,enabled,daily_requests,monthly_requests,next_allowed_at,last_error
from public.vehicle_catalog_import_controls;

select source_key,count(*) as cached_pages,sum(row_count) as cached_rows,
       sum(invalid_count) as rows_needing_repair
from public.vehicle_catalog_raw_pages group by source_key;

select source_key,status,count(*) from public.vehicle_catalog_import_jobs
group by source_key,status;
```

Setting `enabled=false` for a provider pauses subsequent reservations without deleting data. Completed queues stay complete; scheduled runs make no further provider requests until new jobs are added or a deliberate refresh is configured. Restarting a completed historical import for refresh needs an explicit snapshot/version strategy, not clearing the cache.

## Validation

Node tests cover destination checks, decimal CC, pagination, unknown-year handling, Retry-After, quota stops and safe transaction payloads. Real RSA signatures test OIDC acceptance and rejection of forged, expired, wrong-audience, wrong-repository and wrong-workflow tokens. Operation tests reject customer-table reads and budget changes. PGlite tests exercise the actual schema/RPCs, public-access denial, concurrent-request guard, budgets including failures, atomic rollback, duplicate/repeated pages and resume checkpoints. The existing full-build workflow includes these tests.
