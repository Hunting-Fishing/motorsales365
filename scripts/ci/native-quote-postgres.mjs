// CI-only native PostgreSQL17 experiment. Importing this module never connects,
// spawns, installs, or executes SQL. Fixture identity/RLS is explicitly synthetic.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import {
  setupStatements,
  IDs,
  SIGNATURE,
  readCandidate,
  nativeForeignKeys,
} from "./fixtures/native-quote-create-source.mjs";

export const PORT = "55433";
export const BIN = "/usr/lib/postgresql/17/bin";
const active = new Set();
const MAX_OUTPUT = 65536;
const COMMAND_MS = 15000;
const STAGES = new Set([
  "admission",
  "server-identity",
  "fixture-setup",
  "locked-acl",
  "happy-call",
  "late-check",
  "customer-wait",
  "vehicle-wait",
  "outer-commit",
  "duplicate-id",
]);
let stage = "admission";
export function safeFailure(value, error) {
  const name = STAGES.has(value) ? value : "admission";
  const code = ["ERR_ASSERTION", "ENOENT", "EACCES", "EPERM", "EPIPE", "ETIMEDOUT"].includes(
    error?.code,
  )
    ? error.code
    : "unavailable";
  const sqlState =
    typeof error?.sqlState === "string" && /^[0-9A-Z]{5}$/.test(error.sqlState)
      ? error.sqlState
      : "unavailable";
  return `Native quote PostgreSQL17 rehearsal failed (stage=${name}, code=${code}, sqlState=${sqlState}); no live acceptance is inferred.\n`;
}

export function validateContext(env, platform) {
  if (platform !== "linux" || env.GITHUB_ACTIONS !== "true")
    throw new Error("Native quote rehearsal requires GitHub Actions Linux.");
  for (const [key, value] of Object.entries(env)) {
    if ((key.startsWith("PG") || key === "DATABASE_URL" || key === "SUPABASE_DB_URL") && value)
      throw new Error("Native quote rehearsal refuses inherited database configuration.");
  }
  const { RUNNER_TEMP: temp, QUOTE_NATIVE_ROOT: root } = env;
  for (const value of [temp, root])
    if (
      typeof value !== "string" ||
      !value.startsWith("/") ||
      value === "/" ||
      /[\\\r\n\0]/.test(value) ||
      path.posix.normalize(value) !== value
    )
      throw new Error("Native quote rehearsal requires canonical private paths.");
  if (
    path.posix.dirname(root) !== temp ||
    !/^quote-native\.[A-Za-z0-9]{6}$/.test(path.posix.basename(root))
  )
    throw new Error("Native quote rehearsal refuses an unscoped cluster.");
  return Object.freeze({ temp, root, data: `${root}/data`, socket: `${root}/socket` });
}

export function clientOptions(context) {
  return Object.freeze({
    command: `${BIN}/psql`,
    args: [
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
    ],
    env: {
      PATH: `${BIN}:/usr/bin:/bin`,
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
      PGPASSFILE: "/dev/null",
      PGSERVICEFILE: "/dev/null",
      PGSYSCONFDIR: context.root,
      PGCONNECT_TIMEOUT: "5",
      PGSSLMODE: "disable",
    },
  });
}

export function observeStreamErrors(streams, onFailure) {
  for (const stream of streams)
    stream?.on("error", () => onFailure(new Error("Native psql stream failed.")));
}

