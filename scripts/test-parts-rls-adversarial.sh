#!/usr/bin/env bash
# Parts Partner Network — cross-organization adversarial RLS suite (plan P2 / G2).
#
# Runs supabase/tests/parts_network_adversarial_rls.sql, which creates synthetic
# fixtures, attacks stock / cost / order / PII boundaries as anon, outsiders,
# competitors, Shop Manager users and suspended partners, and ROLLS BACK.
#
# Usage:
#   ./scripts/test-parts-rls-adversarial.sh
#       Run against the database in DATABASE_URL / PG* (needs a postgres or
#       service-role connection). Use a local or disposable staging database.
#
#   ./scripts/test-parts-rls-adversarial.sh --local
#       Build a throwaway database on a LOCAL Postgres (15+) server from
#       supabase/tests/support/local_supabase_stub.sql + supabase/migrations,
#       run the suite, then drop the database. Needs a local superuser
#       connection via PG* env vars (PGHOST must be empty, a socket path,
#       localhost or 127.0.0.1). Refuses to run against any other host.
#
#   ./scripts/test-parts-rls-adversarial.sh --local --realtime
#       Additionally replays real WAL through Supabase Realtime's row/column
#       filter (realtime.apply_rls from supabase/walrus, pinned below) and runs
#       supabase/tests/parts_network_realtime_columns.sql in the same throwaway
#       database. Needs wal_level=logical and the wal2json plugin on the local
#       server (e.g. apt install postgresql-17-wal2json). Set WALRUS_DIR to an
#       existing walrus checkout to skip the git clone.
#
# Exit codes: 0 pass (or SKIP without privileges), 1 assertion failure, 2 setup error.

set -u
RED=$'\033[31m'; GRN=$'\033[32m'; YLW=$'\033[33m'; RST=$'\033[0m'

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUITE_PATH="supabase/tests/parts_network_adversarial_rls.sql"
SUITE="$ROOT/$SUITE_PATH"
STUB="$ROOT/supabase/tests/support/local_supabase_stub.sql"

if ! command -v psql >/dev/null 2>&1; then
  echo "${RED}FAIL${RST}  psql is not installed."
  exit 2
fi

run_suite() {
  # $@ = extra psql connection args
  local out
  if ! out=$(psql "$@" -X -q -v ON_ERROR_STOP=1 -f "$SUITE" 2>&1); then
    echo "$out"
    if echo "$out" | grep -qE "permission denied (for|to) (schema auth|table users|set role)"; then
      echo "${YLW}SKIP${RST}  parts adversarial RLS suite needs a postgres/service-role connection."
      return 0
    fi
    echo "${RED}FAIL${RST}  parts adversarial RLS suite reported failures (see above)."
    return 1
  fi
  echo "$out"
  echo "${GRN}PASS${RST}  parts adversarial RLS suite: cross-organization stock, cost, order and PII boundaries hold."
}

LOCAL=0
REALTIME=0
for arg in "$@"; do
  case "$arg" in
    --local) LOCAL=1 ;;
    --realtime) REALTIME=1 ;;
    *) echo "${RED}FAIL${RST}  Unknown argument: $arg"; exit 2 ;;
  esac
done
if [[ $REALTIME -eq 1 && $LOCAL -eq 0 ]]; then
  echo "${RED}FAIL${RST}  --realtime commits fixtures and is only supported together with --local."
  exit 2
fi

if [[ $LOCAL -eq 0 ]]; then
  if [[ -z "${PGHOST:-}" && -z "${DATABASE_URL:-}" ]]; then
    echo "${RED}FAIL${RST}  No Postgres connection configured (set PG* or DATABASE_URL), or use --local."
    exit 2
  fi
  if [[ -n "${DATABASE_URL:-}" ]]; then
    run_suite "$DATABASE_URL"
  else
    run_suite
  fi
  exit $?
fi

