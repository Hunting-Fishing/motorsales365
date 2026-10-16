// Offline source/syntax/non-CI refusal guards, never a PostgreSQL experiment.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptUrl = new URL("./run-native-expense-postgres.sh", import.meta.url);
const scriptPath = fileURLToPath(scriptUrl);
const scriptArgument = process.platform === "win32" ? scriptPath.replaceAll("\\", "/") : scriptPath;
const source = fs.readFileSync(scriptUrl, "utf8").replace(/\r\n/g, "\n");
const bash =
  process.platform === "win32"
    ? ["C:/Program Files/Git/bin/bash.exe", "C:/Program Files/Git/usr/bin/bash.exe"].find((value) =>
        fs.existsSync(value),
      )
    : ["/bin/bash", "/usr/bin/bash"].find((value) => fs.existsSync(value));
const refusalEnvironment = {
  PATH: process.env.PATH ?? "",
  SystemRoot: process.env.SystemRoot ?? "",
  GITHUB_ACTIONS: "false",
  RUNNER_TEMP: "UNUSED-SYNTHETIC-PATH",
  DATABASE_URL: "PRIVATE-UNUSED-ROUTING-SENTINEL",
  PGUNKNOWN: "PRIVATE-UNUSED-LIBPQ-SENTINEL",
};
const at = (value) => {
  const index = source.indexOf(value);
  assert.notEqual(index, -1, value);
  return index;
};

