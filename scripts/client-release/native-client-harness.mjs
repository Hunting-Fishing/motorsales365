// Shared isolated native PG17 test transport. Never uses an inherited DB target.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
export const literal = (value) => "'" + String(value).replaceAll("'", "''") + "'";
export async function withNativeDatabase(run) {
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(process.env.GITHUB_REPOSITORY, "Hunting-Fishing/motorsales365");
  assert.equal(process.platform, "linux");
  assert.notEqual(process.getuid(), 0);
  const bin = "/usr/lib/postgresql/17/bin",
    port = "55442",
    children = new Map();
  for (const name of ["initdb", "pg_ctl", "postgres", "psql"]) {
    const s = fs.lstatSync(`${bin}/${name}`);
    assert.ok(s.isFile() && !s.isSymbolicLink());
    assert.equal(s.uid, 0);
    assert.equal(s.mode & 0o022, 0);
  }
  const temp = fs.realpathSync(process.env.RUNNER_TEMP);
  assert.ok(fs.lstatSync(temp).isDirectory());
  const root = fs.mkdtempSync(path.join(temp, "client-commerce-"));
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
  const args = ["-X", "-Atq", "-w", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate"];
  let started = false,
    interrupted = false;
  const stop = () => {
    interrupted = true;
    for (const c of children.keys()) c.kill("SIGTERM");
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  const exec = (name, argv, input) =>
    execFileSync(`${bin}/${name}`, argv, {
      env,
      input,
      encoding: "utf8",
      timeout: 30000,
      maxBuffer: 2097152,
    });
  const sql = (s) => {
    assert.ok(typeof s === "string" && s.length < 2097152 && !s.includes("\0"));
    return exec("psql", args, s + "\n;\n");
  };
  const json = (s) => JSON.parse(sql(s).trim());
  function query(s, app) {
    assert.ok(
      !interrupted && s.length < 2097152 && !s.includes("\0") && /^[a-zA-Z0-9_-]{1,60}$/.test(app),
    );
    let child;
    const done = new Promise((resolve) => {
      child = spawn(`${bin}/psql`, args, {
        env: { ...env, PGAPPNAME: app },
        stdio: ["pipe", "pipe", "pipe"],
        shell: false,
      });
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
      for (const stream of [child.stdin, child.stdout, child.stderr])
        stream.on("error", () => child.kill("SIGTERM"));
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
    children.set(child, done);
    return done;
  }
  async function observe(test) {
    const until = Date.now() + 6500;
    do {
      assert.ok(!interrupted);
      if (test()) return;
      await delay(25);
    } while (Date.now() < until);
    throw Error("Expected independent-session lock not observed");
  }
  const sleeping = (app) =>
    observe(() =>
      json(
        `SELECT to_jsonb(COALESCE(bool_or(wait_event='PgSleep'),false)) FROM pg_stat_activity WHERE application_name=${literal(app)}`,
      ),
    );
  const blocked = (waiter, blocker) =>
    observe(() =>
      json(
        `SELECT to_jsonb(EXISTS(SELECT 1 FROM pg_stat_activity x,pg_stat_activity y WHERE x.application_name=${literal(waiter)} AND y.application_name=${literal(blocker)} AND x.wait_event_type='Lock' AND y.pid=ANY(pg_blocking_pids(x.pid))))`,
      ),
    );
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
    assert.equal(
      json("SELECT count(*) FROM pg_namespace WHERE nspname IN ('auth','shop_manager')"),
      0,
    );
    console.log(`PASS isolated commerce PostgreSQL ${identity.version}`);
    await run({ sql, json, query, sleeping, blocked, identity });
    assert.ok(!interrupted);
  } finally {
    const running = [...children.entries()];
    for (const [c] of running) c.kill("SIGTERM");
    await Promise.allSettled(running.map(([, done]) => done));
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
    console.log("PASS commerce private-cluster cleanup");
  }
}
