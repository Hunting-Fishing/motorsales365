// CI-only independent-session proof. Creates its own socket-only PG17 cluster.
// Uses the same selected source and synthetic owner/test.user authority as the
// SQL tests. This does not establish production Auth, all-writer or app readiness.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { buildMixedReservationOrderSource } from "./mixed-reservation-order-source.mjs";

const bin = "/usr/lib/postgresql/17/bin";
const port = "55438";
const schema = "manual_stock_operations_candidate";
const sessions = new Set();
let interrupted = false;
const interrupt = () => {
  interrupted = true;
  for (const session of sessions) session.child.kill("SIGTERM");
};

class Session {
  constructor(socket, env) {
    this.buffer = "";
    this.stderr = "";
    this.pending = null;
    this.closed = false;
    this.child = spawn(
      `${bin}/psql`,
      [
        "-X",
        "-Atq",
        "-w",
        "-h",
        socket,
        "-p",
        port,
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-v",
        "VERBOSITY=sqlstate",
      ],
      { env, stdio: ["pipe", "pipe", "pipe"], shell: false },
    );
    sessions.add(this);
    this.done = new Promise((resolve) => {
      this.resolveClose = resolve;
    });
    const fail = () => this.child.kill("SIGTERM");
    for (const stream of [this.child.stdin, this.child.stdout, this.child.stderr])
      stream.on("error", fail);
    this.child.on("error", fail);
    this.child.stderr.setEncoding("utf8");
    this.child.stdout.setEncoding("utf8");
    this.child.stderr.on("data", (chunk) => {
      this.stderr += chunk;
      if (this.stderr.length > 65536) fail();
    });
    this.child.stdout.on("data", (chunk) => {
      this.buffer += chunk;
      if (this.buffer.length > 262144) {
        fail();
        return;
      }
      while (this.buffer.includes("\n")) {
        const at = this.buffer.indexOf("\n");
        const line = this.buffer.slice(0, at).replace(/\r$/, "");
        this.buffer = this.buffer.slice(at + 1);
        const pending = this.pending;
        if (!pending) {
          fail();
          return;
        }
        if (line === pending.marker) {
          clearTimeout(pending.timer);
          this.pending = null;
          if (this.stderr || interrupted) pending.reject(new Error("Native session diagnostics"));
          else pending.resolve(pending.lines.filter(Boolean));
        } else {
          pending.bytes += Buffer.byteLength(line);
          if (pending.bytes > 262144) {
            fail();
            return;
          }
          pending.lines.push(line);
        }
      }
    });
    this.child.once("close", () => {
      this.closed = true;
      sessions.delete(this);
      if (this.pending) {
        clearTimeout(this.pending.timer);
        const error = new Error("Native stock operation failed");
        error.code = this.stderr.match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})/)?.[1];
        this.pending.reject(error);
        this.pending = null;
      }
      this.resolveClose();
    });
  }
  command(sql) {
    assert.ok(!this.pending && !this.closed && !interrupted);
    assert.ok(typeof sql === "string" && sql.length < 262144 && !sql.includes("\0"));
    return new Promise((resolve, reject) => {
      const marker = `STOCK_DONE_${randomUUID().replaceAll("-", "")}`;
      const timer = setTimeout(() => this.child.kill("SIGTERM"), 15000);
      this.pending = { marker, resolve, reject, timer, lines: [], bytes: 0 };
      // Terminate the SQL before the marker; a newline alone leaves a SELECT
      // buffered by psql and can acknowledge it before it has executed.
      this.child.stdin.write(`${sql}\n;\n\\echo ${marker}\n`);
    });
  }
  async one(sql) {
    const lines = await this.command(sql);
    assert.equal(lines.length, 1);
    return JSON.parse(lines[0]);
  }
  async close() {
    if (!this.closed) {
      this.child.stdin.end("\\q\n");
      const timer = setTimeout(() => this.child.kill("SIGKILL"), 1000);
      await this.done;
      clearTimeout(timer);
    }
  }
}

