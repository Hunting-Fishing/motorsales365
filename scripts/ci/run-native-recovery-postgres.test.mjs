// Offline source/syntax/refusal guards only. Never initialize or start PostgreSQL.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const scriptUrl = new URL("./run-native-recovery-postgres.sh", import.meta.url);
const scriptPath = fileURLToPath(scriptUrl);
const scriptArgument = process.platform === "win32" ? scriptPath.replaceAll("\\", "/") : scriptPath;
const source = fs.readFileSync(scriptUrl, "utf8").replace(/\r\n/g, "\n");
const bash =
  process.platform === "win32"
    ? ["C:/Program Files/Git/bin/bash.exe", "C:/Program Files/Git/usr/bin/bash.exe"].find((path) =>
        fs.existsSync(path),
      )
    : ["/bin/bash", "/usr/bin/bash"].find((path) => fs.existsSync(path));
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

test("only run/cleanup are admitted and CI/Linux refusal precedes binary or filesystem setup", () => {
  assert.match(source, /\[\[ \$# == 1 && \( "\$1" == --run \|\| "\$1" == --cleanup \) \]\]/);
  assert.match(source, /GITHUB_ACTIONS:-.*== true.*uname -s.*== Linux/);
  assert.ok(at("GitHub Actions Linux only") < at("recovery_temp=$(realpath"));
  assert.ok(at("GitHub Actions Linux only") < at("recovery_bin=/usr/lib/postgresql/17/bin"));
  assert.match(source, /recovery_uid.*!= 0.*non-root runner required/);
  assert.doesNotMatch(
    source,
    /^\s*(?:eval\b|source\s|\.\s)|\bdocker\b|\bapt(?:-get)?\b|systemctl|npm install|https?:\/\//im,
  );
});

test("every inherited PG variable and database route is rejected before creation, then scrubbed", () => {
  assert.match(
    source,
    /for recovery_key in \$\{!PG@\}; do fail 'inherited libpq environment is not permitted'; done/,
  );
  assert.match(source, /! \$\{DATABASE_URL\+x\} && ! \$\{SUPABASE_DB_URL\+x\}/);
  assert.match(source, /! \$\{RECOVERY_NATIVE_ROOT\+x\} && ! \$\{RECOVERY_MANIFEST_SHA256\+x\}/);
  assert.match(source, /for recovery_key in \$\{!PG@\}; do unset "\$recovery_key"; done/);
  assert.match(source, /unset DATABASE_URL SUPABASE_DB_URL RECOVERY_MANIFEST_SHA256/);
  assert.ok(at("inherited libpq environment") < at("mktemp -d"));
  assert.ok(at("unset DATABASE_URL") < at("mktemp -d"));
});

test("fixed native17 programs are real root-owned non-writable executables, never aliases or downloads", () => {
  assert.match(source, /recovery_bin=\/usr\/lib\/postgresql\/17\/bin/);
  assert.match(
    source,
    /for recovery_program in postgres initdb pg_ctl pg_isready psql pg_dump pg_dumpall pg_restore pg_controldata; do/,
  );
  assert.match(
    source,
    /! -L "\$recovery_executable".*realpath -e -- "\$recovery_executable".*== "\$recovery_executable"/,
  );
  assert.match(source, /stat -c %u -- "\$recovery_executable".*== 0/);
  assert.match(source, /8#\$recovery_mode & 022/);
  assert.match(source, /recovery_version.*--version.*head -c 512/);
  assert.match(source, /PostgreSQL.*17\\\./);
});

test("the disposable root is one unique canonical private direct child and all cluster directories are700", () => {
  assert.match(source, /mktemp -d "\$recovery_temp\/recovery-native\.XXXXXX"/);
  assert.match(source, /dirname -- "\$root".*== "\$recovery_temp"/);
  assert.match(source, /\^recovery-native\\\.\[A-Za-z0-9\]\{6\}\$/);
  assert.match(source, /stat -c %u.*== "\$recovery_uid".*stat -c %a.*== 700/);
  assert.match(source, /for cluster in source restored; do/);
  assert.match(source, /for child in data socket; do/);
  assert.match(source, /find "\$root" -xdev.*-type l.*! -uid.*-links \+1/);
  assert.match(source, /umask 077/);
  assert.match(
    source,
    /mkdir -m 700 -- "\$recovery_root\/\$recovery_cluster" "\$recovery_root\/\$recovery_cluster\/socket"/,
  );
});

test("cleanup trap is installed immediately after validation, before export/env write or startup", () => {
  const validation = at(
    "validate_root \"$recovery_root\" || fail 'new recovery target is not isolated'",
  );
  const exitTrap = at("trap 'recovery_status=$?");
  assert.ok(validation < exitTrap);
  assert.equal(
    source.slice(validation, exitTrap).trim(),
    "validate_root \"$recovery_root\" || fail 'new recovery target is not isolated'",
  );
  assert.ok(exitTrap < at("export RECOVERY_NATIVE_ROOT="));
  assert.ok(exitTrap < at("printf 'RECOVERY_NATIVE_ROOT="));
  assert.ok(exitTrap < at("quiet_native 30s"));
  assert.match(source, /trap 'exit 130' INT/);
  assert.match(source, /trap 'exit 143' TERM/);
  assert.match(source, /GITHUB_ENV.*-f.*! -L.*-w/);
  assert.match(
    source,
    /realpath -e -- "\$GITHUB_ENV".*== "\$GITHUB_ENV".*stat -c %u.*== "\$recovery_uid"/,
  );
});

test("source and restored use distinct private sockets, ports and bootstrap users with noTCP", () => {
  assert.match(source, /recovery_port=55434; recovery_bootstrap=postgres/);
  assert.match(source, /restored.*recovery_port=55435; recovery_bootstrap=recovery_bootstrap/);
  assert.match(source, /--username="\$recovery_bootstrap"/);
  assert.match(source, /--auth-local=trust --auth-host=reject --set=listen_addresses=/);
  assert.match(source, /unix_socket_directories=\$recovery_root\/\$recovery_cluster\/socket/);
  assert.match(source, /unix_socket_permissions=0700/);
  assert.match(
    source,
    /pg_isready" -h "\$recovery_root\/\$recovery_cluster\/socket" -p "\$recovery_port" -U "\$recovery_bootstrap" -d postgres/,
  );
  assert.doesNotMatch(
    source,
    /-h (?:localhost|127\.0\.0\.1)|listen_addresses=\*|--auth-host=trust/,
  );
});

test("postmaster identity includes PID uid executable exactargv data-dir port and socket before stop", () => {
  assert.match(source, /mapfile -t -n 8 lines < "\$pid_file"/);
  assert.match(
    source,
    /lines\[1\].*== "\$cluster\/data".*lines\[3\].*== "\$port".*lines\[4\].*== "\$cluster\/socket"/,
  );
  assert.match(source, /stat -c %u -- "\/proc\/\$recovery_verified_pid".*== "\$recovery_uid"/);
  assert.match(source, /readlink -f -- "\/proc\/\$recovery_verified_pid\/exe"/);
  assert.match(source, /\/proc\/\$recovery_verified_pid\/cmdline/);
  assert.match(
    source,
    /"\$exe" == "\$recovery_bin\/postgres" && "\$args" == "\$recovery_bin\/postgres"\$'\\n-D\\n'"\$cluster\/data"/,
  );
  const stop = source.slice(at("stop_cluster() {"), at("recovery_phase_pid="));
  assert.ok(stop.indexOf('validate_postmaster "$cluster" "$port"') < stop.indexOf("-m fast"));
  assert.ok(
    stop.lastIndexOf('validate_postmaster "$cluster" "$port"') < stop.indexOf("-m immediate"),
  );
  assert.match(stop, /recovery_verified_pid.*== "\$verified_pid"/);
});

test("both verified clusters are stopped before a uniquely scoped delete, uncertainty preserves root", () => {
  const cleanup = source.slice(
    at("cleanup_root() {"),
    at('if [[ "$1" == --cleanup ]]; then\n  recovery_root='),
  );
  assert.match(cleanup, /stop_phase \|\| failed=1/);
  assert.match(cleanup, /stop_cluster "\$recovery_root\/source" 55434 \|\| failed=1/);
  assert.match(cleanup, /stop_cluster "\$recovery_root\/restored" 55435 \|\| failed=1/);
  assert.match(cleanup, /failed != 0.*preserved unverifiable targets.*return 1/);
  assert.ok(cleanup.indexOf("validate_root") < cleanup.indexOf("stop_cluster"));
  assert.ok(cleanup.lastIndexOf("validate_root") < cleanup.indexOf("rm -rf"));
  assert.ok(
    cleanup.indexOf('postmaster_absent "$recovery_root/restored"') < cleanup.indexOf("rm -rf"),
  );
  assert.equal((source.match(/\brm\s+-rf\s+--\s+"\$recovery_root"/g) ?? []).length, 1);
  assert.doesNotMatch(source, /pkill|killall|rm -rf.*\$recovery_temp|rm -rf.*RUNNER_TEMP/);
  assert.match(source, /-m fast -w -t 15 stop/);
  assert.match(source, /-m immediate -w -t 10 stop/);
});

test("source-offline proof checks PID socket listener and matching process absence, not just a deletedpid", () => {
  const absent = source.slice(at("postmaster_absent() {"), at("stop_cluster() {"));
  assert.match(absent, /! -e "\$cluster\/data\/postmaster.pid".*! -L/);
  assert.match(absent, /\.s\.PGSQL\.\$port.*\.s\.PGSQL\.\$port\.lock/);
  assert.match(absent, /for candidate in \/proc\/\[0-9\]\*/);
  assert.match(absent, /scanned -le 8192/);
  assert.match(absent, /"\$args" != "\$recovery_bin\/postgres"\$'\\n-D\\n'"\$cluster\/data"/);
  assert.match(absent, /pg_isready.*-h "\$cluster\/socket".*-p "\$port"/);
  assert.match(absent, /ready_status == 2/);
  const prepare = source.lastIndexOf("run_phase --prepare");
  const stop = source.lastIndexOf('stop_cluster "$recovery_root/source" 55434');
  const offline = source.lastIndexOf('postmaster_absent "$recovery_root/source" 55434');
  const restore = source.lastIndexOf('run_phase --restore "$recovery_manifest_sha"');
  assert.ok(prepare < stop && stop < offline && offline < restore);
});

test("bounded PID wait is the only shutdown change and retains actual directory absence plus all final checks", () => {
  const start = at("postmaster_pid_absent() {");
  const end = at("stop_cluster() {");
  const helpers = source.slice(start, end);
  assert.match(helpers, /\[\[ ! -d "\/proc\/\$verified_pid" \]\]/);
  assert.match(helpers, /for attempt in \{1\.\.20\}; do/);
  assert.match(helpers, /sleep 0\.1/);
  assert.match(helpers, /postmaster_pid_wait_cadence \|\| return 1/);
  const helperCode = helpers
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
  assert.doesNotMatch(helperCode, /\bkill\b|killall|pkill|pg_ctl|readlink|\/stat|\brm\b/);
  const stop = source.slice(end, at("recovery_phase_pid="));
  assert.ok(stop.indexOf('validate_postmaster "$cluster" "$port"') < stop.indexOf("-m fast"));
  assert.ok(
    stop.indexOf("-m immediate") < stop.indexOf('wait_verified_pid_absent "$verified_pid"'),
  );
  assert.ok(
    stop.indexOf('wait_verified_pid_absent "$verified_pid"') <
      stop.indexOf('postmaster_absent "$cluster" "$port"'),
  );
  const withoutHelpers = source.slice(0, start) + source.slice(end);
  const original = withoutHelpers.replace(
    '    wait_verified_pid_absent "$verified_pid" || return 1\n',
    '    [[ ! -d "/proc/$verified_pid" ]] || return 1\n',
  );
  assert.notEqual(original, withoutHelpers, "the single replacement is actually present");
  assert.equal(
    createHash("sha256").update(original).digest("hex"),
    "57a5e3f8c20080990d2d836aee108c2924d8135e400cc8855a39e4415b0a1d24",
    "all original identity/stop escalation/socket/listener/cleanup/timeouts remain byte-identical",
  );
});

function runPidAbsencePoll({
  pid = "12345",
  presentChecks = 0,
  cadenceFailure = 0,
  missingArgument = false,
} = {}) {
  // Definitions only. Replace both OS-touching callbacks before invoking the
  // actual poll: no /proc reads, sleep, PostgreSQL, files, network or wrapper.
  const definitions = source.slice(at("postmaster_pid_absent() {"), at("stop_cluster() {"));
  // Fixed hex DATA preserves malformed newlines through Windows native argv;
  // only numeric callback controls are passed as shell arguments.
  const pidLiteral = `$'${[...Buffer.from(pid, "utf8")]
    .map((byte) => `\\x${byte.toString(16).padStart(2, "0")}`)
    .join("")}'`;
  const invocation = missingArgument
    ? "wait_verified_pid_absent"
    : 'wait_verified_pid_absent "$expected_pid"';
  return spawnSync(
    bash,
    [
      "--noprofile",
      "--norc",
      "-c",
      `${definitions}
predicate_calls=0
cadence_calls=0
present_checks=$1
cadence_failure=$2
postmaster_pid_absent() {
  predicate_calls=$((predicate_calls + 1))
  [[ "$1" == "$expected_pid" ]] || return 1
  [[ $predicate_calls -gt $present_checks ]]
}
postmaster_pid_wait_cadence() {
  cadence_calls=$((cadence_calls + 1))
  [[ $cadence_calls != $cadence_failure ]]
}
expected_pid=${pidLiteral}
status=0
${invocation} || status=$?
printf '%s:%s:%s\\n' "$status" "$predicate_calls" "$cadence_calls"
`,
      "isolated-pid-poll",
      String(presentChecks),
      String(cadenceFailure),
    ],
    {
      env: refusalEnvironment,
      encoding: "utf8",
      timeout: 5000,
      maxBuffer: 8192,
    },
  );
}
function assertPoll(result, expected) {
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, `${expected}\n`);
}

test(
  "actual isolated Bash poll returns immediately for an already absent PID without cadence",
  { skip: !bash },
  () => {
    assertPoll(runPidAbsencePoll(), "0:1:0");
  },
);
test(
  "actual isolated Bash poll waits only until its real predicate is satisfied within the bound",
  { skip: !bash },
  () => {
    assertPoll(runPidAbsencePoll({ presentChecks: 3 }), "0:4:3");
    assertPoll(runPidAbsencePoll({ presentChecks: 20 }), "0:21:20");
  },
);
test(
  "actual isolated Bash poll refuses persistent PID presence at exactly twenty cadences",
  { skip: !bash },
  () => {
    assertPoll(runPidAbsencePoll({ presentChecks: 21 }), "1:21:20");
    assertPoll(runPidAbsencePoll({ presentChecks: 1000 }), "1:21:20");
  },
);
test(
  "actual isolated Bash poll refuses malformed or absent PID input before predicate or cadence",
  { skip: !bash },
  () => {
    for (const pid of ["", "0", "01", "-1", "+1", "1.0", "12345678901", "1\n2", "../12345", "NaN"])
      assertPoll(runPidAbsencePoll({ pid }), "1:0:0");
    assertPoll(runPidAbsencePoll({ missingArgument: true }), "1:0:0");
  },
);
test(
  "actual isolated Bash poll refuses failed cadence immediately without a later predicate",
  { skip: !bash },
  () => {
    assertPoll(runPidAbsencePoll({ presentChecks: 100, cadenceFailure: 1 }), "1:1:1");
    assertPoll(runPidAbsencePoll({ presentChecks: 100, cadenceFailure: 4 }), "1:4:4");
  },
);

test("manifest pin stays in shell-local state between prepare and source stop/restore, never a mutable sidecar", () => {
  assert.match(source, /captured=\$\(head -c 66.*printf '\.'/);
  assert.match(source, /captured\} == 66.*captured:64.*\\n\..*\[a-f0-9\]\{64\}/);
  assert.match(source, /recovery_manifest_sha=\$\{captured:0:64\}/);
  assert.match(source, /if \[\[ "\$phase" == --restore \]\]; then args\+=\("\$pin"\)/);
  assert.match(source, /run_phase --restore "\$recovery_manifest_sha"/);
  assert.doesNotMatch(
    source,
    /export recovery_manifest_sha|printf.*recovery_manifest_sha|recovery_manifest_sha.*GITHUB_ENV|\.sha256|sha256sum.*>/,
  );
});

test("phases have scrubbed env and bounded own timeout groups, stdout and stderr", () => {
  assert.match(source, /--signal=TERM --kill-after=5s 120s \/usr\/bin\/env -i/);
  assert.doesNotMatch(source, /--foreground/);
  assert.match(
    source,
    /GITHUB_ACTIONS=true "RUNNER_TEMP=\$recovery_temp" "RECOVERY_NATIVE_ROOT=\$recovery_root"/,
  );
  assert.match(source, /coproc RECOVERY_PHASE \{ exec "\$\{args\[@\]\}" 2>\/dev\/null/);
  assert.match(source, /recovery_phase_pid=\$RECOVERY_PHASE_PID/);
  assert.match(
    source,
    /"\$args" == "\$recovery_phase_command" && "\$group" == "\$recovery_phase_pid"/,
  );
  assert.match(source, /kill -TERM -- "-\$recovery_phase_pid"/);
  assert.match(source, /kill -KILL -- "-\$recovery_phase_pid"/);
  assert.match(source, /wait "\$recovery_phase_pid"/);
  assert.match(source, /head -c 65536/);
  assert.match(source, /pg_ctl".*-l \/dev\/null/);
  assert.match(source, /"\$@" >\/dev\/null 2>&1/);
});

test("private phase PID marker preserves residual-group uncertainty and never grants stale PID kill authority", () => {
  assert.match(source, /marker="\$recovery_root\/phase-group\.pid"/);
  assert.match(source, /! -L "\$marker".*stat -c %u.*recovery_uid.*stat -c %a.*600.*stat -c %h.*1/);
  assert.match(source, /bytes -ge 2 && \$bytes -le 11/);
  assert.match(source, /recorded.*\^\[1-9\]\[0-9\]\{0,9\}\$/);
  assert.match(source, /\[\[ -n "\$recovery_phase_command" \]\] \|\| return 1/);
  assert.match(
    source,
    /set -o noclobber; printf '%s\\n' "\$recovery_phase_pid" > "\$recovery_root\/phase-group\.pid"/,
  );
  assert.match(
    source,
    /wait "\$recovery_phase_pid" \|\| result=1[\s\S]*clear_phase_marker \|\| result=1/,
  );
  assert.match(source, /group_absent "\$recovery_phase_pid" \|\| return 1/);
  assert.match(source, /fields=\$\{line##\*\) \}/);
  assert.match(source, /"\$group" != "\$expected"/);
  assert.doesNotMatch(source, /phase-group.*(?:manifest_sha|GITHUB_ENV)/);
});

test("shell syntax parses without executing any statement", { skip: !bash }, () => {
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
  "real shell refuses run/cleanup outside CI before any binaries, secrets or services are touched",
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
        /Native recovery rehearsal refused: (?:GitHub Actions Linux only|expected --run or --cleanup)/,
      );
      assert.doesNotMatch(result.stderr, /PRIVATE|UNUSED|password|postgresql:\/\//i);
    }
  },
);

test("prepare diagnostics publish only a complete allowlisted marker after child/group cleanup, never a failed pin", () => {
  const phase = source.slice(at("run_phase() {"));
  assert.match(source, /report_failure_marker\(\) \{/);
  assert.match(
    source,
    /admission\|server-identity\|fixture\|source-access\|dump\|manifest\|offline-source\|roles-restore\|database-restore\|compare\|restored-access\|rollback/,
  );
  assert.match(
    source,
    /identity-read\|identity-json\|identity-version\|identity-data\|identity-socket\|identity-port\|identity-listen\|identity-database\|identity-user\|identity-session\|identity-recovery\|identity-encoding\|identity-system-id\|fresh-read\|fresh-json\|fresh-roles\|fresh-databases\|fresh-memberships\|cluster-distinct/,
  );
  assert.match(source, /\[0-9A-Z\]\{5\}\|unavailable/);
  assert.match(
    source,
    /printf 'Native recovery phase failed: stage=%s sqlState=%s\\n' "\$\{BASH_REMATCH\[1\]\}" "\$\{BASH_REMATCH\[2\]\}"/,
  );
  assert.match(
    phase,
    /recovery_manifest_sha=\s+if \[\[.*captured:0:64.*\[a-f0-9\]\{64\}.*\]\]; then\s+recovery_manifest_sha=\$\{captured:0:64\}\s+else\s+result=1/,
  );
  assert.ok(
    phase.indexOf('wait "$recovery_phase_pid"') <
      phase.indexOf('report_failure_marker "$captured"'),
  );
  assert.ok(
    phase.indexOf("clear_phase_marker || result=1") <
      phase.indexOf('report_failure_marker "$captured"'),
  );
  assert.match(phase, /"\$phase" == --prepare && \$result != 0/);
  assert.doesNotMatch(phase, /printf[^\n]*"\$captured"|echo[^\n]*"\$captured"/);
});

function runFailureMarker(marker) {
  // Execute ONLY the extracted pure parser/printf function, never the wrapper,
  // CI admission, any PostgreSQL program, cleanup or the recovery Node runner.
  const definition = source.slice(at("report_failure_marker() {"), at("run_phase() {"));
  return spawnSync(
    bash,
    [
      "--noprofile",
      "--norc",
      "-c",
      `${definition}\nIFS= read -r -d '' marker || true\nreport_failure_marker "$marker"`,
    ],
    {
      env: refusalEnvironment,
      input: marker,
      encoding: "utf8",
      timeout: 5000,
      maxBuffer: 8192,
    },
  );
}

test(
  "the actual isolated Bash marker function emits bounded stage/state only for every approved stage",
  { skip: !bash },
  () => {
    for (const stage of [
      "admission",
      "server-identity",
      "fixture",
      "source-access",
      "dump",
      "manifest",
      "offline-source",
      "roles-restore",
      "database-restore",
      "compare",
      "restored-access",
      "rollback",
      "identity-read",
      "identity-json",
      "identity-version",
      "identity-data",
      "identity-socket",
      "identity-port",
      "identity-listen",
      "identity-database",
      "identity-user",
      "identity-session",
      "identity-recovery",
      "identity-encoding",
      "identity-system-id",
      "fresh-read",
      "fresh-json",
      "fresh-roles",
      "fresh-databases",
      "fresh-memberships",
      "cluster-distinct",
    ]) {
      for (const state of ["42501", "unavailable"]) {
        const result = runFailureMarker(`FAIL:${stage}:${state}\n.`);
        assert.equal(result.error, undefined);
        assert.equal(result.status, 0);
        assert.equal(result.stdout, "");
        assert.equal(
          result.stderr,
          `Native recovery phase failed: stage=${stage} sqlState=${state}\n`,
        );
        assert.ok(result.stderr.length <= 100);
      }
    }
  },
);

test(
  "the actual marker function refuses raw data, extra output, wrong terminators, injected fields and success hashes",
  { skip: !bash },
  () => {
    for (const marker of [
      "",
      "PRIVATE SQL detail",
      "FAIL:PRIVATE-STAGE:42501\n.",
      "FAIL:identity-version-extra:42501\n.",
      "FAIL:fresh-role:42501\n.",
      "FAIL:cluster-distinct-extra:42501\n.",
      "FAIL:fixture:p0001\n.",
      "FAIL:fixture:4250\n.",
      "FAIL:fixture:425010\n.",
      "FAIL:fixture:Unavailable\n.",
      "FAIL:fixture:42501.",
      "FAIL:fixture:42501\n",
      "FAIL:fixture:42501\r\n.",
      "FAIL:fixture:42501\n\n.",
      "FAIL:fixture:42501\n..",
      "FAIL:fixture:42501\n.EXTRA",
      "FAIL:fixture:42501:PRIVATE\n.",
      "FAIL:fixture:42501\nPRIVATE\n.",
      "FAIL:$(echo PRIVATE):42501\n.",
      `${"a".repeat(64)}\n.`,
    ]) {
      const result = runFailureMarker(marker);
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
    }
  },
);
