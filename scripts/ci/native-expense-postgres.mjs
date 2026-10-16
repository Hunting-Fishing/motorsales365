// CI-only, Docker-free PG17 independent-session laboratory. Import is inert.
// Positive calls are postgres OWNER + synthetic test.user, never real Auth or
// trusted native shop authority. Ordinary roles are tested ONLY for denial.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { buildExpenseNativeSource } from "../vehicle-receipts/expense-native-source.mjs";
import {
  bindExpenseOperationRequest,
  parseExpenseOperationAcknowledgment,
} from "../vehicle-receipts/expense-operation-contract.mjs";

export const BIN = "/usr/lib/postgresql/17/bin";
export const PORT = "55436";
export const COMMAND_MS = 15000;
export const MAX_OUTPUT = 65536;
const active = new Set();
const admitted = new WeakSet();
let interrupted = false;
let fatalSessionFailure = null;
let stage = "admission";
const stages = new Set([
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
]);
export function safeFailure(value, error) {
  const name = stages.has(value) ? value : "admission";
  let state = "unavailable";
  try {
    const field = error && Object.getOwnPropertyDescriptor(error, "sqlState");
    if (
      field &&
      "value" in field &&
      typeof field.value === "string" &&
      /^[0-9A-Z]{5}$/.test(field.value)
    )
      state = field.value;
  } catch {
    /* hostile diagnostic objects are never reflected into output */
  }
  return `FAIL nativePG17 expense: stage=${name}, sqlState=${state}; no live acceptance.\n`;
}
export function validateContext(env, platform) {
  assert.equal(platform, "linux");
  assert.equal(env.GITHUB_ACTIONS, "true");
  for (const key of Object.keys(env))
    assert.ok(!key.startsWith("PG") && !["DATABASE_URL", "SUPABASE_DB_URL"].includes(key));
  const { RUNNER_TEMP: temp, EXPENSE_NATIVE_ROOT: root } = env;
  for (const value of [temp, root]) {
    assert.equal(typeof value, "string");
    assert.ok(value.startsWith("/") && value !== "/" && !/[\\\x00-\x1f\x7f]/.test(value));
    assert.equal(path.posix.normalize(value), value);
  }
  assert.equal(path.posix.dirname(root), temp);
  assert.match(path.posix.basename(root), /^expense-native\.[A-Za-z0-9]{6}$/);
  return Object.freeze({
    temp,
    root,
    data: `${root}/data`,
    socket: `${root}/socket`,
    passfile: `${root}/pgpass`,
    servicefile: `${root}/pgservice`,
  });
}
export function clientOptions(context) {
  return Object.freeze({
    command: `${BIN}/psql`,
    args: Object.freeze([
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
    ]),
    env: Object.freeze({
      PATH: `${BIN}:/usr/bin:/bin`,
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
      PGPASSFILE: context.passfile,
      PGSERVICEFILE: context.servicefile,
      PGSYSCONFDIR: context.root,
      PGCONNECT_TIMEOUT: "5",
      PGSSLMODE: "disable",
      PGCLIENTENCODING: "UTF8",
    }),
  });
}
export function assertPrivateMetadata(stat, uid, kind, mode) {
  assert.ok(!stat.isSymbolicLink());
  assert.ok(
    kind === "directory" ? stat.isDirectory() : kind === "socket" ? stat.isSocket() : stat.isFile(),
  );
  assert.equal(stat.uid, uid);
  assert.equal(stat.mode & 0o777, mode);
  if (kind === "file") assert.equal(stat.nlink, 1);
}
export function readPrivateFile(value, limit, uid, empty = false) {
  const fd = fs.openSync(value, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = fs.fstatSync(fd);
    assertPrivateMetadata(before, uid, "file", 0o600);
    assert.ok(before.size >= (empty ? 0 : 1) && before.size <= limit);
    const bytes = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const length = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      assert.ok(length > 0);
      offset += length;
    }
    const after = fs.fstatSync(fd),
      named = fs.lstatSync(value);
    assert.ok(!named.isSymbolicLink());
    for (const key of ["dev", "ino", "size", "mtimeMs", "ctimeMs"])
      assert.equal(after[key], before[key]);
    assert.equal(named.dev, before.dev);
    assert.equal(named.ino, before.ino);
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}
export function assertPostmaster(pidText, executable, args, uid, actualUid, context) {
  const pid = pidText.split("\n")[0];
  assert.match(pid, /^[1-9][0-9]{0,9}$/);
  assert.equal(actualUid, uid);
  assert.equal(executable, `${BIN}/postgres`);
  assert.deepEqual(args, [`${BIN}/postgres`, "-D", context.data]);
  return pid;
}
function validateFiles(context) {
  const uid = process.getuid();
  assert.ok(
    fs.lstatSync(context.temp).isDirectory() && !fs.lstatSync(context.temp).isSymbolicLink(),
  );
  assert.equal(fs.realpathSync(context.temp), context.temp);
  for (const value of [context.root, context.data, context.socket]) {
    assertPrivateMetadata(fs.lstatSync(value), uid, "directory", 0o700);
    assert.equal(fs.realpathSync(value), value);
  }
  for (const value of [context.passfile, context.servicefile])
    assert.equal(readPrivateFile(value, 1, uid, true).length, 0);
  assert.equal(readPrivateFile(`${context.data}/PG_VERSION`, 8, uid).toString("ascii"), "17\n");
  for (const program of ["postgres", "psql"]) {
    const value = `${BIN}/${program}`,
      stat = fs.lstatSync(value);
    assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.mode & 0o111);
    assert.equal(stat.uid, 0);
    assert.equal(stat.mode & 0o022, 0);
    assert.equal(fs.realpathSync(value), value);
  }
  const pidText = readPrivateFile(`${context.data}/postmaster.pid`, 4096, uid).toString("utf8"),
    pid = pidText.split("\n")[0];
  assert.match(pid, /^[1-9][0-9]{0,9}$/);
  const fd = fs.openSync(`/proc/${pid}/cmdline`, fs.constants.O_RDONLY),
    bytes = Buffer.alloc(8193);
  let length;
  try {
    length = fs.readSync(fd, bytes, 0, bytes.length, 0);
  } finally {
    fs.closeSync(fd);
  }
  assert.ok(length > 0 && length <= 8192);
  assertPostmaster(
    pidText,
    fs.realpathSync(`/proc/${pid}/exe`),
    bytes.subarray(0, length).toString("utf8").split("\0").filter(Boolean),
    uid,
    fs.statSync(`/proc/${pid}`).uid,
    context,
  );
  assertPrivateMetadata(fs.lstatSync(`${context.socket}/.s.PGSQL.${PORT}`), uid, "socket", 0o700);
  admitted.add(context);
}

