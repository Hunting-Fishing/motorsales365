// Socket-only PG17 concurrency. Authenticated roles use synthetic claims, not hosted JWTs.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { setupStatements, boundary, sql as stockSql } from "./shop-stock-fixture.mjs";
import { extraSetup, selectionSql, ids, claims, request } from "./shop-selection-fixture.mjs";
assert.equal(process.env.GITHUB_ACTIONS, "true");
assert.equal(process.env.GITHUB_REPOSITORY, "Hunting-Fishing/motorsales365");
assert.equal(process.platform, "linux");
assert.notEqual(process.getuid(), 0);
const bin = "/usr/lib/postgresql/17/bin",
  port = "55441",
  children = new Set();
for (const name of ["initdb", "pg_ctl", "postgres", "psql"]) {
  const s = fs.lstatSync(`${bin}/${name}`);
  assert.ok(s.isFile() && !s.isSymbolicLink());
  assert.equal(s.uid, 0);
  assert.equal(s.mode & 0o022, 0);
}
const root = fs.mkdtempSync(path.join(fs.realpathSync(process.env.RUNNER_TEMP), "shop-selection-"));
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
let started = false,
  interrupted = false;
const stop = () => {
  interrupted = true;
  for (const c of children) c.kill("SIGTERM");
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
const q = (s) => "'" + String(s).replaceAll("'", "''") + "'";
const args = ["-X", "-Atq", "-w", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate"];
const exec = (name, argv, input) =>
  execFileSync(`${bin}/${name}`, argv, {
    env,
    input,
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 1024 * 1024,
  });
const sql = (s) => exec("psql", args, s + "\n;\n"),
  json = (s) => JSON.parse(sql(s).trim());
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
      failed = false;
    const timer = setTimeout(() => child.kill("SIGKILL"), 16000);
    child.stdout.on("data", (v) => {
      out += v;
      if (out.length > 1048576) child.kill("SIGKILL");
    });
    child.stderr.on("data", (v) => {
      err += v;
      if (err.length > 65536) child.kill("SIGKILL");
    });
    child.stdin.on("error", () => child.kill("SIGTERM"));
    child.on("error", () => {
      failed = true;
      child.kill("SIGTERM");
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      children.delete(child);
      resolve({ code: failed ? -1 : code, out, err });
    });
    child.stdin.end(s + "\n;\n");
  });
}
const session = (body, c = claims()) =>
  `BEGIN;SET LOCAL ROLE authenticated;SET LOCAL "request.jwt.claims"=${q(JSON.stringify(c))};${body}`;
const select = (r) =>
  `SELECT public.shop_selection_change_v1(${q(JSON.stringify(r))}::jsonb,false);`;
async function observe(test) {
  const until = Date.now() + 6500;
  do {
    if (interrupted) throw Error("Interrupted");
    if (test()) return;
    await delay(25);
  } while (Date.now() < until);
  throw Error("Expected lock was not observed");
}
const sleeping = (app) =>
  observe(() =>
    json(
      `SELECT to_jsonb(COALESCE(bool_or(wait_event='PgSleep'),false)) FROM pg_stat_activity WHERE application_name=${q(app)}`,
    ),
  );
const blocked = (waiter, blocker) =>
  observe(() =>
    json(
      `SELECT to_jsonb(EXISTS(SELECT 1 FROM pg_stat_activity x,pg_stat_activity y WHERE x.application_name=${q(waiter)} AND y.application_name=${q(blocker)} AND x.wait_event_type='Lock' AND y.pid=ANY(pg_blocking_pids(x.pid))))`,
    ),
  );
