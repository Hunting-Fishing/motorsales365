// CI-only fresh native PG17 mixed-writer mechanics. Import is inert: no child,
// connection or SQL execution. Owner/test.user positives are SYNTHETIC, never
// original-human/session/native business authority or global no-oversell proof.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { buildMixedReservationOrderSource } from "../parts-stock/mixed-reservation-order-source.mjs";

export const BIN = "/usr/lib/postgresql/17/bin";
export const PORT = "55437";
export const COMMAND_MS = 15000;
export const MAX_OUTPUT = 65536;
export const STOCK_STAGES = Object.freeze([
  "admission",
  "server-identity",
  "fresh-cluster",
  "fixture-setup",
  "locked-acl",
  "b2b-commit",
  "inquiry-commit",
  "b2b-rollback",
  "inquiry-rollback",
  "outer-transaction",
  "late-event-fk",
  "complete",
]);
export const REQUIRED_STOCK_MARKERS = Object.freeze([
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
export const STOCK_SERVER_PATTERN =
  "^NativeMixedStockPG17 server_version_num=17[0-9]{4}; private cluster identity verified\\.$";
export const STOCK_FAILURE_PATTERN =
  "^FAIL nativePG17 mixed-stock: stage=(" +
  STOCK_STAGES.join("|") +
  "), sqlState=([0-9A-Z]{5}|unavailable); no live acceptance\\.$";
const active = new Set();
const admitted = new WeakSet();
let interrupted = false;
let fatalSessionFailure = null;
let stage = "admission";
export function safeFailure(value, error) {
  const name = STOCK_STAGES.includes(value) ? value : "admission";
  let state = "unavailable";
  try {
    const descriptor = error && Object.getOwnPropertyDescriptor(error, "sqlState");
    if (
      descriptor &&
      "value" in descriptor &&
      typeof descriptor.value === "string" &&
      /^[0-9A-Z]{5}$/.test(descriptor.value)
    )
      state = descriptor.value;
  } catch {
    /* Never reflect getters, private diagnostics or SQL. */
  }
  return `FAIL nativePG17 mixed-stock: stage=${name}, sqlState=${state}; no live acceptance.\n`;
}
export function validateContext(env, platform) {
  assert.equal(platform, "linux");
  assert.ok(env && typeof env === "object" && !Array.isArray(env));
  assert.ok([Object.prototype, null].includes(Object.getPrototypeOf(env)));
  const descriptors = Object.getOwnPropertyDescriptors(env);
  for (const key of Reflect.ownKeys(descriptors)) {
    assert.equal(typeof key, "string");
    assert.ok(!/^(?:PG|DB|DATABASE|SUPABASE_DB)/.test(key));
    assert.ok(descriptors[key].enumerable && Object.hasOwn(descriptors[key], "value"));
    assert.equal(typeof descriptors[key].value, "string");
  }
  const own = (key) => descriptors[key]?.value;
  assert.equal(own("GITHUB_ACTIONS"), "true");
  const temp = own("RUNNER_TEMP"),
    root = own("STOCK_NATIVE_ROOT");
  for (const value of [temp, root]) {
    assert.equal(typeof value, "string");
    assert.ok(value.startsWith("/") && value !== "/" && !/[\\\x00-\x1f\x7f]/.test(value));
    assert.equal(path.posix.normalize(value), value);
  }
  assert.equal(path.posix.dirname(root), temp);
  assert.match(path.posix.basename(root), /^stock-native\.[A-Za-z0-9]{6}$/);
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
    stream?.on("error", () => failed(new Error("Native mixed stock psql stream failed.")));
}
// An injected fake spawn permits offline transport tests. Real spawn requires
// this module's private admission witness; exported construction is not a bypass.
export class PsqlSession {
  constructor(context, spawnImpl = spawn, commandMs = COMMAND_MS) {
    if (spawnImpl === spawn)
      assert.ok(admitted.has(context) && !interrupted && commandMs === COMMAND_MS);
    assert.ok(Number.isSafeInteger(commandMs) && commandMs > 0 && commandMs <= COMMAND_MS);
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
        return this.fail(new Error("Native mixed stock output limit."));
      this.stderr += data;
      // Diagnostics arriving after an already delivered marker are never
      // hidden by a later explicit close; expected SQL errors remain pending
      // until ON_ERROR_STOP exits and the child CLOSE event settles rejection.
      if (!this.pending) this.fail(new Error("Native mixed stock late diagnostics."));
    });
    this.child.once("error", () => this.fail(new Error("Native mixed stock psql unavailable.")));
    this.child.once("close", (code, signal) => {
      this.ended = true;
      clearTimeout(this.killer);
      active.delete(this);
      const pending = this.pending;
      if (pending) {
        clearTimeout(pending.timer);
        this.pending = null;
        const error = this.failure ?? new Error("Native mixed stock command failed.");
        error.sqlState = this.stderr.match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})\b/)?.[1];
        pending.reject(error);
      } else if ((code !== 0 || signal || this.stderr.length) && !this.closing) {
        this.failure ??= new Error("Native mixed stock session failed.");
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
    if (this.outputBytes > MAX_OUTPUT)
      return this.fail(new Error("Native mixed stock output limit."));
    this.buffer += data;
    while (this.buffer.includes("\n")) {
      const index = this.buffer.indexOf("\n"),
        line = this.buffer.slice(0, index).replace(/\r$/, "");
      this.buffer = this.buffer.slice(index + 1);
      if (!this.pending) return this.fail(new Error("Unsolicited native mixed stock output."));
      if (line === this.pending.marker) {
        if (this.stderr.length || this.failure || interrupted || this.buffer.length)
          return this.fail(new Error("Native mixed stock diagnostics were not empty."));
        const { resolve, lines, timer } = this.pending;
        clearTimeout(timer);
        this.pending = null;
        resolve(lines.filter((value) => value !== ""));
      } else this.pending.lines.push(line);
    }
  }
  command(sql) {
    if (this.pending || this.ended || this.closing || this.failure || interrupted)
      return Promise.reject(new Error("Native mixed stock session unavailable."));
    if (typeof sql !== "string" || Buffer.byteLength(sql) > 131072 || sql.includes("\0"))
      return Promise.reject(new Error("Native mixed stock input limit."));
    const marker = `MIXED_STOCK_NATIVE_DONE_${++this.sequence}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => this.fail(new Error("Native mixed stock command deadline.")),
        this.commandMs,
      );
      this.pending = { marker, resolve, reject, timer, lines: [] };
      try {
        this.child.stdin.write(`${sql}\n\\echo ${marker}\n`, (error) => {
          if (error) this.fail(new Error("Native mixed stock input failed."));
        });
      } catch {
        this.fail(new Error("Native mixed stock input failed."));
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
const json = async (session, sql) => JSON.parse(single(await session.command(sql)));
const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const quotedUuid = (value) => {
  assert.match(value, uuidPattern);
  return `'${value}'::uuid`;
};
const text = (value) =>
  value === null
    ? "NULL"
    : `pg_catalog.convert_from(pg_catalog.decode('${Buffer.from(value, "utf8").toString("hex")}','hex'),'UTF8')`;
const jsonb = (value) => `${text(JSON.stringify(value))}::jsonb`;
export function assertServerIdentity(value, context) {
  assert.match(value.version, /^17[0-9]{4}$/);
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
    publicObjects: "0",
    publicFunctions: "0",
    extensions: ["plpgsql"],
    foreignServers: "0",
    subscriptions: "0",
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
      await value.command(`SELECT set_config('test.user',${text(subject)},false);`);
    return value;
  } catch (error) {
    await value.close();
    throw error;
  }
}
async function withWriters(context, observer, subject, run) {
  const values = [];
  try {
    values.push(await session(context, subject));
    values.push(await session(context, subject));
    assert.equal(new Set([observer.pid, ...values.map((value) => value.pid)]).size, 3);
    await run(...values);
  } finally {
    await Promise.all(values.map((value) => value.close()));
  }
}
export async function observedBlock(observer, waiter, blocker) {
  assert.equal(new Set([observer.pid, waiter.pid, blocker.pid]).size, 3);
  const deadline = performance.now() + 4000;
  while (performance.now() < deadline) {
    assert.ok(!interrupted);
    const value = await json(
      observer,
      `SELECT json_build_object('exists',EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid=${waiter.pid}),
      'blocked',${blocker.pid}=ANY(pg_blocking_pids(${waiter.pid})),
      'activeLock',EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid=${waiter.pid} AND state='active' AND wait_event_type='Lock'));`,
    );
    assert.equal(value.exists, true);
    if (value.blocked === true && value.activeLock === true) return;
    await new Promise((resolve) => setTimeout(resolve, 25)); // Poll cadence is NOT the evidence.
  }
  throw new Error("Verified native mixed stock blocking barrier absent.");
}
export function expectedError(pending, expectedState) {
  const checked = pending.then(
    () => {
      throw new Error("Required native mixed stock denial absent.");
    },
    (error) => {
      let observed;
      try {
        const descriptor = error && Object.getOwnPropertyDescriptor(error, "sqlState");
        if (
          descriptor &&
          "value" in descriptor &&
          typeof descriptor.value === "string" &&
          /^[0-9A-Z]{5}$/.test(descriptor.value)
        )
          observed = descriptor.value;
      } catch {
        /* No getter/raw error reflection. */
      }
      if (observed !== expectedState) {
        const failure = new Error("Unexpected native mixed stock SQL denial.");
        if (observed !== undefined) failure.sqlState = observed;
        throw failure;
      }
    },
  );
  checked.catch(() => {});
  return checked;
}
const inquiryFields = Object.freeze([
  "status",
  "reserved_item_id",
  "reserved_quantity",
  "reserved_until",
  "response_note",
  "responded_at",
  "responded_by",
]);
const acceptanceFields = Object.freeze({
  "public.parts_orders": ["status", "supplier_note", "accepted_at", "updated_at"],
  "public.parts_order_lines": ["accepted_quantity", "updated_at"],
  "public.business_inventory_items": ["qty_on_hold", "updated_at"],
});

// Same-cluster complete graph witnesses, NOT backups. Every actual NUMERIC is
// converted to TEXT before JSON hashing. All selected data, events, synthetic
// Auth, catalog/ACL/RLS/defaults/FKs/functions/triggers, role flags, session
// settings and sequence state are included. No row data or SQL is printed.
async function graphReader(observer, source) {
  const names = source.tables.map(([schema, table]) => `${schema}.${table}`);
  assert.equal(names.length, 14);
  assert.equal(new Set(names).size, 14);
  for (const name of names) assert.match(name, /^[a-z_]+\.[a-z_]+$/);
  const columns = await json(
    observer,
    `SELECT coalesce(json_agg(json_build_object('table',n.nspname||'.'||c.relname,'name',a.attname) ORDER BY n.nspname,c.relname,a.attnum),'[]'::json)
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE a.attnum>0 AND NOT a.attisdropped AND a.atttypid='pg_catalog.numeric'::regtype
      AND a.attrelid IN(${names.map((name) => `'${name}'::regclass`).join(",")});`,
  );
  assert.ok(Array.isArray(columns) && columns.length > 0 && columns.length < 128);
  const numeric = new Map(names.map((name) => [name, []]));
  for (const column of columns) {
    assert.ok(numeric.has(column.table));
    assert.match(column.name, /^[a-z_][a-z0-9_]*$/);
    assert.ok(!numeric.get(column.table).includes(column.name));
    numeric.get(column.table).push(column.name);
  }
  const rowExpression = (name, alias = "t") =>
    `to_jsonb(${alias})` +
    (numeric.get(name).length
      ? `||jsonb_build_object(${numeric
          .get(name)
          .map((column) => `'${column}',${alias}.${column}::text`)
          .join(",")})`
      : "");
  const schemas = "('auth','public','shop_manager','mixed_reservation_candidate')";
  const catalogQueries = {
    namespaces: `SELECT n.nspname,r.rolname owner,n.nspacl::text FROM pg_namespace n JOIN pg_roles r ON r.oid=n.nspowner WHERE n.nspname IN ${schemas} ORDER BY 1`,
    tables: `SELECT n.nspname,c.relname,c.relkind,r.rolname owner,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner WHERE n.nspname IN ${schemas} AND c.relkind IN('r','S') ORDER BY 1,2`,
    columns: `SELECT n.nspname,c.relname,a.attname,format_type(a.atttypid,a.atttypmod) type,a.attnotnull,a.attacl::text,pg_get_expr(d.adbin,d.adrelid) default_expression FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname IN ${schemas} AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1,2,a.attnum`,
    constraints: `SELECT n.nspname,c.relname,k.conname,k.contype,k.convalidated,k.condeferrable,k.condeferred,pg_get_constraintdef(k.oid) definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ${schemas} ORDER BY 1,2,3`,
    indexes: `SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN ${schemas} ORDER BY 1,2,3`,
    policies: `SELECT * FROM pg_policies WHERE schemaname IN ${schemas} ORDER BY schemaname,tablename,policyname`,
    functions: `SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args,r.rolname owner,p.prosecdef,p.provolatile,p.proconfig,p.proacl::text,pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname IN ${schemas} ORDER BY 1,2,3`,
    triggers: `SELECT n.nspname,c.relname,t.tgname,t.tgenabled,t.tgisinternal,pg_get_triggerdef(t.oid) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ${schemas} ORDER BY 1,2,3`,
    roles:
      "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolconnlimit,rolvaliduntil,rolbypassrls FROM pg_roles ORDER BY rolname",
    memberships:
      "SELECT pg_get_userbyid(roleid) role,pg_get_userbyid(member) member,pg_get_userbyid(grantor) grantor,admin_option,inherit_option,set_option FROM pg_auth_members ORDER BY 1,2,3",
    types: `SELECT n.nspname,t.typname,t.typtype,t.typcategory,t.typnotnull,t.typdefault,
      (SELECT coalesce(jsonb_agg(e.enumlabel ORDER BY e.enumsortorder),'[]'::jsonb) FROM pg_enum e WHERE e.enumtypid=t.oid) labels
      FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname IN ${schemas} ORDER BY 1,2`,
  };
  const digest = async (normalization = { fields: [], exclude: [] }) => {
    const data = names.map((name) => {
      let expression = rowExpression(name);
      for (const change of normalization.fields.filter((entry) => entry.table === name))
        expression = `CASE WHEN t.id=${quotedUuid(change.id)} THEN (${expression})||${jsonb(change.values)} ELSE (${expression}) END`;
      const exclude = normalization.exclude.filter((entry) => entry.table === name);
      const where = exclude.length
        ? ` WHERE t.id NOT IN(${exclude.map((entry) => quotedUuid(entry.id)).join(",")})`
        : "";
      return `'${name}',(SELECT coalesce(jsonb_agg(${expression} ORDER BY t.${name === "public.business_types" ? "slug" : "id"}),'[]'::jsonb) FROM ${name} t${where})`;
    });
    const catalog = Object.entries(catalogQueries).map(
      ([name, sql]) =>
        `'${name}',(SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) FROM (${sql}) c)`,
    );
    const value = single(
      await observer.command(`SELECT encode(sha256(convert_to(jsonb_build_object(
      'data',jsonb_build_object(${data.join(",")}),
      'catalog',jsonb_build_object(${catalog.join(",")}),
      'settings',jsonb_build_object('user',current_user,'session',session_user,'role',current_setting('role'),'search_path',current_setting('search_path'),'subject',current_setting('test.user',true),'statement_timeout',current_setting('statement_timeout'),'lock_timeout',current_setting('lock_timeout')),
      'sequence',(SELECT jsonb_build_object('last_value',last_value::text,'is_called',is_called) FROM public.parts_order_number_seq)
      )::text,'UTF8')),'hex');`),
    );
    assert.match(value, /^[a-f0-9]{64}$/);
    return value;
  };
  const rows = async (reader, cohort) =>
    json(
      reader,
      `SELECT json_build_object(
    'order',(SELECT ${rowExpression("public.parts_orders")} FROM public.parts_orders t WHERE id=${quotedUuid(cohort.order)}),
    'line',(SELECT ${rowExpression("public.parts_order_lines")} FROM public.parts_order_lines t WHERE id=${quotedUuid(cohort.line)}),
    'item',(SELECT ${rowExpression("public.business_inventory_items")} FROM public.business_inventory_items t WHERE id=${quotedUuid(cohort.item)}),
    'inquiry',(SELECT ${rowExpression("public.network_part_inquiries")} FROM public.network_part_inquiries t WHERE id=${quotedUuid(cohort.inquiry)}),
    'reservations',(SELECT coalesce(json_agg(${rowExpression("public.parts_reservations")} ORDER BY id),'[]'::json) FROM public.parts_reservations t WHERE order_id=${quotedUuid(cohort.order)}),
    'events',(SELECT coalesce(json_agg(to_jsonb(t) ORDER BY id),'[]'::json) FROM public.parts_order_events t WHERE order_id=${quotedUuid(cohort.order)}));`,
    );
  const persisted = async (cohort, witness) => {
    // Full-row comparisons bind every acknowledged field after COMMIT, not
    // just the fields later allowed in normalized snapshot comparison.
    const pairs = [
      ["order", "public.parts_orders", cohort.order],
      ["line", "public.parts_order_lines", cohort.line],
      ["item", "public.business_inventory_items", cohort.item],
      ["inquiry", "public.network_part_inquiries", cohort.inquiry],
    ];
    const predicates = pairs.map(
      ([key, name, id]) =>
        `(SELECT ${rowExpression(name)}=${jsonb(witness[key])} FROM ${name} t WHERE id=${quotedUuid(id)})`,
    );
    for (const [key, name] of [
      ["reservations", "public.parts_reservations"],
      ["events", "public.parts_order_events"],
    ])
      predicates.push(
        `(SELECT coalesce(jsonb_agg(${rowExpression(name)} ORDER BY id),'[]'::jsonb)=${jsonb(witness[key])} FROM ${name} t WHERE order_id=${quotedUuid(cohort.order)})`,
      );
    assert.equal(
      single(await observer.command(`SELECT (${predicates.join(" AND ")})::text;`)),
      "true",
    );
  };
  return { digest, rows, persisted };
}

function cohortIds(index) {
  assert.ok(Number.isSafeInteger(index) && index >= 1 && index <= 6);
  const ending = String(index).padStart(12, "0");
  return Object.freeze({
    item: `81000000-0000-4000-8000-${ending}`,
    inquiry: `82000000-0000-4000-8000-${ending}`,
    order: `83000000-0000-4000-8000-${ending}`,
    line: `84000000-0000-4000-8000-${ending}`,
  });
}
async function seedFresh(observer, ids, cohort) {
  await observer.command(`INSERT INTO public.business_inventory_items(id,business_id,name,qty_on_hand,updated_at)
    VALUES(${quotedUuid(cohort.item)},${quotedUuid(ids.business)},'Fresh synthetic native item',10,'2001-01-01T00:00:00Z');
    INSERT INTO public.network_part_inquiries(id,business_id,item_id,part_name,contact_name,contact_email)
    VALUES(${quotedUuid(cohort.inquiry)},${quotedUuid(ids.business)},${quotedUuid(cohort.item)},'Fresh synthetic inquiry','Fixture','native@example.invalid');
    INSERT INTO public.parts_orders(id,requester_business_id,supplier_business_id,created_by,status,updated_at)
    VALUES(${quotedUuid(cohort.order)},${quotedUuid(ids.otherBusiness)},${quotedUuid(ids.business)},${quotedUuid(ids.actor)},'submitted','2001-01-01T00:00:00Z');
    INSERT INTO public.parts_order_lines(id,order_id,inventory_item_id,name_snapshot,requested_quantity,accepted_quantity,unit_price,line_total,updated_at)
    VALUES(${quotedUuid(cohort.line)},${quotedUuid(cohort.order)},${quotedUuid(cohort.item)},'Fresh synthetic native B2B line',8,0,0,0,'2001-01-01T00:00:00Z');`);
}
const transitionSQL = (cohort) =>
  `SELECT public.transition_parts_network_order(${quotedUuid(cohort.order)},'accepted','Synthetic transition note',72);`;
const inquirySQL = (ids, cohort, quantity) => {
  assert.ok(["2", "5"].includes(quantity));
  return `SELECT mixed_reservation_candidate.reserve_inquiry(${quotedUuid(ids.actor)},${quotedUuid(ids.business)},${quotedUuid(cohort.inquiry)},${quotedUuid(cohort.item)},${quantity}::numeric,24,'Synthetic inquiry note');`;
};
const acceptanceResult = async (writer, cohort) =>
  assert.deepEqual(JSON.parse(single(await writer.command(transitionSQL(cohort)))), {
    id: cohort.order,
    status: "accepted",
  });
async function inquiryResult(pending, ids, cohort, quantity, orderHolds) {
  const ack = JSON.parse(single(await pending));
  assert.deepEqual(
    Object.keys(ack).sort(),
    [
      "accountId",
      "businessId",
      "inquiryId",
      "itemId",
      "quantity",
      "reservedUntil",
      "otherInquiryHolds",
      "orderHolds",
      "availableBefore",
      "availableAfter",
    ].sort(),
  );
  for (const [name, value] of Object.entries({
    accountId: ids.actor,
    businessId: ids.business,
    inquiryId: cohort.inquiry,
    itemId: cohort.item,
  }))
    assert.equal(ack[name], value);
  const units = (value) => {
    assert.match(value, /^\d+(?:\.\d{1,2})?$/);
    const [whole, fraction = ""] = value.split(".");
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  };
  assert.equal(units(ack.quantity), BigInt(quantity) * 100n);
  assert.equal(units(ack.orderHolds), BigInt(orderHolds) * 100n);
  assert.equal(units(ack.otherInquiryHolds), 0n);
  assert.equal(units(ack.availableBefore), (10n - BigInt(orderHolds)) * 100n);
  assert.equal(units(ack.availableAfter), (10n - BigInt(orderHolds) - BigInt(quantity)) * 100n);
  assert.ok(Number.isFinite(Date.parse(ack.reservedUntil)));
}
function assertFreshWitness(before, ids, cohort) {
  for (const key of ["order", "line", "item", "inquiry"]) assert.ok(before[key]);
  assert.equal(before.order.status, "submitted");
  assert.equal(before.order.supplier_business_id, ids.business);
  assert.equal(before.line.inventory_item_id, cohort.item);
  assert.equal(before.line.requested_quantity, "8.00");
  assert.equal(before.line.accepted_quantity, "0.00");
  assert.equal(before.item.qty_on_hand, "10.00");
  assert.equal(before.item.qty_on_hold, "0");
  assert.equal(before.inquiry.reserved_quantity, null);
  assert.deepEqual(before.reservations, []);
  assert.deepEqual(before.events, []);
}
function acceptanceNormalization(before, after, ids, cohort) {
  assert.equal(after.order.id, cohort.order);
  assert.equal(after.order.status, "accepted");
  assert.equal(after.order.supplier_note, "Synthetic transition note");
  assert.ok(Number.isFinite(Date.parse(after.order.accepted_at)));
  assert.equal(after.line.accepted_quantity, "8.00");
  assert.equal(after.item.qty_on_hand, "10.00");
  assert.equal(after.item.qty_on_hold, "8.00");
  for (const row of [after.order, after.line, after.item]) {
    assert.equal(row.updated_at, after.order.accepted_at);
    assert.ok(Date.parse(row.updated_at) > Date.parse("2001-01-01T00:00:00Z"));
  }
  assert.equal(after.reservations.length, 1);
  const reservation = after.reservations[0];
  assert.deepEqual(
    Object.keys(reservation).sort(),
    [
      "id",
      "order_id",
      "order_line_id",
      "inventory_item_id",
      "supplier_business_id",
      "quantity",
      "expires_at",
      "released_at",
      "fulfilled_at",
      "created_by",
      "created_at",
    ].sort(),
  );
  assert.match(reservation.id, uuidPattern);
  assert.equal(reservation.order_id, cohort.order);
  assert.equal(reservation.order_line_id, cohort.line);
  assert.equal(reservation.inventory_item_id, cohort.item);
  assert.equal(reservation.supplier_business_id, ids.business);
  assert.equal(reservation.quantity, "8.00");
  assert.equal(reservation.created_by, ids.actor);
  assert.equal(reservation.created_at, after.order.accepted_at);
  assert.equal(reservation.released_at, null);
  assert.equal(reservation.fulfilled_at, null);
  assert.equal(
    Date.parse(reservation.expires_at) - Date.parse(reservation.created_at),
    72 * 60 * 60 * 1000,
  );
  assert.equal(after.events.length, 1);
  const event = after.events[0];
  assert.deepEqual(
    Object.keys(event).sort(),
    [
      "id",
      "order_id",
      "actor_id",
      "event_type",
      "from_status",
      "to_status",
      "note",
      "metadata",
      "created_at",
    ].sort(),
  );
  assert.match(event.id, uuidPattern);
  assert.equal(event.order_id, cohort.order);
  assert.equal(event.actor_id, ids.actor);
  assert.equal(event.event_type, "accepted");
  assert.equal(event.from_status, "submitted");
  assert.equal(event.to_status, "accepted");
  assert.equal(event.note, "Synthetic transition note");
  assert.deepEqual(event.metadata, {});
  assert.equal(event.created_at, after.order.accepted_at);
  const rows = [
    ["public.parts_orders", cohort.order, "order"],
    ["public.parts_order_lines", cohort.line, "line"],
    ["public.business_inventory_items", cohort.item, "item"],
  ];
  return {
    fields: rows.map(([table, id, key]) => ({
      table,
      id,
      values: Object.fromEntries(
        acceptanceFields[table].map((field) => [field, before[key][field]]),
      ),
    })),
    exclude: [
      { table: "public.parts_reservations", id: reservation.id },
      { table: "public.parts_order_events", id: event.id },
    ],
  };
}
function inquiryNormalization(before, after, ids, cohort, quantity) {
  const row = after.inquiry;
  assert.equal(row.id, cohort.inquiry);
  assert.equal(row.status, "accepted");
  assert.equal(row.reserved_item_id, cohort.item);
  assert.equal(row.reserved_quantity, `${quantity}.00`);
  assert.equal(row.response_note, "Synthetic inquiry note");
  assert.equal(row.responded_by, ids.actor);
  assert.equal(before.inquiry.responded_at, null);
  assert.ok(Number.isFinite(Date.parse(row.responded_at)));
  assert.equal(Date.parse(row.reserved_until) - Date.parse(row.responded_at), 24 * 60 * 60 * 1000);
  return {
    fields: [
      {
        table: "public.network_part_inquiries",
        id: cohort.inquiry,
        values: Object.fromEntries(inquiryFields.map((field) => [field, before.inquiry[field]])),
      },
    ],
    exclude: [],
  };
}
let markerIndex = 0;
function pass(name) {
  assert.ok(!interrupted);
  const line = `PASS nativePG17 mixed-stock: ${name}.`;
  assert.equal(line, REQUIRED_STOCK_MARKERS[markerIndex++]);
  process.stdout.write(line + "\n");
}

async function rehearse(context) {
  const observer = await session(context);
  try {
    stage = "server-identity";
    const identity = await json(
      observer,
      `SELECT json_build_object('version',current_setting('server_version_num'),'systemId',(pg_control_system()).system_identifier::text,
      'data',current_setting('data_directory'),'socket',current_setting('unix_socket_directories'),'port',current_setting('port'),'listen',current_setting('listen_addresses'),
      'user',current_user,'session',session_user,'database',current_database(),'owner',pg_get_userbyid(d.datdba),'super',r.rolsuper,'recovery',pg_is_in_recovery(),'encoding',current_setting('server_encoding'))
      FROM pg_roles r CROSS JOIN pg_database d WHERE r.rolname=current_user AND d.datname=current_database();`,
    );
    const version = assertServerIdentity(identity, context);
    process.stdout.write(
      `NativeMixedStockPG17 server_version_num=${version}; private cluster identity verified.\n`,
    );
    stage = "fresh-cluster";
    assertFreshCluster(
      await json(
        observer,
        `SELECT json_build_object(
      'roles',(SELECT json_agg(rolname ORDER BY rolname) FROM pg_roles WHERE rolname !~ '^pg_'),
      'databases',(SELECT json_agg(datname ORDER BY datname) FROM pg_database),
      'memberships',(SELECT count(*)::text FROM pg_auth_members WHERE pg_get_userbyid(member) !~ '^pg_'),
      'extraSchemas',(SELECT coalesce(json_agg(nspname ORDER BY nspname),'[]'::json) FROM pg_namespace WHERE nspname NOT IN('public','information_schema') AND nspname !~ '^pg_'),
      'publicObjects',(SELECT count(*)::text FROM pg_class WHERE relnamespace='public'::regnamespace),
      'publicFunctions',(SELECT count(*)::text FROM pg_proc WHERE pronamespace='public'::regnamespace),
      'extensions',(SELECT json_agg(extname ORDER BY extname) FROM pg_extension),
      'foreignServers',(SELECT count(*)::text FROM pg_foreign_server),'subscriptions',(SELECT count(*)::text FROM pg_subscription));`,
      ),
    );
    stage = "fixture-setup";
    const source = buildMixedReservationOrderSource();
    assert.equal(source.selectedSources.length, 49);
    assert.equal(source.tables.length, 14);
    assert.equal(source.setupStatements.length, 75);
    assert.equal(
      source.candidateSha256,
      "80dfd6a15e15ca404ece0cb77402d3fa3280da767d5f19a1cca9e3b16436332f",
    );
    for (const sql of source.setupStatements) {
      assert.ok(typeof sql === "string" && sql.trimEnd().endsWith(";"));
      await observer.command(sql);
    }
    await observer.command(source.candidateSQL);
    const ids = source.ids;
    const graph = await graphReader(observer, source);
    stage = "locked-acl";
    const locked = await graph.digest();
    for (const role of ["anon", "authenticated", "service_role"]) {
      const allowed = await json(
        observer,
        `SELECT json_build_object('b2b',has_function_privilege('${role}',${text(source.transitionSignature)},'EXECUTE'),'inquiry',has_function_privilege('${role}',${text(source.signature)},'EXECUTE'));`,
      );
      assert.deepEqual(allowed, { b2b: false, inquiry: false });
      for (const sql of [transitionSQL(cohortIds(1)), inquirySQL(ids, cohortIds(1), "2")]) {
        const denied = await session(context);
        try {
          await denied.command(`SET ROLE ${role};`);
          await expectedError(denied.command(sql), "42501");
        } finally {
          await denied.close();
        }
        assert.equal(await graph.digest(), locked);
      }
    }
    pass("locked-acl");

    // Each ordered pair uses ACTUAL retained/candidate writers, never raw
    // inserted holds as concurrency proof. The unrelated core raw-hold seed
    // remains unchanged and is included in every whole-graph comparison.
    for (const [index, first, commit] of [
      [1, "b2b", true],
      [2, "inquiry", true],
      [3, "b2b", false],
      [4, "inquiry", false],
    ]) {
      stage = `${first}-${commit ? "commit" : "rollback"}`;
      const cohort = cohortIds(index);
      await seedFresh(observer, ids, cohort);
      const before = await graph.rows(observer, cohort);
      assertFreshWitness(before, ids, cohort);
      const baseline = await graph.digest();
      await withWriters(context, observer, ids.actor, async (writer, waiter) => {
        await writer.command("BEGIN;");
        if (first === "b2b") await acceptanceResult(writer, cohort);
        else
          await inquiryResult(writer.command(inquirySQL(ids, cohort, "5")), ids, cohort, "5", "0");
        const uncommitted = await graph.rows(writer, cohort);
        const sql = first === "b2b" ? inquirySQL(ids, cohort, "5") : transitionSQL(cohort);
        const pending = waiter.command(sql);
        pending.catch(() => {});
        const denial = commit ? expectedError(pending, first === "b2b" ? "22023" : "P0001") : null;
        await observedBlock(observer, waiter, writer);
        assert.equal(
          await graph.digest(),
          baseline,
          "Uncommitted writer results must remain invisible",
        );
        await writer.command(commit ? "COMMIT;" : "ROLLBACK;");
        let witness, normalization;
        if (commit) {
          await denial;
          witness = uncommitted;
          normalization =
            first === "b2b"
              ? acceptanceNormalization(before, witness, ids, cohort)
              : inquiryNormalization(before, witness, ids, cohort, "5");
        } else if (first === "b2b") {
          await inquiryResult(pending, ids, cohort, "5", "0");
          witness = await graph.rows(waiter, cohort);
          normalization = inquiryNormalization(before, witness, ids, cohort, "5");
        } else {
          assert.deepEqual(JSON.parse(single(await pending)), {
            id: cohort.order,
            status: "accepted",
          });
          witness = await graph.rows(waiter, cohort);
          normalization = acceptanceNormalization(before, witness, ids, cohort);
        }
        await graph.persisted(cohort, witness);
        assert.equal(
          await graph.digest(normalization),
          baseline,
          "Only individually checked writer fields/rows may change",
        );
      });
      pass(
        first === "b2b"
          ? commit
            ? "b2b-commit-inquiry-rejected"
            : "b2b-rollback-inquiry-permitted"
          : commit
            ? "inquiry-commit-b2b-rejected"
            : "inquiry-rollback-b2b-permitted",
      );
    }

    stage = "outer-transaction";
    const outer = cohortIds(5);
    await seedFresh(observer, ids, outer);
    const baseline = await graph.digest();
    await withWriters(context, observer, ids.actor, async (writer, waiter) => {
      await writer.command("BEGIN;");
      await acceptanceResult(writer, outer);
      await inquiryResult(writer.command(inquirySQL(ids, outer, "2")), ids, outer, "2", "8");
      assert.equal(await graph.digest(), baseline);
      await waiter.command("BEGIN;");
      const pending = waiter.command(transitionSQL(outer));
      pending.catch(() => {});
      await observedBlock(observer, waiter, writer);
      assert.equal(await graph.digest(), baseline);
      await writer.command("ROLLBACK;");
      assert.deepEqual(JSON.parse(single(await pending)), { id: outer.order, status: "accepted" });
      const own = await graph.rows(waiter, outer);
      assert.equal(own.item.qty_on_hold, "8.00");
      assert.equal(own.reservations.length, 1);
      assert.equal(own.events.length, 1);
      assert.equal(own.inquiry.reserved_quantity, null);
      assert.equal(
        await graph.digest(),
        baseline,
        "Successful but uncommitted waiter is also invisible",
      );
      await waiter.command("ROLLBACK;");
      assert.equal(await graph.digest(), baseline);
    });
    pass("outer-visibility-rollback");

    stage = "late-event-fk";
    const fault = cohortIds(6);
    await seedFresh(observer, ids, fault);
    // Explicit SYNTHETIC fault injection, not a natural provider failure. The
    // retained event/Auth FK is the actual rejecting constraint after checked
    // accepted order/line/reservation/counter work; XX000 means no valid proof.
    await observer.command(`CREATE FUNCTION public.lab_order_event_fk_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NOT EXISTS(SELECT 1 FROM public.parts_orders WHERE id=NEW.order_id AND status='accepted')
        OR NOT EXISTS(SELECT 1 FROM public.parts_order_lines WHERE order_id=NEW.order_id AND accepted_quantity=8)
        OR NOT EXISTS(SELECT 1 FROM public.parts_reservations WHERE order_id=NEW.order_id AND quantity=8)
        OR NOT EXISTS(SELECT 1 FROM public.business_inventory_items WHERE id=${quotedUuid(fault.item)} AND qty_on_hold=8)
      THEN RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Fixture work witness absent'; END IF;
      NEW.actor_id:=${quotedUuid(ids.absent)}; RETURN NEW; END $$;
      REVOKE ALL ON FUNCTION public.lab_order_event_fk_fault() FROM PUBLIC,anon,authenticated,service_role;
      CREATE TRIGGER lab_order_event_fk BEFORE INSERT ON public.parts_order_events
      FOR EACH ROW EXECUTE FUNCTION public.lab_order_event_fk_fault();`);
    const faultBaseline = await graph.digest();
    const failed = await session(context, ids.actor);
    try {
      await expectedError(failed.command(transitionSQL(fault)), "23503");
    } finally {
      await failed.close();
    }
    assert.equal(await graph.digest(), faultBaseline);
    await observer.command(
      "DROP TRIGGER lab_order_event_fk ON public.parts_order_events; DROP FUNCTION public.lab_order_event_fk_fault();",
    );
    pass("late-event-fk-rollback");
    stage = "complete";
    pass("complete");
  } finally {
    await observer.close();
  }
}
async function closeAll() {
  await Promise.all([...active].map((value) => value.close()));
}
export async function runNativeMixedStock(env = { ...process.env }, platform = process.platform) {
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
  assert.equal(markerIndex, 8);
  process.stdout.write(REQUIRED_STOCK_MARKERS[8] + "\n");
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
    await runNativeMixedStock();
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
