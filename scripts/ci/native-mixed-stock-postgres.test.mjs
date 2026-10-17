// OFFLINE only. Fake psql transport and pure admission/source checks never
// start PostgreSQL, execute fixture SQL, open a connector or inspect live data.
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { EventEmitter } from "node:events";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  BIN,
  PORT,
  COMMAND_MS,
  MAX_OUTPUT,
  STOCK_STAGES,
  REQUIRED_STOCK_MARKERS,
  STOCK_SERVER_PATTERN,
  STOCK_FAILURE_PATTERN,
  validateContext,
  clientOptions,
  assertPrivateMetadata,
  assertPostmaster,
  assertServerIdentity,
  assertFreshCluster,
  readPrivateFile,
  observeStreamErrors,
  expectedError,
  safeFailure,
  observedBlock,
  PsqlSession,
  runNativeMixedStock,
} from "./native-mixed-stock-postgres.mjs";

const moduleUrl = new URL("./native-mixed-stock-postgres.mjs", import.meta.url);
const source = fs.readFileSync(moduleUrl, "utf8");
const env = {
  GITHUB_ACTIONS: "true",
  RUNNER_TEMP: "/runner/_temp",
  STOCK_NATIVE_ROOT: "/runner/_temp/stock-native.Abc123",
};
const context = validateContext(env, "linux");
const options = { timeout: 5000, concurrency: false };
const metadata = (kind = "file", extra = {}) => ({
  uid: 1000,
  mode: kind === "file" ? 0o100600 : kind === "socket" ? 0o140700 : 0o40700,
  nlink: 1,
  size: 0,
  dev: 1,
  ino: 2,
  mtimeMs: 3,
  ctimeMs: 4,
  isFile: () => kind === "file",
  isDirectory: () => kind === "directory",
  isSocket: () => kind === "socket",
  isSymbolicLink: () => false,
  ...extra,
});
function fake() {
  const child = new EventEmitter();
  child.stdin = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  const writes = [],
    kills = [],
    launches = [];
  child.stdin.write = (value, callback) => {
    writes.push(value);
    callback?.();
    return true;
  };
  child.stdin.destroy = () => {};
  child.stdout.setEncoding = child.stderr.setEncoding = () => {};
  child.kill = (signal) => {
    kills.push(signal);
    return true;
  };
  const spawn = (...args) => {
    launches.push(args);
    return child;
  };
  const finish = (code = 0, signal = null) => child.emit("close", code, signal);
  return { child, writes, kills, launches, spawn, finish };
}
function done(transport, index = 1, body = "") {
  transport.child.stdout.emit("data", body + `MIXED_STOCK_NATIVE_DONE_${index}\n`);
}

test(
  "fixed Linux Actions admission rejects PG/DB routing, inherited/accessor authority and noncanonical paths before FS or spawn",
  options,
  async () => {
    assert.deepEqual(context, {
      temp: env.RUNNER_TEMP,
      root: env.STOCK_NATIVE_ROOT,
      data: env.STOCK_NATIVE_ROOT + "/data",
      socket: env.STOCK_NATIVE_ROOT + "/socket",
      passfile: env.STOCK_NATIVE_ROOT + "/pgpass",
      servicefile: env.STOCK_NATIVE_ROOT + "/pgservice",
    });
    for (const platform of ["win32", "darwin", "freebsd"])
      assert.throws(() => validateContext(env, platform));
    for (const value of ["", "false", "TRUE", undefined])
      assert.throws(() => validateContext({ ...env, GITHUB_ACTIONS: value }, "linux"));
    for (const key of [
      "PGHOST",
      "PGHOSTADDR",
      "PGPORT",
      "PGUSER",
      "PGDATABASE",
      "PGPASSWORD",
      "PGPASSFILE",
      "PGSERVICEFILE",
      "PGOPTIONS",
      "PGUNKNOWN",
      "DATABASE_URL",
      "SUPABASE_DB_URL",
      "DB_HOST",
      "DBPORT",
    ])
      for (const value of ["", "PRIVATE"])
        assert.throws(() => validateContext({ ...env, [key]: value }, "linux"));
    for (const value of [null, [], Object.create(env), { ...env, [Symbol("hidden")]: "x" }])
      assert.throws(() => validateContext(value, "linux"));
    let reads = 0;
    const accessor = { ...env };
    Object.defineProperty(accessor, "GITHUB_ACTIONS", {
      enumerable: true,
      get() {
        reads++;
        return "true";
      },
    });
    assert.throws(() => validateContext(accessor, "linux"));
    assert.equal(reads, 0);
    const fsTrap = mock.method(fs, "lstatSync", () => {
      throw new Error("PRIVATE FS MUST NOT RUN");
    });
    try {
      await assert.rejects(runNativeMixedStock(env, "win32"));
      await assert.rejects(runNativeMixedStock({ ...env, PGPASSWORD: "" }, "linux"));
      assert.equal(fsTrap.mock.callCount(), 0);
    } finally {
      fsTrap.mock.restore();
    }
    for (const root of [
      "/",
      env.RUNNER_TEMP,
      "/runner/_temp/stock-native.Abc12",
      "/runner/_temp/stock-native.Abc1234",
      "/runner/_temp/other.Abc123",
      "/outside/stock-native.Abc123",
      "/runner/_temp/nested/stock-native.Abc123",
      "/runner/_temp/../stock-native.Abc123",
      "relative/stock-native.Abc123",
      "/runner/_temp/stock-native.Ab\\c123",
      "/runner/_temp/stock-native.Ab\nc123",
      "/runner/_temp/stock-native.Ab\0c123",
    ])
      assert.throws(() => validateContext({ ...env, STOCK_NATIVE_ROOT: root }, "linux"));
    for (const temp of ["/", "/runner/_temp/", "/runner//_temp", "relative", "/runner/../_temp"])
      assert.throws(() => validateContext({ ...env, RUNNER_TEMP: temp }, "linux"));
  },
);