async function run() {
  assert.equal(process.platform, "linux");
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(process.env.GITHUB_REPOSITORY, "Hunting-Fishing/motorsales365");
  assert.ok(process.getuid() !== 0, "Never initialize a cluster as root");
  const temp = fs.realpathSync(process.env.RUNNER_TEMP);
  assert.ok(fs.lstatSync(temp).isDirectory());
  const root = fs.mkdtempSync(path.join(temp, "stock-operation-"));
  fs.chmodSync(root, 0o700);
  const data = path.join(root, "data");
  const socket = path.join(root, "socket");
  fs.mkdirSync(socket, { mode: 0o700 });
  for (const name of ["pgpass", "pgservice"])
    fs.writeFileSync(path.join(root, name), "", { mode: 0o600, flag: "wx" });
  const env = {
    PATH: `${bin}:/usr/bin:/bin`,
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    PGPASSFILE: path.join(root, "pgpass"),
    PGSERVICEFILE: path.join(root, "pgservice"),
    PGSYSCONFDIR: root,
    PGCONNECT_TIMEOUT: "5",
    PGSSLMODE: "disable",
    PGOPTIONS: "-c statement_timeout=10000 -c lock_timeout=10000 -c client_min_messages=error",
  };
  const exec = (name, args) =>
    execFileSync(`${bin}/${name}`, args, {
      env,
      timeout: 30000,
      maxBuffer: 65536,
      stdio: ["ignore", "pipe", "pipe"],
    });
  let started = false;
  let clean = false;
  process.on("SIGTERM", interrupt);
  process.on("SIGINT", interrupt);
  try {
    for (const name of ["initdb", "pg_ctl", "postgres", "psql"]) {
      const filename = `${bin}/${name}`;
      const stat = fs.lstatSync(filename);
      assert.ok(stat.isFile() && !stat.isSymbolicLink());
      assert.equal(stat.uid, 0);
      assert.equal(stat.mode & 0o022, 0);
    }
    exec("initdb", [
      "-D",
      data,
      "--username=postgres",
      "--encoding=UTF8",
      "--locale=C.UTF-8",
      "--auth-local=trust",
      "--auth-host=reject",
      "--set=listen_addresses=",
      `--set=unix_socket_directories=${socket}`,
      "--set=unix_socket_permissions=0700",
      `--set=port=${port}`,
      "--no-instructions",
    ]);
    exec("pg_ctl", ["-D", data, "-l", path.join(root, "server.log"), "-w", "-t", "20", "start"]);
    started = true;
    const open = () => new Session(socket, env);
    const observer = open();
    const identity = await observer.one(
      "SELECT json_build_object('version',current_setting('server_version_num'),'data',current_setting('data_directory'),'socket',current_setting('unix_socket_directories'),'tcp',current_setting('listen_addresses'),'user',current_user,'super',(SELECT rolsuper FROM pg_roles WHERE rolname=current_user))",
    );
    assert.match(identity.version, /^17[0-9]{4}$/);
    assert.equal(identity.data, data);
    assert.equal(identity.socket, socket);
    assert.equal(identity.tcp, "");
    assert.equal(identity.user, "postgres");
    assert.equal(identity.super, true);
    console.log(`PASS native stock operation server=${identity.version}`);
    assert.equal(
      await observer.one(
        "SELECT count(*) FROM pg_namespace WHERE nspname IN ('auth','shop_manager','manual_stock_candidate','manual_stock_operations_candidate')",
      ),
      0,
    );
    const source = buildMixedReservationOrderSource();
    const { ids } = source;
    for (const statement of source.setupStatements) await observer.command(statement);
    await observer.command(source.candidateSQL);
    const base = fs
      .readFileSync(new URL("./manual-adjustment-candidate.sql", import.meta.url), "utf8")
      .replaceAll("\r\n", "\n");
    assert.equal(
      createHash("sha256").update(base).digest("hex"),
      "6b2899e15dc75ecffe943760604651aca9c63c22f4a7bc1bd4ca94bc8274b250",
    );
    await observer.command(base);
    await observer.command(
      fs.readFileSync(new URL("./manual-operation-candidate.sql", import.meta.url), "utf8"),
    );
    console.log("PASS native stock operation retained fixture and candidates installed");
    const uuid = (prefix, n) => `${prefix}000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    const cohort = (n) => ({ item: uuid("32", n), op: uuid("82", n) });
    async function seed(c) {
      await observer.command(
        `INSERT INTO public.business_inventory_items(id,business_id,name,qty_on_hand) VALUES('${c.item}','${ids.business}','Native synthetic operation',10)`,
      );
    }
    const statement = (c, delta = "2") =>
      `SELECT ${schema}.apply('${ids.actor}','${ids.business}','${c.item}','${c.op}',10,${delta},'Native fixture')`;
    async function begin(s) {
      await s.command(`BEGIN; SELECT set_config('test.user','${ids.actor}',true);`);
    }
    async function inventory(c) {
      return observer.one(
        `SELECT json_build_object('quantity',(SELECT qty_on_hand::text FROM public.business_inventory_items WHERE id='${c.item}'),'movements',(SELECT count(*) FROM public.business_inventory_movements WHERE item_id='${c.item}'),'outcomes',(SELECT count(*) FROM ${schema}.outcomes WHERE item_id='${c.item}'))`,
      );
    }
    async function waitForBlock(waiter, blocker) {
      const end = Date.now() + 8000;
      do {
        const proof = await observer.one(
          `SELECT json_build_object('blocked',${blocker}=ANY(pg_blocking_pids(${waiter})),'wait',wait_event_type) FROM pg_stat_activity WHERE pid=${waiter}`,
        );
        if (proof.blocked && proof.wait === "Lock") return;
        await delay(20);
      } while (Date.now() < end && !interrupted);
      throw new Error("Expected independent-session lock was not observed");
    }
    for (const [n, outcome] of [
      [1, "commit"],
      [2, "rollback"],
      [3, "conflict"],
      [4, "stale"],
    ]) {
      const c = cohort(n);
      await seed(c);
      const a = open(),
        b = open();
      const aPid = await a.one("SELECT pg_backend_pid()");
      const bPid = await b.one("SELECT pg_backend_pid()");
      await begin(a);
      const first = await a.one(statement(c));
      assert.equal(first.result.quantityAfter, "12.00");
      assert.deepEqual(await inventory(c), { quantity: "10.00", movements: 0, outcomes: 0 });
      await begin(b);
      const secondC = outcome === "stale" ? { ...c, op: uuid("83", n) } : c;
      const pending = b.one(statement(secondC, outcome === "conflict" ? "3" : "2")).then(
        (value) => ({ value }),
        (error) => ({ error }),
      );
      await waitForBlock(bPid, aPid);
      await a.command(outcome === "rollback" ? "ROLLBACK;" : "COMMIT;");
      const result = await pending;
      if (outcome === "conflict" || outcome === "stale") {
        assert.equal(result.error?.code, outcome === "conflict" ? "22023" : "40001");
      } else {
        assert.ok(!result.error);
        if (outcome === "commit") assert.deepEqual(result.value, first);
        else assert.notEqual(result.value.result.movementId, first.result.movementId);
        await b.command("COMMIT;");
      }
      assert.deepEqual(await inventory(c), { quantity: "12.00", movements: 1, outcomes: 1 });
      await a.close();
      await b.close();
      // A replacement connection can recover the original committed outcome.
      const reader = open();
      await begin(reader);
      const saved = await reader.one(
        `SELECT ${schema}.inspect('${ids.actor}','${ids.business}','${c.op}')`,
      );
      assert.equal(saved.status, "completed");
      assert.equal(saved.result.quantityAfter, "12.00");
      await reader.command("COMMIT;");
      await reader.close();
      console.log(
        `PASS native stock operation ${outcome}: observed lock, one movement, committed recovery`,
      );
    }
    for (const role of ["anon", "authenticated", "service_role"]) {
      const denied = open();
      await denied.command(`SET ROLE ${role}`);
      await assert.rejects(denied.one(statement(cohort(1))), (error) => error.code === "42501");
      await denied.close();
    }
    console.log("PASS native stock operation ordinary-role denial");
    await observer.close();
    assert.ok(!interrupted);
    clean = true;
  } finally {
    for (const session of [...sessions]) await session.close();
    const pidfile = path.join(data, "postmaster.pid");
    if (started || fs.existsSync(pidfile)) {
      if (fs.existsSync(pidfile)) {
        const lines = fs.readFileSync(pidfile, "utf8").split("\n");
        assert.equal(lines[1], data);
        assert.equal(lines[3], port);
        assert.equal(lines[4], socket);
      }
      try {
        exec("pg_ctl", ["-D", data, "-m", "fast", "-w", "-t", "15", "stop"]);
      } catch {
        exec("pg_ctl", ["-D", data, "-m", "immediate", "-w", "-t", "15", "stop"]);
      }
      assert.ok(!fs.existsSync(pidfile));
      assert.ok(!fs.existsSync(path.join(socket, `.s.PGSQL.${port}`)));
      console.log("PASS native stock operation private-cluster cleanup");
    }
    fs.rmSync(root, { recursive: true, force: true });
    process.off("SIGTERM", interrupt);
    process.off("SIGINT", interrupt);
  }
  assert.ok(clean);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.deepEqual(process.argv.slice(2), ["--run"]);
  run().catch((error) => {
    console.error(`FAIL native stock operation: ${error.code ?? error.name ?? "unknown"}`);
    process.exitCode = 1;
  });
}
