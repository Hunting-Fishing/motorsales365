// Offline admission/transport/source guards ONLY; never start PostgreSQL.
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EventEmitter } from "node:events";
import { spawnSync } from "node:child_process";
import {
  BIN,
  PORT,
  COMMAND_MS,
  MAX_OUTPUT,
  validateContext,
  clientOptions,
  assertPrivateMetadata,
  assertPostmaster,
  assertServerIdentity,
  assertFreshCluster,
  readPrivateFile,
  observeStreamErrors,
  safeFailure,
  expectedError,
  PsqlSession,
  invokeSQL,
  SNAPSHOT_SQL,
  runNativeExpense,
} from "./native-expense-postgres.mjs";
import { buildExpenseNativeSource } from "../vehicle-receipts/expense-native-source.mjs";
import { bindExpenseOperationRequest } from "../vehicle-receipts/expense-operation-contract.mjs";

const moduleUrl = new URL("./native-expense-postgres.mjs", import.meta.url);
const source = fs.readFileSync(moduleUrl, "utf8");
const env = {
  GITHUB_ACTIONS: "true",
  RUNNER_TEMP: "/runner/_temp",
  EXPENSE_NATIVE_ROOT: "/runner/_temp/expense-native.Abc123",
};
const context = validateContext(env, "linux");
const childEnv = {
  PATH: process.env.PATH ?? "",
  SystemRoot: process.env.SystemRoot ?? "",
  GITHUB_ACTIONS: "false",
  DATABASE_URL: "UNUSED-PRIVATE-ROUTE",
};
const metadata = (kind = "file", changes = {}) => ({
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
  ...changes,
});
const id = (n) => `10000000-abcd-4000-8000-${String(n).padStart(12, "0")}`;
const intent = {
  version: 1,
  kind: "create",
  operationId: id(1),
  expectedAccountId: id(2),
  expectedShopId: id(3),
  expectedShopVehicleId: id(4),
  receiptId: id(5),
  amount: "12.34",
  taxAmount: "0",
  currency: "PHP",
  expenseDate: "2026-10-01",
  vendor: "Synthetic 'quote' \\path\n🧾",
  paymentIntent: "cash",
};