test(
  "fixed psql argv/env has only private controls, no default/libpq routing or real-spawn admission bypass",
  options,
  () => {
    assert.equal(BIN, "/usr/lib/postgresql/17/bin");
    assert.equal(PORT, "55437");
    assert.equal(COMMAND_MS, 15000);
    assert.equal(MAX_OUTPUT, 65536);
    const config = clientOptions(context);
    assert.equal(config.command, BIN + "/psql");
    assert.deepEqual(config.args, [
      "-X",
      "-w",
      "-h",
      context.socket,
      "-p",
      PORT,
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-A",
      "-t",
      "-q",
      "-P",
      "pager=off",
      "-v",
      "ON_ERROR_STOP=1",
      "-v",
      "VERBOSITY=sqlstate",
    ]);
    assert.deepEqual(config.env, {
      PATH: BIN + ":/usr/bin:/bin",
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
      PGPASSFILE: context.passfile,
      PGSERVICEFILE: context.servicefile,
      PGSYSCONFDIR: context.root,
      PGCONNECT_TIMEOUT: "5",
      PGSSLMODE: "disable",
      PGCLIENTENCODING: "UTF8",
    });
    assert.ok(
      Object.isFrozen(config) && Object.isFrozen(config.args) && Object.isFrozen(config.env),
    );
    assert.doesNotMatch(
      JSON.stringify(config),
      /PRIVATE|\/dev\/null|postgres(?:ql)?:\/\/|PGPASSWORD|DATABASE_URL|HOME/,
    );
    assert.throws(() => new PsqlSession(context));
  },
);

test(
  "private directory/socket/file metadata rejects wrong owner/mode/symlink/hardlink",
  options,
  () => {
    for (const kind of ["directory", "socket", "file"]) {
      const mode = kind === "file" ? 0o600 : 0o700;
      assert.doesNotThrow(() => assertPrivateMetadata(metadata(kind), 1000, kind, mode));
      for (const extra of [
        { uid: 1001 },
        { mode: 0o777 },
        { isSymbolicLink: () => true },
        { isDirectory: () => false, isFile: () => false, isSocket: () => false },
      ])
        assert.throws(() => assertPrivateMetadata(metadata(kind, extra), 1000, kind, mode));
    }
    assert.throws(() => assertPrivateMetadata(metadata("file", { nlink: 2 }), 1000, "file", 0o600));
  },
);

