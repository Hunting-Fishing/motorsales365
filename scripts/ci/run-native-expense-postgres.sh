#!/usr/bin/env bash
# CI-only synthetic owner-session experiment. Never admit an existing database.
set -euo pipefail

fail() { printf 'Native expense rehearsal refused: %s\n' "$1" >&2; exit 1; }
[[ $# == 1 && ( "$1" == --run || "$1" == --cleanup ) ]] || fail 'expected --run or --cleanup'
[[ "${GITHUB_ACTIONS:-}" == true && "$(uname -s)" == Linux ]] || fail 'GitHub Actions Linux only'
[[ -n "${RUNNER_TEMP:-}" && "$RUNNER_TEMP" == /* && "$RUNNER_TEMP" != / && ! -L "$RUNNER_TEMP" ]] || fail 'invalid runner temp'
[[ "$RUNNER_TEMP" != *$'\n'* && "$RUNNER_TEMP" != *$'\r'* && "$RUNNER_TEMP" != *\\* ]] || fail 'invalid runner temp characters'
expense_temp=$(realpath -e -- "$RUNNER_TEMP")
[[ "$expense_temp" == "$RUNNER_TEMP" && -d "$expense_temp" ]] || fail 'runner temp must be canonical'
expense_uid=$(id -u)
[[ "$expense_uid" != 0 ]] || fail 'non-root runner required'

# Refuse even empty/future libpq keys. Fallback cleanup scrubs them instead.
if [[ "$1" == --run ]]; then
  for expense_key in ${!PG@}; do fail 'inherited libpq environment is not permitted'; done
  [[ ! ${DATABASE_URL+x} && ! ${SUPABASE_DB_URL+x} ]] || fail 'inherited database routing is not permitted'
  [[ ! ${EXPENSE_NATIVE_ROOT+x} ]] || fail 'refusing inherited expense state'
fi
for expense_key in ${!PG@}; do unset "$expense_key"; done
unset DATABASE_URL SUPABASE_DB_URL
if [[ "$1" == --cleanup && -z "${EXPENSE_NATIVE_ROOT:-}" ]]; then exit 0; fi
if [[ "$1" == --cleanup && ! -e "$EXPENSE_NATIVE_ROOT" && ! -L "$EXPENSE_NATIVE_ROOT" ]]; then exit 0; fi

expense_bin=/usr/lib/postgresql/17/bin
expense_timeout=/usr/bin/timeout
[[ -f "$expense_timeout" && -x "$expense_timeout" && ! -L "$expense_timeout" && "$(realpath -e -- "$expense_timeout")" == "$expense_timeout" && "$(stat -c %u -- "$expense_timeout")" == 0 ]] || fail 'missing trusted native timeout'
expense_timeout_mode=$(stat -c %a -- "$expense_timeout")
(( (8#$expense_timeout_mode & 022) == 0 )) || fail 'writable native timeout'
[[ "$(realpath -e -- "$expense_bin")" == "$expense_bin" && ! -L "$expense_bin" ]] || fail 'invalid native binary directory'
for expense_program in postgres initdb pg_ctl pg_isready psql; do
  expense_executable="$expense_bin/$expense_program"
  [[ -f "$expense_executable" && -x "$expense_executable" && ! -L "$expense_executable" && "$(realpath -e -- "$expense_executable")" == "$expense_executable" ]] || fail 'missing native PostgreSQL17 binary'
  [[ "$(stat -c %u -- "$expense_executable")" == 0 ]] || fail 'untrusted native binary owner'
  expense_mode=$(stat -c %a -- "$expense_executable")
  (( (8#$expense_mode & 022) == 0 )) || fail 'writable native binary'
  expense_version=$("$expense_timeout" --signal=TERM --kill-after=2s 5s /usr/bin/env -i PATH=/usr/bin:/bin LANG=C.UTF-8 LC_ALL=C.UTF-8 "$expense_executable" --version 2>/dev/null | head -c 512)
  [[ "$expense_version" =~ ^[a-z_]+\ \(PostgreSQL\)\ 17\. ]] || fail 'binary is not PostgreSQL17'
done

private_directory() {
  [[ -d "$1" && ! -L "$1" && "$(realpath -e -- "$1")" == "$1" && "$(stat -c %u -- "$1")" == "$expense_uid" && "$(stat -c %a -- "$1")" == 700 ]]
}
private_control() {
  [[ -f "$1" && ! -L "$1" && "$(realpath -e -- "$1")" == "$1" && "$(stat -c %u -- "$1")" == "$expense_uid" && "$(stat -c %a -- "$1")" == 600 && "$(stat -c %h -- "$1")" == 1 && "$(stat -c %s -- "$1")" == 0 ]]
}
validate_root() {
  local root=$1 child
  [[ -n "$root" && "$(dirname -- "$root")" == "$expense_temp" && "$(basename -- "$root")" =~ ^expense-native\.[A-Za-z0-9]{6}$ ]] || return 1
  private_directory "$root" || return 1
  for child in data socket; do
    [[ ! -L "$root/$child" ]] || return 1
    if [[ -e "$root/$child" ]]; then private_directory "$root/$child" || return 1; fi
  done
  for child in pgpass pgservice; do
    if [[ -e "$root/$child" || -L "$root/$child" ]]; then private_control "$root/$child" || return 1; fi
  done
  # Never follow tablespaces, symlinks, foreign owners or multiply linked files.
  [[ -z "$(find "$root" -xdev \( -type l -o ! -uid "$expense_uid" -o \( -type f -links +1 \) \) -print -quit)" ]]
}
validate_postmaster() {
  local pid_file="$expense_root/data/postmaster.pid" exe args
  validate_root "$expense_root" || return 1
  [[ -f "$pid_file" && ! -L "$pid_file" && "$(stat -c %u -- "$pid_file")" == "$expense_uid" && "$(stat -c %s -- "$pid_file")" -le 2048 ]] || return 1
  local lines=()
  mapfile -t -n 8 lines < "$pid_file"
  [[ ${#lines[@]} -ge 5 && "${lines[0]}" =~ ^[1-9][0-9]{0,9}$ && "${lines[1]}" == "$expense_root/data" && "${lines[3]}" == 55436 && "${lines[4]}" == "$expense_root/socket" ]] || return 1
  expense_verified_pid=${lines[0]}
  [[ -d "/proc/$expense_verified_pid" && "$(stat -c %u -- "/proc/$expense_verified_pid")" == "$expense_uid" ]] || return 1
  exe=$(readlink -f -- "/proc/$expense_verified_pid/exe")
  args=$(tr '\0' '\n' < "/proc/$expense_verified_pid/cmdline")
  [[ "$exe" == "$expense_bin/postgres" && "$args" == "$expense_bin/postgres"$'\n-D\n'"$expense_root/data" ]]
}
quiet_native() {
  local seconds=$1; shift
  # Fixed private controls prevent HOME/service/password fallback, even cleanup.
  "$expense_timeout" --signal=TERM --kill-after=2s "$seconds" /usr/bin/env -i PATH="$expense_bin:/usr/bin:/bin" LANG=C.UTF-8 LC_ALL=C.UTF-8 \
    PGPASSFILE="$expense_root/pgpass" PGSERVICEFILE="$expense_root/pgservice" PGSYSCONFDIR="$expense_root" "$@" >/dev/null 2>&1
}
postmaster_absent() {
  local candidate exe args scanned=0 ready_status=0
  [[ ! -e "$expense_root/data/postmaster.pid" && ! -L "$expense_root/data/postmaster.pid" && ! -e "$expense_root/socket/.s.PGSQL.55436" && ! -e "$expense_root/socket/.s.PGSQL.55436.lock" ]] || return 1
  for candidate in /proc/[0-9]*; do
    scanned=$((scanned + 1)); [[ $scanned -le 8192 ]] || return 1
    [[ "$(stat -c %u -- "$candidate" 2>/dev/null)" == "$expense_uid" ]] || continue
    exe=$(readlink -f -- "$candidate/exe" 2>/dev/null) || continue
    [[ "$exe" == "$expense_bin/postgres" ]] || continue
    args=$(tr '\0' '\n' < "$candidate/cmdline" 2>/dev/null) || return 1
    [[ "$args" != "$expense_bin/postgres"$'\n-D\n'"$expense_root/data" ]] || return 1
  done
  quiet_native 7s "$expense_bin/pg_isready" -h "$expense_root/socket" -p 55436 -U postgres -d postgres -t 5 || ready_status=$?
  [[ $ready_status == 2 ]]
}
stop_cluster() {
  local stop_status=0 verified_pid
  validate_root "$expense_root" || return 1
  if [[ -e "$expense_root/data/postmaster.pid" || -L "$expense_root/data/postmaster.pid" ]]; then
    validate_postmaster || return 1
    verified_pid=$expense_verified_pid
    quiet_native 20s "$expense_bin/pg_ctl" -D "$expense_root/data" -m fast -w -t 15 stop || stop_status=$?
    if [[ $stop_status != 0 && -e "$expense_root/data/postmaster.pid" ]]; then
      validate_postmaster || return 1
      [[ "$expense_verified_pid" == "$verified_pid" ]] || return 1
      quiet_native 15s "$expense_bin/pg_ctl" -D "$expense_root/data" -m immediate -w -t 10 stop || return 1
    fi
    [[ ! -d "/proc/$verified_pid" ]] || return 1
  fi
  postmaster_absent
}

expense_phase_pid=
expense_phase_command=
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
  local marker="$expense_root/phase-group.pid" recorded bytes
  [[ -e "$marker" || -L "$marker" ]] || return 0
  [[ -f "$marker" && ! -L "$marker" && "$(stat -c %u -- "$marker")" == "$expense_uid" && "$(stat -c %a -- "$marker")" == 600 && "$(stat -c %h -- "$marker")" == 1 ]] || return 1
  bytes=$(stat -c %s -- "$marker")
  [[ $bytes -ge 2 && $bytes -le 11 ]] || return 1
  recorded=$(< "$marker")
  [[ "$recorded" =~ ^[1-9][0-9]{0,9}$ && $bytes == $((${#recorded} + 1)) ]] || return 1
  [[ -z "$expense_phase_pid" || "$recorded" == "$expense_phase_pid" ]] || return 1
  expense_phase_pid=$recorded
}
clear_phase_marker() {
  read_phase_marker || return 1
  if [[ -n "$expense_phase_pid" ]]; then group_absent "$expense_phase_pid" || return 1; fi
  rm -f -- "$expense_root/phase-group.pid"
  expense_phase_pid=
}
validate_phase_identity() {
  local args group
  # A persisted PID proves only uncertainty, never authority to kill a process.
  [[ -n "$expense_phase_command" ]] || return 1
  [[ -d "/proc/$expense_phase_pid" ]] || return 1
  [[ "$(stat -c %u -- "/proc/$expense_phase_pid")" == "$expense_uid" && "$(readlink -f -- "/proc/$expense_phase_pid/exe")" == "$expense_timeout" ]] || return 1
  args=$(tr '\0' '\n' < "/proc/$expense_phase_pid/cmdline")
  group=$(awk '{print $5}' "/proc/$expense_phase_pid/stat")
  [[ "$args" == "$expense_phase_command" && "$group" == "$expense_phase_pid" ]] || return 1
}
stop_phase() {
  [[ -n "$expense_phase_pid" ]] || return 0
  if [[ ! -d "/proc/$expense_phase_pid" ]]; then group_absent "$expense_phase_pid"; return $?; fi
  local attempt
  validate_phase_identity || return 1
  kill -TERM -- "-$expense_phase_pid" 2>/dev/null || true
  for attempt in {1..50}; do
    kill -0 -- "-$expense_phase_pid" 2>/dev/null || break
    sleep 0.1
  done
  if kill -0 -- "-$expense_phase_pid" 2>/dev/null; then
    # Revalidate the FULL identity after grace; PID/executable alone could be reused.
    validate_phase_identity || return 1
    kill -KILL -- "-$expense_phase_pid" 2>/dev/null || return 1
  fi
  wait "$expense_phase_pid" 2>/dev/null || true
  group_absent "$expense_phase_pid"
}
cleanup_root() {
  local failed=0
  validate_root "$expense_root" || { printf 'Native expense cleanup preserved an unvalidated target.\n' >&2; return 1; }
  read_phase_marker || failed=1
  stop_phase || failed=1
  stop_cluster || failed=1
  if [[ $failed != 0 ]]; then printf 'Native expense cleanup preserved unverifiable targets.\n' >&2; return 1; fi
  validate_root "$expense_root" || return 1
  postmaster_absent || return 1
  clear_phase_marker || return 1
  # One validated unique canonical direct child, never RUNNER_TEMP itself.
  rm -rf --one-file-system -- "$expense_root"
}
if [[ "$1" == --cleanup ]]; then
  expense_root=$EXPENSE_NATIVE_ROOT
  cleanup_root
  exit $?
fi

[[ -n "${GITHUB_ENV:-}" && "$GITHUB_ENV" == "$expense_temp"/* && -f "$GITHUB_ENV" && ! -L "$GITHUB_ENV" && -w "$GITHUB_ENV" ]] || fail 'missing private GitHub environment file'
[[ "$GITHUB_ENV" != *$'\n'* && "$GITHUB_ENV" != *$'\r'* && "$(realpath -e -- "$GITHUB_ENV")" == "$GITHUB_ENV" && "$(stat -c %u -- "$GITHUB_ENV")" == "$expense_uid" && "$(stat -c %h -- "$GITHUB_ENV")" == 1 ]] || fail 'invalid environment file'
expense_node=$(command -v node)
[[ "$expense_node" == /* && -f "$expense_node" && -x "$expense_node" && ! -L "$expense_node" && "$(realpath -e -- "$expense_node")" == "$expense_node" ]] || fail 'missing canonical Node executable'
umask 077
expense_root=$(mktemp -d "$expense_temp/expense-native.XXXXXX")
validate_root "$expense_root" || fail 'new expense target is not isolated'
trap 'expense_status=$?; trap - EXIT; cleanup_root || expense_status=1; exit "$expense_status"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
export EXPENSE_NATIVE_ROOT="$expense_root"
printf 'EXPENSE_NATIVE_ROOT=%s\n' "$expense_root" >> "$GITHUB_ENV"
mkdir -m 700 -- "$expense_root/socket"
for expense_control in pgpass pgservice; do
  ( set -o noclobber; : > "$expense_root/$expense_control" ) || fail 'private control creation failed'
  private_control "$expense_root/$expense_control" || fail 'private control validation failed'
done
quiet_native 30s "$expense_bin/initdb" -D "$expense_root/data" --username=postgres --encoding=UTF8 --locale=C.UTF-8 \
  --auth-local=trust --auth-host=reject --set=listen_addresses= \
  --set="unix_socket_directories=$expense_root/socket" --set=unix_socket_permissions=0700 --set=port=55436 || fail 'cluster initialization failed'
quiet_native 35s "$expense_bin/pg_ctl" -D "$expense_root/data" -l /dev/null -w -t 30 start || fail 'cluster start failed'
validate_postmaster || fail 'started postmaster identity mismatch'
quiet_native 7s "$expense_bin/pg_isready" -h "$expense_root/socket" -p 55436 -U postgres -d postgres -t 5 || fail 'cluster readiness failed'

report_phase_output() {
  local captured=$1 phase_status=$2 body line index=0 failed=0 completed=0
  local failure_pattern='^FAIL nativePG17 expense: stage=(admission|server-identity|fresh-cluster|fixture-setup|locked-acl|same-request|different-operation|changed-binding|outer-transaction|late-ledger-fk|customer-wait|vehicle-wait|financial-wait|complete), sqlState=([0-9A-Z]{5}|unavailable); no live acceptance\.$'
  local passes=(
    'locked ordinary-role denial; owner/GUC positives only, not authority'
    'same request waits then exact replay without timestamp/repost writes'
    'different operation same receipt refused after observed wait'
    'same operation changed full binding refused after observed wait'
    'outer result invisible until COMMIT; ROLLBACK restores every selected financial row'
    'real late account and ledger FK23503 roll all selected financial effects back'
    'customer shop drift after observed wait refuses prior shop intent'
    'vehicle customer drift after observed wait refuses stale join binding'
    'expense journal line account drift after observed waits is rechecked without replay writes'
    'complete; synthetic owner/GUC only, NOT authority policy global-writer phantom API Auth Storage restore or release acceptance'
  )
  [[ "$phase_status" == 0 || "$phase_status" == 1 ]] || return 1
  # The sentinel preserves the last newline. The extra captured byte detects
  # over-budget/truncated output; exit0 alone never proves phase completion.
  [[ ${#captured} -ge 2 && ${#captured} -le 65537 && "${captured: -2}" == $'\n.' ]] || return 1
  body=${captured%.}
  while IFS= read -r line; do
    [[ $failed == 0 && $completed == 0 ]] || return 1
    if [[ $index == 0 && "$line" =~ ^NativeExpensePG17\ server_version_num=17[0-9]{4}\;\ private\ cluster\ identity\ verified\.$ ]]; then
      index=1
    elif [[ $index -ge 1 && $index -le ${#passes[@]} && "$line" == "PASS nativePG17 expense: ${passes[$((index - 1))]}." ]]; then
      index=$((index + 1))
    elif [[ "$line" =~ $failure_pattern ]]; then
      failed=1
    elif [[ $index == $((${#passes[@]} + 1)) && "$line" == 'Native expense PostgreSQL17 rehearsal complete: synthetic owner sessions only.' ]]; then
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
  # Publish only a completely admitted bounded transcript after owned children
  # have exited and group absence has been proved, never raw Node stderr.
  printf '%s' "$body"
}
run_phase() {
  local output_fd input_fd result=0 captured
  local args=("$expense_timeout" --signal=TERM --kill-after=5s 180s /usr/bin/env -i
    "PATH=$(dirname -- "$expense_node"):$expense_bin:/usr/bin:/bin" LANG=C.UTF-8 LC_ALL=C.UTF-8
    GITHUB_ACTIONS=true "RUNNER_TEMP=$expense_temp" "EXPENSE_NATIVE_ROOT=$expense_root"
    "$expense_node" scripts/ci/native-expense-postgres.mjs --run)
  expense_phase_command=$(printf '%s\n' "${args[@]}")
  coproc EXPENSE_PHASE { exec "${args[@]}" 2>/dev/null; }
  expense_phase_pid=$EXPENSE_PHASE_PID
  [[ "$expense_phase_pid" =~ ^[1-9][0-9]{0,9}$ ]] || return 1
  ( set -o noclobber; printf '%s\n' "$expense_phase_pid" > "$expense_root/phase-group.pid" ) || return 1
  exec {output_fd}<&"${EXPENSE_PHASE[0]}"
  input_fd=${EXPENSE_PHASE[1]}; exec {input_fd}>&-
  captured=$(head -c 65537 <&"$output_fd"; expense_capture_status=$?; printf '.'; exit "$expense_capture_status") || result=1
  exec {output_fd}<&-
  wait "$expense_phase_pid" || result=1
  # Node must reap its clients; a dead timeout leader alone is not group absence.
  clear_phase_marker || result=1
  report_phase_output "$captured" "$result" || return 1
  [[ $result == 0 ]]
}
run_phase || fail 'owner-session phase failed'
printf 'Native expense PostgreSQL17 rehearsal completed; synthetic owner sessions only.\n'
