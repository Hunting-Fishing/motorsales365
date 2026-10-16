#!/usr/bin/env bash
# CI-only synthetic recovery rehearsal. Never admit an existing/local/hosted DB.
set -euo pipefail

fail() { printf 'Native recovery rehearsal refused: %s\n' "$1" >&2; exit 1; }
[[ $# == 1 && ( "$1" == --run || "$1" == --cleanup ) ]] || fail 'expected --run or --cleanup'
[[ "${GITHUB_ACTIONS:-}" == true && "$(uname -s)" == Linux ]] || fail 'GitHub Actions Linux only'
[[ -n "${RUNNER_TEMP:-}" && "$RUNNER_TEMP" == /* && "$RUNNER_TEMP" != / && ! -L "$RUNNER_TEMP" ]] || fail 'invalid runner temp'
[[ "$RUNNER_TEMP" != *$'\n'* && "$RUNNER_TEMP" != *$'\r'* && "$RUNNER_TEMP" != *\\* ]] || fail 'invalid runner temp characters'
recovery_temp=$(realpath -e -- "$RUNNER_TEMP")
[[ "$recovery_temp" == "$RUNNER_TEMP" && -d "$recovery_temp" ]] || fail 'runner temp must be canonical'
recovery_uid=$(id -u)
[[ "$recovery_uid" != 0 ]] || fail 'non-root runner required'

# Refuse every inherited libpq variable, including unknown future PG* keys and
# empty credentials/routes. Cleanup scrubs them instead so fallback can still run.
if [[ "$1" == --run ]]; then
  for recovery_key in ${!PG@}; do fail 'inherited libpq environment is not permitted'; done
  [[ ! ${DATABASE_URL+x} && ! ${SUPABASE_DB_URL+x} ]] || fail 'inherited database routing is not permitted'
  [[ ! ${RECOVERY_NATIVE_ROOT+x} && ! ${RECOVERY_MANIFEST_SHA256+x} ]] || fail 'refusing inherited recovery state'
fi
for recovery_key in ${!PG@}; do unset "$recovery_key"; done
unset DATABASE_URL SUPABASE_DB_URL RECOVERY_MANIFEST_SHA256
if [[ "$1" == --cleanup && -z "${RECOVERY_NATIVE_ROOT:-}" ]]; then exit 0; fi
if [[ "$1" == --cleanup && ! -e "$RECOVERY_NATIVE_ROOT" && ! -L "$RECOVERY_NATIVE_ROOT" ]]; then exit 0; fi

recovery_bin=/usr/lib/postgresql/17/bin
recovery_timeout=/usr/bin/timeout
[[ -x "$recovery_timeout" && ! -L "$recovery_timeout" ]] || fail 'missing native timeout'
[[ "$(realpath -e -- "$recovery_bin")" == "$recovery_bin" && ! -L "$recovery_bin" ]] || fail 'invalid native binary directory'
for recovery_program in postgres initdb pg_ctl pg_isready psql pg_dump pg_dumpall pg_restore pg_controldata; do
  recovery_executable="$recovery_bin/$recovery_program"
  [[ -f "$recovery_executable" && -x "$recovery_executable" && ! -L "$recovery_executable" && "$(realpath -e -- "$recovery_executable")" == "$recovery_executable" ]] || fail 'missing native PostgreSQL17 binary'
  [[ "$(stat -c %u -- "$recovery_executable")" == 0 ]] || fail 'untrusted native binary owner'
  recovery_mode=$(stat -c %a -- "$recovery_executable")
  (( (8#$recovery_mode & 022) == 0 )) || fail 'writable native binary'
  recovery_version=$("$recovery_timeout" --signal=TERM --kill-after=2s 5s /usr/bin/env -i PATH=/usr/bin:/bin LANG=C.UTF-8 LC_ALL=C.UTF-8 "$recovery_executable" --version 2>/dev/null | head -c 512)
  [[ "$recovery_version" =~ ^[a-z_]+\ \(PostgreSQL\)\ 17\. ]] || fail 'binary is not PostgreSQL17'
done

private_directory() {
  [[ -d "$1" && ! -L "$1" && "$(realpath -e -- "$1")" == "$1" && "$(stat -c %u -- "$1")" == "$recovery_uid" && "$(stat -c %a -- "$1")" == 700 ]]
}
validate_root() {
  local root=$1 cluster child
  [[ -n "$root" && "$(dirname -- "$root")" == "$recovery_temp" && "$(basename -- "$root")" =~ ^recovery-native\.[A-Za-z0-9]{6}$ ]] || return 1
  private_directory "$root" || return 1
  for cluster in source restored; do
    [[ ! -L "$root/$cluster" ]] || return 1
    if [[ -e "$root/$cluster" ]]; then
      private_directory "$root/$cluster" || return 1
      for child in data socket; do
        [[ ! -L "$root/$cluster/$child" ]] || return 1
        if [[ -e "$root/$cluster/$child" ]]; then private_directory "$root/$cluster/$child" || return 1; fi
      done
    fi
  done
  # No tablespace/symlink/foreign-owned/hard-linked escape is accepted for cleanup.
  [[ -z "$(find "$root" -xdev \( -type l -o ! -uid "$recovery_uid" -o \( -type f -links +1 \) \) -print -quit)" ]]
}
validate_postmaster() {
  local cluster=$1 port=$2 pid_file="$1/data/postmaster.pid" exe args
  validate_root "$recovery_root" || return 1
  [[ -f "$pid_file" && ! -L "$pid_file" && "$(stat -c %u -- "$pid_file")" == "$recovery_uid" && "$(stat -c %s -- "$pid_file")" -le 2048 ]] || return 1
  local lines=()
  mapfile -t -n 8 lines < "$pid_file"
  [[ ${#lines[@]} -ge 5 && "${lines[0]}" =~ ^[1-9][0-9]{0,9}$ && "${lines[1]}" == "$cluster/data" && "${lines[3]}" == "$port" && "${lines[4]}" == "$cluster/socket" ]] || return 1
  recovery_verified_pid=${lines[0]}
  [[ -d "/proc/$recovery_verified_pid" && "$(stat -c %u -- "/proc/$recovery_verified_pid")" == "$recovery_uid" ]] || return 1
  exe=$(readlink -f -- "/proc/$recovery_verified_pid/exe")
  args=$(tr '\0' '\n' < "/proc/$recovery_verified_pid/cmdline")
  [[ "$exe" == "$recovery_bin/postgres" && "$args" == "$recovery_bin/postgres"$'\n-D\n'"$cluster/data" ]]
}
quiet_native() {
  local seconds=$1; shift
  # Suppress all native diagnostics; no credential/SQL/path output or log growth.
  "$recovery_timeout" --signal=TERM --kill-after=2s "$seconds" /usr/bin/env -i PATH="$recovery_bin:/usr/bin:/bin" LANG=C.UTF-8 LC_ALL=C.UTF-8 "$@" >/dev/null 2>&1
}
postmaster_absent() {
  local cluster=$1 port=$2 candidate exe args scanned=0 ready_status=0
  [[ ! -e "$cluster/data/postmaster.pid" && ! -L "$cluster/data/postmaster.pid" && ! -e "$cluster/socket/.s.PGSQL.$port" && ! -e "$cluster/socket/.s.PGSQL.$port.lock" ]] || return 1
  for candidate in /proc/[0-9]*; do
    scanned=$((scanned + 1)); [[ $scanned -le 8192 ]] || return 1
    [[ "$(stat -c %u -- "$candidate" 2>/dev/null)" == "$recovery_uid" ]] || continue
    exe=$(readlink -f -- "$candidate/exe" 2>/dev/null) || continue
    [[ "$exe" == "$recovery_bin/postgres" ]] || continue
    args=$(tr '\0' '\n' < "$candidate/cmdline" 2>/dev/null) || return 1
    [[ "$args" != "$recovery_bin/postgres"$'\n-D\n'"$cluster/data" ]] || return 1
  done
  quiet_native 7s "$recovery_bin/pg_isready" -h "$cluster/socket" -p "$port" -U postgres -d postgres -t 5 || ready_status=$?
  [[ $ready_status == 2 ]]
}
stop_cluster() {
  local cluster=$1 port=$2 stop_status=0 verified_pid
  validate_root "$recovery_root" || return 1
  if [[ -e "$cluster/data/postmaster.pid" || -L "$cluster/data/postmaster.pid" ]]; then
    validate_postmaster "$cluster" "$port" || return 1
    verified_pid=$recovery_verified_pid
    quiet_native 20s "$recovery_bin/pg_ctl" -D "$cluster/data" -m fast -w -t 15 stop || stop_status=$?
    if [[ $stop_status != 0 && -e "$cluster/data/postmaster.pid" ]]; then
      validate_postmaster "$cluster" "$port" || return 1
      [[ "$recovery_verified_pid" == "$verified_pid" ]] || return 1
      quiet_native 15s "$recovery_bin/pg_ctl" -D "$cluster/data" -m immediate -w -t 10 stop || return 1
    fi
    [[ ! -d "/proc/$verified_pid" ]] || return 1
  fi
  postmaster_absent "$cluster" "$port"
}

recovery_phase_pid=
recovery_phase_command=
group_absent() {
  local expected=$1 candidate line fields state parent group rest scanned=0
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
  local marker="$recovery_root/phase-group.pid" recorded bytes
  [[ -e "$marker" || -L "$marker" ]] || return 0
  [[ -f "$marker" && ! -L "$marker" && "$(stat -c %u -- "$marker")" == "$recovery_uid" && "$(stat -c %a -- "$marker")" == 600 && "$(stat -c %h -- "$marker")" == 1 ]] || return 1
  bytes=$(stat -c %s -- "$marker")
  [[ $bytes -ge 2 && $bytes -le 11 ]] || return 1
  recorded=$(< "$marker")
  [[ "$recorded" =~ ^[1-9][0-9]{0,9}$ && $bytes == $((${#recorded} + 1)) ]] || return 1
  [[ -z "$recovery_phase_pid" || "$recorded" == "$recovery_phase_pid" ]] || return 1
  recovery_phase_pid=$recorded
}
clear_phase_marker() {
  read_phase_marker || return 1
  if [[ -n "$recovery_phase_pid" ]]; then
    group_absent "$recovery_phase_pid" || return 1
  fi
  rm -f -- "$recovery_root/phase-group.pid"
  recovery_phase_pid=
}
stop_phase() {
  [[ -n "$recovery_phase_pid" ]] || return 0
  if [[ ! -d "/proc/$recovery_phase_pid" ]]; then
    group_absent "$recovery_phase_pid"
    return $?
  fi
  local args group attempt
  # A persisted PID is only a refusal/absence marker, never kill authority.
  [[ -n "$recovery_phase_command" ]] || return 1
  [[ "$(stat -c %u -- "/proc/$recovery_phase_pid")" == "$recovery_uid" && "$(readlink -f -- "/proc/$recovery_phase_pid/exe")" == "$recovery_timeout" ]] || return 1
  args=$(tr '\0' '\n' < "/proc/$recovery_phase_pid/cmdline")
  group=$(awk '{print $5}' "/proc/$recovery_phase_pid/stat")
  [[ "$args" == "$recovery_phase_command" && "$group" == "$recovery_phase_pid" ]] || return 1
  # Only this admitted GNU timeout's owned process group; never name/global kills.
  kill -TERM -- "-$recovery_phase_pid" 2>/dev/null || true
  for attempt in {1..50}; do
    kill -0 -- "-$recovery_phase_pid" 2>/dev/null || break
    sleep 0.1
  done
  if kill -0 -- "-$recovery_phase_pid" 2>/dev/null; then
    [[ -d "/proc/$recovery_phase_pid" && "$(readlink -f -- "/proc/$recovery_phase_pid/exe")" == "$recovery_timeout" ]] || return 1
    kill -KILL -- "-$recovery_phase_pid" 2>/dev/null || return 1
  fi
  wait "$recovery_phase_pid" 2>/dev/null || true
  group_absent "$recovery_phase_pid"
}
cleanup_root() {
  local failed=0
  validate_root "$recovery_root" || { printf 'Native recovery cleanup preserved an unvalidated target.\n' >&2; return 1; }
  read_phase_marker || failed=1
  stop_phase || failed=1
  stop_cluster "$recovery_root/source" 55434 || failed=1
  stop_cluster "$recovery_root/restored" 55435 || failed=1
  if [[ $failed != 0 ]]; then printf 'Native recovery cleanup preserved unverifiable targets.\n' >&2; return 1; fi
  validate_root "$recovery_root" || return 1
  postmaster_absent "$recovery_root/source" 55434 || return 1
  postmaster_absent "$recovery_root/restored" 55435 || return 1
  clear_phase_marker || return 1
  # Only the validated unique canonical direct child, never RUNNER_TEMP itself.
  rm -rf -- "$recovery_root"
}
if [[ "$1" == --cleanup ]]; then
  recovery_root=$RECOVERY_NATIVE_ROOT
  cleanup_root
  exit $?
fi

[[ -n "${GITHUB_ENV:-}" && "$GITHUB_ENV" == "$recovery_temp"/* && -f "$GITHUB_ENV" && ! -L "$GITHUB_ENV" && -w "$GITHUB_ENV" ]] || fail 'missing private GitHub environment file'
[[ "$GITHUB_ENV" != *$'\n'* && "$GITHUB_ENV" != *$'\r'* && "$(realpath -e -- "$GITHUB_ENV")" == "$GITHUB_ENV" && "$(stat -c %u -- "$GITHUB_ENV")" == "$recovery_uid" ]] || fail 'invalid environment file'
recovery_node=$(command -v node)
[[ "$recovery_node" == /* && -f "$recovery_node" && -x "$recovery_node" && ! -L "$recovery_node" && "$(realpath -e -- "$recovery_node")" == "$recovery_node" ]] || fail 'missing canonical Node executable'
umask 077
recovery_root=$(mktemp -d "$recovery_temp/recovery-native.XXXXXX")
validate_root "$recovery_root" || fail 'new recovery target is not isolated'
trap 'recovery_status=$?; trap - EXIT; cleanup_root || recovery_status=1; exit "$recovery_status"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
export RECOVERY_NATIVE_ROOT="$recovery_root"
printf 'RECOVERY_NATIVE_ROOT=%s\n' "$recovery_root" >> "$GITHUB_ENV"
for recovery_cluster in source restored; do
  mkdir -m 700 -- "$recovery_root/$recovery_cluster" "$recovery_root/$recovery_cluster/socket"
  recovery_port=55434; recovery_bootstrap=postgres
  if [[ "$recovery_cluster" == restored ]]; then recovery_port=55435; recovery_bootstrap=recovery_bootstrap; fi
  quiet_native 30s "$recovery_bin/initdb" -D "$recovery_root/$recovery_cluster/data" --username="$recovery_bootstrap" --encoding=UTF8 --locale=C.UTF-8 \
    --auth-local=trust --auth-host=reject --set=listen_addresses= \
    --set="unix_socket_directories=$recovery_root/$recovery_cluster/socket" --set=unix_socket_permissions=0700 --set="port=$recovery_port" || fail 'cluster initialization failed'
  # /dev/null bounds server stdout/stderr without imposing file limits on DB data.
  quiet_native 35s "$recovery_bin/pg_ctl" -D "$recovery_root/$recovery_cluster/data" -l /dev/null -w -t 30 start || fail 'cluster start failed'
  validate_postmaster "$recovery_root/$recovery_cluster" "$recovery_port" || fail 'started postmaster identity mismatch'
  quiet_native 7s "$recovery_bin/pg_isready" -h "$recovery_root/$recovery_cluster/socket" -p "$recovery_port" -U "$recovery_bootstrap" -d postgres -t 5 || fail 'cluster readiness failed'
done

report_failure_marker() {
  local marker=$1 pattern=$'^FAIL:(admission|server-identity|fixture|source-access|dump|manifest|offline-source|roles-restore|database-restore|compare|restored-access|rollback|identity-read|identity-json|identity-version|identity-data|identity-socket|identity-port|identity-listen|identity-database|identity-user|identity-session|identity-recovery|identity-encoding|identity-system-id|fresh-read|fresh-json|fresh-roles|fresh-databases|fresh-memberships|cluster-distinct):([0-9A-Z]{5}|unavailable)\n\\.$'
  [[ "$marker" =~ $pattern ]] || return 1
  printf 'Native recovery phase failed: stage=%s sqlState=%s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" >&2
}
run_phase() {
  local phase=$1 pin=${2:-} output_fd input_fd result=0 captured
  local args=("$recovery_timeout" --signal=TERM --kill-after=5s 120s /usr/bin/env -i
    "PATH=$(dirname -- "$recovery_node"):$recovery_bin:/usr/bin:/bin" LANG=C.UTF-8 LC_ALL=C.UTF-8
    GITHUB_ACTIONS=true "RUNNER_TEMP=$recovery_temp" "RECOVERY_NATIVE_ROOT=$recovery_root"
    "$recovery_node" scripts/ci/native-recovery-postgres.mjs "$phase")
  if [[ "$phase" == --restore ]]; then args+=("$pin"); fi
  recovery_phase_command=$(printf '%s\n' "${args[@]}")
  coproc RECOVERY_PHASE { exec "${args[@]}" 2>/dev/null; }
  recovery_phase_pid=$RECOVERY_PHASE_PID
  [[ "$recovery_phase_pid" =~ ^[1-9][0-9]{0,9}$ ]] || return 1
  ( set -o noclobber; printf '%s\n' "$recovery_phase_pid" > "$recovery_root/phase-group.pid" ) || return 1
  exec {output_fd}<&"${RECOVERY_PHASE[0]}"
  input_fd=${RECOVERY_PHASE[1]}; exec {input_fd}>&-
  if [[ "$phase" == --prepare ]]; then
    # Sentinel preserves the required single newline, rejecting extra output.
    captured=$(head -c 66 <&"$output_fd"; printf '.')
    recovery_manifest_sha=
    if [[ ${#captured} == 66 && "${captured:64}" == $'\n.' && "${captured:0:64}" =~ ^[a-f0-9]{64}$ ]]; then
      recovery_manifest_sha=${captured:0:64}
    else
      result=1
    fi
  else
    head -c 65536 <&"$output_fd" || result=1
  fi
  exec {output_fd}<&-
  wait "$recovery_phase_pid" || result=1
  # Node must close/reap its tools before exiting. A dead timeout leader alone
  # does not prove group absence, and fallback must retain that uncertainty.
  clear_phase_marker || result=1
  if [[ "$phase" == --prepare && $result != 0 ]]; then
    # Only the complete bounded allowlisted marker is published, never raw stdout.
    report_failure_marker "$captured" || true
  fi
  [[ $result == 0 ]]
}
run_phase --prepare || fail 'prepare phase failed'
[[ "$recovery_manifest_sha" =~ ^[a-f0-9]{64}$ ]] || fail 'invalid prepared manifest digest'
stop_cluster "$recovery_root/source" 55434 || fail 'source stop could not be verified'
postmaster_absent "$recovery_root/source" 55434 || fail 'source is not offline'
run_phase --restore "$recovery_manifest_sha" || fail 'restore phase failed'
printf 'Native recovery PostgreSQL17 rehearsal completed.\n'