test(
  "private empty controls use O_NOFOLLOW/fstat and close even on size/inode drift",
  options,
  () => {
    const opened = mock.method(fs, "openSync", () => 7),
      closed = mock.method(fs, "closeSync", () => {}),
      stat = mock.method(fs, "fstatSync", () => metadata()),
      named = mock.method(fs, "lstatSync", () => metadata());
    try {
      assert.equal(readPrivateFile(context.passfile, 1, 1000, true).length, 0);
      assert.deepEqual(opened.mock.calls[0].arguments, [
        context.passfile,
        fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
      ]);
      stat.mock.mockImplementation(() => metadata("file", { size: 2 }));
      assert.throws(() => readPrivateFile(context.passfile, 1, 1000, true));
      stat.mock.mockImplementation(() => metadata());
      named.mock.mockImplementation(() => metadata("file", { ino: 9 }));
      assert.throws(() => readPrivateFile(context.passfile, 1, 1000, true));
      assert.equal(closed.mock.callCount(), 3);
    } finally {
      opened.mock.restore();
      closed.mock.restore();
      stat.mock.restore();
      named.mock.restore();
    }
  },
);

test(
  "postmaster PID/exe/UID/exact-D and SQL server17/socket-only/fresh cluster identity are mandatory",
  options,
  () => {
    const args = [BIN + "/postgres", "-D", context.data];
    assert.equal(assertPostmaster("123\n", BIN + "/postgres", args, 1000, 1000, context), "123");
    for (const [pid, exe, argv, uid] of [
      ["0\n", BIN + "/postgres", args, 1000],
      ["123\n", "/usr/bin/postgres", args, 1000],
      ["123\n", BIN + "/postgres", [...args, "-p", "5432"], 1000],
      ["123\n", BIN + "/postgres", args, 1001],
    ])
      assert.throws(() => assertPostmaster(pid, exe, argv, 1000, uid, context));
    const identity = {
      version: "170011",
      systemId: "123456789",
      data: context.data,
      socket: context.socket,
      port: PORT,
      listen: "",
      user: "postgres",
      session: "postgres",
      owner: "postgres",
      super: true,
      database: "postgres",
      recovery: false,
      encoding: "UTF8",
    };
    assert.equal(assertServerIdentity(identity, context), "170011");
    for (const [key, value] of Object.entries({
      version: "180001",
      systemId: "0",
      data: "/outside",
      socket: "/tmp",
      port: "5432",
      listen: "localhost",
      user: "authenticated",
      session: "other",
      owner: "other",
      super: false,
      database: "other",
      recovery: true,
      encoding: "LATIN1",
    }))
      assert.throws(() => assertServerIdentity({ ...identity, [key]: value }, context));
    const fresh = {
      roles: ["postgres"],
      databases: ["postgres", "template0", "template1"],
      memberships: "0",
      extraSchemas: [],
      publicObjects: "0",
      publicFunctions: "0",
      extensions: ["plpgsql"],
      foreignServers: "0",
      subscriptions: "0",
    };
    assert.doesNotThrow(() => assertFreshCluster(fresh));
    for (const [key, value] of Object.entries({
      roles: ["postgres", "authenticated"],
      databases: ["postgres"],
      memberships: "1",
      extraSchemas: ["auth"],
      publicObjects: "1",
      publicFunctions: "1",
      extensions: ["plpgsql", "other"],
      foreignServers: "1",
      subscriptions: "1",
    }))
      assert.throws(() => assertFreshCluster({ ...fresh, [key]: value }));
  },
);

test(
  "marker vector is exact/frozen and safe failure reflects only allowlisted stage plus own SQLSTATE",
  options,
  () => {
    assert.deepEqual(REQUIRED_STOCK_MARKERS, [
      "PASS nativePG17 mixed-stock: locked-acl.",
      "PASS nativePG17 mixed-stock: b2b-commit-inquiry-rejected.",
      "PASS nativePG17 mixed-stock: inquiry-commit-b2b-rejected.",
      "PASS nativePG17 mixed-stock: b2b-rollback-inquiry-permitted.",
      "PASS nativePG17 mixed-stock: inquiry-rollback-b2b-permitted.",
      "PASS nativePG17 mixed-stock: outer-visibility-rollback.",
      "PASS nativePG17 mixed-stock: late-event-fk-rollback.",
      "PASS nativePG17 mixed-stock: complete.",
      "Native mixed stock PostgreSQL17 rehearsal complete: synthetic owner sessions only.",
    ]);
    assert.ok(Object.isFrozen(REQUIRED_STOCK_MARKERS) && Object.isFrozen(STOCK_STAGES));
    assert.equal(STOCK_STAGES.length, 12);
    assert.match(
      "NativeMixedStockPG17 server_version_num=170011; private cluster identity verified.",
      new RegExp(STOCK_SERVER_PATTERN),
    );
    assert.doesNotMatch(
      "NativeMixedStockPG17 server_version_num=180001; private cluster identity verified.",
      new RegExp(STOCK_SERVER_PATTERN),
    );
    for (const stage of STOCK_STAGES)
      assert.match(
        safeFailure(stage, { sqlState: "23503" }).trim(),
        new RegExp(STOCK_FAILURE_PATTERN),
      );
    assert.equal(
      safeFailure("PRIVATE SQL", { sqlState: "23503", message: "PRIVATE AUTH" }),
      "FAIL nativePG17 mixed-stock: stage=admission, sqlState=23503; no live acceptance.\n",
    );
    let reads = 0;
    const getter = {
      get sqlState() {
        reads++;
        return "23503";
      },
    };
    assert.ok(safeFailure("admission", getter).includes("sqlState=unavailable"));
    assert.equal(reads, 0);
    assert.ok(
      safeFailure("admission", Object.create({ sqlState: "23503" })).includes("unavailable"),
    );
    assert.ok(safeFailure("admission", { sqlState: "PRIVATE" }).includes("unavailable"));
  },
);

