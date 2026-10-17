// Offline source/refusal guards only. These tests must never start PostgreSQL.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import {
  BIN,
  PORT,
  validateContext,
  clientOptions,
  safeFailure,
  observeStreamErrors,
} from "./native-quote-postgres.mjs";

const moduleUrl = new URL("./native-quote-postgres.mjs", import.meta.url);
const shell = fs.readFileSync(new URL("./run-native-quote-postgres.sh", import.meta.url), "utf8");
const source = fs.readFileSync(moduleUrl, "utf8");
const valid = {
  GITHUB_ACTIONS: "true",
  RUNNER_TEMP: "/runner/_temp",
  QUOTE_NATIVE_ROOT: "/runner/_temp/quote-native.Abc123",
};
const childEnv = {
  PATH: process.env.PATH ?? "",
  SystemRoot: process.env.SystemRoot ?? "",
  GITHUB_ACTIONS: "false",
  DATABASE_URL: "UNUSED-SYNTHETIC-SENTINEL",
};

test("native runner refuses non-CI/non-Linux and every inherited libpq/DB route or credential", () => {
  assert.deepEqual(validateContext(valid, "linux"), {
    temp: valid.RUNNER_TEMP,
    root: valid.QUOTE_NATIVE_ROOT,
    data: `${valid.QUOTE_NATIVE_ROOT}/data`,
    socket: `${valid.QUOTE_NATIVE_ROOT}/socket`,
  });
  for (const platform of ["win32", "darwin", "freebsd"])
    assert.throws(() => validateContext(valid, platform));
  for (const value of [undefined, "", "false", "1", "TRUE"])
    assert.throws(() => validateContext({ ...valid, GITHUB_ACTIONS: value }, "linux"));
  for (const key of [
    "PGHOST",
    "PGHOSTADDR",
    "PGPORT",
    "PGUSER",
    "PGDATABASE",
    "PGSERVICE",
    "PGSERVICEFILE",
    "PGPASSWORD",
    "PGOPTIONS",
    "PGPASSFILE",
    "PGDATA",
    "PGUNKNOWN",
    "DATABASE_URL",
    "SUPABASE_DB_URL",
  ])
    assert.throws(() => validateContext({ ...valid, [key]: "external-or-sensitive" }, "linux"));
});

test("only a canonical unique direct child of exact runner temp is admitted", () => {
  for (const root of [
    "/",
    "/runner/_temp",
    "/runner/_temp/other.Abc123",
    "/runner/_temp/quote-native.Abc12",
    "/runner/_temp/quote-native.Abc1234",
    "/runner/_temp/../quote-native.Abc123",
    "/runner/_temp/nested/quote-native.Abc123",
    "/other/_temp/quote-native.Abc123",
    "relative/quote-native.Abc123",
    "/runner/_temp/quote-native.Ab\nc123",
    "/runner/_temp/quote-native.Ab\rc123",
    "/runner/_temp/quote-native.Ab\0c123",
    "/runner/_temp/quote-native.Ab\\c123",
  ])
    assert.throws(() => validateContext({ ...valid, QUOTE_NATIVE_ROOT: root }, "linux"));
  for (const temp of ["/", "/runner/_temp/", "/runner//_temp", "/runner/../_temp", "relative"])
    assert.throws(() => validateContext({ ...valid, RUNNER_TEMP: temp }, "linux"));
});

test("psql configuration is explicit private socket, no rc/password/URI/shell or inherited credentials", () => {
  const config = clientOptions(validateContext(valid, "linux"));
  assert.equal(BIN, "/usr/lib/postgresql/17/bin");
  assert.equal(PORT, "55433");
  assert.equal(config.command, `${BIN}/psql`);
  assert.deepEqual(config.args.slice(0, 12), [
    "-X",
    "-w",
    "-h",
    `${valid.QUOTE_NATIVE_ROOT}/socket`,
    "-p",
    PORT,
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-A",
    "-t",
  ]);
  assert.ok(config.args.includes("ON_ERROR_STOP=1") && config.args.includes("VERBOSITY=sqlstate"));
  assert.equal(config.env.PGPASSFILE, "/dev/null");
  assert.equal(config.env.PGSERVICEFILE, "/dev/null");
  assert.equal(config.env.PGCONNECT_TIMEOUT, "5");
  assert.equal(config.env.DATABASE_URL, undefined);
  assert.equal(config.env.PGPASSWORD, undefined);
  assert.equal(config.env.HOME, undefined);
  assert.doesNotMatch(JSON.stringify(config), /UNUSED-SYNTHETIC|postgres(?:ql)?:\/\//);
});

test("import is inert even when spawning APIs throw and hostile connection env is present", () => {
  const code = `import child from 'node:child_process'; import {syncBuiltinESMExports} from 'node:module';
    for(const key of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork']) child[key]=()=>{throw Error('UNEXPECTED CHILD')};
    syncBuiltinESMExports(); await import(${JSON.stringify(moduleUrl.href)}); process.stdout.write('inert import');`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    env: childEnv,
    timeout: 5000,
    maxBuffer: 8192,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "inert import");
});