let seq = 0;
function reset() {
  sql(
    `UPDATE shop_manager.profiles SET shop_id='${ids.shop}',updated_at=clock_timestamp() WHERE id='${ids.actor}';DELETE FROM shop_manager.user_roles WHERE user_id='${ids.actor}';INSERT INTO shop_manager.user_roles(user_id,role_id) SELECT '${ids.actor}',id FROM shop_manager.roles WHERE name='owner';`,
  );
  return request({
    operationId: `87000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`,
    expectedUpdatedAt: json(
      `SELECT to_jsonb(to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.USTZH:TZM')) FROM shop_manager.profiles WHERE id='${ids.actor}'`,
    ),
  });
}
function final(r, count = 1) {
  const v = json(
    `SELECT json_build_object('shop',(SELECT shop_id FROM shop_manager.profiles WHERE id='${ids.actor}'),'roles',(SELECT json_agg(r.name ORDER BY r.name) FROM shop_manager.user_roles u JOIN shop_manager.roles r ON r.id=u.role_id WHERE u.user_id='${ids.actor}'),'outcomes',(SELECT count(*) FROM shop_selection_v1.outcomes WHERE operation_id='${r.operationId}'))`,
  );
  assert.deepEqual(v, { shop: ids.otherShop, roles: ["office_admin"], outcomes: count });
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
    "SELECT json_build_object('version',current_setting('server_version_num'),'data',current_setting('data_directory'),'socket',current_setting('unix_socket_directories'),'tcp',current_setting('listen_addresses'))",
  );
  assert.match(identity.version, /^17[0-9]{4}$/);
  assert.equal(identity.data, data);
  assert.equal(identity.socket, socket);
  assert.equal(identity.tcp, "");
  sql(setupStatements.map((s) => s + "\n;").join("\n"));
  sql(boundary);
  sql(stockSql);
  sql(extraSetup.map((s) => s + "\n;").join("\n"));
  sql(
    session(
      `INSERT INTO public.business_staff(business_id,user_id,role,invited_by) VALUES('${ids.otherBusiness}','${ids.actor}','clerk','${ids.outsider}');COMMIT;`,
      claims(ids.outsider),
    ),
  );
  sql(selectionSql);
  for (const mode of ["commit", "rollback", "intent_conflict", "stale"]) {
    const r = reset(),
      aName = `select_a_${seq}`,
      bName = `select_b_${seq}`;
    const a = query(
      session(select(r) + `SELECT pg_sleep(2);${mode === "rollback" ? "ROLLBACK" : "COMMIT"};`),
      aName,
    );
    await sleeping(aName);
    const other = {
      ...r,
      ...(mode === "intent_conflict" ? { targetShopId: ids.shop } : {}),
      ...(mode === "stale"
        ? { operationId: `88000000-0000-4000-8000-${String(seq).padStart(12, "0")}` }
        : {}),
    };
    const b = query(session(select(other) + "COMMIT;"), bName);
    await blocked(bName, aName);
    const first = await a,
      second = await b;
    assert.equal(first.code, 0, first.err);
    if (mode === "intent_conflict") {
      assert.notEqual(second.code, 0);
      assert.match(second.err, /22023/);
    } else {
      assert.equal(second.code, 0, second.err);
      const v = JSON.parse(second.out.trim());
      assert.equal(v.status, mode === "stale" ? "rejected" : "completed");
      if (mode === "stale") assert.equal(v.code, "conflict");
    }
    final(r);
    const replay = await query(session(select(r) + "COMMIT;"), `replay_${seq}`);
    assert.equal(replay.code, 0, replay.err);
    assert.equal(JSON.parse(replay.out.trim()).status, "completed");
    final(r);
    console.log(
      `PASS shop selection ${mode}: observed lock, atomic role binding, reconnect replay`,
    );
  }
  // A switch that owns the profile lock cannot be followed by a stale-shop activation.
  let r = reset();
  const held = query(session(select(r) + "SELECT pg_sleep(2);COMMIT;"), "switch_before_shift");
  await sleeping("switch_before_shift");
  const shift = query(
    session(
      `INSERT INTO shop_manager.employee_shifts(shop_id,profile_id,user_id) VALUES('${ids.shop}','${ids.actor}','${ids.actor}');COMMIT;`,
    ),
    "late_shift",
  );
  await blocked("late_shift", "switch_before_shift");
  assert.equal((await held).code, 0);
  const refused = await shift;
  assert.notEqual(refused.code, 0);
  assert.match(refused.err, /42501/);
  final(r);
  assert.equal(json("SELECT count(*) FROM shop_manager.employee_shifts"), 0);
  console.log("PASS shop selection rejects activation in the old shop after lock wait");
  // Conversely, an activation holding the profile share lock wins admission; selection refuses busy.
  r = reset();
  const active = query(
    session(
      `INSERT INTO shop_manager.employee_shifts(shop_id,profile_id,user_id) VALUES('${ids.shop}','${ids.actor}','${ids.actor}');SELECT pg_sleep(2);COMMIT;`,
    ),
    "shift_before_switch",
  );
  await sleeping("shift_before_switch");
  const switching = query(session(select(r) + "COMMIT;"), "busy_switch");
  await blocked("busy_switch", "shift_before_switch");
  assert.equal((await active).code, 0);
  const busy = await switching;
  assert.equal(busy.code, 0, busy.err);
  assert.equal(JSON.parse(busy.out.trim()).code, "active_shift");
  assert.equal(
    json(`SELECT to_jsonb(shop_id) FROM shop_manager.profiles WHERE id='${ids.actor}'`),
    ids.shop,
  );
  sql(
    "UPDATE shop_manager.employee_shifts SET status='completed',clocked_out_at=now() WHERE status='on_shift'",
  );
  console.log("PASS shop selection waits for active shift then refuses without auto-closing it");
  // Sessions are checked again after waiting for the account-wide operation lock.
  r = reset();
  const first = query(session(select(r) + "SELECT pg_sleep(3);COMMIT;"), "expires_a");
  await sleeping("expires_a");
  const expiry = json("SELECT floor(extract(epoch FROM clock_timestamp()))::bigint+2");
  const late = query(
    session(select(r) + "COMMIT;", claims(ids.actor, { exp: expiry })),
    "expires_b",
  );
  await blocked("expires_b", "expires_a");
  assert.equal((await first).code, 0);
  const expired = await late;
  assert.notEqual(expired.code, 0);
  assert.match(expired.err, /42501/);
  final(r);
  console.log("PASS shop selection expiry after a duplicate wait is denied");
  assert.ok(!interrupted);
  console.log(`PASS shop selection native PostgreSQL ${identity.version}`);
} finally {
  for (const c of children) c.kill("SIGTERM");
  const pidfile = path.join(data, "postmaster.pid");
  if (started || fs.existsSync(pidfile)) {
    if (fs.existsSync(pidfile)) {
      const p = fs.readFileSync(pidfile, "utf8").split("\n");
      assert.equal(p[1], data);
      assert.equal(p[3], port);
      assert.equal(p[4], socket);
    }
    try {
      exec("pg_ctl", ["-D", data, "-m", "fast", "-w", "-t", "15", "stop"]);
    } catch {
      exec("pg_ctl", ["-D", data, "-m", "immediate", "-w", "-t", "15", "stop"]);
    }
    assert.ok(!fs.existsSync(pidfile));
    assert.ok(!fs.existsSync(path.join(socket, `.s.PGSQL.${port}`)));
  }
  fs.rmSync(root, { recursive: true, force: true });
  process.off("SIGTERM", stop);
  process.off("SIGINT", stop);
  console.log("PASS shop selection private-cluster cleanup");
}
