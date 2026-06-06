#!/usr/bin/env bash
# Runs scripts/rls-regression.sql against the configured Postgres database.
# Asserts the post-fix behavior of:
#   - "Owners update listings" RLS policy on public.listings
#   - "Authenticated upload to business gallery" RLS policy on storage.objects
#
# Exits non-zero on any assertion failure. Safe to run repeatedly: the SQL
# wraps everything in a transaction that is rolled back at the end.
#
# Usage:
#   ./scripts/test-rls-regression.sh
#
# Requires psql in PATH and either PG* env vars or DATABASE_URL set.

set -u
RED=$'\033[31m'; GRN=$'\033[32m'; RST=$'\033[0m'

if ! command -v psql >/dev/null 2>&1; then
  echo "${RED}FAIL${RST}  psql is not installed."
  exit 2
fi

if [[ -z "${PGHOST:-}" && -z "${DATABASE_URL:-}" ]]; then
  echo "${RED}FAIL${RST}  No Postgres connection configured (set PG* or DATABASE_URL)."
  exit 2
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$DIR/rls-regression.sql"

if ! out=$(psql -v ON_ERROR_STOP=1 -X -q -f "$SQL_FILE" 2>&1); then
  echo "$out"
  if echo "$out" | grep -qE "permission denied (for|to) (schema auth|set role)"; then
    YLW=$'\033[33m'
    echo "${YLW}SKIP${RST}  rls-regression requires a service_role/postgres DB connection."
    echo "       Re-run with DATABASE_URL pointed at the service-role connection string."
    exit 0
  fi
  echo "${RED}FAIL${RST}  rls-regression reported a failure."
  exit 1
fi

echo "$out"
echo "${GRN}PASS${RST}  rls-regression: owner-update freeze + business-gallery upload guard verified."