export function observeStreamErrors(streams, failed) {
  for (const stream of streams)
    stream?.on("error", () => failed(new Error("Native expense psql stream failed.")));
}
// An injected fake spawn permits offline transport tests. Real spawn requires
// this module's private admission witness; exported construction is not a bypass.
export class PsqlSession {
  constructor(context, spawnImpl = spawn, commandMs = COMMAND_MS) {
    if (spawnImpl === spawn) assert.ok(admitted.has(context) && !interrupted);
    this.context = context;
    this.commandMs = commandMs;
    const config = clientOptions(context);
    this.child = spawnImpl(config.command, [...config.args], {
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...config.env },
    });
    active.add(this);
    this.sequence = 0;
    this.buffer = "";
    this.stderr = "";
    this.outputBytes = 0;
    this.pending = null;
    this.ended = false;
    this.failure = null;
    this.closing = false;
    this.exited = new Promise((resolve) => {
      this.resolveExit = resolve;
    });
    observeStreamErrors([this.child.stdin, this.child.stdout, this.child.stderr], (error) =>
      this.fail(error),
    );
    this.child.stdout?.setEncoding("utf8");
    this.child.stderr?.setEncoding("utf8");
    this.child.stdout?.on("data", (data) => this.receive(data));
    this.child.stderr?.on("data", (data) => {
      this.outputBytes += Buffer.byteLength(data);
      if (this.outputBytes > MAX_OUTPUT)
        return this.fail(new Error("Native expense output limit."));
      this.stderr += data;
    });
    this.child.once("error", () => this.fail(new Error("Native expense psql unavailable.")));
    this.child.once("close", (code, signal) => {
      this.ended = true;
      clearTimeout(this.killer);
      active.delete(this);
      const pending = this.pending;
      if (pending) {
        clearTimeout(pending.timer);
        this.pending = null;
        const error = this.failure ?? new Error("Native expense command failed.");
        error.sqlState = this.stderr.match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})\b/)?.[1];
        pending.reject(error);
      } else if ((code !== 0 || signal || this.stderr.length) && !this.closing) {
        this.failure ??= new Error("Native expense session failed.");
        fatalSessionFailure ??= this.failure;
      }
      this.resolveExit();
    });
  }
  fail(error) {
    this.failure ??= error;
    fatalSessionFailure ??= this.failure;
    void this.close(); // Pending failures settle only when the child CLOSES.
  }
  receive(data) {
    this.outputBytes += Buffer.byteLength(data);
    if (this.outputBytes > MAX_OUTPUT) return this.fail(new Error("Native expense output limit."));
    this.buffer += data;
    while (this.buffer.includes("\n")) {
      const index = this.buffer.indexOf("\n"),
        line = this.buffer.slice(0, index).replace(/\r$/, "");
      this.buffer = this.buffer.slice(index + 1);
      if (!this.pending) return this.fail(new Error("Unsolicited native expense output."));
      if (line === this.pending.marker) {
        if (this.stderr.length || this.failure || interrupted || this.buffer.length)
          return this.fail(new Error("Native expense diagnostics were not empty."));
        const { resolve, lines, timer } = this.pending;
        clearTimeout(timer);
        this.pending = null;
        resolve(lines.filter((value) => value !== ""));
      } else this.pending.lines.push(line);
    }
  }
  command(sql) {
    if (this.pending || this.ended || this.closing || this.failure || interrupted)
      return Promise.reject(new Error("Native expense session unavailable."));
    if (typeof sql !== "string" || Buffer.byteLength(sql) > 131072 || sql.includes("\0"))
      return Promise.reject(new Error("Native expense input limit."));
    const marker = `EXPENSE_NATIVE_DONE_${++this.sequence}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => this.fail(new Error("Native expense command deadline.")),
        this.commandMs,
      );
      this.pending = { marker, resolve, reject, timer, lines: [] };
      try {
        this.child.stdin.write(`${sql}\n\\echo ${marker}\n`, (error) => {
          if (error) this.fail(new Error("Native expense input failed."));
        });
      } catch {
        this.fail(new Error("Native expense input failed."));
      }
    });
  }
  async close() {
    if (!this.ended && !this.closing) {
      this.closing = true;
      this.child.stdin?.destroy();
      this.child.kill("SIGTERM");
      this.killer = setTimeout(() => {
        if (!this.ended) this.child.kill("SIGKILL");
      }, 1000);
    }
    await this.exited;
  }
}
const single = (lines) => {
  assert.equal(lines.length, 1);
  return lines[0];
};
const literal = (value) => (value === null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`);
const uuid = (number) => `70000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
export function invokeSQL(request) {
  const bound = bindExpenseOperationRequest(request);
  const hex = (value) => Buffer.from(value, "utf8").toString("hex");
  return `SELECT receipt_expense_candidate.create_operation(convert_from(decode('${hex(JSON.stringify(bound.payload))}','hex'),'UTF8')::jsonb,convert_from(decode('${hex(bound.binding)}','hex'),'UTF8')::text);`;
}
export function assertServerIdentity(value, context) {
  assert.match(value.version, /^17\d{4}$/);
  assert.match(value.systemId, /^[1-9][0-9]{0,19}$/);
  assert.deepEqual(
    { ...value, version: undefined, systemId: undefined },
    {
      version: undefined,
      systemId: undefined,
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
    },
  );
  return value.version;
}
export function assertFreshCluster(value) {
  assert.deepEqual(value, {
    roles: ["postgres"],
    databases: ["postgres", "template0", "template1"],
    memberships: "0",
    extraSchemas: [],
  });
}
async function session(context, subject = null) {
  const value = new PsqlSession(context);
  try {
    await value.command(
      "SET client_min_messages=warning; SET statement_timeout='12s'; SET lock_timeout='8s'; SET idle_in_transaction_session_timeout='20s'; SET standard_conforming_strings=on;",
    );
    value.pid = Number(single(await value.command("SELECT pg_backend_pid();")));
    assert.ok(Number.isSafeInteger(value.pid) && value.pid > 0);
    if (subject !== null)
      await value.command(`SELECT set_config('test.user',${literal(subject)},false);`);
    return value;
  } catch (error) {
    await value.close();
    throw error;
  }
}
async function withSessions(context, subjects, run) {
  const sessions = [];
  try {
    for (const subject of subjects) sessions.push(await session(context, subject));
    await run(...sessions);
  } finally {
    await Promise.all(sessions.map((value) => value.close()));
  }
}
export async function observedBlock(observer, waiting, blocker) {
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    assert.ok(!interrupted);
    const value = JSON.parse(
      single(
        await observer.command(
          `SELECT json_build_object('exists',EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid=${waiting.pid}),'blocked',${blocker.pid}=ANY(pg_blocking_pids(${waiting.pid})));`,
        ),
      ),
    );
    assert.equal(value.exists, true);
    if (value.blocked === true) return;
    await new Promise((resolve) => setTimeout(resolve, 25)); // Poll cadence, never the proof/barrier.
  }
  throw new Error("Verified native expense blocking barrier absent.");
}
export function expectedError(pending, state) {
  const checked = pending.then(
    () => {
      throw new Error("Required native expense SQL denial absent.");
    },
    (error) => {
      let observed;
      try {
        const field = error && Object.getOwnPropertyDescriptor(error, "sqlState");
        if (
          field &&
          "value" in field &&
          typeof field.value === "string" &&
          /^[0-9A-Z]{5}$/.test(field.value)
        )
          observed = field.value;
      } catch {
        /* Never read diagnostic getters or reflect raw errors. */
      }
      if (observed !== state) {
        const failure = new Error("Unexpected native expense SQL denial.");
        if (observed !== undefined) failure.sqlState = observed;
        throw failure;
      }
    },
  );
  checked.catch(() => {});
  return checked;
}
const result = async (value, request) =>
  parseExpenseOperationAcknowledgment(
    JSON.parse(single(await value.command(invokeSQL(request)))),
    request,
  );

// Exact NUMERIC values are text BEFORE JSON/digest; timestamps and every selected
// row remain in the snapshot. Core PG17 sha256 keeps private fixture rows off logs
// and bounded psql output. This is a same-cluster equality witness, not a backup.
export const SNAPSHOT_SQL = `SELECT encode(sha256(convert_to(jsonb_build_object(
 'receipts',(SELECT coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('total',t.total::text) ORDER BY t.id),'[]'::jsonb) FROM public.vehicle_receipts t),
 'expenses',(SELECT coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('amount',t.amount::text,'tax_amount',t.tax_amount::text) ORDER BY t.id),'[]'::jsonb) FROM shop_manager.expenses t),
 'entries',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id),'[]'::jsonb) FROM shop_manager.journal_entries t),
 'lines',(SELECT coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('debit',t.debit::text,'credit',t.credit::text) ORDER BY t.id),'[]'::jsonb) FROM shop_manager.journal_entry_lines t),
 'accounts',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id),'[]'::jsonb) FROM shop_manager.chart_of_accounts t),
 'outcomes',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.account_id,t.operation_id),'[]'::jsonb) FROM receipt_expense_candidate.outcomes t),
 'customers',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id),'[]'::jsonb) FROM shop_manager.customers t),
 'vehicles',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id),'[]'::jsonb) FROM shop_manager.vehicles t),
 'profiles',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id),'[]'::jsonb) FROM shop_manager.profiles t)
 )::text,'UTF8')),'hex');`;
async function snapshot(observer) {
  const hash = single(await observer.command(SNAPSHOT_SQL));
  assert.match(hash, /^[a-f0-9]{64}$/);
  return hash;
}
async function visible(observer, value, count) {
  assert.deepEqual(
    JSON.parse(
      single(
        await observer.command(`SELECT json_build_object(
    'expenses',(SELECT count(*)::text FROM shop_manager.expenses WHERE vehicle_receipt_id=${literal(value.receiptId)}::uuid),
    'entries',(SELECT count(*)::text FROM shop_manager.journal_entries j JOIN shop_manager.expenses e ON e.id=j.source_id AND j.source_type='expense' WHERE e.vehicle_receipt_id=${literal(value.receiptId)}::uuid),
    'lines',(SELECT count(*)::text FROM shop_manager.journal_entry_lines l JOIN shop_manager.journal_entries j ON j.id=l.journal_entry_id JOIN shop_manager.expenses e ON e.id=j.source_id AND j.source_type='expense' WHERE e.vehicle_receipt_id=${literal(value.receiptId)}::uuid),
    'outcomes',(SELECT count(*)::text FROM receipt_expense_candidate.outcomes WHERE receipt_id=${literal(value.receiptId)}::uuid));`),
      ),
    ),
    {
      expenses: String(count),
      entries: String(count),
      lines: String(count * 2),
      outcomes: String(count),
    },
  );
}
const pass = (name) => {
  assert.ok(!interrupted);
  process.stdout.write(`PASS nativePG17 expense: ${name}.\n`);
};

async function rehearse(context) {
  const observer = await session(context);
  try {
    stage = "server-identity";
    const identity = JSON.parse(
      single(
        await observer.command(`SELECT json_build_object('version',current_setting('server_version_num'),'systemId',(pg_control_system()).system_identifier::text,
      'data',current_setting('data_directory'),'socket',current_setting('unix_socket_directories'),'port',current_setting('port'),
      'listen',current_setting('listen_addresses'),'user',current_user,'session',session_user,'database',current_database(),
      'owner',pg_get_userbyid(d.datdba),'super',r.rolsuper,'recovery',pg_is_in_recovery(),'encoding',current_setting('server_encoding'))
      FROM pg_roles r CROSS JOIN pg_database d WHERE r.rolname=current_user AND d.datname=current_database();`),
      ),
    );
    const version = assertServerIdentity(identity, context);
    process.stdout.write(
      `NativeExpensePG17 server_version_num=${version}; private cluster identity verified.\n`,
    );
    stage = "fresh-cluster";
    assertFreshCluster(
      JSON.parse(
        single(
          await observer.command(`SELECT json_build_object('roles',(SELECT json_agg(rolname ORDER BY rolname) FROM pg_roles WHERE rolname !~ '^pg_'),
      'databases',(SELECT json_agg(datname ORDER BY datname) FROM pg_database),
      'memberships',(SELECT count(*)::text FROM pg_auth_members WHERE pg_get_userbyid(member) !~ '^pg_'),
      'extraSchemas',(SELECT coalesce(json_agg(nspname ORDER BY nspname),'[]'::json) FROM pg_namespace WHERE nspname NOT IN('public','information_schema') AND nspname !~ '^pg_'));`),
        ),
      ),
    );
    stage = "fixture-setup";
    const source = buildExpenseNativeSource();
    assert.equal(source.signature, "receipt_expense_candidate.create_operation(jsonb,text)");
    assert.ok(Array.isArray(source.setupStatements) && source.setupStatements.length > 0);
    for (const statement of source.setupStatements) {
      assert.equal(typeof statement, "string");
      assert.ok(statement.trim().endsWith(";"));
      await observer.command(statement);
    }
    await observer.command(source.candidateSQL);
    const ids = source.ids;
    await observer.command(
      `INSERT INTO shop_manager.customers(id,shop_id) VALUES(${literal(uuid(900))},${literal(ids.shop)});`,
    );
    let ordinal = 0;
    async function request(overrides = {}) {
      const number = ++ordinal;
      const value = {
        version: 1,
        kind: "create",
        operationId: uuid(number * 10 + 1),
        expectedAccountId: ids.manager,
        expectedShopId: ids.shop,
        expectedShopVehicleId: ids.vehicle,
        receiptId: uuid(number * 10 + 2),
        amount: "250.00",
        taxAmount: "0.00",
        currency: "PHP",
        expenseDate: "2026-10-01",
        vendor: "Synthetic native expense",
        paymentIntent: "cash",
        ...overrides,
      };
      await observer.command(
        `INSERT INTO public.vehicle_receipts(id,shop_vehicle_id,created_by,vendor,purchased_on,currency,total,status) VALUES(${literal(value.receiptId)},${literal(ids.vehicle)},${literal(ids.manager)},${literal(value.vendor)},'2026-10-01','PHP',250,'confirmed');`,
      );
      return bindExpenseOperationRequest(value).payload;
    }
    stage = "locked-acl";
    const locked = JSON.parse(
      single(
        await observer.command(`SELECT json_build_object('functions',(SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='receipt_expense_candidate' AND p.prosecdef),
      'policies',(SELECT count(*)::text FROM pg_policies WHERE schemaname='receipt_expense_candidate'),
      'force',(SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='receipt_expense_candidate.outcomes'::regclass),
      'allowed',(SELECT count(*)::text FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role') AND (has_schema_privilege(r.oid,'receipt_expense_candidate','USAGE') OR has_function_privilege(r.oid,'receipt_expense_candidate.create_operation(jsonb,text)','EXECUTE') OR has_table_privilege(r.oid,'receipt_expense_candidate.outcomes','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'))));`),
      ),
    );
    assert.deepEqual(locked, { functions: "0", policies: "0", force: true, allowed: "0" });
    for (const role of ["anon", "authenticated", "service_role"])
      await withSessions(context, [null], async (denied) => {
        await expectedError(
          denied.command(
            `SET ROLE ${role}; SELECT receipt_expense_candidate.create_operation('{}'::jsonb,'x');`,
          ),
          "42501",
        );
      });
    pass("locked ordinary-role denial; owner/GUC positives only, not authority");

    stage = "same-request";
    await withSessions(context, [ids.manager, ids.manager], async (first, second) => {
      const value = await request();
      await first.command("BEGIN;");
      const ack = await result(first, value),
        saved = await snapshot(first);
      await visible(observer, value, 0);
      const pending = result(second, value);
      pending.catch(() => {});
      await observedBlock(observer, second, first);
      await first.command("COMMIT;");
      assert.deepEqual(await pending, ack);
      await visible(observer, value, 1);
      assert.equal(await snapshot(observer), saved);
    });
    pass("same request waits then exact replay without timestamp/repost writes");
    stage = "different-operation";
    await withSessions(context, [ids.manager, ids.manager], async (first, second) => {
      const value = await request();
      await first.command("BEGIN;");
      await result(first, value);
      const saved = await snapshot(first);
      const pending = expectedError(
        second.command(invokeSQL({ ...value, operationId: uuid(800) })),
        "55000",
      );
      await observedBlock(observer, second, first);
      await first.command("COMMIT;");
      await pending;
      await visible(observer, value, 1);
      assert.equal(await snapshot(observer), saved);
    });
    pass("different operation same receipt refused after observed wait");
    stage = "changed-binding";
    await withSessions(context, [ids.manager, ids.manager], async (first, second) => {
      const value = await request();
      await first.command("BEGIN;");
      await result(first, value);
      const saved = await snapshot(first);
      const pending = expectedError(
        second.command(invokeSQL({ ...value, paymentIntent: "accounts_payable" })),
        "22023",
      );
      await observedBlock(observer, second, first);
      await first.command("COMMIT;");
      await pending;
      assert.equal(await snapshot(observer), saved);
    });
    await withSessions(context, [ids.manager, ids.manager], async (first, second) => {
      const value = await request({ vendor: null });
      await first.command("BEGIN;");
      const ack = await result(first, value);
      assert.equal(ack.expense.description, "Vehicle parts receipt");
      const changed = { ...value, vendor: "Vehicle parts receipt" };
      const pending = expectedError(second.command(invokeSQL(changed)), "22023");
      await observedBlock(observer, second, first);
      // Fixture-only owner drift makes the second request match the CURRENT
      // receipt, isolating full ledger binding despite equal descriptions.
      await first.command(
        `UPDATE public.vehicle_receipts SET vendor='Vehicle parts receipt' WHERE id=${literal(value.receiptId)};`,
      );
      const saved = await snapshot(first);
      await first.command("COMMIT;");
      await pending;
      assert.equal(await snapshot(observer), saved);
      await visible(observer, value, 1);
    });
    pass("same operation changed full binding refused after observed wait");
    stage = "outer-transaction";
    await withSessions(context, [ids.manager, null], async (owner, writer) => {
      const value = await request(),
        before = await snapshot(observer);
      await owner.command("BEGIN;");
      await result(owner, value);
      await visible(observer, value, 0);
      assert.equal(await snapshot(observer), before);
      await owner.command("ROLLBACK;");
      assert.equal(await snapshot(observer), before);
      await owner.command("BEGIN;");
      const ack = await result(owner, value);
      await visible(observer, value, 0);
      const saved = await snapshot(owner);
      const pending = writer.command(
        `BEGIN; UPDATE shop_manager.customers SET shop_id=shop_id WHERE id=${literal(ids.customer)};`,
      );
      pending.catch(() => {});
      await observedBlock(observer, writer, owner);
      await owner.command("COMMIT;");
      await pending;
      await writer.command("ROLLBACK;");
      await visible(observer, value, 1);
      assert.equal(await snapshot(observer), saved);
      assert.deepEqual(await result(owner, value), ack);
    });
    pass("outer result invisible until COMMIT; ROLLBACK restores every selected financial row");
    stage = "late-ledger-fk";
    const accountFault = await request({ paymentIntent: "accounts_payable" });
    assert.equal(
      single(
        await observer.command(
          "SELECT count(*)::text FROM shop_manager.chart_of_accounts WHERE code='2000';",
        ),
      ),
      "0",
    );
    await observer.command(`CREATE FUNCTION public.lab_native_expense_account_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.line_order=1 AND EXISTS(SELECT 1 FROM shop_manager.journal_entries j JOIN shop_manager.expenses e ON e.id=j.source_id
          WHERE j.id=NEW.journal_entry_id AND e.vehicle_receipt_id=${literal(accountFault.receiptId)}::uuid) THEN
        IF(SELECT count(*) FROM shop_manager.journal_entry_lines WHERE journal_entry_id=NEW.journal_entry_id)<>1
          OR(SELECT count(*) FROM shop_manager.chart_of_accounts WHERE code='2000')<>1
          OR EXISTS(SELECT 1 FROM receipt_expense_candidate.outcomes WHERE receipt_id=${literal(accountFault.receiptId)}::uuid)
        THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Synthetic late account boundary absent'; END IF;
        NEW.account_id=${literal(ids.absent)}::uuid;
      END IF; RETURN NEW; END $$;
      CREATE TRIGGER lab_native_expense_account_fault BEFORE INSERT ON shop_manager.journal_entry_lines FOR EACH ROW EXECUTE FUNCTION public.lab_native_expense_account_fault();`);
    try {
      const before = await snapshot(observer);
      await withSessions(context, [ids.manager], async (owner) => {
        await expectedError(owner.command(invokeSQL(accountFault)), "23503");
      });
      assert.equal(await snapshot(observer), before);
      await visible(observer, accountFault, 0);
      assert.equal(
        single(
          await observer.command(
            "SELECT count(*)::text FROM shop_manager.chart_of_accounts WHERE code='2000';",
          ),
        ),
        "0",
      );
      assert.equal(
        single(
          await observer.command(
            "SELECT count(*)::text FROM pg_constraint WHERE conrelid='shop_manager.journal_entry_lines'::regclass AND contype='f' AND convalidated;",
          ),
        ),
        "2",
      );
    } finally {
      await observer.command(
        "DROP TRIGGER lab_native_expense_account_fault ON shop_manager.journal_entry_lines; DROP FUNCTION public.lab_native_expense_account_fault();",
      );
    }
    const fault = await request({ paymentIntent: "accounts_payable" });
    await observer.command(`CREATE FUNCTION public.lab_native_expense_ledger_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.receipt_id=${literal(fault.receiptId)}::uuid THEN
        IF NOT EXISTS(SELECT 1 FROM shop_manager.expenses WHERE id=NEW.expense_id)
          OR(SELECT count(*) FROM shop_manager.journal_entry_lines WHERE journal_entry_id=NEW.journal_entry_id)<>2
          OR(SELECT count(*) FROM shop_manager.chart_of_accounts WHERE code='2000')<>1
        THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Synthetic late boundary absent'; END IF;
        NEW.journal_entry_id=${literal(ids.absent)}::uuid;
      END IF; RETURN NEW; END $$;
      CREATE TRIGGER lab_native_expense_ledger_fault BEFORE INSERT ON receipt_expense_candidate.outcomes FOR EACH ROW EXECUTE FUNCTION public.lab_native_expense_ledger_fault();`);
    try {
      const before = await snapshot(observer);
      await withSessions(context, [ids.manager], async (owner) => {
        await expectedError(owner.command(invokeSQL(fault)), "23503");
      });
      assert.equal(await snapshot(observer), before);
      await visible(observer, fault, 0);
      assert.equal(
        single(
          await observer.command(
            "SELECT count(*)::text FROM shop_manager.chart_of_accounts WHERE code='2000';",
          ),
        ),
        "0",
      );
      assert.equal(
        single(
          await observer.command(
            "SELECT count(*)::text FROM pg_constraint WHERE conrelid='receipt_expense_candidate.outcomes'::regclass AND contype='f' AND convalidated;",
          ),
        ),
        "4",
      );
    } finally {
      await observer.command(
        "DROP TRIGGER lab_native_expense_ledger_fault ON receipt_expense_candidate.outcomes; DROP FUNCTION public.lab_native_expense_ledger_fault();",
      );
    }
    pass("real late account and ledger FK23503 roll all selected financial effects back");

    stage = "customer-wait";
    await withSessions(context, [null, ids.manager], async (locker, owner) => {
      const value = await request();
      await locker.command(
        `BEGIN; SELECT id FROM shop_manager.customers WHERE id=${literal(ids.customer)} FOR UPDATE;`,
      );
      const pending = expectedError(owner.command(invokeSQL(value)), "42501");
      await observedBlock(observer, owner, locker);
      await locker.command(
        `UPDATE shop_manager.customers SET shop_id=${literal(ids.otherShop)} WHERE id=${literal(ids.customer)}; UPDATE shop_manager.profiles SET shop_id=${literal(ids.otherShop)} WHERE id=${literal(ids.manager)}; COMMIT;`,
      );
      const afterDrift = await snapshot(observer);
      await pending;
      assert.equal(await snapshot(observer), afterDrift);
      await visible(observer, value, 0);
    });
    await observer.command(
      `UPDATE shop_manager.customers SET shop_id=${literal(ids.shop)} WHERE id=${literal(ids.customer)}; UPDATE shop_manager.profiles SET shop_id=${literal(ids.shop)} WHERE id=${literal(ids.manager)};`,
    );
    pass("customer shop drift after observed wait refuses prior shop intent");
    stage = "vehicle-wait";
    await withSessions(context, [null, ids.manager], async (locker, owner) => {
      const value = await request();
      await locker.command(
        `BEGIN; SELECT id FROM shop_manager.vehicles WHERE id=${literal(ids.vehicle)} FOR UPDATE;`,
      );
      const pending = expectedError(owner.command(invokeSQL(value)), "42501");
      await observedBlock(observer, owner, locker);
      await locker.command(
        `UPDATE shop_manager.vehicles SET customer_id=${literal(uuid(900))} WHERE id=${literal(ids.vehicle)}; COMMIT;`,
      );
      const afterDrift = await snapshot(observer);
      await pending;
      assert.equal(await snapshot(observer), afterDrift);
      await visible(observer, value, 0);
    });
    await observer.command(
      `UPDATE shop_manager.vehicles SET customer_id=${literal(ids.customer)} WHERE id=${literal(ids.vehicle)};`,
    );
    pass("vehicle customer drift after observed wait refuses stale join binding");
    stage = "financial-wait";
    for (const kind of ["expense", "journal", "line", "account"]) {
      const value = await request();
      let ack;
      await withSessions(context, [ids.manager], async (owner) => {
        ack = await result(owner, value);
      });
      const [table, id, change] =
        kind === "expense"
          ? ["shop_manager.expenses", ack.expense.id, "amount=249.99"]
          : kind === "journal"
            ? ["shop_manager.journal_entries", ack.journal.id, "status='void'"]
            : kind === "line"
              ? ["shop_manager.journal_entry_lines", ack.journal.lines[1].id, "credit=250.01"]
              : [
                  "shop_manager.chart_of_accounts",
                  ack.journal.lines[1].accountId,
                  "name='Synthetic changed account'",
                ];
      await withSessions(context, [null, ids.manager], async (locker, owner) => {
        await locker.command(`BEGIN; SELECT id FROM ${table} WHERE id=${literal(id)} FOR UPDATE;`);
        const pending = expectedError(owner.command(invokeSQL(value)), "55000");
        await observedBlock(observer, owner, locker);
        await locker.command(`UPDATE ${table} SET ${change} WHERE id=${literal(id)}; COMMIT;`);
        const afterDrift = await snapshot(observer);
        await pending;
        assert.equal(await snapshot(observer), afterDrift);
        await visible(observer, value, 1);
      });
      if (kind === "account")
        await observer.command(
          `UPDATE shop_manager.chart_of_accounts SET name='Cash' WHERE id=${literal(id)};`,
        );
    }
    pass(
      "expense journal line account drift after observed waits is rechecked without replay writes",
    );
    stage = "complete";
    pass(
      "complete; synthetic owner/GUC only, NOT authority policy global-writer phantom API Auth Storage restore or release acceptance",
    );
  } finally {
    await observer.close();
  }
}
async function closeAll() {
  await Promise.all([...active].map((value) => value.close()));
}
export async function runNativeExpense(env = process.env, platform = process.platform) {
  stage = "admission";
  assert.ok(!interrupted);
  const context = validateContext(env, platform);
  validateFiles(context);
  try {
    await rehearse(context);
  } finally {
    await closeAll();
  }
  assert.ok(!interrupted && active.size === 0 && fatalSessionFailure === null);
  process.stdout.write(
    "Native expense PostgreSQL17 rehearsal complete: synthetic owner sessions only.\n",
  );
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const stop = () => {
    interrupted = true;
    process.exitCode = 1;
    void closeAll();
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  try {
    assert.deepEqual(process.argv.slice(2), ["--run"]);
    await runNativeExpense();
    assert.ok(!interrupted);
  } catch (error) {
    process.stdout.write(safeFailure(stage, error));
    process.exitCode = 1;
  } finally {
    await closeAll();
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
  }
}
