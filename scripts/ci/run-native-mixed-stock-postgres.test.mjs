// Offline source guards, bash -n and extracted PURE Bash functions only.
// No full --run, PostgreSQL binary, server, cluster or SQL is executed here.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { load } from "js-yaml";
import {
  REQUIRED_STOCK_MARKERS,
  STOCK_SERVER_PATTERN,
  STOCK_FAILURE_PATTERN,
} from "./native-mixed-stock-postgres.mjs";

const url = new URL("./run-native-mixed-stock-postgres.sh", import.meta.url);
const scriptPath = fileURLToPath(url);
const scriptArgument = process.platform === "win32" ? scriptPath.replaceAll("\\", "/") : scriptPath;
const source = fs.readFileSync(url, "utf8").replace(/\r\n/g, "\n");
const bash =
  process.platform === "win32"
    ? ["C:/Program Files/Git/bin/bash.exe", "C:/Program Files/Git/usr/bin/bash.exe"].find((path) =>
        fs.existsSync(path),
      )
    : ["/bin/bash", "/usr/bin/bash"].find((path) => fs.existsSync(path));
const environment = {
  PATH: process.env.PATH ?? "",
  SystemRoot: process.env.SystemRoot ?? "",
  LANG: "C",
  LC_ALL: "C",
  GITHUB_ACTIONS: "false",
};
const at = (text) => {
  const index = source.indexOf(text);
  assert.notEqual(index, -1, text);
  return index;
};
const section = (first, next) => source.slice(at(first), at(next));
const report = section("report_phase_output() {", "run_phase() {");
const poll = section("postmaster_pid_absent() {", "postmaster_absent() {");
const cleanup = section("cleanup_root() {", 'if [[ "$1" == --cleanup ]]; then\n  stock_root=');
const passNames = [
  "locked-acl",
  "b2b-commit-inquiry-rejected",
  "inquiry-commit-b2b-rejected",
  "b2b-rollback-inquiry-permitted",
  "inquiry-rollback-b2b-permitted",
  "outer-visibility-rollback",
  "late-event-fk-rollback",
  "complete",
];
const terminal =
  "Native mixed stock PostgreSQL17 rehearsal complete: synthetic owner sessions only.";
const server = "NativeMixedStockPG17 server_version_num=170011; private cluster identity verified.";
const transcript =
  [server, ...passNames.map((name) => `PASS nativePG17 mixed-stock: ${name}.`), terminal].join(
    "\n",
  ) + "\n";
// Encode inside the fixed Bash script, not newline-bearing native argv. This
// avoids Windows/Git Bash argument splitting and never evaluates fixture text.
const literal = (value) =>
  "$'" +
  [...Buffer.from(value)].map((byte) => "\\x" + byte.toString(16).padStart(2, "0")).join("") +
  "'";
