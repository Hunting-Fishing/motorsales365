#!/usr/bin/env bash
# Temporary fail-closed quarantine, NOT a migration planner or release approval.
# The historical chain is not replayable and its baseline/recovery is unverified.
# Keep this entry point blocked until a reviewed forward-only release workflow
# replaces it. Counts, environment variables and source hashes cannot authorize
# historical replay. No CLI, database connection, secret or history write occurs.
set -euo pipefail

printf '%s\n' '::error title=Database release blocked::Automated historical db push is disabled. Migration provenance, the known cost-fix replay trap and baseline/recovery prerequisites remain unresolved.' >&2
printf '%s\n' 'Review docs/evidence/MIGRATION_BASELINE_STRATEGY.md and docs/365_COMPLETION_CHECKLIST.md. Do not raise a pending-count limit, bypass staging, repair timestamps or replay the historical chain.' >&2
printf '%s\n' 'Separately approved exact-file containment is recorded in docs/evidence/INVOICE_CONVERTER_CONTAINMENT_RELEASE.md; it does not authorize this workflow.' >&2
exit 1