test("fixed Linux Actions admission rejects every inherited PG/DB route even when empty", async () => {
  assert.deepEqual(context, {
    temp: env.RUNNER_TEMP,
    root: env.EXPENSE_NATIVE_ROOT,
    data: `${env.EXPENSE_NATIVE_ROOT}/data`,
    socket: `${env.EXPENSE_NATIVE_ROOT}/socket`,
    passfile: `${env.EXPENSE_NATIVE_ROOT}/pgpass`,
    servicefile: `${env.EXPENSE_NATIVE_ROOT}/pgservice`,
  });
  for (const platform of ["win32", "darwin", "freebsd"])
    assert.throws(() => validateContext(env, platform));
  for (const value of [undefined, "", "false", "1", "TRUE"])
    assert.throws(() => validateContext({ ...env, GITHUB_ACTIONS: value }, "linux"));
  for (const key of [
    "PGHOST",
    "PGHOSTADDR",
    "PGPORT",
    "PGUSER",
    "PGDATABASE",
    "PGPASSWORD",
    "PGPASSFILE",
    "PGSERVICE",
    "PGSERVICEFILE",
    "PGOPTIONS",
    "PGDATA",
    "PGUNKNOWN",
    "DATABASE_URL",
    "SUPABASE_DB_URL",
  ])
    for (const value of ["", "PRIVATE"])
      assert.throws(() => validateContext({ ...env, [key]: value }, "linux"));
  const read = mock.method(fs, "lstatSync", () => {
    throw new Error("UNEXPECTED FS");
  });
  try {
    await assert.rejects(runNativeExpense(env, "win32"));
    await assert.rejects(runNativeExpense({ ...env, PGPASSWORD: "" }, "linux"));
    assert.equal(read.mock.callCount(), 0);
  } finally {
    read.mock.restore();
  }
});
test("only canonical unique direct-child private paths are accepted", () => {
  for (const root of [
    "/",
    env.RUNNER_TEMP,
    "/runner/_temp/other.Abc123",
    "/runner/_temp/expense-native.Abc12",
    "/runner/_temp/expense-native.Abc1234",
    "/runner/_temp/nested/expense-native.Abc123",
    "/other/expense-native.Abc123",
    "/runner/_temp/../expense-native.Abc123",
    "relative/expense-native.Abc123",
    "/runner/_temp/expense-native.Ab\nc123",
    "/runner/_temp/expense-native.Ab\rc123",
    "/runner/_temp/expense-native.Ab\0c123",
    "/runner/_temp/expense-native.Ab\\c123",
    "/runner/_temp/expense-native.Ab\x7fc123",
  ])
    assert.throws(() => validateContext({ ...env, EXPENSE_NATIVE_ROOT: root }, "linux"));
  for (const temp of ["/", "/runner/_temp/", "/runner//_temp", "/runner/../_temp", "relative"])
    assert.throws(() => validateContext({ ...env, RUNNER_TEMP: temp }, "linux"));
});
test("fixed private libpq controls replace /dev/null without inherited secrets or shell", () => {
  const options = clientOptions(context);
  assert.equal(BIN, "/usr/lib/postgresql/17/bin");
  assert.equal(PORT, "55436");
  assert.equal(COMMAND_MS, 15000);
  assert.equal(MAX_OUTPUT, 65536);
  assert.deepEqual(options.args, [
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
  assert.deepEqual(options.env, {
    PATH: `${BIN}:/usr/bin:/bin`,
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
    Object.isFrozen(options) && Object.isFrozen(options.args) && Object.isFrozen(options.env),
  );
  assert.doesNotMatch(
    JSON.stringify(options),
    /PRIVATE|\/dev\/null|postgres(?:ql)?:\/\/|DATABASE_URL|PGPASSWORD|HOME/,
  );
  assert.throws(() => new PsqlSession(context)); // No private filesystem admission witness.
});
test("private directory/socket/file metadata refuse symlink, wrong owner, mode or hardlinks", () => {
  for (const kind of ["directory", "socket", "file"]) {
    const mode = kind === "file" ? 0o600 : 0o700;
    assert.doesNotThrow(() => assertPrivateMetadata(metadata(kind), 1000, kind, mode));
    for (const changes of [
      { uid: 1001 },
      { mode: 0o777 },
      { isSymbolicLink: () => true },
      { isDirectory: () => false, isFile: () => false, isSocket: () => false },
    ])
      assert.throws(() => assertPrivateMetadata(metadata(kind, changes), 1000, kind, mode));
  }
  assert.throws(() => assertPrivateMetadata(metadata("file", { nlink: 2 }), 1000, "file", 0o600));
});
test("empty private control files are descriptor checked and always close before any libpq use", () => {
  const opened = mock.method(fs, "openSync", () => 7),
    closed = mock.method(fs, "closeSync", () => {});
  const stat = mock.method(fs, "fstatSync", () => metadata()),
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
    named.mock.mockImplementation(() => metadata("file", { ino: 99 }));
    assert.throws(() => readPrivateFile(context.passfile, 1, 1000, true));
    assert.equal(closed.mock.callCount(), 3);
  } finally {
    opened.mock.restore();
    closed.mock.restore();
    stat.mock.restore();
    named.mock.restore();
  }
});
test("postmaster PID/executable/UID/argv and server17 private identity are exact", () => {
  const args = [`${BIN}/postgres`, "-D", context.data];
  assert.equal(assertPostmaster("123\n", `${BIN}/postgres`, args, 1000, 1000, context), "123");
  for (const values of [
    ["0\n", `${BIN}/postgres`, args, 1000],
    ["123\n", "/usr/bin/postgres", args, 1000],
    ["123\n", `${BIN}/postgres`, [...args, "--other"], 1000],
    ["123\n", `${BIN}/postgres`, args, 1001],
  ])
    assert.throws(() =>
      assertPostmaster(values[0], values[1], values[2], 1000, values[3], context),
    );
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
    user: "other",
    session: "other",
    owner: "other",
    super: false,
    database: "production",
    recovery: true,
    encoding: "SQL_ASCII",
    extra: "PRIVATE",
  }))
    assert.throws(() => assertServerIdentity({ ...identity, [key]: value }, context));
  const fresh = {
    roles: ["postgres"],
    databases: ["postgres", "template0", "template1"],
    memberships: "0",
    extraSchemas: [],
  };
  assert.doesNotThrow(() => assertFreshCluster(fresh));
  for (const change of [
    { roles: ["postgres", "authenticated"] },
    { databases: ["postgres", "template0", "template1", "application"] },
    { memberships: "1" },
    { extraSchemas: ["shop_manager"] },
  ])
    assert.throws(() => assertFreshCluster({ ...fresh, ...change }));
});
test("import is inert with all child-process APIs disabled and hostile environment", () => {
  const code = `import child from 'node:child_process';import{syncBuiltinESMExports}from'node:module';for(const k of['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])child[k]=()=>{throw Error('UNEXPECTED CHILD')};syncBuiltinESMExports();await import(${JSON.stringify(moduleUrl.href)});process.stdout.write('inert');`;
  const value = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    env: childEnv,
    timeout: 5000,
    maxBuffer: 8192,
    encoding: "utf8",
  });
  assert.equal(value.error, undefined);
  assert.equal(value.status, 0, value.stderr);
  assert.equal(value.stdout, "inert");
});
test("CLI refuses bad arguments/nonCI with a bounded stdout marker before native admission", () => {
  for (const args of [
    [],
    ["--run"],
    ["--run", "extra"],
    ["--restore"],
    ["--run", "postgres://PRIVATE"],
  ]) {
    const value = spawnSync(process.execPath, [fileURLToPath(moduleUrl), ...args], {
      env: childEnv,
      timeout: 5000,
      maxBuffer: 8192,
      encoding: "utf8",
    });
    assert.equal(value.error, undefined);
    assert.equal(value.status, 1);
    assert.equal(
      value.stdout,
      "FAIL nativePG17 expense: stage=admission, sqlState=unavailable; no live acceptance.\n",
    );
    assert.equal(value.stderr, "");
  }
});
test("diagnostics never reflect raw errors, getters, paths, SQL or arbitrary stage names", () => {
  assert.equal(
    safeFailure("financial-wait", {
      sqlState: "55000",
      message: "PRIVATE SQL",
      stack: "PRIVATE STACK",
    }),
    "FAIL nativePG17 expense: stage=financial-wait, sqlState=55000; no live acceptance.\n",
  );
  const getter = {
    get sqlState() {
      throw new Error("PRIVATE");
    },
  };
  assert.doesNotThrow(() => safeFailure("PRIVATE", getter));
  assert.doesNotMatch(safeFailure("PRIVATE", { sqlState: "PRIVATE", code: "PRIVATE" }), /PRIVATE/);
});