function pure(script) {
  assert.ok(bash, "Explicit Git Bash/Linux Bash is required for offline guards");
  const result = spawnSync(bash, ["-c", "set -u; export LC_ALL=C;\n" + script], {
    env: environment,
    encoding: "utf8",
    timeout: 5000,
    maxBuffer: 16384,
    windowsHide: true,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  return result;
}
function checkTranscript(value, status = 0) {
  return pure(`${report}\nreport_phase_output ${literal(value)} ${status};`);
}

test("exact CLI/CI/Linux/non-root admission precedes native tools and filesystem setup", () => {
  assert.match(source, /\[\[ \$# == 1 && \( "\$1" == --run \|\| "\$1" == --cleanup \) \]\]/);
  assert.match(source, /GITHUB_ACTIONS:-.*== true.*uname -s.*== Linux/);
  assert.ok(at("GitHub Actions Linux only") < at("stock_temp=$(realpath"));
  assert.match(source, /stock_uid.*!= 0.*non-root runner required/);
  assert.doesNotMatch(
    source,
    /^\s*(?:eval\b|source\s|\.\s)|\bdocker\b|\bapt(?:-get)?\b|systemctl|https?:\/\//im,
  );
});

test("every PG variable and database route is refused even empty; cleanup scrubs without admitting previous state", () => {
  assert.match(
    source,
    /for stock_key in \$\{!PG@\}; do fail 'inherited libpq environment is not permitted'; done/,
  );
  assert.match(source, /! \$\{DATABASE_URL\+x\} && ! \$\{SUPABASE_DB_URL\+x\}/);
  assert.match(source, /! \$\{STOCK_NATIVE_ROOT\+x\}/);
  assert.match(source, /for stock_key in \$\{!PG@\}; do unset "\$stock_key"; done/);
  assert.ok(at("unset DATABASE_URL SUPABASE_DB_URL") < at("mktemp -d"));
  assert.doesNotMatch(
    source,
    /QUOTE_NATIVE_ROOT|EXPENSE_NATIVE_ROOT|RECOVERY_NATIVE_ROOT|5543[23456]/,
  );
});

test("PG17 and timeout tools are fixed root-owned nonwritable files and cluster remains socket-only55437", () => {
  assert.match(source, /stock_bin=\/usr\/lib\/postgresql\/17\/bin/);
  assert.match(source, /stock_timeout=\/usr\/bin\/timeout/);
  assert.match(source, /for stock_program in postgres initdb pg_ctl pg_isready psql; do/);
  assert.match(source, /stat -c %u -- "\$stock_executable".*== 0/);
  assert.match(source, /8#\$stock_mode & 022/);
  assert.match(source, /8#\$stock_timeout_mode & 022/);
  assert.match(source, /stock_version.*--version.*head -c 512/);
  assert.match(source, /--username=postgres --encoding=UTF8 --locale=C.UTF-8/);
  assert.match(source, /--auth-local=trust --auth-host=reject --set=listen_addresses=/);
  assert.match(source, /unix_socket_permissions=0700 --set=port=55437/);
  assert.doesNotMatch(
    source,
    /--auth-host=trust|-h (?:localhost|127\.0\.0\.1)|listen_addresses=\*/,
  );
});

test("canonical unique direct-child directories, controls and scans refuse escapes and scan failures", () => {
  assert.match(source, /mktemp -d "\$stock_temp\/stock-native\.XXXXXX"/);
  assert.match(
    source,
    /dirname -- "\$root".*== "\$stock_temp".*stock-native\\\.\[A-Za-z0-9\]\{6\}/,
  );
  assert.match(source, /stat -c %u.*stock_uid.*stat -c %a.*700/);
  assert.match(source, /for child in data socket; do/);
  assert.match(
    source,
    /unsafe=\$\(find "\$root" -xdev.*-type l.*! -uid.*-links \+1.*\|\| return 1/,
  );
  assert.match(source, /private_file "\$1" && \[\[ "\$\(stat -c %s -- "\$1"\)" == 0 \]\]/);
  assert.match(source, /stat -c %a -- "\$1".*600.*stat -c %h -- "\$1".*1/);
  assert.match(source, /for stock_control in pgpass pgservice; do/);
  assert.match(source, /set -o noclobber; : > "\$stock_root\/\$stock_control"/);
  assert.match(
    source,
    /PGPASSFILE="\$stock_root\/pgpass" PGSERVICEFILE="\$stock_root\/pgservice" PGSYSCONFDIR="\$stock_root"/,
  );
  assert.doesNotMatch(source, /PGPASSFILE=.?\/dev\/null|PGSERVICEFILE=.?\/dev\/null|\bHOME=/);
});

test("startup identity receipt is exclusive and cannot authorize a signal or no-PID-file deletion alone", () => {
  assert.ok(at("startup marker validation failed") < at('quiet_native 35s "$stock_bin/pg_ctl"'));
  assert.ok(at('quiet_native 35s "$stock_bin/pg_ctl"') < at("record_postmaster_identity || fail"));
  assert.match(
    source,
    /set -o noclobber; printf '%s\\n' "\$stock_verified_pid" > "\$stock_root\/postmaster-owned\.pid"/,
  );
  assert.match(
    section("read_owned_pid() {", "validate_postmaster() {"),
    /bytes -ge 2 && \$bytes -le 11/,
  );
  const validate = section("validate_postmaster() {", "record_postmaster_identity() {");
  assert.match(validate, /private_file "\$pid_file"/);
  assert.match(
    validate,
    /lines\[1\].*stock_root\/data.*lines\[3\].*55437.*lines\[4\].*stock_root\/socket/,
  );
  assert.match(validate, /stat -c %u -- "\/proc\/\$stock_verified_pid".*stock_uid/);
  assert.match(
    validate,
    /"\$exe" == "\$stock_bin\/postgres" && "\$args" == "\$stock_bin\/postgres"\$'\\n-D\\n'"\$stock_root\/data"/,
  );
  const stop = section("stop_cluster() {", "stock_phase_pid=");
  assert.ok(stop.indexOf("validate_postmaster || return 1") < stop.indexOf("-m fast"));
  assert.ok(stop.lastIndexOf("validate_postmaster || return 1") < stop.indexOf("-m immediate"));
  assert.match(
    stop,
    /elif \[\[ -n "\$stock_owned_pid" \]\]; then[\s\S]*wait_verified_pid_absent "\$stock_owned_pid"/,
  );
  assert.match(
    section("postmaster_absent() {", "stop_cluster() {"),
    /elif .*startup-attempted[\s\S]*return 1/,
  );
});

test("absence means actual PID directory disappearance plus PID/socket/lock/listener checks, never zombies", () => {
  const predicate = section("postmaster_pid_absent() {", "postmaster_pid_wait_cadence() {");
  assert.match(predicate, /\[\[ ! -d "\/proc\/\$verified_pid" \]\]/);
  assert.doesNotMatch(predicate, /\/stat|readlink|kill|state|zombie/i);
  const absent = section("postmaster_absent() {", "stop_cluster() {");
  assert.match(absent, /! -e.*postmaster\.pid.*! -L.*postmaster\.pid/);
  assert.match(absent, /\.s\.PGSQL\.55437.*\.s\.PGSQL\.55437\.lock/);
  assert.match(absent, /postmaster_pid_absent "\$stock_owned_pid" \|\| return 1/);
  assert.match(absent, /scanned -le 8192/);
  assert.match(absent, /ready_status == 2/);
  assert.ok(cleanup.indexOf("postmaster_absent") < cleanup.indexOf("rm -rf"));
});

test("phase TERM/KILL require full fresh owned timeout argv/UID/group; stale markers never grant authority", () => {
  const validate = section("validate_phase_identity() {", "stop_phase() {");
  assert.match(validate, /-n "\$stock_phase_command"/);
  assert.match(validate, /stat -c %u.*stock_uid.*readlink -f.*stock_timeout/);
  assert.match(validate, /"\$args" == "\$stock_phase_command" && "\$group" == "\$stock_phase_pid"/);
  const stop = section("stop_phase() {", "cleanup_root() {");
  assert.equal((stop.match(/validate_phase_identity \|\| return 1/g) ?? []).length, 2);
  assert.ok(stop.indexOf("validate_phase_identity") < stop.indexOf("kill -TERM"));
  assert.ok(stop.lastIndexOf("validate_phase_identity") < stop.indexOf("kill -KILL"));
  assert.match(stop, /group_absent "\$stock_phase_pid"/);
  assert.match(source, /fields=\$\{line##\*\) \}/);
  assert.doesNotMatch(source, /\bpkill\b|\bkillall\b/);
});

test("EXIT traps precede startup; cleanup is idempotent, preserves uncertain targets and only removes validated root", () => {
  assert.ok(at("trap 'stock_status=$?") < at("export STOCK_NATIVE_ROOT="));
  assert.ok(at("trap 'stock_status=$?") < at('quiet_native 30s "$stock_bin/initdb"'));
  assert.match(source, /trap 'exit 130' INT/);
  assert.match(source, /trap 'exit 143' TERM/);
  assert.match(source, /--cleanup && -z "\$\{STOCK_NATIVE_ROOT:-\}".*exit 0/);
  assert.match(source, /--cleanup && ! -e "\$STOCK_NATIVE_ROOT" && ! -L.*exit 0/);
  assert.match(cleanup, /failed != 0.*preserved unverifiable targets.*return 1/);
  assert.ok(cleanup.indexOf("clear_phase_marker") < cleanup.indexOf("rm -rf"));
  assert.equal((source.match(/rm -rf --one-file-system -- "\$stock_root"/g) ?? []).length, 1);
  assert.doesNotMatch(source, /rm -rf.*\$stock_temp|rm -rf.*RUNNER_TEMP|rm -rf.*workspace/);
  assert.match(source, /GITHUB_ENV.*-f.*! -L.*-w/);
  assert.match(source, /realpath -e -- "\$GITHUB_ENV".*stock_uid.*stat -c %h.*1/);
});

test("one scrubbed180s Node phase captures merged stderr under hard byte bound before any publication", () => {
  const phase = section("run_phase() {", "run_phase || {");
  assert.match(phase, /--signal=TERM --kill-after=5s 180s \/usr\/bin\/env -i/);
  assert.match(
    phase,
    /GITHUB_ACTIONS=true "RUNNER_TEMP=\$stock_temp" "STOCK_NATIVE_ROOT=\$stock_root"/,
  );
  assert.match(phase, /"\$stock_node" scripts\/ci\/native-mixed-stock-postgres\.mjs --run/);
  assert.doesNotMatch(phase, /\bPG[A-Z_]*=|DATABASE_URL=|SUPABASE_DB_URL=|--foreground/);
  assert.match(phase, /coproc STOCK_PHASE \{ exec "\$\{args\[@\]\}" 2>&1/);
  assert.match(phase, /head -c 65537/);
  assert.match(phase, /bytes -ge 1 && \$bytes -le 65536/);
  assert.match(phase, /\$\{#captured\} == \$\(\(bytes \+ 1\)\)/);
  assert.ok(phase.indexOf('wait "$stock_phase_pid"') < phase.indexOf("report_phase_output"));
  assert.ok(phase.indexOf("clear_phase_marker") < phase.indexOf("report_phase_output"));
});

test("exact ordered shell marker vector agrees with inert native helper constants", () => {
  const actualNames = [...report.matchAll(/^    '([^']+)'$/gm)].map((match) => match[1]);
  assert.deepEqual(actualNames, passNames);
  assert.deepEqual(REQUIRED_STOCK_MARKERS, [
    ...passNames.map((name) => `PASS nativePG17 mixed-stock: ${name}.`),
    terminal,
  ]);
  assert.ok(new RegExp(STOCK_SERVER_PATTERN).test(server));
  assert.ok(
    new RegExp(STOCK_FAILURE_PATTERN).test(
      "FAIL nativePG17 mixed-stock: stage=b2b-commit, sqlState=22023; no live acceptance.",
    ),
  );
  assert.ok(report.includes(terminal));
});

test("owned shell passes bash -n only; no full script run or native process is started", () => {
  assert.ok(bash, "Explicit Git Bash/Linux Bash required");
  const result = spawnSync(bash, ["-n", scriptArgument], {
    env: environment,
    encoding: "utf8",
    timeout: 5000,
    maxBuffer: 8192,
    windowsHide: true,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});

test("actual pure Bash parser admits only complete ordered vector with preserved final newline", () => {
  const result = checkTranscript(transcript + ".");
  assert.equal(result.status, 0);
  assert.equal(result.stdout, transcript);
  assert.equal(result.stderr, "");
});

test("actual parser refuses missing/reordered/duplicate/extra/diagnostic/truncated/wrong-version vectors and failed success", () => {
  const rows = transcript.trimEnd().split("\n");
  const swapped = [...rows];
  [swapped[1], swapped[2]] = [swapped[2], swapped[1]];
  const variants = [
    rows.filter((_row, index) => index !== 3).join("\n") + "\n.",
    swapped.join("\n") + "\n.",
    [rows[0], rows[1], ...rows.slice(1)].join("\n") + "\n.",
    transcript + "UNEXPECTED STDERR DIAGNOSTIC\n.",
    "UNEXPECTED STDERR DIAGNOSTIC\n" + transcript + ".",
    transcript.slice(0, -1) + ".",
    transcript.replace("170011", "160011") + ".",
    transcript.replace("private cluster identity verified", "existing cluster accepted") + ".",
    transcript + "\n.",
    transcript + ".extra",
  ];
  for (const value of variants) {
    const result = checkTranscript(value);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
  }
  for (const status of [1, 124, 130, 143]) {
    const result = checkTranscript(transcript + ".", status);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
  }
  const tooLarge = pure(
    `${report}\nprintf -v captured '%65538s' ''; report_phase_output "$captured" 0;`,
  );
  assert.notEqual(tooLarge.status, 0);
  assert.equal(tooLarge.stdout, "");
});

test("actual parser admits one sanitized allowlisted failure but never treats it as success or allows trailing output", () => {
  const failures = [
    "FAIL nativePG17 mixed-stock: stage=admission, sqlState=unavailable; no live acceptance.\n",
    server +
      "\nFAIL nativePG17 mixed-stock: stage=late-event-fk, sqlState=23503; no live acceptance.\n",
  ];
  for (const failure of failures) {
    const result = checkTranscript(failure + ".", 1);
    assert.equal(result.status, 0); // Grammar accepted; run_phase still returns phase exit1.
    assert.equal(result.stdout, failure);
    assert.notEqual(checkTranscript(failure + ".", 0).status, 0);
    assert.notEqual(checkTranscript(failure + "extra\n.", 1).status, 0);
  }
  for (const failure of [
    failures[0].replace("admission", "unknown-stage"),
    failures[0].replace("unavailable", "PRIVATE-DIAGNOSTIC"),
    failures[0].replace("no live acceptance.", "production accepted."),
  ])
    assert.notEqual(checkTranscript(failure + ".", 1).status, 0);
});

test("actual bounded poll uses fake predicates: immediate/delayed/persistent/malformed/cadence failure without signals or sleeps", () => {
  for (const [pid, threshold, cadenceFailure, expected] of [
    ["123", 0, false, "0:1:0"],
    ["123", 2, false, "0:3:2"],
    ["123", 999, false, "1:21:20"],
    ["0", 0, false, "1:0:0"],
    ["1\n2", 0, false, "1:0:0"],
    ["123", 999, true, "1:1:1"],
  ]) {
    const result = pure(`${poll}
      checks=0; cadences=0;
      postmaster_pid_absent() { checks=$((checks+1)); [[ $checks -gt ${threshold} ]]; }
      postmaster_pid_wait_cadence() { cadences=$((cadences+1)); ${cadenceFailure ? "return 1" : ":"}; }
      if wait_verified_pid_absent ${literal(pid)}; then status=0; else status=1; fi;
      printf '%s:%s:%s' "$status" "$checks" "$cadences";`);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, expected);
    assert.equal(result.stderr, "");
  }
});

test("actual cleanup and EXIT trap with fake controls preserve unsafe targets and original failure status", () => {
  for (const stage of ["validation", "phase", "cluster", "absence"]) {
    const result = pure(`${cleanup}
      stock_root='SYNTHETIC-NEVER-CREATED'; removed=0;
      validate_root() { ${stage === "validation" ? "return 1" : ":"}; }
      read_phase_marker() { :; }
      stop_phase() { ${stage === "phase" ? "return 1" : ":"}; }
      stop_cluster() { ${stage === "cluster" ? "return 1" : ":"}; }
      postmaster_absent() { ${stage === "absence" ? "return 1" : ":"}; }
      clear_phase_marker() { :; }
      rm() { removed=$((removed+1)); }
      if cleanup_root >/dev/null 2>&1; then status=0; else status=1; fi;
      printf '%s:%s' "$status" "$removed";`);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "1:0");
    assert.equal(result.stderr, "");
  }
  const trap = source.split("\n").find((line) => line.startsWith("trap 'stock_status=$?"));
  assert.ok(trap);
  for (const status of [0, 37, 130, 143]) {
    const result = pure(`cleanup_root() { return 1; }\n${trap}\nexit ${status};`);
    assert.equal(result.status, status === 0 ? 1 : status);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
  }
});

test("mandatory CI keeps stock offline gate unique and fresh native run after expense cleanup with always-cleanup", () => {
  const workflow = load(
    fs.readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8"),
  );
  const unit = workflow.jobs.test.steps.filter(
    (step) => step.name === "Native mixed-stock runner safety (offline, never quarantined)",
  );
  assert.equal(unit.length, 1);
  assert.equal(
    unit[0].run,
    "node --test --test-concurrency=1 scripts/ci/native-mixed-stock-postgres.test.mjs scripts/ci/run-native-mixed-stock-postgres.test.mjs",
  );
  assert.equal(unit[0].if, undefined);
  assert.equal(unit[0]["continue-on-error"], undefined);
  const steps = workflow.jobs["parts-rls"].steps;
  const runs = steps.filter(
    (step) => step.name === "Mixed inquiry and B2B independent sessions (native PostgreSQL 17)",
  );
  const cleanups = steps.filter(
    (step) => step.name === "Clean private mixed-stock PostgreSQL cluster (always)",
  );
  assert.equal(runs.length, 1);
  assert.equal(cleanups.length, 1);
  assert.equal(runs[0].run, "bash scripts/ci/run-native-mixed-stock-postgres.sh --run");
  assert.equal(runs[0].if, undefined);
  assert.equal(runs[0]["timeout-minutes"], 5);
  assert.equal(runs[0]["continue-on-error"], undefined);
  assert.equal(cleanups[0].run, "bash scripts/ci/run-native-mixed-stock-postgres.sh --cleanup");
  assert.equal(cleanups[0].if, "always()");
  assert.equal(cleanups[0]["timeout-minutes"], 2);
  assert.equal(cleanups[0]["continue-on-error"], undefined);
  assert.ok(
    steps.indexOf(runs[0]) >
      steps.findIndex((step) => step.name === "Clean private expense PostgreSQL cluster (always)"),
  );
  assert.ok(steps.indexOf(cleanups[0]) > steps.indexOf(runs[0]));
});