test(
  "expected SQL denial preserves observed safe mismatch diagnostics and refuses missing denial/getters",
  options,
  async () => {
    await expectedError(Promise.reject({ sqlState: "23503", message: "PRIVATE" }), "23503");
    await assert.rejects(
      expectedError(Promise.reject({ sqlState: "22023", message: "PRIVATE" }), "23503"),
      (error) =>
        error.message === "Unexpected native mixed stock SQL denial." &&
        error.sqlState === "22023" &&
        !String(error).includes("PRIVATE"),
    );
    await assert.rejects(
      expectedError(Promise.resolve([]), "23503"),
      /Required native mixed stock denial absent/,
    );
    let reads = 0;
    await assert.rejects(
      expectedError(
        Promise.reject({
          get sqlState() {
            reads++;
            return "23503";
          },
        }),
        "23503",
      ),
      /Unexpected native mixed stock SQL denial/,
    );
    assert.equal(reads, 0);
  },
);

test(
  "fake transport has exact fixed argv/env/no shell and fragmented markers resolve only current command",
  options,
  async () => {
    const t = fake(),
      value = new PsqlSession(context, t.spawn);
    const pending = value.command("SELECT 1;");
    assert.equal(t.launches.length, 1);
    const [command, args, launch] = t.launches[0];
    assert.equal(command, BIN + "/psql");
    assert.deepEqual(args, clientOptions(context).args);
    assert.equal(launch.shell, false);
    assert.deepEqual(launch.env, clientOptions(context).env);
    assert.equal(t.writes[0], "SELECT 1;\n\\echo MIXED_STOCK_NATIVE_DONE_1\n");
    t.child.stdout.emit("data", "1\nMIXED_STOCK_NATIVE_");
    t.child.stdout.emit("data", "DONE_1\n");
    assert.deepEqual(await pending, ["1"]);
    const closed = value.close();
    assert.deepEqual(t.kills, ["SIGTERM"]);
    t.finish(0, "SIGTERM");
    await closed;
    assert.equal(value.ended, true);
  },
);

test(
  "psql SQL error rejects only AFTER close with safe state, never raw accumulated stderr",
  options,
  async () => {
    const t = fake(),
      value = new PsqlSession(context, t.spawn);
    let settled = false;
    const pending = value.command("SELECT fixture_error;");
    pending.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    t.child.stderr.emit("data", "ERROR:  23503\nPRIVATE SQL DETAIL\n");
    await Promise.resolve();
    assert.equal(settled, false);
    t.finish(3);
    await assert.rejects(
      pending,
      (error) =>
        error.sqlState === "23503" &&
        error.message === "Native mixed stock command failed." &&
        !String(error).includes("PRIVATE"),
    );
    await value.close();
    assert.equal(value.ended, true);
  },
);

test(
  "stderr plus apparently valid marker cannot produce success and waits for close",
  options,
  async () => {
    const t = fake(),
      value = new PsqlSession(context, t.spawn);
    let settled = false;
    const pending = value.command("SELECT 1;");
    pending.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    t.child.stderr.emit("data", "WARNING: PRIVATE\n");
    done(t);
    await Promise.resolve();
    assert.equal(settled, false);
    assert.deepEqual(t.kills, ["SIGTERM"]);
    t.finish(1, "SIGTERM");
    await assert.rejects(pending, /Native mixed stock diagnostics were not empty/);
    await value.close();
  },
);