function privateDirectory(value, uid) {
  const stat = fs.lstatSync(value);
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), "private directory required");
  assert.equal(stat.uid, uid, "private directory owner mismatch");
  assert.equal(stat.mode & 0o777, 0o700, "private directory mode mismatch");
  assert.equal(fs.realpathSync(value), value, "private directory must be canonical");
}
function validateFiles(context) {
  const uid = process.getuid();
  const temp = fs.lstatSync(context.temp);
  assert.ok(temp.isDirectory() && !temp.isSymbolicLink());
  assert.equal(fs.realpathSync(context.temp), context.temp);
  for (const value of [context.root, context.data, context.socket]) privateDirectory(value, uid);
  const socket = fs.lstatSync(`${context.socket}/.s.PGSQL.${PORT}`);
  assert.ok(socket.isSocket());
  assert.equal(socket.uid, uid);
  assert.equal(socket.mode & 0o777, 0o700);
  for (const executable of ["psql", "postgres"]) {
    const value = `${BIN}/${executable}`;
    assert.ok(fs.lstatSync(value).isFile() && !fs.lstatSync(value).isSymbolicLink());
    assert.equal(fs.realpathSync(value), value);
  }
  const pidFile = `${context.data}/postmaster.pid`;
  assert.ok(fs.lstatSync(pidFile).isFile() && !fs.lstatSync(pidFile).isSymbolicLink());
  const pid = fs.readFileSync(pidFile, "utf8").split("\n")[0];
  assert.match(pid, /^[1-9][0-9]{0,9}$/);
  assert.equal(fs.statSync(`/proc/${pid}`).uid, uid);
  assert.equal(fs.realpathSync(`/proc/${pid}/exe`), `${BIN}/postgres`);
  assert.deepEqual(fs.readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0").filter(Boolean), [
    `${BIN}/postgres`,
    "-D",
    context.data,
  ]);
}