test("expected SQL denials preserve only safe observed states and refuse missing denial", async () => {
  await expectedError(Promise.reject({ sqlState: "42501", message: "PRIVATE SQL" }), "42501");
  await assert.rejects(
    expectedError(Promise.reject({ sqlState: "23503", message: "PRIVATE SQL" }), "42501"),
    (error) => {
      assert.equal(error.message, "Unexpected native expense SQL denial.");
      assert.equal(error.sqlState, "23503");
      assert.equal(error.cause, undefined);
      assert.equal(
        safeFailure("locked-acl", error),
        "FAIL nativePG17 expense: stage=locked-acl, sqlState=23503; no live acceptance.\n",
      );
      return true;
    },
  );
  await assert.rejects(expectedError(Promise.resolve("PRIVATE success"), "42501"), (error) => {
    assert.equal(error.message, "Required native expense SQL denial absent.");
    assert.equal(error.sqlState, undefined);
    return true;
  });
  const hostile = Object.defineProperty({}, "sqlState", {
    get() {
      assert.fail("Diagnostic getter must not execute.");
    },
  });
  await assert.rejects(expectedError(Promise.reject(hostile), "42501"), (error) => {
    assert.equal(error.message, "Unexpected native expense SQL denial.");
    assert.equal(error.sqlState, undefined);
    return true;
  });
});
test("all stdio error events are observed as generic failures", () => {
  const streams = [new EventEmitter(), new EventEmitter(), new EventEmitter()],
    errors = [];
  observeStreamErrors(streams, (error) => errors.push(error));
  for (const stream of streams)
    assert.doesNotThrow(() => stream.emit("error", new Error("PRIVATE")));
  assert.equal(errors.length, 3);
  assert.ok(errors.every((error) => error.message === "Native expense psql stream failed."));
});
function fakeChild(onWrite, closes = true) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = new EventEmitter();
  child.stdout.setEncoding = child.stderr.setEncoding = () => {};
  child.stdin.destroy = () => {};
  child.stdin.write = (value, done) => onWrite?.(value, done, child);
  child.signals = [];
  child.kill = (signal) => {
    child.signals.push(signal);
    if (closes) queueMicrotask(() => child.emit("close", null, signal));
    return true;
  };
  return child;
}
test("fake psql successful frames are isolated, sequential and explicitly configured", async () => {
  let args;
  const child = fakeChild((value, done, instance) => {
    done();
    const marker = value.match(/\\echo (EXPENSE_NATIVE_DONE_\d+)\n$/)[1];
    instance.stdout.emit("data", `first\n${marker}\n`);
  });
  const session = new PsqlSession(context, (...values) => {
    args = values;
    return child;
  });
  try {
    assert.deepEqual(await session.command("SELECT 1;"), ["first"]);
    assert.deepEqual(await session.command("SELECT 2;"), ["first"]);
    assert.equal(args[0], `${BIN}/psql`);
    assert.equal(args[2].shell, false);
    assert.deepEqual(args[2].env, clientOptions(context).env);
  } finally {
    await session.close();
  }
  assert.deepEqual(child.signals, ["SIGTERM"]);
  assert.equal(session.ended, true);
});
test("fake psql denies overlapping/oversized/NUL input without second dispatch", async () => {
  let writes = 0;
  const child = fakeChild(() => {
    writes++;
  });
  const session = new PsqlSession(context, () => child);
  const pending = session.command("SELECT 1;");
  const assertion = assert.rejects(pending, /Native expense command failed/);
  try {
    await assert.rejects(session.command("SELECT 2;"));
    assert.equal(writes, 1);
    await session.close();
    await assertion;
  } finally {
    await session.close();
  }
  const other = fakeChild(() => {
      writes++;
    }),
    empty = new PsqlSession(context, () => other);
  try {
    for (const sql of [null, "x".repeat(131073), "SELECT '\0';"])
      await assert.rejects(empty.command(sql));
    assert.equal(writes, 1);
  } finally {
    await empty.close();
  }
});
test("fake SQLSTATE rejection waits for child close and redacts native detail", async () => {
  const child = fakeChild((_value, _done, instance) => {
    instance.stderr.emit("data", "ERROR:  23503 PRIVATE SQL\n");
    queueMicrotask(() => instance.emit("close", 3, null));
  });
  const session = new PsqlSession(context, () => child);
  await assert.rejects(session.command("SELECT denied;"), (error) => {
    assert.equal(error.sqlState, "23503");
    assert.equal(error.message, "Native expense command failed.");
    assert.equal(session.ended, true);
    return true;
  });
  await session.close();
});