test(
  "late stderr after delivered marker latches failure even during explicit close",
  options,
  async () => {
    const t = fake(),
      value = new PsqlSession(context, t.spawn);
    const pending = value.command("SELECT 1;");
    done(t, 1, "1\n");
    assert.deepEqual(await pending, ["1"]);
    const close = value.close();
    t.child.stderr.emit("data", "ERROR: PRIVATE LATE\n");
    assert.equal(value.failure.message, "Native mixed stock late diagnostics.");
    t.finish(1, "SIGTERM");
    await close;
    await assert.rejects(value.command("SELECT 2;"), /session unavailable/);
  },
);

test(
  "timeouts kill and settle only after child close, then refuse another command",
  options,
  async () => {
    const t = fake(),
      value = new PsqlSession(context, t.spawn, 10);
    let settled = false;
    const pending = value.command("SELECT wait;");
    pending.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(settled, false);
    assert.deepEqual(t.kills, ["SIGTERM"]);
    t.finish(1, "SIGTERM");
    await assert.rejects(pending, /command deadline/);
    await value.close();
    await assert.rejects(value.command("SELECT 2;"), /session unavailable/);
  },
);

test(
  "oversized output, stream/input failures and unsolicited tail all close before pending rejection",
  options,
  async () => {
    for (const mode of ["overflow", "stream", "input", "tail"]) {
      const t = fake(),
        value = new PsqlSession(context, t.spawn);
      let settled = false;
      if (mode === "input")
        t.child.stdin.write = () => {
          throw new Error("PRIVATE");
        };
      const pending = value.command("SELECT 1;");
      pending.then(
        () => {
          settled = true;
        },
        () => {
          settled = true;
        },
      );
      if (mode === "overflow") t.child.stdout.emit("data", "x".repeat(MAX_OUTPUT + 1));
      if (mode === "stream") t.child.stdout.emit("error", new Error("PRIVATE"));
      if (mode === "tail") done(t, 1, "1\n");
      if (mode === "tail") {
        assert.deepEqual(await pending, ["1"]);
        t.child.stdout.emit("data", "PRIVATE unsolicited\n");
      } else {
        await Promise.resolve();
        assert.equal(settled, false);
      }
      assert.deepEqual(t.kills, ["SIGTERM"]);
      t.finish(1, "SIGTERM");
      if (mode !== "tail")
        await assert.rejects(pending, (error) => !String(error).includes("PRIVATE"));
      await value.close();
      assert.equal(value.ended, true);
    }
  },
);

test(
  "command input limits and overlapping requests refuse without additional writes",
  options,
  async () => {
    const t = fake(),
      value = new PsqlSession(context, t.spawn);
    for (const input of [null, "SELECT\0private", "x".repeat(131073)])
      await assert.rejects(value.command(input), /input limit/);
    assert.equal(t.writes.length, 0);
    const pending = value.command("SELECT 1;");
    await assert.rejects(value.command("SELECT 2;"), /session unavailable/);
    assert.equal(t.writes.length, 1);
    done(t, 1, "1\n");
    await pending;
    const closed = value.close();
    t.finish(0, "SIGTERM");
    await closed;
  },
);

test(
  "observed barrier requires THREE distinct PIDs plus real blocker and active Lock state, not guessed sleep",
  options,
  async () => {
    let calls = 0;
    const statements = [];
    const observer = {
      pid: 101,
      async command(sql) {
        statements.push(sql);
        calls++;
        return [JSON.stringify({ exists: true, blocked: true, activeLock: calls > 1 })];
      },
    };
    await observedBlock(observer, { pid: 102 }, { pid: 103 });
    assert.equal(calls, 2);
    assert.match(statements[0], /pg_blocking_pids\(102\)/);
    assert.match(statements[0], /state='active' AND wait_event_type='Lock'/);
    assert.match(statements[0], /103=ANY/);
    await assert.rejects(observedBlock(observer, { pid: 101 }, { pid: 103 }));
  },
);

