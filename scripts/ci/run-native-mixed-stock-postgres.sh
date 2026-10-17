#!/usr/bin/env bash
# CI-only, fresh synthetic owner-session stock experiment. Never an existing DB.
set -euo pipefail
export LC_ALL=C

fail() { printf 'Native mixed stock rehearsal refused: %s\n' "$1" >&2; exit "${2:-1}"; }
[[ $# == 1 && ( "$1" == --run || "$1" == --cleanup ) ]] || fail 'expected --run or --cleanup'
[[ "${GITHUB_ACTIONS:-}" == true && "$(uname -s)" == Linux ]] || fail 'GitHub Actions Linux only'
[[ -n "${RUNNER_TEMP:-}" && "$RUNNER_TEMP" == /* && "$RUNNER_TEMP" != / && ! -L "$RUNNER_TEMP" ]] || fail 'invalid runner temp'
[[ "$RUNNER_TEMP" != *$'\n'* && "$RUNNER_TEMP" != *$'\r'* && "$RUNNER_TEMP" != *\\* ]] || fail 'invalid runner temp characters'
stock_temp=$(realpath -e -- "$RUNNER_TEMP")
[[ "$stock_temp" == "$RUNNER_TEMP" && -d "$stock_temp" ]] || fail 'runner temp must be canonical'
stock_uid=$(id -u)
[[ "$stock_uid" != 0 ]] || fail 'non-root runner required'
if [[ "$1" == --run ]]; then
  for stock_key in ${!PG@}; do fail 'inherited libpq environment is not permitted'; done
  [[ ! ${DATABASE_URL+x} && ! ${SUPABASE_DB_URL+x} ]] || fail 'inherited database routing is not permitted'
  [[ ! ${STOCK_NATIVE_ROOT+x} ]] || fail 'refusing inherited stock state'
fi
for stock_key in ${!PG@}; do unset "$stock_key"; done
unset DATABASE_URL SUPABASE_DB_URL
if [[ "$1" == --cleanup && -z "${STOCK_NATIVE_ROOT:-}" ]]; then exit 0; fi
if [[ "$1" == --cleanup && ! -e "$STOCK_NATIVE_ROOT" && ! -L "$STOCK_NATIVE_ROOT" ]]; then exit 0; fi

stock_bin=/usr/lib/postgresql/17/bin
stock_timeout=/usr/bin/timeout
[[ -f "$stock_timeout" && -x "$stock_timeout" && ! -L "$stock_timeout" && "$(realpath -e -- "$stock_timeout")" == "$stock_timeout" && "$(stat -c %u -- "$stock_timeout")" == 0 ]] || fail 'missing trusted native timeout'
stock_timeout_mode=$(stat -c %a -- "$stock_timeout")
(( (8#$stock_timeout_mode & 022) == 0 )) || fail 'writable native timeout'
[[ "$(realpath -e -- "$stock_bin")" == "$stock_bin" && ! -L "$stock_bin" ]] || fail 'invalid native binary directory'
for stock_program in postgres initdb pg_ctl pg_isready psql; do
  stock_executable="$stock_bin/$stock_program"
  [[ -f "$stock_executable" && -x "$stock_executable" && ! -L "$stock_executable" && "$(realpath -e -- "$stock_executable")" == "$stock_executable" ]] || fail 'missing native PostgreSQL17 binary'
  [[ "$(stat -c %u -- "$stock_executable")" == 0 ]] || fail 'untrusted native binary owner'
  stock_mode=$(stat -c %a -- "$stock_executable")
  (( (8#$stock_mode & 022) == 0 )) || fail 'writable native binary'
  stock_version=$("$stock_timeout" --signal=TERM --kill-after=2s 5s /usr/bin/env -i PATH=/usr/bin:/bin LANG=C.UTF-8 LC_ALL=C.UTF-8 "$stock_executable" --version 2>/dev/null | head -c 512)
  [[ "$stock_version" =~ ^[a-z_]+\ \(PostgreSQL\)\ 17\. ]] || fail 'binary is not PostgreSQL17'
done

private_directory() {
  [[ -d "$1" && ! -L "$1" && "$(realpath -e -- "$1")" == "$1" && "$(stat -c %u -- "$1")" == "$stock_uid" && "$(stat -c %a -- "$1")" == 700 ]]
}
private_file() {
  [[ -f "$1" && ! -L "$1" && "$(realpath -e -- "$1")" == "$1" && "$(stat -c %u -- "$1")" == "$stock_uid" && "$(stat -c %a -- "$1")" == 600 && "$(stat -c %h -- "$1")" == 1 ]]
}
private_control() {
  private_file "$1" && [[ "$(stat -c %s -- "$1")" == 0 ]]
}
validate_root() {
  local root=$1 child unsafe
  [[ -n "$root" && "$(dirname -- "$root")" == "$stock_temp" && "$(basename -- "$root")" =~ ^stock-native\.[A-Za-z0-9]{6}$ ]] || return 1
  private_directory "$root" || return 1
  for child in data socket; do
    [[ ! -L "$root/$child" ]] || return 1
    if [[ -e "$root/$child" ]]; then private_directory "$root/$child" || return 1; fi
  done
  for child in pgpass pgservice startup-attempted; do
    if [[ -e "$root/$child" || -L "$root/$child" ]]; then private_control "$root/$child" || return 1; fi
  done
  for child in postmaster-owned.pid phase-group.pid phase-output; do
    if [[ -e "$root/$child" || -L "$root/$child" ]]; then private_file "$root/$child" || return 1; fi
  done
  # Fail closed on scan errors as well as symlink/tablespace/foreign/hardlink escape.
  unsafe=$(find "$root" -xdev \( -type l -o ! -uid "$stock_uid" -o \( -type f -links +1 \) \) -print -quit) || return 1
  [[ -z "$unsafe" ]]
}
stock_owned_pid=
read_owned_pid() {
  local marker="$stock_root/postmaster-owned.pid" recorded bytes
  [[ -e "$marker" || -L "$marker" ]] || return 0
  private_file "$marker" || return 1
  bytes=$(stat -c %s -- "$marker")
  [[ $bytes -ge 2 && $bytes -le 11 ]] || return 1
  recorded=$(< "$marker")
  [[ "$recorded" =~ ^[1-9][0-9]{0,9}$ && $bytes == $((${#recorded} + 1)) ]] || return 1
  [[ -z "$stock_owned_pid" || "$recorded" == "$stock_owned_pid" ]] || return 1
  stock_owned_pid=$recorded
}
validate_postmaster() {
  local pid_file="$stock_root/data/postmaster.pid" exe args
  validate_root "$stock_root" || return 1
  private_file "$pid_file" || return 1
  [[ "$(stat -c %s -- "$pid_file")" -le 2048 ]] || return 1
  local lines=()
  mapfile -t -n 8 lines < "$pid_file"
  [[ ${#lines[@]} -ge 5 && "${lines[0]}" =~ ^[1-9][0-9]{0,9}$ && "${lines[1]}" == "$stock_root/data" && "${lines[3]}" == 55437 && "${lines[4]}" == "$stock_root/socket" ]] || return 1
  stock_verified_pid=${lines[0]}
  [[ -d "/proc/$stock_verified_pid" && "$(stat -c %u -- "/proc/$stock_verified_pid")" == "$stock_uid" ]] || return 1
  exe=$(readlink -f -- "/proc/$stock_verified_pid/exe") || return 1
  args=$(tr '\0' '\n' < "/proc/$stock_verified_pid/cmdline") || return 1
  [[ "$exe" == "$stock_bin/postgres" && "$args" == "$stock_bin/postgres"$'\n-D\n'"$stock_root/data" ]] || return 1
  read_owned_pid || return 1
  [[ -z "$stock_owned_pid" || "$stock_owned_pid" == "$stock_verified_pid" ]]
}
record_postmaster_identity() {
  validate_postmaster || return 1
  if [[ -z "$stock_owned_pid" ]]; then
    ( set -o noclobber; printf '%s\n' "$stock_verified_pid" > "$stock_root/postmaster-owned.pid" ) || return 1
    read_owned_pid || return 1
  fi
  [[ "$stock_owned_pid" == "$stock_verified_pid" ]]
}
quiet_native() {
  local seconds=$1; shift
  "$stock_timeout" --signal=TERM --kill-after=2s "$seconds" /usr/bin/env -i PATH="$stock_bin:/usr/bin:/bin" LANG=C.UTF-8 LC_ALL=C.UTF-8 \
    PGPASSFILE="$stock_root/pgpass" PGSERVICEFILE="$stock_root/pgservice" PGSYSCONFDIR="$stock_root" "$@" >/dev/null 2>&1
}
postmaster_pid_absent() {
  local verified_pid=${1:-}
  [[ $# == 1 && "$verified_pid" =~ ^[1-9][0-9]{0,9}$ ]] || return 1
  [[ ! -d "/proc/$verified_pid" ]]
}
postmaster_pid_wait_cadence() { sleep 0.1; }
wait_verified_pid_absent() {
  local verified_pid=${1:-} attempt
  [[ $# == 1 && "$verified_pid" =~ ^[1-9][0-9]{0,9}$ ]] || return 1
  postmaster_pid_absent "$verified_pid" && return 0
  for attempt in {1..20}; do
    postmaster_pid_wait_cadence || return 1
    postmaster_pid_absent "$verified_pid" && return 0
  done
  return 1
}
postmaster_absent() {
  local candidate exe args scanned=0 ready_status=0
  [[ ! -e "$stock_root/data/postmaster.pid" && ! -L "$stock_root/data/postmaster.pid" && ! -e "$stock_root/socket/.s.PGSQL.55437" && ! -L "$stock_root/socket/.s.PGSQL.55437" && ! -e "$stock_root/socket/.s.PGSQL.55437.lock" && ! -L "$stock_root/socket/.s.PGSQL.55437.lock" ]] || return 1
  read_owned_pid || return 1
  if [[ -n "$stock_owned_pid" ]]; then
    postmaster_pid_absent "$stock_owned_pid" || return 1
  elif [[ -e "$stock_root/startup-attempted" || -L "$stock_root/startup-attempted" ]]; then
    # An uncertain startup with no recorded identity never becomes delete authority.
    return 1
  fi
  for candidate in /proc/[0-9]*; do
    scanned=$((scanned + 1)); [[ $scanned -le 8192 ]] || return 1
    [[ "$(stat -c %u -- "$candidate" 2>/dev/null)" == "$stock_uid" ]] || continue
    exe=$(readlink -f -- "$candidate/exe" 2>/dev/null) || continue
    [[ "$exe" == "$stock_bin/postgres" ]] || continue
    args=$(tr '\0' '\n' < "$candidate/cmdline" 2>/dev/null) || return 1
    [[ "$args" != "$stock_bin/postgres"$'\n-D\n'"$stock_root/data" ]] || return 1
  done
  quiet_native 7s "$stock_bin/pg_isready" -h "$stock_root/socket" -p 55437 -U postgres -d postgres -t 5 || ready_status=$?
  [[ $ready_status == 2 ]]
}
stop_cluster() {
  local stop_status=0 verified_pid
  validate_root "$stock_root" || return 1
  read_owned_pid || return 1
  if [[ -e "$stock_root/data/postmaster.pid" || -L "$stock_root/data/postmaster.pid" ]]; then
    record_postmaster_identity || return 1
    verified_pid=$stock_owned_pid
    validate_postmaster || return 1
    quiet_native 20s "$stock_bin/pg_ctl" -D "$stock_root/data" -m fast -w -t 15 stop || stop_status=$?
    if [[ $stop_status != 0 && ( -e "$stock_root/data/postmaster.pid" || -L "$stock_root/data/postmaster.pid" ) ]]; then
      validate_postmaster || return 1
      [[ "$stock_verified_pid" == "$verified_pid" ]] || return 1
      quiet_native 15s "$stock_bin/pg_ctl" -D "$stock_root/data" -m immediate -w -t 10 stop || return 1
    fi
    wait_verified_pid_absent "$verified_pid" || return 1
  elif [[ -n "$stock_owned_pid" ]]; then
    # Missing postmaster.pid cannot skip the known process-directory proof.
    wait_verified_pid_absent "$stock_owned_pid" || return 1
  fi
  postmaster_absent
}

stock_phase_pid=
stock_phase_command=
group_absent() {
  local expected=$1 candidate line fields state parent group rest scanned=0
  [[ "$expected" =~ ^[1-9][0-9]{0,9}$ ]] || return 1
  for candidate in /proc/[0-9]*; do
    scanned=$((scanned + 1)); [[ $scanned -le 8192 ]] || return 1
    if ! { IFS= read -r line < "$candidate/stat"; } 2>/dev/null; then
      [[ ! -d "$candidate" ]] && continue
      return 1
    fi
    fields=${line##*) }
    read -r state parent group rest <<< "$fields"
    [[ "$group" =~ ^[0-9]+$ ]] || return 1
    [[ "$group" != "$expected" ]] || return 1
  done
}
read_phase_marker() {
  local marker="$stock_root/phase-group.pid" recorded bytes
  [[ -e "$marker" || -L "$marker" ]] || return 0
  private_file "$marker" || return 1
  bytes=$(stat -c %s -- "$marker")
  [[ $bytes -ge 2 && $bytes -le 11 ]] || return 1
  recorded=$(< "$marker")
  [[ "$recorded" =~ ^[1-9][0-9]{0,9}$ && $bytes == $((${#recorded} + 1)) ]] || return 1
  [[ -z "$stock_phase_pid" || "$recorded" == "$stock_phase_pid" ]] || return 1
  stock_phase_pid=$recorded
}
clear_phase_marker() {
  read_phase_marker || return 1
  if [[ -n "$stock_phase_pid" ]]; then group_absent "$stock_phase_pid" || return 1; fi
  rm -f -- "$stock_root/phase-group.pid"
  stock_phase_pid=
}
validate_phase_identity() {
  local args line fields state parent group rest
  [[ -n "$stock_phase_command" && "$stock_phase_pid" =~ ^[1-9][0-9]{0,9}$ ]] || return 1
  [[ -d "/proc/$stock_phase_pid" && "$(stat -c %u -- "/proc/$stock_phase_pid")" == "$stock_uid" && "$(readlink -f -- "/proc/$stock_phase_pid/exe")" == "$stock_timeout" ]] || return 1
  args=$(tr '\0' '\n' < "/proc/$stock_phase_pid/cmdline") || return 1
  IFS= read -r line < "/proc/$stock_phase_pid/stat" || return 1
  fields=${line##*) }; read -r state parent group rest <<< "$fields"
  [[ "$args" == "$stock_phase_command" && "$group" == "$stock_phase_pid" ]]
}
stop_phase() {
  [[ -n "$stock_phase_pid" ]] || return 0
  if [[ ! -d "/proc/$stock_phase_pid" ]]; then group_absent "$stock_phase_pid"; return $?; fi
  local attempt
  # A persisted marker alone can only refuse; it never grants kill authority.
  validate_phase_identity || return 1
  kill -TERM -- "-$stock_phase_pid" 2>/dev/null || true
  for attempt in {1..50}; do
    kill -0 -- "-$stock_phase_pid" 2>/dev/null || break
    sleep 0.1
  done
  if kill -0 -- "-$stock_phase_pid" 2>/dev/null; then
    validate_phase_identity || return 1
    kill -KILL -- "-$stock_phase_pid" 2>/dev/null || return 1
  fi
  wait "$stock_phase_pid" 2>/dev/null || true
  group_absent "$stock_phase_pid"
}
cleanup_root() {
  local failed=0
  validate_root "$stock_root" || { printf 'Native mixed stock cleanup preserved an unvalidated target.\n' >&2; return 1; }
  read_phase_marker || failed=1
  stop_phase || failed=1
  stop_cluster || failed=1
  if [[ $failed != 0 ]]; then printf 'Native mixed stock cleanup preserved unverifiable targets.\n' >&2; return 1; fi
  validate_root "$stock_root" || return 1
  postmaster_absent || return 1
  clear_phase_marker || return 1
  rm -rf --one-file-system -- "$stock_root"
}
if [[ "$1" == --cleanup ]]; then
  stock_root=$STOCK_NATIVE_ROOT
  cleanup_root
  exit $?
fi

[[ -n "${GITHUB_ENV:-}" && "$GITHUB_ENV" == "$stock_temp"/* && -f "$GITHUB_ENV" && ! -L "$GITHUB_ENV" && -w "$GITHUB_ENV" ]] || fail 'missing private GitHub environment file'
[[ "$GITHUB_ENV" != *$'\n'* && "$GITHUB_ENV" != *$'\r'* && "$(realpath -e -- "$GITHUB_ENV")" == "$GITHUB_ENV" && "$(stat -c %u -- "$GITHUB_ENV")" == "$stock_uid" && "$(stat -c %h -- "$GITHUB_ENV")" == 1 ]] || fail 'invalid environment file'
stock_node=$(command -v node)
[[ "$stock_node" == /* && -f "$stock_node" && -x "$stock_node" && ! -L "$stock_node" && "$(realpath -e -- "$stock_node")" == "$stock_node" ]] || fail 'missing canonical Node executable'
umask 077
stock_root=$(mktemp -d "$stock_temp/stock-native.XXXXXX")
validate_root "$stock_root" || fail 'new stock target is not isolated'
trap 'stock_status=$?; trap - EXIT; if ! cleanup_root; then [[ $stock_status != 0 ]] || stock_status=1; fi; exit "$stock_status"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
export STOCK_NATIVE_ROOT="$stock_root"
printf 'STOCK_NATIVE_ROOT=%s\n' "$stock_root" >> "$GITHUB_ENV"
mkdir -m 700 -- "$stock_root/socket"
for stock_control in pgpass pgservice; do
  ( set -o noclobber; : > "$stock_root/$stock_control" ) || fail 'private control creation failed'
  private_control "$stock_root/$stock_control" || fail 'private control validation failed'
done
quiet_native 30s "$stock_bin/initdb" -D "$stock_root/data" --username=postgres --encoding=UTF8 --locale=C.UTF-8 \
  --auth-local=trust --auth-host=reject --set=listen_addresses= \
  --set="unix_socket_directories=$stock_root/socket" --set=unix_socket_permissions=0700 --set=port=55437 || fail 'cluster initialization failed' "$?"
( set -o noclobber; : > "$stock_root/startup-attempted" ) || fail 'startup marker creation failed'
private_control "$stock_root/startup-attempted" || fail 'startup marker validation failed'
quiet_native 35s "$stock_bin/pg_ctl" -D "$stock_root/data" -l /dev/null -w -t 30 start || fail 'cluster start failed' "$?"
record_postmaster_identity || fail 'started postmaster identity mismatch'
quiet_native 7s "$stock_bin/pg_isready" -h "$stock_root/socket" -p 55437 -U postgres -d postgres -t 5 || fail 'cluster readiness failed' "$?"

report_phase_output() {
  local captured=$1 phase_status=$2 body line index=0 failed=0 completed=0
  local failure_pattern='^FAIL nativePG17 mixed-stock: stage=(admission|server-identity|fresh-cluster|fixture-setup|locked-acl|b2b-commit|inquiry-commit|b2b-rollback|inquiry-rollback|outer-transaction|late-event-fk|complete), sqlState=([0-9A-Z]{5}|unavailable); no live acceptance\.$'
  local passes=(
    'locked-acl'
    'b2b-commit-inquiry-rejected'
    'inquiry-commit-b2b-rejected'
    'b2b-rollback-inquiry-permitted'
    'inquiry-rollback-b2b-permitted'
    'outer-visibility-rollback'
    'late-event-fk-rollback'
    'complete'
  )
  [[ "$phase_status" == 0 || "$phase_status" == 1 ]] || return 1
  [[ ${#captured} -ge 2 && ${#captured} -le 65537 && "${captured: -2}" == $'\n.' ]] || return 1
  body=${captured%.}
  while IFS= read -r line; do
    [[ $failed == 0 && $completed == 0 ]] || return 1
    if [[ $index == 0 && "$line" =~ ^NativeMixedStockPG17\ server_version_num=17[0-9]{4}\;\ private\ cluster\ identity\ verified\.$ ]]; then
      index=1
    elif [[ $index -ge 1 && $index -le ${#passes[@]} && "$line" == "PASS nativePG17 mixed-stock: ${passes[$((index - 1))]}." ]]; then
      index=$((index + 1))
    elif [[ "$line" =~ $failure_pattern ]]; then
      failed=1
    elif [[ $index == $((${#passes[@]} + 1)) && "$line" == 'Native mixed stock PostgreSQL17 rehearsal complete: synthetic owner sessions only.' ]]; then
      completed=1
    else
      return 1
    fi
  done <<< "${body%$'\n'}"
  if [[ "$phase_status" == 0 ]]; then
    [[ $completed == 1 && $failed == 0 ]] || return 1
  else
    [[ $failed == 1 && $completed == 0 ]] || return 1
  fi
  printf '%s' "$body"
}
run_phase() {
  local output_fd input_fd capture_status=0 phase_status=0 captured bytes
  local args=("$stock_timeout" --signal=TERM --kill-after=5s 180s /usr/bin/env -i
    "PATH=$(dirname -- "$stock_node"):$stock_bin:/usr/bin:/bin" LANG=C.UTF-8 LC_ALL=C.UTF-8
    GITHUB_ACTIONS=true "RUNNER_TEMP=$stock_temp" "STOCK_NATIVE_ROOT=$stock_root"
    "$stock_node" scripts/ci/native-mixed-stock-postgres.mjs --run)
  stock_phase_command=$(printf '%s\n' "${args[@]}")
  ( set -o noclobber; : > "$stock_root/phase-output" ) || return 1
  private_control "$stock_root/phase-output" || return 1
  # Merge stderr into the same bounded capture: no unexpected diagnostic can be
  # hidden behind a valid stdout vector, and raw diagnostics are never published.
  coproc STOCK_PHASE { exec "${args[@]}" 2>&1; }
  stock_phase_pid=$STOCK_PHASE_PID
  [[ "$stock_phase_pid" =~ ^[1-9][0-9]{0,9}$ ]] || return 1
  ( set -o noclobber; printf '%s\n' "$stock_phase_pid" > "$stock_root/phase-group.pid" ) || return 1
  exec {output_fd}<&"${STOCK_PHASE[0]}"
  input_fd=${STOCK_PHASE[1]}; exec {input_fd}>&-
  head -c 65537 <&"$output_fd" > "$stock_root/phase-output" || capture_status=$?
  exec {output_fd}<&-
  wait "$stock_phase_pid" || phase_status=$?
  clear_phase_marker || return 1
  [[ $capture_status == 0 ]] || return 1
  private_file "$stock_root/phase-output" || return 1
  bytes=$(stat -c %s -- "$stock_root/phase-output")
  [[ $bytes -ge 1 && $bytes -le 65536 ]] || return 1
  captured=$(cat -- "$stock_root/phase-output"; printf '.') || return 1
  # LC_ALL=C makes length bytes; NUL stripping during substitution cannot pass.
  [[ ${#captured} == $((bytes + 1)) ]] || return 1
  if ! report_phase_output "$captured" "$phase_status"; then
    [[ $phase_status == 0 ]] && return 1
    return "$phase_status"
  fi
  [[ $phase_status == 0 ]] || return "$phase_status"
}
run_phase || { stock_status=$?; fail 'owner-session phase failed' "$stock_status"; }
printf 'Native mixed stock PostgreSQL17 rehearsal completed; synthetic owner sessions only.\n'