# ---- --local: throwaway replay on a local server only ----------------------
if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "${RED}FAIL${RST}  --local ignores DATABASE_URL; unset it and use PG* for the local server."
  exit 2
fi
case "${PGHOST:-}" in
  ""|/*|localhost|127.0.0.1|::1) ;;
  *) echo "${RED}FAIL${RST}  --local refuses non-local PGHOST='${PGHOST}'."; exit 2 ;;
esac

DB="parts_rls_adversarial_$$"
cleanup() {
  # A logical slot left by an interrupted --realtime run would block DROP DATABASE.
  psql -X -q -d postgres -c "SELECT pg_drop_replication_slot(slot_name) FROM pg_replication_slots WHERE database = '$DB'" >/dev/null 2>&1 || true
  psql -X -q -d postgres -c "DROP DATABASE IF EXISTS \"$DB\"" >/dev/null 2>&1 || true
}
trap cleanup EXIT

psql -X -q -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DB\"" >/dev/null || {
  echo "${RED}FAIL${RST}  Could not create local database (needs a local superuser)."; exit 2; }
psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -f "$STUB" >/dev/null || {
  echo "${RED}FAIL${RST}  Local Supabase stub failed to load."; exit 2; }

failed=0
for f in "$ROOT"/supabase/migrations/*.sql; do
  # Extensions that only exist on Supabase are replaced by schema stubs.
  if ! err=$(sed -E 's/^\s*CREATE EXTENSION[^;]*(pg_cron|pg_net|pgmq|supabase_vault|pg_graphql|pgsodium)[^;]*;/-- stubbed extension/I' "$f" \
      | psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -1 2>&1 >/dev/null); then
    failed=$((failed + 1))
    echo "  migration not replayable locally: $(basename "$f"): $(echo "$err" | grep -m1 ERROR)"
  fi
done
echo "Replayed migrations with ${failed} local replay failure(s)."
echo "(Objects created outside the migration history cannot be replayed; the suite"
echo " fails its positive controls if any Parts network object is missing.)"

PGDATABASE="$DB" run_suite -d "$DB"
status=$?
[[ $REALTIME -eq 0 || $status -ne 0 ]] && exit $status

# ---- --realtime: Realtime (walrus) column filtering over real WAL ------------
WALRUS_COMMIT="493794f"  # supabase/walrus: "selecting empty columns returns primary keys (#85)"
if [[ "$(psql -X -Atq -d "$DB" -c 'show wal_level')" != "logical" ]]; then
  echo "${RED}FAIL${RST}  --realtime needs wal_level=logical on the local server."; exit 2
fi
walrus_dir="${WALRUS_DIR:-}"
if [[ -z "$walrus_dir" ]]; then
  walrus_dir="$(mktemp -d)/walrus"
  git clone -q https://github.com/supabase/walrus.git "$walrus_dir" \
    && git -C "$walrus_dir" checkout -q "$WALRUS_COMMIT" || {
      echo "${RED}FAIL${RST}  Could not fetch supabase/walrus@$WALRUS_COMMIT."; exit 2; }
fi
# The stub's minimal realtime schema is replaced by walrus.
psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -c 'ALTER SCHEMA realtime RENAME TO realtime_stub' >/dev/null || exit 2
for f in "$walrus_dir/sql/walrus--0.1.sql" $(ls "$walrus_dir"/sql/walrus_migration_*.sql | sort); do
  psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -f "$f" >/dev/null || {
    echo "${RED}FAIL${RST}  walrus install failed at $(basename "$f")."; exit 2; }
done
if ! out=$(psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/parts_network_realtime_columns.sql" 2>&1); then
  echo "$out"
  echo "${RED}FAIL${RST}  Realtime column check reported failures (see above)."
  exit 1
fi
echo "$out" | grep -E '^ (PASS|FAIL) ' || true
echo "${GRN}PASS${RST}  Realtime column check: no subscriber receives cost, supplier, markup or anon-private columns."