test(
  "source preserves actual writer/cohort/NUMERIC-as-text full graph and explicit synthetic late FK, no grants/other fixture admission",
  options,
  () => {
    assert.match(source, /buildMixedReservationOrderSource\(\)/);
    assert.match(source, /source\.setupStatements\.length,\s*75/);
    assert.match(source, /source\.selectedSources\.length,\s*49/);
    assert.match(source, /source\.tables\.length,\s*14/);
    assert.match(source, /80dfd6a15e15ca404ece0cb77402d3fa3280da767d5f19a1cca9e3b16436332f/);
    assert.doesNotMatch(
      source,
      /expense-native-source|native-quote|PGlite|GRANT\s+(?:EXECUTE|ALL)|SECURITY\s+DEFINER|SET\s+ROLE\s+service_role/,
    );
    for (const token of [
      "public.parts_order_events",
      "auth",
      "sha256(convert_to(jsonb_build_object",
      "pg_catalog.numeric",
      "::text",
      "pg_get_functiondef",
      "pg_get_triggerdef",
      "pg_get_constraintdef",
      "proacl",
      "relacl",
      "attacl",
      "enumlabel",
      "rolbypassrls",
      "last_value::text",
      "current_setting('role')",
      "wait_event_type='Lock'",
      "Uncommitted writer results must remain invisible",
      "Only individually checked writer fields/rows may change",
    ])
      assert.ok(source.includes(token), token);
    assert.match(
      source,
      /\[\s*\[1,\s*"b2b",\s*true\],\s*\[2,\s*"inquiry",\s*true\],\s*\[3,\s*"b2b",\s*false\],\s*\[4,\s*"inquiry",\s*false\],?\s*\]/,
    );
    assert.match(
      source,
      /expectedError\(pending,\s*first\s*===\s*"b2b"\s*\?\s*"22023"\s*:\s*"P0001"\)/,
    );
    assert.match(source, /expectedError\(failed\.command\(transitionSQL\(fault\)\),\s*"23503"\)/);
    assert.match(
      source,
      /REVOKE ALL ON FUNCTION public\.lab_order_event_fk_fault\(\) FROM PUBLIC,anon,authenticated,service_role/,
    );
    assert.match(source, /Fixture work witness absent/);
    assert.match(
      source,
      /DROP TRIGGER lab_order_event_fk ON public\.parts_order_events; DROP FUNCTION public\.lab_order_event_fk_fault/,
    );
    assert.ok(
      source.indexOf("const faultBaseline") >
        source.indexOf("REVOKE ALL ON FUNCTION public.lab_order_event_fk_fault"),
    );
    assert.match(source, /assert\.equal\(await graph\.digest\(\),\s*faultBaseline\)/);
    assert.match(source, /process\.exitCode\s*=\s*1/);
  },
);

test(
  "module import is inert and exact CLI admission fails safely on non-Actions before any native process",
  options,
  () => {
    const childEnv = {
      PATH: process.env.PATH ?? "",
      SystemRoot: process.env.SystemRoot ?? "",
      GITHUB_ACTIONS: "false",
      DATABASE_URL: "UNUSED_PRIVATE_ROUTE",
    };
    const imported = spawnSync(
      process.execPath,
      ["--input-type=module", "--eval", `await import(${JSON.stringify(moduleUrl.href)});`],
      { encoding: "utf8", env: childEnv, timeout: 4000, maxBuffer: 65536 },
    );
    assert.equal(imported.status, 0);
    assert.equal(imported.stdout, "");
    assert.equal(imported.stderr, "");
    assert.equal(imported.error, undefined);
    for (const args of [[], ["--run"], ["--run", "--other"]]) {
      const refused = spawnSync(process.execPath, [fileURLToPath(moduleUrl), ...args], {
        encoding: "utf8",
        env: childEnv,
        timeout: 4000,
        maxBuffer: 65536,
      });
      assert.equal(refused.status, 1);
      assert.equal(refused.stderr, "");
      assert.equal(refused.error, undefined);
      assert.equal(
        refused.stdout,
        "FAIL nativePG17 mixed-stock: stage=admission, sqlState=unavailable; no live acceptance.\n",
      );
      assert.doesNotMatch(
        refused.stdout,
        /UNUSED_PRIVATE_ROUTE|psql|postgres\.exe|SELECT|PASSWORD/,
      );
    }
  },
);

test(
  "all three stdio errors are observed without reflecting original stream causes",
  options,
  () => {
    const streams = [new EventEmitter(), new EventEmitter(), new EventEmitter()],
      errors = [];
    observeStreamErrors(streams, (error) => errors.push(error));
    for (const stream of streams) stream.emit("error", new Error("PRIVATE CAUSE"));
    assert.equal(errors.length, 3);
    assert.ok(errors.every((error) => error.message === "Native mixed stock psql stream failed."));
  },
);