class Psql {
  constructor(context) {
    const config = clientOptions(context);
    this.child = spawn(config.command, config.args, {
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      env: config.env,
    });
    active.add(this);
    this.buffer = "";
    this.stderr = "";
    this.outputBytes = 0;
    this.sequence = 0;
    this.pending = null;
    this.ended = false;
    observeStreamErrors([this.child.stdin, this.child.stdout, this.child.stderr], (error) =>
      this.fail(error),
    );
    this.child.stdout?.setEncoding("utf8");
    this.child.stderr?.setEncoding("utf8");
    this.child.stdout?.on("data", (data) => this.receive(data));
    this.child.stderr?.on("data", (data) => {
      this.outputBytes += Buffer.byteLength(data);
      this.stderr += data;
      if (this.outputBytes > MAX_OUTPUT)
        this.fail(new Error("Native psql output exceeded its bound."));
    });
    this.child.once("error", () => this.fail(new Error("Native psql could not start.")));
    this.exited = new Promise((resolve) =>
      this.child.once("close", () => {
        this.ended = true;
        active.delete(this);
        if (this.pending) {
          const error = new Error("Native psql command failed.");
          error.sqlState = this.stderr.match(/ERROR:\s+([0-9A-Z]{5})\b/)?.[1];
          this.reject(error);
        }
        resolve();
      }),
    );
  }
  receive(data) {
    this.outputBytes += Buffer.byteLength(data);
    if (this.outputBytes > MAX_OUTPUT)
      return this.fail(new Error("Native psql output exceeded its bound."));
    this.buffer += data;
    while (this.buffer.includes("\n")) {
      const index = this.buffer.indexOf("\n");
      const line = this.buffer.slice(0, index).replace(/\r$/, "");
      this.buffer = this.buffer.slice(index + 1);
      if (!this.pending) return this.fail(new Error("Unsolicited native psql output."));
      if (line === this.pending.marker) {
        const { resolve, lines, timer } = this.pending;
        clearTimeout(timer);
        this.pending = null;
        resolve(lines.filter((value) => value !== ""));
      } else this.pending.lines.push(line);
    }
  }
  reject(error) {
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    const { reject } = this.pending;
    this.pending = null;
    reject(error);
  }
  fail(error) {
    this.reject(error);
    void this.close();
  }
  command(sql) {
    if (this.pending || this.ended)
      return Promise.reject(new Error("Native psql session is unavailable."));
    if (typeof sql !== "string" || Buffer.byteLength(sql) > 131072 || sql.includes("\0"))
      return Promise.reject(new Error("Native psql command exceeded its bound."));
    const marker = `QUOTE_NATIVE_DONE_${++this.sequence}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => this.fail(new Error("Native psql command deadline exceeded.")),
        COMMAND_MS,
      );
      this.pending = { marker, resolve, reject, timer, lines: [] };
      this.child.stdin.write(`${sql}\n\\echo ${marker}\n`, (error) => {
        if (error) this.fail(new Error("Native psql input failed."));
      });
    });
  }
  async close() {
    if (!this.ended) {
      this.reject(new Error("Native psql session closed."));
      this.child.stdin?.destroy();
      this.child.kill("SIGTERM");
      const force = setTimeout(() => this.child.kill("SIGKILL"), 1000);
      try {
        await this.exited;
      } finally {
        clearTimeout(force);
      }
    }
  }
}

const literal = (value) => (value === null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`);
let ordinal = 0;
const uuid = (n) => `60000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function request() {
  const id = ++ordinal * 100;
  return {
    expectedAccount: IDs.actorA,
    expectedShop: IDs.shopA,
    quoteId: uuid(id),
    customerId: IDs.customerA,
    vehicleId: IDs.vehicleA,
    taxRate: "0.08",
    expiryDate: "2026-10-30",
    notes: "Synthetic native PG17",
    terms: null,
    items: [
      {
        id: uuid(id + 1),
        name: "Synthetic service",
        description: null,
        quantity: "1.00",
        unit_price: "100.25",
        item_type: "service",
      },
    ],
  };
}
function invokeSQL(value) {
  const json = Buffer.from(JSON.stringify(value.items), "utf8").toString("hex");
  return `SELECT shop_manager.create_quote_atomic_candidate(
    ${literal(value.expectedAccount)}::uuid,${literal(value.expectedShop)}::uuid,${literal(value.quoteId)}::uuid,
    ${literal(value.customerId)}::uuid,${literal(value.vehicleId)}::uuid,${literal(value.taxRate)}::text,
    ${literal(value.expiryDate)}::date,${literal(value.notes)}::text,${literal(value.terms)}::text,
    convert_from(decode('${json}','hex'),'UTF8')::jsonb);`;
}
function single(lines) {
  assert.equal(lines.length, 1);
  return lines[0];
}
async function session(context, actor = null) {
  const value = new Psql(context);
  await value.command(
    "SET statement_timeout='12s'; SET lock_timeout='8s'; SET idle_in_transaction_session_timeout='20s';",
  );
  value.pid = Number(single(await value.command("SELECT pg_backend_pid();")));
  assert.ok(Number.isSafeInteger(value.pid) && value.pid > 0);
  if (actor !== null) {
    await value.command(`SELECT set_config('request.jwt.claim.sub',${literal(actor)},false);`);
    const role = JSON.parse(
      single(
        await value.command(`SET ROLE authenticated;
      SELECT json_build_object('role',current_user,'super',r.rolsuper,'bypass',r.rolbypassrls,
      'rls',row_security_active('shop_manager.quotes'::regclass)) FROM pg_roles r WHERE r.rolname=current_user;`),
      ),
    );
    assert.deepEqual(role, { role: "authenticated", super: false, bypass: false, rls: true });
  }
  return value;
}
async function withSessions(context, actors, run) {
  const values = [];
  try {
    for (const actor of actors) values.push(await session(context, actor));
    await run(...values);
  } finally {
    await Promise.all(values.map((value) => value.close()));
  }
}
async function blocked(observer, waiting, blocker) {
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    const state = JSON.parse(
      single(
        await observer.command(`SELECT json_build_object(
      'exists',EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid=${waiting.pid}),
      'blocked',${blocker.pid}=ANY(pg_blocking_pids(${waiting.pid})));`),
      ),
    );
    assert.equal(state.exists, true, "competing backend exited before observed lock wait");
    if (state.blocked) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("No verified native PostgreSQL blocking barrier before deadline.");
}
function expectedError(promise, state) {
  const checked = promise.then(
    () => assert.fail("Expected native SQL failure was absent."),
    (error) => {
      if (error.sqlState !== state) {
        const failure = new Error("Unexpected native SQLSTATE.");
        failure.code = "ERR_ASSERTION";
        failure.sqlState = error.sqlState;
        throw failure;
      }
    },
  );
  checked.catch(() => {}); // An observer barrier may still be pending.
  return checked;
}
async function counts(observer) {
  return JSON.parse(
    single(
      await observer.command(
        "SELECT json_build_object('quotes',(SELECT count(*) FROM shop_manager.quotes),'items',(SELECT count(*) FROM shop_manager.quote_items));",
      ),
    ),
  );
}
async function absent(observer, value) {
  assert.equal(
    single(
      await observer.command(
        `SELECT count(*) FROM shop_manager.quotes WHERE id=${literal(value.quoteId)}::uuid;`,
      ),
    ),
    "0",
  );
}

async function verifyServer(observer, context) {
  const server = JSON.parse(
    single(
      await observer.command(`SELECT json_build_object('version',current_setting('server_version_num'),
    'data',current_setting('data_directory'),'socket',current_setting('unix_socket_directories'),
    'listen',current_setting('listen_addresses'),'user',current_user,'super',r.rolsuper,
    'database',current_database(),'owner',pg_get_userbyid(d.datdba))
    FROM pg_roles r CROSS JOIN pg_database d WHERE r.rolname=current_user AND d.datname=current_database();`),
    ),
  );
  assert.match(server.version, /^17\d{4}$/);
  assert.deepEqual(
    { ...server, version: undefined },
    {
      version: undefined,
      data: context.data,
      socket: context.socket,
      listen: "",
      user: "postgres",
      super: true,
      database: "postgres",
      owner: "postgres",
    },
  );
  return server.version;
}
async function rehearse(context) {
  assert.equal(
    SIGNATURE,
    "shop_manager.create_quote_atomic_candidate(uuid,uuid,uuid,uuid,uuid,text,date,text,text,jsonb)",
  );
  stage = "server-identity";
  const observer = await session(context);
  try {
    const version = await verifyServer(observer, context); // Before global fixture roles/tables/DDL.
    process.stdout.write(
      `NativePG17 server_version_num=${version}; private cluster identity verified.\n`,
    );
    stage = "fixture-setup";
    for (const statement of setupStatements) await observer.command(statement);
    await observer.command(readCandidate());
    const fks = JSON.parse(
      single(
        await observer.command(`SELECT json_agg(conname ORDER BY conname) FROM pg_constraint
      WHERE convalidated AND conname=ANY(ARRAY[${nativeForeignKeys.map((fk) => literal(fk.name)).join(",")}]::text[]);`),
      ),
    );
    assert.deepEqual(fks, nativeForeignKeys.map((fk) => fk.name).sort());
    stage = "locked-acl";
    const functionMetadata = JSON.parse(
      single(
        await observer.command(`SELECT json_build_object('definer',p.prosecdef,'config',p.proconfig)
      FROM pg_proc p WHERE p.oid=${literal(SIGNATURE)}::regprocedure;`),
      ),
    );
    assert.deepEqual(functionMetadata, { definer: false, config: ['search_path=""'] });
    assert.equal(
      single(
        await observer.command(`SELECT count(*) FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role')
      AND has_function_privilege(r.oid,${literal(SIGNATURE)},'EXECUTE');`),
      ),
      "0",
    );
    await observer.command(`GRANT EXECUTE ON FUNCTION ${SIGNATURE} TO authenticated;`); // TEST ONLY.

    stage = "happy-call";
    await withSessions(context, [IDs.actorA], async (actor) => {
      const value = request();
      const dto = JSON.parse(single(await actor.command(invokeSQL(value))));
      assert.equal(dto.quote.id, value.quoteId);
      assert.equal(dto.quote.total_amount, "108.27");
      assert.equal(dto.items.length, 1);
      assert.equal(dto.items[0].id, value.items[0].id);
    });
    process.stdout.write(
      "PASS nativePG17: locked ACL and non-superuser happy call (synthetic authority).\n",
    );

    stage = "late-check";
    const before = await counts(observer);
    await observer.command(`CREATE FUNCTION shop_manager.fixture_native_quote_fault() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER AS $$
      BEGIN IF NEW.name='Synthetic late CHECK' THEN NEW.item_type:='INVALID'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER zz_fixture_native_quote_fault BEFORE INSERT ON shop_manager.quote_items FOR EACH ROW EXECUTE FUNCTION shop_manager.fixture_native_quote_fault();`);
    try {
      await withSessions(context, [IDs.actorA], async (actor) => {
        const value = request();
        value.items.push({
          ...value.items[0],
          id: uuid(++ordinal * 100 + 2),
          name: "Synthetic late CHECK",
        });
        await expectedError(actor.command(invokeSQL(value)), "23514");
        await absent(observer, value);
      });
    } finally {
      await observer.command(
        "DROP TRIGGER zz_fixture_native_quote_fault ON shop_manager.quote_items; DROP FUNCTION shop_manager.fixture_native_quote_fault();",
      );
    }
    assert.deepEqual(await counts(observer), before);
    process.stdout.write(
      "PASS nativePG17: late native CHECK rolls back header and all earlier children.\n",
    );

    stage = "customer-wait";
    await withSessions(context, [null, IDs.actorA], async (locker, actor) => {
      const value = request();
      const original = await counts(observer);
      await locker.command(
        `BEGIN; SELECT id FROM shop_manager.customers WHERE id=${literal(IDs.customerA)} FOR UPDATE;`,
      );
      const pending = expectedError(actor.command(invokeSQL(value)), "42501");
      await blocked(observer, actor, locker);
      await locker.command(`UPDATE shop_manager.customers SET shop_id=${literal(IDs.shopB)} WHERE id=${literal(IDs.customerA)};
        UPDATE shop_manager.profiles SET shop_id=${literal(IDs.shopB)} WHERE id=${literal(IDs.actorA)}; COMMIT;`);
      await pending;
      await absent(observer, value);
      assert.deepEqual(await counts(observer), original);
      assert.equal(
        single(
          await observer.command(`SELECT count(*) FROM shop_manager.customers c JOIN shop_manager.profiles p ON p.shop_id=c.shop_id
        WHERE c.id=${literal(IDs.customerA)} AND p.id=${literal(IDs.actorA)} AND c.shop_id=${literal(IDs.shopB)};`),
        ),
        "1",
      );
      // A wait-time 42501 may also arise from EvalPlanQual/STABLE-helper
      // visibility. Separately demonstrate the intent fence in a fresh actual
      // non-superuser command where mutable legacy shop-follow is visible.
      await withSessions(context, [IDs.actorA], async (freshActor) => {
        assert.equal(
          single(
            await freshActor.command(
              `SELECT shop_id FROM shop_manager.customers WHERE id=${literal(IDs.customerA)};`,
            ),
          ),
          IDs.shopB,
        );
        await expectedError(freshActor.command(invokeSQL(value)), "42501");
      });
      await absent(observer, value);
      assert.deepEqual(await counts(observer), original);
    });
    await observer.command(`UPDATE shop_manager.customers SET shop_id=${literal(IDs.shopA)} WHERE id=${literal(IDs.customerA)};
      UPDATE shop_manager.profiles SET shop_id=${literal(IDs.shopA)} WHERE id=${literal(IDs.actorA)};`);
    process.stdout.write(
      "PASS nativePG17: observed customer wait rejection and fresh visible legacy-follow reject old expected shop.\n",
    );

    stage = "vehicle-wait";
    await withSessions(context, [null, IDs.actorA], async (locker, actor) => {
      const value = request();
      const original = await counts(observer);
      await locker.command(
        `BEGIN; SELECT id FROM shop_manager.vehicles WHERE id=${literal(IDs.vehicleA)} FOR UPDATE;`,
      );
      const pending = expectedError(actor.command(invokeSQL(value)), "42501");
      await blocked(observer, actor, locker);
      // Different customer avoids native FK key-share deadlock with actor's selected customer lock.
      await locker.command(
        `UPDATE shop_manager.vehicles SET customer_id=${literal(IDs.customerA2)} WHERE id=${literal(IDs.vehicleA)}; COMMIT;`,
      );
      await pending;
      await absent(observer, value);
      assert.deepEqual(await counts(observer), original);
    });
    await observer.command(
      `UPDATE shop_manager.vehicles SET customer_id=${literal(IDs.customerA)} WHERE id=${literal(IDs.vehicleA)};`,
    );
    process.stdout.write(
      "PASS nativePG17: observed vehicle wait rejects changed customer binding.\n",
    );

    stage = "outer-commit";
    await withSessions(context, [IDs.actorA, null], async (actor, writer) => {
      const value = request();
      await actor.command("BEGIN;");
      assert.equal(
        JSON.parse(single(await actor.command(invokeSQL(value)))).quote.id,
        value.quoteId,
      );
      await absent(observer, value); // A returned DTO is not outer transaction COMMIT.
      const pending = writer.command(
        `BEGIN; UPDATE shop_manager.customers SET last_name='Synthetic competing update' WHERE id=${literal(IDs.customerA)};`,
      );
      pending.catch(() => {});
      await blocked(observer, writer, actor);
      await actor.command("COMMIT;");
      await pending;
      await writer.command("ROLLBACK;");
      assert.equal(
        single(
          await observer.command(
            `SELECT count(*) FROM shop_manager.quotes WHERE id=${literal(value.quoteId)};`,
          ),
        ),
        "1",
      );
    });
    process.stdout.write(
      "PASS nativePG17: outer transaction visibility and competing writer wait until COMMIT.\n",
    );

    stage = "duplicate-id";
    await withSessions(context, [IDs.actorA, IDs.actorA], async (first, second) => {
      const value = request();
      await first.command("BEGIN;");
      assert.equal(
        JSON.parse(single(await first.command(invokeSQL(value)))).quote.id,
        value.quoteId,
      );
      const pending = expectedError(second.command(invokeSQL(value)), "23505");
      await blocked(observer, second, first);
      await first.command("COMMIT;");
      await pending;
      assert.equal(
        single(
          await observer.command(
            `SELECT count(*) FROM shop_manager.quotes WHERE id=${literal(value.quoteId)};`,
          ),
        ),
        "1",
      );
      assert.equal(
        single(
          await observer.command(
            `SELECT count(*) FROM shop_manager.quote_items WHERE quote_id=${literal(value.quoteId)};`,
          ),
        ),
        "1",
      );
    });
    process.stdout.write(
      "PASS nativePG17: concurrent duplicate UUID gives one commit and one23505, never replay.\n",
    );
    process.stdout.write(
      "NativePG17 rehearsal complete: synthetic fixture/helper authority only; no JWT/API/R2/restore/release or durable-idempotency acceptance.\n",
    );
  } finally {
    await observer.close();
  }
}

async function closeAll() {
  await Promise.all([...active].map((value) => value.close()));
}
async function main() {
  assert.deepEqual(process.argv.slice(2), ["--run"], "explicit --run required");
  const context = validateContext(process.env, process.platform);
  validateFiles(context);
  const interrupt = () => {
    void closeAll().finally(() => process.exit(1));
  };
  process.once("SIGTERM", interrupt);
  process.once("SIGINT", interrupt);
  try {
    await rehearse(context);
  } finally {
    await closeAll();
    process.removeListener("SIGTERM", interrupt);
    process.removeListener("SIGINT", interrupt);
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(safeFailure(stage, error));
    process.exitCode = 1;
  });
}
