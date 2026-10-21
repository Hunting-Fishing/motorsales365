// Private PG17 cluster only. Uses the real public RPC and SQL test JWT claims;
// this does not exercise a hosted Auth token signature or a real customer's data.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import {
  setupStatements,
  boundary,
  stockSql,
  claims,
  ids,
  request,
} from "./business-stock-fixture.mjs";
assert.equal(process.env.GITHUB_ACTIONS, "true");
assert.equal(process.env.GITHUB_REPOSITORY, "Hunting-Fishing/motorsales365");
assert.equal(process.platform, "linux");
assert.notEqual(process.getuid(), 0);
const bin = "/usr/lib/postgresql/17/bin",
  port = "55439";
for (const name of ["initdb", "pg_ctl", "postgres", "psql"]) {
  const f = `${bin}/${name}`,
    s = fs.lstatSync(f);
  assert.ok(s.isFile() && !s.isSymbolicLink());
  assert.equal(s.uid, 0);
  assert.equal(s.mode & 0o022, 0);
}
const root = fs.mkdtempSync(path.join(fs.realpathSync(process.env.RUNNER_TEMP), "stock-rpc-"));
fs.chmodSync(root, 0o700);
const data = path.join(root, "data"),
  socket = path.join(root, "socket");
fs.mkdirSync(socket, { mode: 0o700 });
const env = {
  PATH: `${bin}:/usr/bin:/bin`,
  LANG: "C.UTF-8",
  LC_ALL: "C.UTF-8",
  PGHOST: socket,
  PGPORT: port,
  PGUSER: "postgres",
  PGDATABASE: "postgres",
  PGSSLMODE: "disable",
  PGCONNECT_TIMEOUT: "3",
  PGOPTIONS: "-c statement_timeout=12000 -c lock_timeout=8000 -c client_min_messages=error",
  PGPASSFILE: path.join(root, "pgpass"),
  PGSERVICEFILE: path.join(root, "pgservice"),
  PGSYSCONFDIR: root,
};
fs.writeFileSync(env.PGPASSFILE, "", { mode: 0o600 });
fs.writeFileSync(env.PGSERVICEFILE, "", { mode: 0o600 });
const children = new Set();
let started = false;
const quote = (s) => "'" + String(s).replaceAll("'", "''") + "'";
const exec = (name, args, input) =>
  execFileSync(`${bin}/${name}`, args, {
    env,
    input,
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 1024 * 1024,
  });