test("CLI refuses before connecting outside GitHub Actions, including on Linux", () => {
  const result = spawnSync(process.execPath, [fileURLToPath(moduleUrl), "--run"], {
    env: childEnv,
    timeout: 5000,
    maxBuffer: 8192,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Native quote PostgreSQL17 rehearsal failed/);
  assert.doesNotMatch(result.stderr, /UNUSED-SYNTHETIC|external-or-sensitive/);
});

test("failure diagnostics expose static stage and bounded codes only, never raw messages or SQL", () => {
  const result = safeFailure("customer-wait", {
    code: "ERR_ASSERTION",
    sqlState: "42501",
    message: "PRIVATE-SQL",
    stderr: "PRIVATE-ENV",
    stack: "PRIVATE-STACK",
  });
  assert.match(result, /stage=customer-wait, code=ERR_ASSERTION, sqlState=42501/);
  assert.doesNotMatch(result, /PRIVATE/);
  assert.match(
    safeFailure("PRIVATE-STAGE", { code: "PRIVATE-CODE", sqlState: "PRIVATE-STATE" }),
    /stage=admission, code=unavailable, sqlState=unavailable/,
  );
});

test("all psql stdio error events are consumed through generic owned cleanup, including after write callbacks", () => {
  const streams = [new EventEmitter(), new EventEmitter(), new EventEmitter()];
  const failures = [];
  observeStreamErrors(streams, (error) => failures.push(error));
  for (const stream of streams) {
    const error = new Error("PRIVATE-STDIO-CONTENT");
    error.code = "EPIPE";
    assert.doesNotThrow(() => stream.emit("error", error));
  }
  assert.equal(failures.length, 3);
  assert.ok(failures.every((error) => error.message === "Native psql stream failed."));
  assert.doesNotMatch(JSON.stringify(failures), /PRIVATE-STDIO-CONTENT/);
  assert.match(
    source,
    /observeStreamErrors\(\[this\.child\.stdin, this\.child\.stdout, this\.child\.stderr\],\s*\(error\)\s*=>/,
  );
  assert.match(source, /this\.fail\(error\)/);
});

test("shell uses a second private native17 cluster with strict scoped cleanup and no install/service path", () => {
  assert.match(shell, /GITHUB_ACTIONS:-.*== true.*uname -s.*== Linux/);
  assert.match(shell, /quote_bin=\/usr\/lib\/postgresql\/17\/bin/);
  assert.match(shell, /mktemp -d "\$quote_temp\/quote-native\.XXXXXX"/);
  assert.match(shell, /umask 077/);
  assert.match(shell, /mkdir -m 700 -- "\$quote_root\/socket"/);
  assert.match(shell, /--auth-local=trust --auth-host=reject --set=listen_addresses=/);
  assert.match(shell, /--set=unix_socket_permissions=0700 --set=port=55433/);
  assert.match(
    shell,
    /pg_ctl" -D "\$quote_root\/data" -l "\$quote_root\/server\.log" -w -t 30 start/,
  );
  assert.match(
    shell,
    /pg_isready" -h "\$quote_root\/socket" -p 55433 -U postgres -d postgres -t 5/,
  );
  assert.match(shell, /validate_postmaster "\$quote_root" \|\| fail/);
  assert.match(shell, /readlink -f -- "\/proc\/\$quote_pid\/exe"/);
  assert.match(shell, /stat -c %u -- "\/proc\/\$quote_pid"/);
  assert.match(shell, /\/proc\/\$quote_pid\/cmdline/);
  assert.match(shell, /validate_root "\$quote_root" \|\| return 1\s+rm -rf -- "\$quote_root"/);
  assert.match(shell, /-m fast -w -t 15 stop/);
  assert.match(shell, /-m immediate -w -t 10 stop/);
  assert.match(shell, /trap 'quote_status=\$\?.*cleanup_root.*' EXIT/);
  assert.ok(shell.indexOf("trap 'quote_status=") < shell.indexOf("printf 'QUOTE_NATIVE_ROOT="));
  assert.match(
    shell,
    /timeout --signal=TERM --kill-after=5s 180s node scripts\/ci\/native-quote-postgres\.mjs --run/,
  );
  assert.doesNotMatch(
    shell,
    /\bdocker\b|\bapt(?:-get)?\b|npm install|systemctl|pkill|killall|https?:\/\//i,
  );
});

test("native runtime checks identity before setup and uses observed bounded independent-session barriers", () => {
  assert.ok(
    source.indexOf("await verifyServer(observer, context)") <
      source.indexOf("for (const statement of setupStatements)"),
  );
  assert.match(source, /assert\.match\(server\.version,\s*\/\^17\\d\{4\}\$\//);
  assert.match(source, /pg_blocking_pids\(\$\{waiting\.pid\}\)/);
  assert.match(source, /Date\.now\(\) \+ 4000/);
  assert.match(source, /COMMAND_MS = 15000/);
  assert.match(source, /MAX_OUTPUT = 65536/);
  assert.match(
    source,
    /statement_timeout='12s'.*lock_timeout='8s'.*idle_in_transaction_session_timeout='20s'/,
  );
  assert.match(source, /shell: false/);
  assert.match(source, /'definer',p\.prosecdef,'config',p\.proconfig/);
  assert.match(source, /this\.child\.kill\("SIGTERM"\)/);
  assert.match(source, /this\.child\.kill\("SIGKILL"\)/);
  assert.match(source, /finally\s*\{\s*await observer\.close\(\);\s*\}/);
  assert.match(source, /await blocked\(observer, actor, locker\)/);
  assert.match(source, /await blocked\(observer, writer, actor\)/);
  assert.match(source, /await blocked\(observer, second, first\)/);
  assert.match(source, /"23514"/);
  assert.match(source, /"23505"/);
  assert.match(source, /"42501"/);
  assert.match(
    source,
    /await absent\(observer, value\); \/\/ A returned DTO is not outer transaction COMMIT/,
  );
  assert.doesNotMatch(source, /new PGlite|\bfetch\(|https?:\/\/|DATABASE_URL\s*:/);
});