test("CI/Linux and exact CLI refusal happens before binaries, filesystem setup or state", () => {
  assert.match(source, /\[\[ \$# == 1 && \( "\$1" == --run \|\| "\$1" == --cleanup \) \]\]/);
  assert.match(source, /GITHUB_ACTIONS:-.*== true.*uname -s.*== Linux/);
  assert.ok(at("GitHub Actions Linux only") < at("expense_temp=$(realpath"));
  assert.ok(at("GitHub Actions Linux only") < at("expense_bin=/usr/lib/postgresql/17/bin"));
  assert.match(source, /expense_uid.*!= 0.*non-root runner required/);
  assert.doesNotMatch(
    source,
    /^\s*(?:eval\b|source\s|\.\s)|\bdocker\b|\bapt(?:-get)?\b|systemctl|npm install|https?:\/\//im,
  );
});

test("all inherited PG keys and database routes are refused even empty, then cleanup scrubs them", () => {
  assert.match(
    source,
    /for expense_key in \$\{!PG@\}; do fail 'inherited libpq environment is not permitted'; done/,
  );
  assert.match(source, /! \$\{DATABASE_URL\+x\} && ! \$\{SUPABASE_DB_URL\+x\}/);
  assert.match(source, /! \$\{EXPENSE_NATIVE_ROOT\+x\}/);
  assert.match(source, /for expense_key in \$\{!PG@\}; do unset "\$expense_key"; done/);
  assert.match(source, /unset DATABASE_URL SUPABASE_DB_URL/);
  assert.ok(at("inherited libpq environment") < at("mktemp -d"));
  assert.ok(at("unset DATABASE_URL") < at("mktemp -d"));
});

test("only fixed real root-owned non-writable native PG17 tools and timeout are used", () => {
  assert.match(source, /expense_bin=\/usr\/lib\/postgresql\/17\/bin/);
  assert.match(source, /expense_timeout=\/usr\/bin\/timeout/);
  assert.match(source, /for expense_program in postgres initdb pg_ctl pg_isready psql; do/);
  assert.match(
    source,
    /! -L "\$expense_executable".*realpath -e -- "\$expense_executable".*== "\$expense_executable"/,
  );
  assert.match(source, /stat -c %u -- "\$expense_executable".*== 0/);
  assert.match(source, /8#\$expense_mode & 022/);
  assert.match(source, /8#\$expense_timeout_mode & 022/);
  assert.match(source, /expense_version.*--version.*head -c 512/);
  assert.match(source, /PostgreSQL.*17\\\./);
});

test("one new canonical private direct-child cluster cannot reuse quote, recovery or runner root", () => {
  assert.match(source, /mktemp -d "\$expense_temp\/expense-native\.XXXXXX"/);
  assert.match(source, /dirname -- "\$root".*== "\$expense_temp"/);
  assert.match(source, /\^expense-native\\\.\[A-Za-z0-9\]\{6\}\$/);
  assert.match(source, /stat -c %u.*== "\$expense_uid".*stat -c %a.*== 700/);
  assert.match(source, /for child in data socket; do/);
  assert.match(source, /find "\$root" -xdev.*-type l.*! -uid.*-links \+1/);
  assert.match(source, /umask 077/);
  assert.match(source, /mkdir -m 700 -- "\$expense_root\/socket"/);
  assert.doesNotMatch(source, /QUOTE_NATIVE_ROOT|RECOVERY_NATIVE_ROOT|5543[345]/);
});

test("cleanup trap precedes env export and startup, only validated GitHub environment file receives root", () => {
  const validation = at(
    "validate_root \"$expense_root\" || fail 'new expense target is not isolated'",
  );
  const exitTrap = at("trap 'expense_status=$?");
  assert.ok(validation < exitTrap);
  assert.equal(
    source.slice(validation, exitTrap).trim(),
    "validate_root \"$expense_root\" || fail 'new expense target is not isolated'",
  );
  assert.ok(exitTrap < at("export EXPENSE_NATIVE_ROOT="));
  assert.ok(exitTrap < at("printf 'EXPENSE_NATIVE_ROOT="));
  assert.ok(exitTrap < at("quiet_native 30s"));
  assert.match(source, /trap 'exit 130' INT/);
  assert.match(source, /trap 'exit 143' TERM/);
  assert.match(source, /GITHUB_ENV.*-f.*! -L.*-w/);
  assert.match(
    source,
    /realpath -e -- "\$GITHUB_ENV".*== "\$GITHUB_ENV".*stat -c %u.*== "\$expense_uid".*stat -c %h.*== 1/,
  );
});

test("empty private libpq controls are exclusive,0600, single-link and validated before first startup/readiness", () => {
  assert.match(source, /for expense_control in pgpass pgservice; do/);
  assert.match(source, /set -o noclobber; : > "\$expense_root\/\$expense_control"/);
  const control = source.slice(at("private_control() {"), at("validate_root() {"));
  assert.match(
    control,
    /-f.*! -L.*realpath -e.*stat -c %u.*expense_uid.*stat -c %a.*600.*stat -c %h.*1.*stat -c %s.*0/,
  );
  assert.ok(at("private control validation failed") < at("quiet_native 30s"));
  assert.match(
    source,
    /PGPASSFILE="\$expense_root\/pgpass" PGSERVICEFILE="\$expense_root\/pgservice" PGSYSCONFDIR="\$expense_root"/,
  );
  assert.doesNotMatch(source, /PGPASSFILE=.?\/dev\/null|PGSERVICEFILE=.?\/dev\/null|\bHOME=/);
});

test("socket-only55436 cluster and bounded readiness never bind TCP or existing servers", () => {
  assert.match(source, /--username=postgres --encoding=UTF8 --locale=C.UTF-8/);
  assert.match(source, /--auth-local=trust --auth-host=reject --set=listen_addresses=/);
  assert.match(source, /unix_socket_directories=\$expense_root\/socket/);
  assert.match(source, /unix_socket_permissions=0700 --set=port=55436/);
  assert.match(source, /quiet_native 35s.*pg_ctl.*-l \/dev\/null -w -t 30 start/);
  assert.match(
    source,
    /quiet_native 7s.*pg_isready.*-h "\$expense_root\/socket" -p 55436 -U postgres -d postgres -t 5/,
  );
  assert.doesNotMatch(
    source,
    /-h (?:localhost|127\.0\.0\.1)|listen_addresses=\*|--auth-host=trust/,
  );
});

test("postmaster PID/UID/executable/exact argv/data/socket/port are verified before scoped stop", () => {
  assert.match(source, /mapfile -t -n 8 lines < "\$pid_file"/);
  assert.match(
    source,
    /lines\[1\].*== "\$expense_root\/data".*lines\[3\].*== 55436.*lines\[4\].*== "\$expense_root\/socket"/,
  );
  assert.match(source, /stat -c %u -- "\/proc\/\$expense_verified_pid".*== "\$expense_uid"/);
  assert.match(source, /readlink -f -- "\/proc\/\$expense_verified_pid\/exe"/);
  assert.match(
    source,
    /"\$exe" == "\$expense_bin\/postgres" && "\$args" == "\$expense_bin\/postgres"\$'\\n-D\\n'"\$expense_root\/data"/,
  );
  const stop = source.slice(at("stop_cluster() {"), at("expense_phase_pid="));
  assert.ok(stop.indexOf("validate_postmaster || return 1") < stop.indexOf("-m fast"));
  assert.ok(stop.lastIndexOf("validate_postmaster || return 1") < stop.indexOf("-m immediate"));
  assert.match(stop, /expense_verified_pid.*== "\$verified_pid"/);
  assert.match(stop, /-m fast -w -t 15 stop/);
  assert.match(stop, /-m immediate -w -t 10 stop/);
});

test("cleanup proves process/socket/readiness absence and preserves uncertain targets before scoped delete", () => {
  const absent = source.slice(at("postmaster_absent() {"), at("stop_cluster() {"));
  assert.match(absent, /! -e "\$expense_root\/data\/postmaster.pid".*! -L/);
  assert.match(absent, /\.s\.PGSQL\.55436.*\.s\.PGSQL\.55436\.lock/);
  assert.match(absent, /for candidate in \/proc\/\[0-9\]\*/);
  assert.match(absent, /scanned -le 8192/);
  assert.match(absent, /"\$args" != "\$expense_bin\/postgres"\$'\\n-D\\n'"\$expense_root\/data"/);
  assert.match(absent, /ready_status == 2/);
  const cleanup = source.slice(
    at("cleanup_root() {"),
    at('if [[ "$1" == --cleanup ]]; then\n  expense_root='),
  );
  assert.match(cleanup, /stop_phase \|\| failed=1/);
  assert.match(cleanup, /stop_cluster \|\| failed=1/);
  assert.match(cleanup, /failed != 0.*preserved unverifiable targets.*return 1/);
  assert.ok(cleanup.lastIndexOf("validate_root") < cleanup.indexOf("rm -rf"));
  assert.ok(cleanup.indexOf("postmaster_absent") < cleanup.indexOf("rm -rf"));
  assert.ok(cleanup.indexOf("clear_phase_marker") < cleanup.indexOf("rm -rf"));
  assert.equal((source.match(/\brm -rf --one-file-system -- "\$expense_root"/g) ?? []).length, 1);
  assert.doesNotMatch(source, /pkill|killall|rm -rf.*\$expense_temp|rm -rf.*RUNNER_TEMP/);
});

test("fallback cleanup is idempotent without root and never gains kill authority from a stale marker", () => {
  assert.match(source, /--cleanup && -z "\$\{EXPENSE_NATIVE_ROOT:-\}".*exit 0/);
  assert.match(
    source,
    /--cleanup && ! -e "\$EXPENSE_NATIVE_ROOT" && ! -L "\$EXPENSE_NATIVE_ROOT".*exit 0/,
  );
  assert.ok(at("--cleanup && -z") < at("expense_bin=/usr/lib/postgresql/17/bin"));
  assert.match(source, /marker="\$expense_root\/phase-group\.pid"/);
  assert.match(source, /! -L "\$marker".*stat -c %u.*expense_uid.*stat -c %a.*600.*stat -c %h.*1/);
  assert.match(source, /bytes -ge 2 && \$bytes -le 11/);
  assert.match(source, /\[\[ -n "\$expense_phase_command" \]\] \|\| return 1/);
  assert.match(source, /fields=\$\{line##\*\) \}/);
  assert.match(source, /"\$group" != "\$expected"/);
});

test("one scrubbed bounded Node phase is tracked and reaped, with no supplied SQL/path/provider arguments", () => {
  assert.match(source, /--signal=TERM --kill-after=5s 180s \/usr\/bin\/env -i/);
  assert.doesNotMatch(source, /--foreground/);
  assert.match(
    source,
    /GITHUB_ACTIONS=true "RUNNER_TEMP=\$expense_temp" "EXPENSE_NATIVE_ROOT=\$expense_root"/,
  );
  assert.match(source, /"\$expense_node" scripts\/ci\/native-expense-postgres\.mjs --run/);
  assert.match(source, /coproc EXPENSE_PHASE \{ exec "\$\{args\[@\]\}" 2>\/dev\/null/);
  assert.match(source, /expense_phase_pid=\$EXPENSE_PHASE_PID/);
  assert.match(
    source,
    /"\$args" == "\$expense_phase_command" && "\$group" == "\$expense_phase_pid"/,
  );
  assert.match(source, /kill -TERM -- "-\$expense_phase_pid"/);
  assert.match(source, /kill -KILL -- "-\$expense_phase_pid"/);
  assert.match(source, /head -c 65537/);
  assert.match(
    source,
    /wait "\$expense_phase_pid" \|\| result=1\s+.*\s+clear_phase_marker \|\| result=1/,
  );
  assert.match(source, /group_absent "\$expense_phase_pid" \|\| return 1/);
  assert.match(source, /"\$@" >\/dev\/null 2>&1/);
});

test("both TERM and escalated KILL require fresh full UID executable argv and group identity", () => {
  const identity = source.slice(at("validate_phase_identity() {"), at("stop_phase() {"));
  assert.match(identity, /\[\[ -n "\$expense_phase_command" \]\] \|\| return 1/);
  assert.match(identity, /stat -c %u.*== "\$expense_uid".*readlink -f.*== "\$expense_timeout"/);
  assert.match(identity, /\/proc\/\$expense_phase_pid\/cmdline/);
  assert.match(identity, /\/proc\/\$expense_phase_pid\/stat/);
  assert.match(
    identity,
    /"\$args" == "\$expense_phase_command" && "\$group" == "\$expense_phase_pid"/,
  );
  const stop = source.slice(at("stop_phase() {"), at("cleanup_root() {"));
  assert.equal((stop.match(/validate_phase_identity \|\| return 1/g) ?? []).length, 2);
  assert.ok(stop.indexOf("validate_phase_identity") < stop.indexOf("kill -TERM"));
  assert.ok(stop.lastIndexOf("validate_phase_identity") > stop.indexOf("for attempt in"));
  assert.ok(stop.lastIndexOf("validate_phase_identity") < stop.indexOf("kill -KILL"));
});

test("only a complete bounded allowlisted transcript can acknowledge success or publish safe failure", () => {
  const phase = source.slice(at("run_phase() {"));
  assert.match(source, /captured=\$\(head -c 65537.*printf '\.'/);
  assert.match(source, /captured\} -le 65537.*captured: -2.*\\n\./);
  assert.match(
    source,
    /Native expense PostgreSQL17 rehearsal complete: synthetic owner sessions only\./,
  );
  assert.match(source, /\$completed == 1 && \$failed == 0/);
  assert.match(source, /\$failed == 1 && \$completed == 0/);
  assert.ok(
    phase.indexOf('wait "$expense_phase_pid"') <
      phase.indexOf('report_phase_output "$captured" "$result"'),
  );
  assert.ok(
    phase.indexOf("clear_phase_marker || result=1") <
      phase.indexOf('report_phase_output "$captured" "$result"'),
  );
  assert.doesNotMatch(phase, /printf[^\n]*"\$captured"|echo[^\n]*"\$captured"|2>&1/);
});

const serverMarker =
  "NativeExpensePG17 server_version_num=170011; private cluster identity verified.\n";
const passMarkers = [
  "locked ordinary-role denial; owner/GUC positives only, not authority",
  "same request waits then exact replay without timestamp/repost writes",
  "different operation same receipt refused after observed wait",
  "same operation changed full binding refused after observed wait",
  "outer result invisible until COMMIT; ROLLBACK restores every selected financial row",
  "real late account and ledger FK23503 roll all selected financial effects back",
  "customer shop drift after observed wait refuses prior shop intent",
  "vehicle customer drift after observed wait refuses stale join binding",
  "expense journal line account drift after observed waits is rechecked without replay writes",
  "complete; synthetic owner/GUC only, NOT authority policy global-writer phantom API Auth Storage restore or release acceptance",
].map((message) => `PASS nativePG17 expense: ${message}.\n`);
const completion =
  "Native expense PostgreSQL17 rehearsal complete: synthetic owner sessions only.\n";
const successTranscript = serverMarker + passMarkers.join("") + completion;
function runOutputParser(transcript, status) {
  // Execute only this extracted pure builtin parser, never the CI wrapper,
  // cleanup, PostgreSQL programs or Node rehearsal.
  const definition = source.slice(at("report_phase_output() {"), at("run_phase() {"));
  return spawnSync(
    bash,
    [
      "--noprofile",
      "--norc",
      "-c",
      `${definition}\nIFS= read -r -d '' captured || true\nreport_phase_output "$captured" "$1"`,
      "parser",
      status,
    ],
    {
      env: refusalEnvironment,
      input: `${transcript}.`,
      encoding: "utf8",
      timeout: 5000,
      maxBuffer: 131072,
    },
  );
}

test(
  "actual isolated Bash output parser admits all proofs and exact final success marker",
  { skip: !bash },
  () => {
    const result = runOutputParser(successTranscript, "0");
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, successTranscript);
    assert.equal(result.stderr, "");
  },
);

test(
  "actual isolated Bash output parser preserves only allowlisted failure stages and SQLSTATE",
  { skip: !bash },
  () => {
    for (const stage of [
      "admission",
      "server-identity",
      "fresh-cluster",
      "fixture-setup",
      "locked-acl",
      "same-request",
      "different-operation",
      "changed-binding",
      "outer-transaction",
      "late-ledger-fk",
      "customer-wait",
      "vehicle-wait",
      "financial-wait",
      "complete",
    ]) {
      for (const state of ["23503", "unavailable"]) {
        const transcript = `FAIL nativePG17 expense: stage=${stage}, sqlState=${state}; no live acceptance.\n`;
        const result = runOutputParser(transcript, "1");
        assert.equal(result.error, undefined);
        assert.equal(result.status, 0);
        assert.equal(result.stdout, transcript);
        assert.equal(result.stderr, "");
      }
    }
    const partial =
      serverMarker +
      passMarkers[0] +
      "FAIL nativePG17 expense: stage=same-request, sqlState=unavailable; no live acceptance.\n";
    const partialResult = runOutputParser(partial, "1");
    assert.equal(partialResult.error, undefined);
    assert.equal(partialResult.status, 0);
    assert.equal(partialResult.stdout, partial);
    assert.equal(partialResult.stderr, "");
  },
);

test(
  "actual isolated Bash output parser refuses truncation, missing/reordered proofs and private/extra diagnostics",
  { skip: !bash },
  () => {
    for (const [transcript, status] of [
      ["", "0"],
      [completion, "0"],
      [serverMarker + passMarkers.join(""), "0"],
      [successTranscript.slice(0, -1), "0"],
      [successTranscript + "\n", "0"],
      [successTranscript + "PRIVATE diagnostic\n", "0"],
      [serverMarker + passMarkers.slice(1).join("") + completion, "0"],
      [serverMarker + [...passMarkers].reverse().join("") + completion, "0"],
      [successTranscript.replace("170011", "180006"), "0"],
      [successTranscript, "1"],
      [successTranscript, "2"],
      ["FAIL nativePG17 expense: stage=PRIVATE, sqlState=23503; no live acceptance.\n", "1"],
      ["FAIL nativePG17 expense: stage=admission, sqlState=private; no live acceptance.\n", "1"],
      ["FAIL nativePG17 expense: stage=admission, sqlState=23503; no live acceptance.\n", "0"],
      ["x".repeat(65537) + "\n", "0"],
    ]) {
      const result = runOutputParser(transcript, status);
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
    }
  },
);

test("shell syntax parses without executing a statement", { skip: !bash }, () => {
  const result = spawnSync(bash, ["-n", scriptArgument], {
    env: refusalEnvironment,
    encoding: "utf8",
    timeout: 5000,
    maxBuffer: 8192,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
});

test(
  "real shell refuses outside CI before binaries, credentials, cluster creation or services",
  { skip: !bash },
  () => {
    for (const args of [["--run"], ["--cleanup"], ["--restore", "PRIVATE-UNUSED-SHA"], []]) {
      const result = spawnSync(bash, [scriptArgument, ...args], {
        env: refusalEnvironment,
        encoding: "utf8",
        timeout: 5000,
        maxBuffer: 8192,
      });
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.match(
        result.stderr,
        /Native expense rehearsal refused: (?:GitHub Actions Linux only|expected --run or --cleanup)/,
      );
      assert.doesNotMatch(result.stderr, /PRIVATE|UNUSED|password|postgresql:\/\//i);
    }
  },
);
