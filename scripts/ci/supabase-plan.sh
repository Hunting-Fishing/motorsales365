#!/usr/bin/env bash
# Show pending migrations for the linked Supabase project (supabase db push --dry-run)
# and publish `pending=<n>` to $GITHUB_OUTPUT. Fails if the count exceeds
# MAX_PENDING_MIGRATIONS, which indicates a migration-history mismatch rather
# than a normal release.
# Usage: scripts/ci/supabase-plan.sh <label>
set -euo pipefail
label="${1:-target}"
max="${MAX_PENDING_MIGRATIONS:-10}"

out="$(supabase db push --linked --password "${SUPABASE_DB_PASSWORD}" --skip-vault --dry-run 2>&1)" || {
  echo "$out"
  echo "::error::supabase db push --dry-run failed for ${label}."
  exit 1
}
echo "$out"

pending_list="$(printf '%s\n' "$out" | grep -oE '[0-9]{14}_[^ ]*\.sql' | sort -u || true)"
if [ -z "$pending_list" ]; then
  count=0
else
  count="$(printf '%s\n' "$pending_list" | wc -l | tr -d ' ')"
fi

{
  echo "### Pending migrations on ${label}: ${count}"
  if [ "$count" != "0" ]; then printf '%s\n' "$pending_list" | sed 's/^/- `/; s/$/`/'; fi
} >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
echo "pending=${count}" >> "${GITHUB_OUTPUT:-/dev/null}"

if [ "$count" -gt "$max" ]; then
  echo "::error title=Too many pending migrations on ${label}::${count} pending (limit ${max}). The remote migration history probably does not match the repository. Run 'supabase migration list' and reconcile with 'supabase migration repair' before applying. Raise the MAX_PENDING_MIGRATIONS repo variable only if this is intended."
  exit 1
fi
