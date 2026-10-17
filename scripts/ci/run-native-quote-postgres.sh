#!/usr/bin/env bash
# CI-only disposable PostgreSQL17 rehearsal. Never use an existing/local/hosted DB.
set -euo pipefail

fail() { printf 'Native quote rehearsal refused: %s\n' "$1" >&2; exit 1; }
[[ $# == 1 && ( "$1" == --run || "$1" == --cleanup ) ]] || fail 'expected --run or --cleanup'
[[ "${GITHUB_ACTIONS:-}" == true && "$(uname -s)" == Linux ]] || fail 'GitHub Actions Linux only'
[[ -n "${RUNNER_TEMP:-}" && "$RUNNER_TEMP" == /* && "$RUNNER_TEMP" != / && ! -L "$RUNNER_TEMP" ]] || fail 'invalid runner temp'
[[ "$RUNNER_TEMP" != *$'\n'* && "$RUNNER_TEMP" != *$'\r'* ]] || fail 'invalid runner temp characters'
quote_temp=$(realpath -e -- "$RUNNER_TEMP")
[[ "$quote_temp" == "$RUNNER_TEMP" && -d "$quote_temp" ]] || fail 'runner temp must be canonical'
quote_bin=/usr/lib/postgresql/17/bin
for quote_program in postgres initdb pg_ctl pg_isready psql; do
  [[ -x "$quote_bin/$quote_program" && ! -L "$quote_bin/$quote_program" ]] || fail 'missing native PostgreSQL17 binary'
done
"$quote_bin/postgres" --version | grep -Eq '^postgres \(PostgreSQL\) 17\.' || fail 'binary is not PostgreSQL17'

validate_root() {
  [[ -n "$1" && "$1" == "$quote_temp"/quote-native.* && ! -L "$1" && -d "$1" ]] || return 1
  [[ "$(dirname -- "$1")" == "$quote_temp" && "$(basename -- "$1")" =~ ^quote-native\.[A-Za-z0-9]{6}$ ]] || return 1
  [[ "$(realpath -e -- "$1")" == "$1" && "$(stat -c %u -- "$1")" == "$(id -u)" && "$(stat -c %a -- "$1")" == 700 ]] || return 1
  for quote_child in data socket; do
    [[ ! -L "$1/$quote_child" ]] || return 1
    if [[ -e "$1/$quote_child" ]]; then
      [[ -d "$1/$quote_child" && "$(realpath -e -- "$1/$quote_child")" == "$1/$quote_child" && "$(stat -c %u -- "$1/$quote_child")" == "$(id -u)" ]] || return 1
    fi
  done
}

# Scrub libpq routing/options/credentials; psql also receives explicit -h/-p/-U/-d.
if [[ "$1" == --run ]]; then
  for quote_key in PGHOST PGHOSTADDR PGPORT PGUSER PGDATABASE PGSERVICE PGSERVICEFILE; do
    [[ -z "${!quote_key:-}" ]] || fail 'preexisting libpq routing is not permitted'
  done
fi
unset DATABASE_URL SUPABASE_DB_URL PGPASSWORD PGPASSFILE PGOPTIONS PGSSLMODE PGSSLKEY PGSSLCERT PGSSLROOTCERT PGSSLCRL PGSSLCRLDIR PGREQUIRESSL PGCONNECT_TIMEOUT PGAPPNAME PGTARGETSESSIONATTRS PGCHANNELBINDING PGGSSENCMODE PGKRBSRVNAME
unset PGHOST PGHOSTADDR PGPORT PGUSER PGDATABASE PGSERVICE PGSERVICEFILE PGSYSCONFDIR
for quote_key in ${!PG@}; do unset "$quote_key"; done

validate_postmaster() {
  local quote_root=$1 quote_pid quote_exe quote_args quote_uid
  [[ -f "$quote_root/data/postmaster.pid" && ! -L "$quote_root/data/postmaster.pid" ]] || return 1
  IFS= read -r quote_pid < "$quote_root/data/postmaster.pid"
  [[ "$quote_pid" =~ ^[1-9][0-9]{0,9}$ && -d "/proc/$quote_pid" ]] || return 1
  quote_exe=$(readlink -f -- "/proc/$quote_pid/exe")
  [[ "$quote_exe" == "$quote_bin/postgres" ]] || return 1
  quote_uid=$(stat -c %u -- "/proc/$quote_pid")
  [[ "$quote_uid" == "$(id -u)" ]] || return 1
  quote_args=$(tr '\0' '\n' < "/proc/$quote_pid/cmdline")
  [[ "$quote_args" == "$quote_bin/postgres"$'\n-D\n'"$quote_root/data" ]] || return 1
}

cleanup_root() {
  local quote_root=$1 quote_stop=0
  validate_root "$quote_root" || { printf 'Native quote cleanup refused an unvalidated target.\n' >&2; return 1; }
  if [[ -e "$quote_root/data/postmaster.pid" ]]; then
    validate_postmaster "$quote_root" || { printf 'Native quote cleanup could not verify postmaster identity; preserving directory.\n' >&2; return 1; }
    env -i PATH="$quote_bin:/usr/bin:/bin" LANG=C.UTF-8 LC_ALL=C.UTF-8 \
      "$quote_bin/pg_ctl" -D "$quote_root/data" -m fast -w -t 15 stop || quote_stop=$?
    if [[ $quote_stop != 0 ]]; then
      validate_postmaster "$quote_root" || return 1
      env -i PATH="$quote_bin:/usr/bin:/bin" LANG=C.UTF-8 LC_ALL=C.UTF-8 \
        "$quote_bin/pg_ctl" -D "$quote_root/data" -m immediate -w -t 10 stop || return 1
    fi
    [[ ! -e "$quote_root/data/postmaster.pid" ]] || return 1
  fi
  # Delete only the already resolved, uniquely named direct child, never temp itself.
  validate_root "$quote_root" || return 1
  rm -rf -- "$quote_root"
}

if [[ "$1" == --cleanup ]]; then
  [[ -n "${QUOTE_NATIVE_ROOT:-}" ]] || exit 0
  [[ -e "$QUOTE_NATIVE_ROOT" || -L "$QUOTE_NATIVE_ROOT" ]] || exit 0
  cleanup_root "$QUOTE_NATIVE_ROOT"
  exit $?
fi

[[ -n "${GITHUB_ENV:-}" && "$GITHUB_ENV" == /* && -f "$GITHUB_ENV" && ! -L "$GITHUB_ENV" && -w "$GITHUB_ENV" ]] || fail 'missing GitHub environment file'
[[ "$(realpath -e -- "$GITHUB_ENV")" == "$GITHUB_ENV" && "$GITHUB_ENV" == "$quote_temp"/* ]] || fail 'environment file must stay inside runner temp'
[[ -z "${QUOTE_NATIVE_ROOT:-}" ]] || fail 'refusing to reuse a cluster'
umask 077
quote_root=$(mktemp -d "$quote_temp/quote-native.XXXXXX")
validate_root "$quote_root" || fail 'new cluster target is not isolated'
trap 'quote_status=$?; trap - EXIT; cleanup_root "$quote_root" || quote_status=1; exit "$quote_status"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
printf 'QUOTE_NATIVE_ROOT=%s\n' "$quote_root" >> "$GITHUB_ENV"
export QUOTE_NATIVE_ROOT="$quote_root"
mkdir -m 700 -- "$quote_root/socket"
env -i PATH="$quote_bin:/usr/bin:/bin" LANG=C.UTF-8 LC_ALL=C.UTF-8 \
  "$quote_bin/initdb" -D "$quote_root/data" --username=postgres --encoding=UTF8 --locale=C.UTF-8 \
  --auth-local=trust --auth-host=reject --set=listen_addresses= \
  --set="unix_socket_directories=$quote_root/socket" --set=unix_socket_permissions=0700 --set=port=55433
env -i PATH="$quote_bin:/usr/bin:/bin" LANG=C.UTF-8 LC_ALL=C.UTF-8 \
  "$quote_bin/pg_ctl" -D "$quote_root/data" -l "$quote_root/server.log" -w -t 30 start
validate_postmaster "$quote_root" || fail 'started postmaster identity mismatch'
env -i PATH="$quote_bin:/usr/bin:/bin" LANG=C.UTF-8 LC_ALL=C.UTF-8 \
  "$quote_bin/pg_isready" -h "$quote_root/socket" -p 55433 -U postgres -d postgres -t 5
# Node performs server-major/data-dir/socket/owner checks before fixture setup.
timeout --signal=TERM --kill-after=5s 180s node scripts/ci/native-quote-postgres.mjs --run
