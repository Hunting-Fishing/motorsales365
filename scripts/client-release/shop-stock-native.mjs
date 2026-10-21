// Authenticated-role SQL on a fresh socket-only PG17 cluster. JWT claims are
// synthetic fixtures, not a hosted Auth/HTTP or whole-production-schema proof.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import {
  setupStatements,
  boundary,
  sql as stockSql,
  claims,
  ids,
  request,
} from "./shop-stock-fixture.mjs";
assert.equal(process.env.GITHUB_ACTIONS, "true");
assert.equal(process.env.GITHUB_REPOSITORY, "Hunting-Fishing/motorsales365");
assert.equal(process.platform, "linux");
assert.notEqual(process.getuid(), 0);
const bin = "/usr/lib/postgresql/17/bin",
  port = "55440";
for (const name of ["initdb", "pg_ctl", "postgres", "psql"]) {
  const stat = fs.lstatSync(`${bin}/${name}`);
  assert.ok(stat.isFile() && !stat.isSymbolicLink());
  assert.equal(stat.uid, 0);
  assert.equal(stat.mode & 0o022, 0);
}
const root = fs.mkdtempSync(path.join(fs.realpathSync(process.env.RUNNER_TEMP), "shop-stock-rpc-"));
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
for (const f of [env.PGPASSFILE, env.PGSERVICEFILE])
  fs.writeFileSync(f, "", { mode: 0o600, flag: "wx" });
const children = new Set();
let started = false,
  interrupted = false;