test("session suppresses fixture NOTICE only while unexpected warning stderr still refuses", async () => {
  assert.match(source, /SET client_min_messages=warning; SET statement_timeout/);
  assert.doesNotMatch(source, /client_min_messages\s*=\s*(?:error|fatal|panic)/i);
  const child = fakeChild((value, done, instance) => {
    done();
    const marker = value.match(/\\echo (EXPENSE_NATIVE_DONE_\d+)\n$/)[1];
    instance.stderr.emit("data", "WARNING: PRIVATE fixture detail\n");
    instance.stdout.emit("data", `${marker}\n`);
  });
  const session = new PsqlSession(context, () => child);
  await assert.rejects(session.command("SELECT 1;"), (error) => {
    assert.equal(error.message, "Native expense diagnostics were not empty.");
    assert.equal(session.ended, true);
    assert.doesNotMatch(error.message, /PRIVATE/);
    return true;
  });
  await session.close();
});
test("fake callback/stream/startup failures kill and close without raw cause", async () => {
  for (const kind of ["callback", "stdin", "stdout", "stderr", "child"]) {
    const child = fakeChild((_value, done, instance) => {
      if (kind === "callback") done(new Error("PRIVATE"));
      else if (kind === "child") instance.emit("error", new Error("PRIVATE"));
      else instance[kind].emit("error", new Error("PRIVATE"));
    });
    const session = new PsqlSession(context, () => child);
    await assert.rejects(session.command("SELECT 1;"), (error) => {
      assert.doesNotMatch(error.message, /PRIVATE/);
      assert.equal(session.ended, true);
      return true;
    });
    assert.ok(child.signals.includes("SIGTERM"));
    await session.close();
  }
});
test("fake excess output or unsolicited partial frame refuses without retaining excess bytes", async () => {
  for (const kind of ["stdout", "stderr", "partial"]) {
    const child = fakeChild((value, _done, instance) => {
      if (kind === "partial") {
        const marker = value.match(/\\echo (EXPENSE_NATIVE_DONE_\d+)\n$/)[1];
        instance.stdout.emit("data", `${marker}\nPRIVATE-PARTIAL`);
      } else instance[kind].emit("data", "x".repeat(MAX_OUTPUT + 1));
    });
    const session = new PsqlSession(context, () => child);
    await assert.rejects(session.command("SELECT 1;"));
    assert.ok(session.stderr.length <= MAX_OUTPUT && session.buffer.length <= MAX_OUTPUT);
    await session.close();
  }
});
test("fake deadline owns TERM cleanup and observes final close", async () => {
  const child = fakeChild(() => {}),
    session = new PsqlSession(context, () => child, 5);
  await assert.rejects(session.command("SELECT 1;"), /deadline/);
  assert.equal(session.ended, true);
  assert.deepEqual(child.signals, ["SIGTERM"]);
  await session.close();
});
test("fake ignored TERM escalates to KILL and waits for the owned child close", async () => {
  const child = fakeChild(() => {}, false);
  child.kill = (signal) => {
    child.signals.push(signal);
    if (signal === "SIGKILL") queueMicrotask(() => child.emit("close", null, signal));
    return true;
  };
  const session = new PsqlSession(context, () => child, 5);
  await assert.rejects(session.command("SELECT 1;"), /deadline/);
  assert.deepEqual(child.signals, ["SIGTERM", "SIGKILL"]);
  assert.equal(session.ended, true);
  await session.close();
});
test("hex payload and full binding are DATA, not unescaped SQL or lossy JS money", () => {
  const bound = bindExpenseOperationRequest(intent),
    sql = invokeSQL(intent);
  const strings = [...sql.matchAll(/decode\('([a-f0-9]+)','hex'\)/g)].map((match) =>
    Buffer.from(match[1], "hex").toString("utf8"),
  );
  assert.deepEqual(JSON.parse(strings[0]), JSON.parse(JSON.stringify(bound.payload)));
  assert.equal(strings[1], bound.binding);
  assert.doesNotMatch(sql, /Synthetic|quote|path|🧾/);
  assert.match(sql, /^SELECT receipt_expense_candidate\.create_operation\(/);
  for (const field of ["total", "amount", "tax_amount", "debit", "credit"])
    assert.ok(SNAPSHOT_SQL.includes(`t.${field}::text`));
  assert.match(SNAPSHOT_SQL, /encode\(sha256\(convert_to/);
  for (const table of [
    "vehicle_receipts",
    "expenses",
    "journal_entries",
    "journal_entry_lines",
    "chart_of_accounts",
    "outcomes",
    "customers",
    "vehicles",
    "profiles",
  ])
    assert.ok(SNAPSHOT_SQL.includes(`.${table} `));
});
test("fixture boundary pins exact source, statements terminated, no client privilege relaxation", () => {
  const built = buildExpenseNativeSource();
  assert.equal(built.signature, "receipt_expense_candidate.create_operation(jsonb,text)");
  assert.equal(
    built.candidateSha256,
    "ddea3f2c59cc8ec385c6273d700ea4a8ee2a010eeac14c3f6475cd3f7b3c1368",
  );
  assert.equal(built.setupStatements.length, 29);
  assert.ok(built.setupStatements.every((sql) => sql.trim().endsWith(";")));
  const identityAt = source.indexOf("const version = assertServerIdentity(identity, context)");
  const freshAt = source.indexOf("assertFreshCluster(", identityAt);
  const buildAt = source.indexOf("buildExpenseNativeSource()", freshAt);
  const setupAt = source.indexOf("for (const statement of source.setupStatements)", buildAt);
  assert.ok(identityAt > 0 && freshAt > identityAt && buildAt > freshAt && setupAt > buildAt);
  assert.match(source, /assert\.ok\(statement\.trim\(\)\.endsWith\(";"\)\)/);
  assert.doesNotMatch(
    source,
    /GRANT\s+(?:ALL|EXECUTE|USAGE|SELECT|INSERT)|new PGlite|\bfetch\(|https?:\/\/|\/dev\/null/,
  );
});
test("all cohorts use observed lock barriers, exact errors, privacy-safe markers and final cleanup", () => {
  assert.match(source, /pg_blocking_pids\(\$\{waiting\.pid\}\)/);
  assert.match(source, /Date\.now\(\) \+ 4000/);
  assert.match(
    source,
    /statement_timeout='12s'.*lock_timeout='8s'.*idle_in_transaction_session_timeout='20s'/,
  );
  for (const label of [
    "same-request",
    "different-operation",
    "changed-binding",
    "outer-transaction",
    "late-ledger-fk",
    "customer-wait",
    "vehicle-wait",
    "financial-wait",
  ])
    assert.ok(source.includes(`stage = "${label}"`));
  assert.match(source, /vendor: null/);
  assert.match(source, /vendor: "Vehicle parts receipt"/);
  assert.match(source, /paymentIntent: "accounts_payable"/);
  assert.match(source, /observedBlock\(observer, writer, owner\)/);
  assert.match(source, /"23503"/);
  assert.match(source, /"42501"/);
  assert.match(source, /"55000"/);
  assert.match(source, /"22023"/);
  assert.match(source, /for \(const kind of \["expense", "journal", "line", "account"\]\)/);
  assert.match(source, /process\.exitCode = 1/);
  assert.match(source, /await closeAll\(\)/);
  assert.match(source, /!interrupted && active\.size === 0 && fatalSessionFailure === null/);
  assert.match(
    source,
    /Native expense PostgreSQL17 rehearsal complete: synthetic owner sessions only\./,
  );
  assert.match(
    source,
    /NOT authority policy global-writer phantom API Auth Storage restore or release acceptance/,
  );
});