const args = ["-X", "-Atq", "-w", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate"];
const sql = (s) => exec("psql", args, s + "\n");
const json = (s) => JSON.parse(sql(s).trim());
function query(s, app) {
  return new Promise((resolve) => {
    const c = spawn(`${bin}/psql`, args, {
      env: { ...env, PGAPPNAME: app },
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });
    children.add(c);
    let out = "",
      err = "";
    const timer = setTimeout(() => c.kill("SIGKILL"), 16000);
    c.stdout.on("data", (v) => {
      out += v;
      if (out.length > 1024 * 1024) c.kill("SIGKILL");
    });
    c.stderr.on("data", (v) => {
      err += v;
      if (err.length > 65536) c.kill("SIGKILL");
    });
    c.stdin.on("error", () => c.kill("SIGTERM"));
    c.on("error", () => c.kill("SIGTERM"));
    c.once("close", (code) => {
      children.delete(c);
      clearTimeout(timer);
      resolve({ code, out, err });
    });
    c.stdin.end(s + "\n");
  });
}
function transaction(r, { sleep = false, rollback = false } = {}) {
  return `BEGIN;SET LOCAL ROLE authenticated;SET LOCAL "request.jwt.claims"=${quote(JSON.stringify(claims(r.expectedAccountId)))};SELECT public.business_stock_operation_v1(${quote(JSON.stringify(r))}::jsonb,false);${sleep ? "SELECT pg_sleep(2);" : ""}${rollback ? "ROLLBACK" : "COMMIT"};`;
}
async function observe(test) {
  const end = Date.now() + 6500;
  do {
    if (test()) return;
    await delay(25);
  } while (Date.now() < end);
  throw new Error("Expected independent-session evidence was not observed");
}
try {
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
  const identity = json(
    "SELECT json_build_object('version',current_setting('server_version_num'),'data',current_setting('data_directory'),'socket',current_setting('unix_socket_directories'),'tcp',current_setting('listen_addresses'));",
  );
  assert.match(identity.version, /^17[0-9]{4}$/);
  assert.equal(identity.data, data);
  assert.equal(identity.socket, socket);
  assert.equal(identity.tcp, "");
  sql(setupStatements.map((s) => s.trimEnd() + ";").join("\n"));
  sql(boundary);
  sql(stockSql);
  for (const [n, mode] of [
    [1, "commit"],
    [2, "rollback"],
    [3, "conflict"],
    [4, "stale"],
  ]) {
    const item = `32000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
      operation = `82000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    sql(
      `INSERT INTO public.business_inventory_items(id,business_id,name,qty_on_hand) VALUES('${item}','${ids.business}','Native RPC fixture',10);`,
    );
    const stamp = json(
      `SELECT to_jsonb(to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.USTZH:TZM')) FROM public.business_inventory_items WHERE id='${item}';`,
    );
    const r = request({ itemId: item, operationId: operation, expectedUpdatedAt: stamp });
    const appA = `stock_rpc_a_${n}`,
      appB = `stock_rpc_b_${n}`;
    const a = query(transaction(r, { sleep: true, rollback: mode === "rollback" }), appA);
    await observe(() =>
      json(
        `SELECT to_jsonb(COALESCE(bool_or(wait_event='PgSleep'),false)) FROM pg_stat_activity WHERE application_name='${appA}';`,
      ),
    );
    const other = {
      ...r,
      ...(mode === "conflict" ? { delta: "3.00" } : {}),
      ...(mode === "stale"
        ? { operationId: `83000000-0000-4000-8000-${String(n).padStart(12, "0")}` }
        : {}),
    };
    const b = query(transaction(other), appB);
    await observe(() =>
      json(
        `SELECT to_jsonb(EXISTS(SELECT 1 FROM pg_stat_activity x,pg_stat_activity y WHERE x.application_name='${appB}' AND y.application_name='${appA}' AND x.wait_event_type='Lock' AND y.pid=ANY(pg_blocking_pids(x.pid))));`,
      ),
    );
    const first = await a,
      second = await b;
    assert.equal(first.code, 0, first.err);
    if (mode === "conflict") {
      assert.notEqual(second.code, 0);
      assert.match(second.err, /22023/);
    } else {
      assert.equal(second.code, 0, second.err);
      const result = JSON.parse(second.out.trim());
      if (mode === "stale") {
        assert.equal(result.status, "rejected");
        assert.equal(result.code, "conflict");
      } else assert.equal(result.status, "completed");
    }
    const final = json(
      `SELECT json_build_object('quantity',(SELECT qty_on_hand::text FROM public.business_inventory_items WHERE id='${item}'),'movements',(SELECT count(*) FROM public.business_inventory_movements WHERE item_id='${item}'),'outcomes',(SELECT count(*) FROM business_stock_operations_v1.outcomes WHERE item_id='${item}'));`,
    );
    assert.deepEqual(final, {
      quantity: "12.00",
      movements: 1,
      outcomes: mode === "stale" ? 2 : 1,
    });
    const recovered = await query(transaction(r), `stock_rpc_recovery_${n}`);
    assert.equal(recovered.code, 0, recovered.err);
    assert.equal(JSON.parse(recovered.out.trim()).status, "completed");
    console.log(
      `PASS public stock RPC ${mode}: authenticated SQL role, observed blocking PID, one movement, reconnect recovery`,
    );
  }
  console.log(`PASS public stock RPC PostgreSQL ${identity.version}`);
} finally {
  for (const child of children) child.kill("SIGTERM");
  if (started || fs.existsSync(path.join(data, "postmaster.pid"))) {
    try {
      exec("pg_ctl", ["-D", data, "-m", "fast", "-w", "-t", "15", "stop"]);
    } catch {
      exec("pg_ctl", ["-D", data, "-m", "immediate", "-w", "-t", "15", "stop"]);
    }
    assert.ok(!fs.existsSync(path.join(data, "postmaster.pid")));
  }
  fs.rmSync(root, { recursive: true, force: true });
  console.log("PASS public stock RPC private-cluster cleanup");
}