const terminate = () => {
  interrupted = true;
  for (const child of children) child.kill("SIGTERM");
};
process.on("SIGTERM", terminate);
process.on("SIGINT", terminate);
const quote = (s) => "'" + String(s).replaceAll("'", "''") + "'";
const args = ["-X", "-Atq", "-w", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate"];
const exec = (name, argv, input) =>
  execFileSync(`${bin}/${name}`, argv, {
    env,
    input,
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 1024 * 1024,
  });
const sql = (s) => exec("psql", args, s + "\n");
const json = (s) => JSON.parse(sql(s).trim());
function query(s, app) {
  return new Promise((resolve) => {
    const child = spawn(`${bin}/psql`, args, {
      env: { ...env, PGAPPNAME: app },
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });
    children.add(child);
    let out = "",
      err = "",
      spawnError = false;
    const timer = setTimeout(() => child.kill("SIGKILL"), 16000);
    child.stdout.on("data", (v) => {
      out += v;
      if (out.length > 1024 * 1024) child.kill("SIGKILL");
    });
    child.stderr.on("data", (v) => {
      err += v;
      if (err.length > 65536) child.kill("SIGKILL");
    });
    child.stdin.on("error", () => child.kill("SIGTERM"));
    child.on("error", () => {
      spawnError = true;
      child.kill("SIGTERM");
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      children.delete(child);
      resolve({ code: spawnError ? -1 : code, out, err });
    });
    child.stdin.end(s + "\n");
  });
}
function transaction(r, { sleep = false, rollback = false } = {}) {
  return `BEGIN; SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claims"=${quote(JSON.stringify(claims(r.expectedAccountId)))}; SELECT public.shop_stock_operation_v1(${quote(JSON.stringify(r))}::jsonb,false); ${sleep ? "SELECT pg_sleep(2);" : ""} ${rollback ? "ROLLBACK" : "COMMIT"};`;
}
async function observe(check) {
  const end = Date.now() + 6500;
  do {
    if (interrupted) throw Error("Interrupted");
    if (check()) return;
    await delay(25);
  } while (Date.now() < end);
  throw Error("Independent-session lock evidence not observed");
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
    const item = `33000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
      operation = `84000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    sql(
      `INSERT INTO shop_manager.inventory_items(id,shop_id,name,sku,category,supplier,quantity,quantity_in_stock,unit_price) VALUES('${item}','${ids.shop}','Native concurrency','PAD','Brakes','Fixture',10,10,100);`,
    );
    const stamp = json(
      `SELECT to_jsonb(to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.USTZH:TZM')) FROM shop_manager.inventory_items WHERE id='${item}';`,
    );
    const r = request({ itemId: item, operationId: operation, expectedUpdatedAt: stamp });
    const appA = `shop_stock_a_${n}`,
      appB = `shop_stock_b_${n}`;
    const a = query(transaction(r, { sleep: true, rollback: mode === "rollback" }), appA);
    await observe(() =>
      json(
        `SELECT to_jsonb(COALESCE(bool_or(wait_event='PgSleep'),false)) FROM pg_stat_activity WHERE application_name='${appA}';`,
      ),
    );
    const other = {
      ...r,
      ...(mode === "conflict" ? { delta: "3" } : {}),
      ...(mode === "stale"
        ? { operationId: `85000000-0000-4000-8000-${String(n).padStart(12, "0")}` }
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
      const v = JSON.parse(second.out.trim());
      assert.equal(v.status, mode === "stale" ? "rejected" : "completed");
      if (mode === "stale") assert.equal(v.code, "conflict");
    }
    const final = json(
      `SELECT json_build_object('quantity',(SELECT quantity FROM shop_manager.inventory_items WHERE id='${item}'),'transactions',(SELECT count(*) FROM shop_manager.inventory_transactions WHERE inventory_item_id='${item}'),'outcomes',(SELECT count(*) FROM shop_stock_operations_v1.outcomes WHERE item_id='${item}'),'audits',(SELECT count(*) FROM shop_manager.employee_operational_events e JOIN shop_manager.inventory_transactions t ON e.entity_id=t.id::text WHERE t.inventory_item_id='${item}' AND e.shop_id='${ids.shop}' AND e.profile_id='${ids.actor}' AND e.actor_user_id='${ids.actor}' AND e.action='insert_inventory_transactions'));`,
    );
    assert.deepEqual(final, {
      quantity: 12,
      transactions: 1,
      outcomes: mode === "stale" ? 2 : 1,
      audits: 1,
    });
    const recovered = await query(transaction(r), `shop_stock_recover_${n}`);
    assert.equal(recovered.code, 0, recovered.err);
    assert.equal(JSON.parse(recovered.out.trim()).status, "completed");
    console.log(
      `PASS native Shop Manager RPC ${mode}: observed blocker, one transaction/audit, reconnect recovery`,
    );
  }
  // A selected-shop change already holding the profile lock must be observed
  // after the wait, never routed into the wrong employee audit ledger.
  const change = query(
    `BEGIN; UPDATE shop_manager.profiles SET shop_id='${ids.otherShop}' WHERE id='${ids.actor}'; SELECT pg_sleep(2); COMMIT;`,
    "shop_selection_change",
  );
  await observe(() =>
    json(
      "SELECT to_jsonb(COALESCE(bool_or(wait_event='PgSleep'),false)) FROM pg_stat_activity WHERE application_name='shop_selection_change';",
    ),
  );
  const denied = query(transaction(request()), "shop_selection_write");
  await observe(() =>
    json(
      "SELECT to_jsonb(EXISTS(SELECT 1 FROM pg_stat_activity x,pg_stat_activity y WHERE x.application_name='shop_selection_write' AND y.application_name='shop_selection_change' AND y.pid=ANY(pg_blocking_pids(x.pid))));",
    ),
  );
  assert.equal((await change).code, 0);
  const denial = await denied;
  assert.notEqual(denial.code, 0);
  assert.match(denial.err, /42501/);
  assert.equal(
    json(`SELECT quantity FROM shop_manager.inventory_items WHERE id='${ids.nativeItem}';`),
    10,
  );
  assert.equal(
    json(
      `SELECT count(*) FROM shop_manager.inventory_transactions WHERE inventory_item_id='${ids.nativeItem}';`,
    ),
    0,
  );
  console.log("PASS native Shop Manager RPC selected-shop wait and denial without writes");
  for (const role of ["anon", "service_role"]) {
    const r = await query(
      `BEGIN;SET LOCAL ROLE ${role};SELECT public.shop_stock_operation_v1(${quote(JSON.stringify(request()))}::jsonb,false);COMMIT;`,
      `shop_denied_${role}`,
    );
    assert.notEqual(r.code, 0);
    assert.match(r.err, /42501/);
  }
  assert.ok(!interrupted);
  console.log(`PASS native Shop Manager RPC PostgreSQL ${identity.version}`);
} finally {
  for (const child of children) child.kill("SIGTERM");
  if (started || fs.existsSync(path.join(data, "postmaster.pid"))) {
    const pidFile = path.join(data, "postmaster.pid");
    if (fs.existsSync(pidFile)) {
      const p = fs.readFileSync(pidFile, "utf8").split("\n");
      assert.equal(p[1], data);
      assert.equal(p[3], port);
      assert.equal(p[4], socket);
    }
    try {
      exec("pg_ctl", ["-D", data, "-m", "fast", "-w", "-t", "15", "stop"]);
    } catch {
      exec("pg_ctl", ["-D", data, "-m", "immediate", "-w", "-t", "15", "stop"]);
    }
    assert.ok(!fs.existsSync(pidFile));
    assert.ok(!fs.existsSync(path.join(socket, `.s.PGSQL.${port}`)));
  }
  fs.rmSync(root, { recursive: true, force: true });
  process.off("SIGTERM", terminate);
  process.off("SIGINT", terminate);
  console.log("PASS native Shop Manager RPC private-cluster cleanup");
}
