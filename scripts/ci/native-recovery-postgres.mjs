// Docker-free, CI-only, TINY SYNTHETIC PostgreSQL17 recovery experiment.
// Importing this module does not spawn, connect, read artifacts or execute SQL.
// Trust-socket LOGIN probes are not password/JWT/Auth/native-shop authority proof.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

export const BIN = "/usr/lib/postgresql/17/bin";
export const VERSION = "365-synthetic-pg17-recovery/v1";
export const DATABASE = "recovery_probe";
export const OWNER = "recovery_fixture_owner";
export const READERS = Object.freeze(["recovery_reader_a", "recovery_reader_b"]);
export const PORTS = Object.freeze({ source: "55434", restored: "55435" });
export const BOOTSTRAPS = Object.freeze({ source: "postgres", restored: "recovery_bootstrap" });
export const MAX_OUTPUT = 65536;
export const MAX_ARCHIVE = 4 * 1024 * 1024;
export const MAX_ROLES = 256 * 1024;
export const COMMAND_MS = 15000;
const active = new Set();
let interrupted = false;
const stages = new Set([
  "admission",
  "server-identity",
  "identity-read",
  "identity-json",
  "identity-version",
  "identity-data",
  "identity-socket",
  "identity-port",
  "identity-listen",
  "identity-database",
  "identity-user",
  "identity-session",
  "identity-recovery",
  "identity-encoding",
  "identity-system-id",
  "fresh-read",
  "fresh-json",
  "fresh-roles",
  "fresh-databases",
  "fresh-memberships",
  "cluster-distinct",
  "fixture",
  "source-access",
  "dump",
  "manifest",
  "offline-source",
  "roles-restore",
  "database-restore",
  "compare",
  "restored-access",
  "rollback",
]);
let stage = "admission";
const sha = (value) => createHash("sha256").update(value).digest("hex");
const tenantA = "10000000-0000-4000-8000-000000000001";
const tenantB = "10000000-0000-4000-8000-000000000002";

// Deliberately unrelated to production/application migrations, schemas or data.
export const FIXTURE_SQL = `
CREATE SCHEMA recovery_fixture AUTHORIZATION ${OWNER};
REVOKE ALL ON SCHEMA recovery_fixture FROM PUBLIC;
GRANT USAGE ON SCHEMA recovery_fixture TO ${READERS.join(",")};
CREATE TABLE recovery_fixture.tenants (
  id uuid PRIMARY KEY, label text NOT NULL CHECK (length(label) BETWEEN 1 AND 40)
);
CREATE TABLE recovery_fixture.records (
  id bigint GENERATED ALWAYS AS IDENTITY (START WITH 7) PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES recovery_fixture.tenants(id),
  amount numeric(18,4) NOT NULL CHECK (amount > 0),
  memo text NOT NULL CHECK (length(memo) BETWEEN 1 AND 80),
  secret text NOT NULL
);
ALTER TABLE recovery_fixture.tenants OWNER TO ${OWNER};
ALTER TABLE recovery_fixture.records OWNER TO ${OWNER};
ALTER TABLE recovery_fixture.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_fixture.tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE recovery_fixture.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_fixture.records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_a ON recovery_fixture.tenants FOR SELECT TO ${READERS[0]} USING (id='${tenantA}'::uuid);
CREATE POLICY tenant_b ON recovery_fixture.tenants FOR SELECT TO ${READERS[1]} USING (id='${tenantB}'::uuid);
CREATE POLICY record_a ON recovery_fixture.records FOR SELECT TO ${READERS[0]} USING (tenant_id='${tenantA}'::uuid);
CREATE POLICY record_b ON recovery_fixture.records FOR SELECT TO ${READERS[1]} USING (tenant_id='${tenantB}'::uuid);
REVOKE ALL ON ALL TABLES IN SCHEMA recovery_fixture FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA recovery_fixture FROM PUBLIC;
GRANT SELECT (id,label) ON recovery_fixture.tenants TO ${READERS.join(",")};
GRANT SELECT (id,tenant_id,amount,memo) ON recovery_fixture.records TO ${READERS.join(",")};
INSERT INTO recovery_fixture.tenants VALUES ('${tenantA}','Synthetic A'),('${tenantB}','Synthetic B');
INSERT INTO recovery_fixture.records (tenant_id,amount,memo,secret) VALUES
 ('${tenantA}',12345678901234.5678,'Synthetic A entry','Synthetic A private field'),
 ('${tenantB}',0.0001,'Synthetic B entry','Synthetic B private field');
SELECT setval('recovery_fixture.records_id_seq',9000,true);
`;

const acl = (expression) => `(SELECT coalesce(jsonb_agg(jsonb_build_object(
 'grantor',pg_get_userbyid(a.grantor),'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
 'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantor::regrole::text,
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type), '[]'::jsonb)
 FROM aclexplode(${expression}) a)`;

// No OIDs, numeric/bigint JSON numbers or volatile timestamps in comparison.
// Database ACL/owner are source-derived metadata replayed separately because
// transactional pg_restore uses a precreated database, not --create.
export const SNAPSHOT_SQL = `SELECT jsonb_build_object(
 'database',(SELECT jsonb_build_object('name',datname,'owner',pg_get_userbyid(datdba),
   'encoding',pg_encoding_to_char(encoding),'collation',datcollate,'ctype',datctype,'connectionLimit',datconnlimit,
   'acl',${acl("coalesce(datacl,acldefault('d',datdba))")},'comment',shobj_description(oid,'pg_database'),
   'settings',coalesce((SELECT jsonb_agg(setconfig ORDER BY setrole::regrole::text) FROM pg_db_role_setting WHERE setdatabase=pg_database.oid),'[]'::jsonb))
   FROM pg_database WHERE datname=current_database()),
 'schemas',(SELECT jsonb_agg(jsonb_build_object('name',nspname,'owner',pg_get_userbyid(nspowner),
   'acl',${acl("coalesce(nspacl,acldefault('n',nspowner))")}) ORDER BY nspname) FROM pg_namespace WHERE nspname='recovery_fixture'),
 'relations',(SELECT jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
   'rls',c.relrowsecurity,'force',c.relforcerowsecurity,'acl',${acl("coalesce(c.relacl,acldefault(CASE WHEN c.relkind='S' THEN 's'::\"char\" ELSE 'r'::\"char\" END,c.relowner))")}) ORDER BY c.relname)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='recovery_fixture' AND c.relkind IN ('r','S')),
 'columns',(SELECT jsonb_agg(jsonb_build_object('relation',c.relname,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
   'notnull',a.attnotnull,'identity',a.attidentity,'default',pg_get_expr(d.adbin,d.adrelid),
   'acl',${acl("coalesce(a.attacl,'{}'::aclitem[])")}) ORDER BY c.relname,a.attnum)
   FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
   WHERE n.nspname='recovery_fixture' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('name',co.conname,'relation',c.relname,'type',co.contype,
   'validated',co.convalidated,'definition',pg_get_constraintdef(co.oid)) ORDER BY c.relname,co.conname)
   FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='recovery_fixture'),
 'indexes',(SELECT jsonb_agg(indexdef ORDER BY indexname) FROM pg_indexes WHERE schemaname='recovery_fixture'),
 'policies',(SELECT jsonb_agg(jsonb_build_object('name',p.polname,'relation',c.relname,'command',p.polcmd,'permissive',p.polpermissive,
   'roles',(SELECT jsonb_agg(pg_get_userbyid(r) ORDER BY pg_get_userbyid(r)) FROM unnest(p.polroles) r),
   'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY c.relname,p.polname)
   FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='recovery_fixture'),
 'roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'super',rolsuper,'inherit',rolinherit,'createRole',rolcreaterole,
   'createDb',rolcreatedb,'login',rolcanlogin,'replication',rolreplication,'bypass',rolbypassrls,'limit',rolconnlimit,
   'validUntil',rolvaliduntil::text,'config',(SELECT setconfig FROM pg_db_role_setting WHERE setrole=pg_authid.oid AND setdatabase=0),
   'passwordIsNull',rolpassword IS NULL) ORDER BY rolname)
   FROM pg_authid WHERE rolname IN ('postgres','${OWNER}','${READERS[0]}','${READERS[1]}')),
 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(roleid),'member',pg_get_userbyid(member),
   'grantor',pg_get_userbyid(grantor),'admin',admin_option,'inherit',inherit_option,'set',set_option)
   ORDER BY pg_get_userbyid(roleid),pg_get_userbyid(member)),'[]'::jsonb) FROM pg_auth_members
   WHERE pg_get_userbyid(member) IN ('${OWNER}','${READERS[0]}','${READERS[1]}')),
 'tenants',(SELECT jsonb_agg(jsonb_build_object('id',id::text,'label',label) ORDER BY id) FROM recovery_fixture.tenants),
 'records',(SELECT jsonb_agg(jsonb_build_object('id',id::text,'tenant',tenant_id::text,'amount',amount::text,'memo',memo,'secret',secret) ORDER BY id) FROM recovery_fixture.records),
 'sequence',(SELECT jsonb_build_object('lastValue',last_value::text,'isCalled',is_called) FROM recovery_fixture.records_id_seq)
)::text;`;
export const FIXTURE_FINGERPRINT = sha(FIXTURE_SQL + SNAPSHOT_SQL);

export function safeFailure(value, error) {
  const name = stages.has(value) ? value : "admission";
  const sqlState =
    typeof error?.sqlState === "string" && /^[0-9A-Z]{5}$/.test(error.sqlState)
      ? error.sqlState
      : "unavailable";
  return `Synthetic PostgreSQL17 recovery failed (stage=${name}, sqlState=${sqlState}); no release or production recovery is inferred.\n`;
}

// A short fixed-vocabulary failure record fits the shell's strict 66-byte
// prepare capture. It never contains driver messages, SQL, paths or artifacts.
export function failureMarker(value, error) {
  const name = stages.has(value) ? value : "admission";
  const sqlState =
    typeof error?.sqlState === "string" && /^[0-9A-Z]{5}$/.test(error.sqlState)
      ? error.sqlState
      : "unavailable";
  return `FAIL:${name}:${sqlState}\n`;
}

export function validateContext(env, platform) {
  assert.equal(platform, "linux");
  assert.equal(env.GITHUB_ACTIONS, "true");
  for (const key of Object.keys(env))
    assert.ok(!key.startsWith("PG") && !["DATABASE_URL", "SUPABASE_DB_URL"].includes(key));
  const { RUNNER_TEMP: temp, RECOVERY_NATIVE_ROOT: root } = env;
  for (const value of [temp, root]) {
    assert.equal(typeof value, "string");
    assert.ok(value.startsWith("/") && value !== "/" && !/[\\\x00-\x1f\x7f]/.test(value));
    assert.equal(path.posix.normalize(value), value);
  }
  assert.equal(path.posix.dirname(root), temp);
  assert.match(path.posix.basename(root), /^recovery-native\.[A-Za-z0-9]{6}$/);
  return Object.freeze({
    temp,
    root,
    source: Object.freeze({ data: `${root}/source/data`, socket: `${root}/source/socket` }),
    restored: Object.freeze({ data: `${root}/restored/data`, socket: `${root}/restored/socket` }),
    archive: `${root}/recovery-probe.dump`,
    roles: `${root}/recovery-roles.sql`,
    manifest: `${root}/manifest.json`,
    passfile: `${root}/empty.pgpass`,
    servicefile: `${root}/empty.pg_service.conf`,
  });
}

function childEnv(context) {
  return Object.freeze({
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
}

export function clientOptions(context, cluster, role = BOOTSTRAPS[cluster], database = "postgres") {
  assert.ok(["source", "restored"].includes(cluster));
  assert.ok([BOOTSTRAPS[cluster], OWNER, ...READERS].includes(role));
  assert.ok(["postgres", DATABASE, `${DATABASE}_negative`].includes(database));
  return Object.freeze({
    command: `${BIN}/psql`,
    args: Object.freeze([
      "-X",
      "-w",
      "-h",
      context[cluster].socket,
      "-p",
      PORTS[cluster],
      "-U",
      role,
      "-d",
      database,
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
    env: childEnv(context),
    timeout: COMMAND_MS,
    maxOutput: MAX_OUTPUT,
  });
}

export function artifactCommand(context, kind, negative = false) {
  assert.ok(["dump", "roles", "restore", "list", "control"].includes(kind));
  assert.ok(!negative || kind === "restore");
  const cluster = ["restore"].includes(kind) ? "restored" : "source";
  const connection = [
    "-w",
    "-h",
    context[cluster].socket,
    "-p",
    PORTS[cluster],
    "-U",
    BOOTSTRAPS[cluster],
  ];
  const commands = {
    dump: ["pg_dump", ...connection, "--format=custom", "--dbname", DATABASE],
    roles: [
      "pg_dumpall",
      ...connection,
      "--database=postgres",
      "--roles-only",
      "--no-role-passwords",
    ],
    restore: [
      "pg_restore",
      ...connection,
      "--exit-on-error",
      "--single-transaction",
      "--dbname",
      negative ? `${DATABASE}_negative` : DATABASE,
    ],
    list: ["pg_restore", "--list"],
    control: ["pg_controldata", "-D", context.source.data],
  };
  const [program, ...args] = commands[kind];
  return Object.freeze({
    command: `${BIN}/${program}`,
    args: Object.freeze(args),
    env: childEnv(context),
    timeout: COMMAND_MS,
    maxOutput: kind === "dump" ? MAX_ARCHIVE : kind === "roles" ? MAX_ROLES : MAX_OUTPUT,
  });
}

export function runBoundedCommand(options, input = undefined, spawnImpl = spawn) {
  if (interrupted) return Promise.reject(new Error("Recovery interrupted."));
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawnImpl(options.command, [...options.args], {
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...options.env },
      });
    } catch {
      reject(new Error("Recovery command unavailable."));
      return;
    }
    active.add(child);
    const stdout = [],
      stderr = [];
    let length = 0,
      failure = null,
      killer,
      finished = false;
    const stop = () => {
      if (failure || finished) return;
      failure = new Error("Recovery command failed.");
      child.kill("SIGTERM");
      killer = setTimeout(() => child.kill("SIGKILL"), 1000);
    };
    const timer = setTimeout(stop, options.timeout);
    for (const [stream, chunks] of [
      [child.stdout, stdout],
      [child.stderr, stderr],
    ]) {
      stream.on("data", (chunk) => {
        const bytes = Buffer.from(chunk);
        length += bytes.length;
        if (length > options.maxOutput) {
          stop();
          return;
        }
        chunks.push(bytes);
      });
      stream.on("error", stop);
    }
    child.stdin.on("error", stop);
    child.once("error", stop);
    child.once("close", (status, signal) => {
      finished = true;
      clearTimeout(timer);
      clearTimeout(killer);
      active.delete(child);
      const errBytes = Buffer.concat(stderr);
      if (failure || status !== 0 || signal || interrupted) {
        const error = failure ?? new Error("Recovery command failed.");
        error.sqlState = errBytes.toString("utf8").match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})\b/)?.[1];
        error.syntheticLateFault = /ERROR:\s+SYNTHETIC_RECOVERY_LATE_FAULT\b/.test(
          errBytes.toString("utf8"),
        );
        reject(error);
      } else if (errBytes.length)
        reject(new Error("Recovery command emitted unexpected diagnostics."));
      else resolve(Buffer.concat(stdout));
    });
    try {
      child.stdin.end(input);
    } catch {
      stop();
    }
  });
}

function directory(value, uid) {
  const stat = fs.lstatSync(value);
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  assert.equal(stat.uid, uid);
  assert.equal(stat.mode & 0o777, 0o700);
  assert.equal(fs.realpathSync(value), value);
}

export function readPrivateFile(value, maxBytes, uid, allowEmpty = false) {
  assert.equal(typeof allowEmpty, "boolean");
  const fd = fs.openSync(value, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = fs.fstatSync(fd);
    assert.ok(
      before.isFile() &&
        before.nlink === 1 &&
        before.size >= (allowEmpty ? 0 : 1) &&
        before.size <= maxBytes,
    );
    assert.equal(before.uid, uid);
    assert.equal(before.mode & 0o777, 0o600);
    const bytes = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      assert.ok(count > 0);
      offset += count;
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

// libpq warns about /dev/null because a password file must be regular. Keep
// strict stderr rejection and use verified EMPTY private controls instead.
export function validateEmptyClientFiles(context, uid) {
  for (const value of [context.passfile, context.servicefile]) {
    assert.equal(readPrivateFile(value, 1, uid, true).length, 0);
  }
}

function privateWrite(value, bytes) {
  const fd = fs.openSync(
    value,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW,
    0o600,
  );
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function boundedTextFile(value, maxBytes) {
  const stat = fs.lstatSync(value);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0 && stat.size <= maxBytes);
  return fs.readFileSync(value, "utf8");
}

function validateFiles(context, phase) {
  const uid = process.getuid();
  assert.equal(fs.realpathSync(context.temp), context.temp);
  assert.ok(
    fs.lstatSync(context.temp).isDirectory() && !fs.lstatSync(context.temp).isSymbolicLink(),
  );
  for (const value of [
    context.root,
    `${context.root}/source`,
    context.source.data,
    context.source.socket,
    `${context.root}/restored`,
    context.restored.data,
    context.restored.socket,
  ])
    directory(value, uid);
  for (const program of [
    "postgres",
    "psql",
    "pg_dump",
    "pg_dumpall",
    "pg_restore",
    "pg_controldata",
  ]) {
    const value = `${BIN}/${program}`,
      stat = fs.lstatSync(value);
    assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.mode & 0o111);
    assert.equal(fs.realpathSync(value), value);
  }
  for (const cluster of phase === "--prepare" ? ["source", "restored"] : ["restored"]) {
    const target = context[cluster];
    const pid = boundedTextFile(`${target.data}/postmaster.pid`, 4096).split("\n")[0];
    assert.match(pid, /^[1-9][0-9]{0,9}$/);
    assert.equal(fs.statSync(`/proc/${pid}`).uid, uid);
    assert.equal(fs.realpathSync(`/proc/${pid}/exe`), `${BIN}/postgres`);
    const procFd = fs.openSync(`/proc/${pid}/cmdline`, fs.constants.O_RDONLY);
    const procBytes = Buffer.alloc(8193);
    let procLength;
    try {
      procLength = fs.readSync(procFd, procBytes, 0, procBytes.length, 0);
    } finally {
      fs.closeSync(procFd);
    }
    assert.ok(procLength > 0 && procLength <= 8192);
    assert.deepEqual(
      procBytes.subarray(0, procLength).toString("utf8").split("\0").filter(Boolean),
      [`${BIN}/postgres`, "-D", target.data],
    );
    const socket = fs.lstatSync(`${target.socket}/.s.PGSQL.${PORTS[cluster]}`);
    assert.ok(socket.isSocket());
    assert.equal(socket.uid, uid);
    assert.equal(socket.mode & 0o777, 0o700);
  }
  if (phase === "--restore") {
    for (const value of [
      `${context.source.data}/postmaster.pid`,
      `${context.source.socket}/.s.PGSQL.${PORTS.source}`,
      `${context.source.socket}/.s.PGSQL.${PORTS.source}.lock`,
    ])
      assert.ok(!fs.existsSync(value));
  } else
    for (const value of [
      context.archive,
      context.roles,
      context.manifest,
      context.passfile,
      context.servicefile,
    ])
      assert.ok(!fs.existsSync(value));
  return uid;
}

const text = (bytes) =>
  new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes).trim();
async function query(context, cluster, sql, role = BOOTSTRAPS[cluster], database = "postgres") {
  assert.ok(!interrupted);
  return text(
    await runBoundedCommand(
      clientOptions(context, cluster, role, database),
      `SET statement_timeout='10s'; SET lock_timeout='5s';\n${sql}\n`,
    ),
  );
}

async function serverIdentity(context, cluster) {
  stage = "identity-read";
  const raw = await query(
    context,
    cluster,
    `SELECT jsonb_build_object(
    'version',current_setting('server_version_num'),'data',current_setting('data_directory'),
    'socket',current_setting('unix_socket_directories'),'port',current_setting('port'),
    'listen',current_setting('listen_addresses'),'database',current_database(),'user',current_user,'session',session_user,
    'systemId',(pg_control_system()).system_identifier::text,'recovery',pg_is_in_recovery(),'encoding',current_setting('server_encoding'))::text;`,
  );
  stage = "identity-json";
  return assertServerIdentity(JSON.parse(raw), context, cluster);
}

// Same admission assertions, independently exercisable without any SQL or I/O.
// Diagnostic stages are fixed labels; never publish actual/expected field values.
export function assertServerIdentity(value, context, cluster) {
  stage = "identity-version";
  assert.match(value.version, /^17\d{4}$/);
  for (const [key, expected] of Object.entries({
    data: context[cluster].data,
    socket: context[cluster].socket,
    port: PORTS[cluster],
    listen: "",
    database: "postgres",
    user: BOOTSTRAPS[cluster],
    session: BOOTSTRAPS[cluster],
    recovery: false,
    encoding: "UTF8",
  })) {
    stage = `identity-${key}`;
    assert.equal(value[key], expected);
  }
  stage = "identity-system-id";
  assert.match(value.systemId, /^[1-9][0-9]{0,19}$/);
  return value.systemId;
}

async function fresh(context, cluster) {
  stage = "fresh-read";
  const raw = await query(
    context,
    cluster,
    `SELECT jsonb_build_object(
    'databases',(SELECT jsonb_agg(datname ORDER BY datname) FROM pg_database),
    'roles',(SELECT jsonb_agg(rolname ORDER BY rolname) FROM pg_roles WHERE rolname !~ '^pg_'),
    'memberships',(SELECT count(*)::text FROM pg_auth_members WHERE pg_get_userbyid(member) !~ '^pg_'))::text;`,
  );
  stage = "fresh-json";
  assertFreshCluster(JSON.parse(raw), cluster);
}

export function assertFreshCluster(value, cluster) {
  const expected = {
    roles: [BOOTSTRAPS[cluster]],
    databases: ["postgres", "template0", "template1"],
    memberships: "0",
  };
  for (const [key, fields] of Object.entries(expected)) {
    stage = `fresh-${key}`;
    assert.deepEqual(value[key], fields);
  }
  stage = "fresh-json";
  assert.deepEqual(value, expected);
}

async function roleProbe(context, cluster, role) {
  const value = JSON.parse(
    await query(
      context,
      cluster,
      `SELECT jsonb_build_object('user',current_user,'session',session_user,
    'super',r.rolsuper,'bypass',r.rolbypassrls,'createRole',r.rolcreaterole,'createDb',r.rolcreatedb,'replication',r.rolreplication,
    'inherit',r.rolinherit,'login',r.rolcanlogin,'memberships',(SELECT coalesce(jsonb_agg(x.rolname ORDER BY x.rolname),'[]'::jsonb) FROM pg_roles x WHERE x.rolname<>current_user AND pg_has_role(current_user,x.oid,'MEMBER')),
    'ownsTable',EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='recovery_fixture' AND c.relowner=r.oid))::text
    FROM pg_roles r WHERE r.rolname=current_user;`,
      role,
      DATABASE,
    ),
  );
  assert.deepEqual(value, {
    user: role,
    session: role,
    super: false,
    bypass: false,
    createRole: false,
    createDb: false,
    replication: false,
    inherit: false,
    login: true,
    memberships: role === OWNER ? ["pg_database_owner"] : [],
    ownsTable: role === OWNER,
  });
}

async function denied(context, cluster, role, sql, sqlState) {
  try {
    await query(context, cluster, sql, role, DATABASE);
  } catch (error) {
    assert.equal(error.sqlState, sqlState);
    return;
  }
  throw new Error("Required synthetic denial was absent.");
}

async function accessProof(context, cluster) {
  for (const role of [OWNER, ...READERS]) await roleProbe(context, cluster, role);
  for (const [index, role] of READERS.entries()) {
    const tenant = index === 0 ? tenantA : tenantB,
      other = index === 0 ? tenantB : tenantA;
    const data = JSON.parse(
      await query(
        context,
        cluster,
        `SELECT jsonb_build_object(
      'own',(SELECT jsonb_agg(jsonb_build_object('id',id::text,'tenant',tenant_id::text,'amount',amount::text,'memo',memo) ORDER BY id) FROM recovery_fixture.records),
      'other',(SELECT count(*)::text FROM recovery_fixture.records WHERE tenant_id='${other}'),
      'tenant',(SELECT jsonb_agg(id::text ORDER BY id) FROM recovery_fixture.tenants))::text;`,
        role,
        DATABASE,
      ),
    );
    assert.deepEqual(data, {
      own: [
        {
          id: index === 0 ? "7" : "8",
          tenant,
          amount: index === 0 ? "12345678901234.5678" : "0.0001",
          memo: index === 0 ? "Synthetic A entry" : "Synthetic B entry",
        },
      ],
      other: "0",
      tenant: [tenant],
    });
    await denied(context, cluster, role, "SELECT secret FROM recovery_fixture.records;", "42501");
    await denied(
      context,
      cluster,
      role,
      `INSERT INTO recovery_fixture.records(tenant_id,amount,memo,secret) VALUES('${tenant}',1,'denied','denied');`,
      "42501",
    );
    await denied(
      context,
      cluster,
      role,
      "SELECT nextval('recovery_fixture.records_id_seq');",
      "42501",
    );
    await denied(
      context,
      cluster,
      role,
      "CREATE TABLE recovery_fixture.denied(id integer);",
      "42501",
    );
  }
  assert.equal(
    await query(
      context,
      cluster,
      "SELECT count(*)::text FROM recovery_fixture.records;",
      OWNER,
      DATABASE,
    ),
    "0",
  );
}

function exact(value, keys) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  assert.ok([Object.prototype, null].includes(Object.getPrototypeOf(value)));
  const descriptors = Object.getOwnPropertyDescriptors(value);
  assert.deepEqual(Reflect.ownKeys(descriptors).sort(), [...keys].sort());
  for (const descriptor of Object.values(descriptors))
    assert.ok(descriptor.enumerable && "value" in descriptor);
  return value;
}

export function parseManifest(bytes, pin, context) {
  assert.match(pin, /^[a-f0-9]{64}$/);
  assert.ok(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= MAX_OUTPUT);
  assert.equal(sha(bytes), pin); // BEFORE JSON parsing or any privileged execution.
  assert.notEqual(bytes[0], 0xef);
  const value = JSON.parse(text(bytes));
  exact(value, [
    "version",
    "root",
    "fixtureFingerprint",
    "sourceSystemId",
    "restoredSystemId",
    "snapshotHash",
    "sequence",
    "artifacts",
    "database",
    "timings",
  ]);
  assert.equal(value.version, VERSION);
  assert.equal(value.root, context.root);
  assert.equal(value.fixtureFingerprint, FIXTURE_FINGERPRINT);
  for (const key of ["sourceSystemId", "restoredSystemId"])
    assert.match(value[key], /^[1-9][0-9]{0,19}$/);
  assert.notEqual(value.sourceSystemId, value.restoredSystemId);
  assert.match(value.snapshotHash, /^[a-f0-9]{64}$/);
  exact(value.sequence, ["lastValue", "isCalled"]);
  assert.deepEqual(value.sequence, { lastValue: "9000", isCalled: true });
  exact(value.artifacts, ["archive", "roles"]);
  for (const [key, name, limit] of [
    ["archive", "recovery-probe.dump", MAX_ARCHIVE],
    ["roles", "recovery-roles.sql", MAX_ROLES],
  ]) {
    const artifact = exact(value.artifacts[key], ["name", "size", "sha256"]);
    assert.equal(artifact.name, name);
    assert.ok(Number.isSafeInteger(artifact.size) && artifact.size > 0 && artifact.size <= limit);
    assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
  }
  exact(value.database, ["name", "owner", "readers", "publicConnect", "comment", "settings"]);
  assert.deepEqual(value.database, databaseMetadata);
  exact(value.timings, ["dumpMs", "verifyMs"]);
  for (const duration of Object.values(value.timings))
    assert.ok(Number.isSafeInteger(duration) && duration >= 0 && duration <= 120000);
  return Object.freeze(value);
}

export function verifyArtifacts(manifest, archive, roles) {
  for (const [key, bytes] of [
    ["archive", archive],
    ["roles", roles],
  ]) {
    assert.ok(Buffer.isBuffer(bytes));
    assert.equal(bytes.length, manifest.artifacts[key].size);
    assert.equal(sha(bytes), manifest.artifacts[key].sha256);
  }
  assert.equal(archive.subarray(0, 5).toString("ascii"), "PGDMP");
  const roleText = text(roles);
  assert.doesNotMatch(roleText, /recovery_bootstrap/i);
  assert.doesNotMatch(roleText, /\bPASSWORD\s+(?!NULL\b)/i);
  for (const role of ["postgres", OWNER, ...READERS])
    assert.match(roleText, new RegExp(`CREATE ROLE ${role};`));
}

const databaseMetadata = Object.freeze({
  name: DATABASE,
  owner: OWNER,
  readers: [...READERS],
  publicConnect: false,
  comment: "TINY SYNTHETIC recovery probe",
  settings: [],
});
const createDatabase = `CREATE DATABASE ${DATABASE} OWNER ${OWNER} TEMPLATE template0 ENCODING 'UTF8';`;
const databaseAcl = `REVOKE ALL ON DATABASE ${DATABASE} FROM PUBLIC; GRANT CONNECT ON DATABASE ${DATABASE} TO ${READERS.join(",")}; COMMENT ON DATABASE ${DATABASE} IS 'TINY SYNTHETIC recovery probe';`;

async function snapshot(context, cluster) {
  const value = await query(context, cluster, SNAPSHOT_SQL, BOOTSTRAPS[cluster], DATABASE);
  const parsed = JSON.parse(value);
  assert.deepEqual(parsed.sequence, { lastValue: "9000", isCalled: true });
  assert.equal(parsed.database.name, DATABASE);
  assert.equal(parsed.database.owner, OWNER);
  assert.equal(parsed.database.comment, databaseMetadata.comment);
  assert.deepEqual(parsed.database.settings, []);
  assert.equal(parsed.database.encoding, "UTF8");
  assert.equal(parsed.database.collation, "C.UTF-8");
  assert.equal(parsed.database.ctype, "C.UTF-8");
  assert.equal(parsed.database.connectionLimit, -1);
  assert.deepEqual(parsed.database.acl, [
    ...["CONNECT", "CREATE", "TEMPORARY"].map((privilege) => ({
      grantor: OWNER,
      grantee: OWNER,
      privilege,
      grantable: false,
    })),
    ...READERS.map((grantee) => ({
      grantor: OWNER,
      grantee,
      privilege: "CONNECT",
      grantable: false,
    })),
  ]);
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.policies.length, 4);
  assert.equal(parsed.constraints.length, 6);
  assert.equal(parsed.roles.length, 4);
  return sha(value);
}

async function rollbackProof(context, archive) {
  const list = text(await runBoundedCommand(artifactCommand(context, "list"), archive));
  const dataAt = list.indexOf("TABLE DATA recovery_fixture records"),
    policyAt = list.indexOf("POLICY recovery_fixture records");
  assert.ok(dataAt >= 0 && policyAt > dataAt);
  await query(
    context,
    "restored",
    `CREATE DATABASE ${DATABASE}_negative OWNER ${OWNER} TEMPLATE template0 ENCODING 'UTF8';`,
  );
  await query(
    context,
    "restored",
    `CREATE SCHEMA recovery_fault; CREATE FUNCTION recovery_fault.reject_policy() RETURNS event_trigger LANGUAGE plpgsql AS $$
    BEGIN IF tg_tag='CREATE POLICY' THEN
      IF (SELECT count(*) FROM recovery_fixture.records)<>2 OR (SELECT count(*) FROM recovery_fixture.tenants)<>2 THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Synthetic recovery witness absent'; END IF;
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='SYNTHETIC_RECOVERY_LATE_FAULT';
    END IF; RETURN; END $$;
    CREATE EVENT TRIGGER recovery_late_fault ON ddl_command_start EXECUTE FUNCTION recovery_fault.reject_policy();`,
    BOOTSTRAPS.restored,
    `${DATABASE}_negative`,
  );
  try {
    await runBoundedCommand(artifactCommand(context, "restore", true), archive);
    throw new Error("Expected restore failure absent.");
  } catch (error) {
    assert.equal(error.syntheticLateFault, true);
  }
  assert.equal(
    await query(
      context,
      "restored",
      `SELECT jsonb_build_object('restoredSchemas',(SELECT count(*)::text FROM pg_namespace WHERE nspname='recovery_fixture'),
    'faultRemains',(SELECT count(*)::text FROM pg_event_trigger WHERE evtname='recovery_late_fault'))::text;`,
      BOOTSTRAPS.restored,
      `${DATABASE}_negative`,
    ),
    '{"faultRemains": "1", "restoredSchemas": "0"}',
  );
}

export async function runRecoveryPhase(phase, pin, env = process.env, platform = process.platform) {
  stage = "admission";
  assert.ok(phase === "--prepare" || phase === "--restore");
  assert.ok(
    phase === "--restore"
      ? typeof pin === "string" && /^[a-f0-9]{64}$/.test(pin)
      : pin === undefined,
  );
  const context = validateContext(env, platform),
    uid = validateFiles(context, phase);
  if (phase === "--prepare") {
    privateWrite(context.passfile, Buffer.alloc(0));
    privateWrite(context.servicefile, Buffer.alloc(0));
  }
  validateEmptyClientFiles(context, uid);
  stage = "server-identity";
  const restoredId = await serverIdentity(context, "restored");
  await fresh(context, "restored");
  if (phase === "--prepare") {
    const sourceId = await serverIdentity(context, "source");
    await fresh(context, "source");
    stage = "cluster-distinct";
    assert.notEqual(sourceId, restoredId);
    stage = "fixture";
    for (const role of [OWNER, ...READERS])
      await query(
        context,
        "source",
        `CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 4 PASSWORD NULL;`,
      );
    await query(context, "source", createDatabase);
    await query(context, "source", databaseAcl);
    await query(context, "source", FIXTURE_SQL, "postgres", DATABASE);
    stage = "source-access";
    const verifyStart = performance.now();
    await accessProof(context, "source");
    const snapshotHash = await snapshot(context, "source");
    const verifyMs = Math.round(performance.now() - verifyStart);
    stage = "dump";
    const dumpStart = performance.now();
    const archive = await runBoundedCommand(artifactCommand(context, "dump"));
    const roles = await runBoundedCommand(artifactCommand(context, "roles"));
    const dumpMs = Math.round(performance.now() - dumpStart);
    const manifest = {
      version: VERSION,
      root: context.root,
      fixtureFingerprint: FIXTURE_FINGERPRINT,
      sourceSystemId: sourceId,
      restoredSystemId: restoredId,
      snapshotHash,
      sequence: { lastValue: "9000", isCalled: true },
      artifacts: {
        archive: { name: "recovery-probe.dump", size: archive.length, sha256: sha(archive) },
        roles: { name: "recovery-roles.sql", size: roles.length, sha256: sha(roles) },
      },
      database: databaseMetadata,
      timings: { dumpMs, verifyMs },
    };
    stage = "manifest";
    const bytes = Buffer.from(JSON.stringify(manifest) + "\n");
    const digest = sha(bytes);
    parseManifest(bytes, digest, context);
    verifyArtifacts(manifest, archive, roles);
    privateWrite(context.archive, archive);
    privateWrite(context.roles, roles);
    privateWrite(context.manifest, bytes);
    assert.equal(sha(readPrivateFile(context.manifest, MAX_OUTPUT, uid)), digest);
    verifyArtifacts(
      manifest,
      readPrivateFile(context.archive, MAX_ARCHIVE, uid),
      readPrivateFile(context.roles, MAX_ROLES, uid),
    );
    return Object.freeze({ pin: digest, dumpMs, verifyMs });
  }
  stage = "manifest";
  const manifest = parseManifest(readPrivateFile(context.manifest, MAX_OUTPUT, uid), pin, context);
  assert.equal(restoredId, manifest.restoredSystemId);
  const archive = readPrivateFile(context.archive, MAX_ARCHIVE, uid),
    roles = readPrivateFile(context.roles, MAX_ROLES, uid);
  verifyArtifacts(manifest, archive, roles);
  stage = "offline-source";
  const control = text(await runBoundedCommand(artifactCommand(context, "control")));
  assert.equal(
    control.match(/^Database system identifier:\s+(\d+)$/m)?.[1],
    manifest.sourceSystemId,
  );
  assert.equal(control.match(/^Database cluster state:\s+(.+)$/m)?.[1], "shut down");
  // Re-admit files/source-offline immediately before any privileged restore.
  validateFiles(context, phase);
  assert.equal(sha(readPrivateFile(context.manifest, MAX_OUTPUT, uid)), pin);
  verifyArtifacts(
    manifest,
    readPrivateFile(context.archive, MAX_ARCHIVE, uid),
    readPrivateFile(context.roles, MAX_ROLES, uid),
  );
  const restoreStart = performance.now();
  stage = "roles-restore";
  await query(context, "restored", text(roles));
  stage = "database-restore";
  await query(context, "restored", createDatabase);
  await query(context, "restored", databaseAcl);
  await runBoundedCommand(artifactCommand(context, "restore"), archive);
  const restoreMs = Math.round(performance.now() - restoreStart),
    verifyStart = performance.now();
  stage = "compare";
  assert.equal(await snapshot(context, "restored"), manifest.snapshotHash);
  stage = "restored-access";
  await accessProof(context, "restored");
  assert.equal(
    await query(
      context,
      "restored",
      "SELECT nextval('recovery_fixture.records_id_seq')::text;",
      BOOTSTRAPS.restored,
      DATABASE,
    ),
    "9001",
  );
  stage = "rollback";
  await rollbackProof(context, archive);
  return Object.freeze({
    dumpMs: manifest.timings.dumpMs,
    restoreMs,
    verifyMs: Math.round(performance.now() - verifyStart),
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const stop = () => {
    interrupted = true;
    process.exitCode = 1;
    for (const child of active) child.kill("SIGTERM");
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  try {
    assert.ok(process.argv.length === (process.argv[2] === "--restore" ? 4 : 3));
    const result = await runRecoveryPhase(process.argv[2], process.argv[3]);
    assert.ok(!interrupted);
    if (process.argv[2] === "--prepare") {
      process.stderr.write(
        `Synthetic PG17 prepare: dumpMs=${result.dumpMs}, verifyMs=${result.verifyMs}; tiny fixture only, no production RTO.\n`,
      );
      process.stdout.write(`${result.pin}\n`);
    } else
      process.stdout.write(
        `PASS synthetic PG17 recovery: data/catalog/ACL/RLS/sequence and late restore rollback; dumpMs=${result.dumpMs}, restoreMs=${result.restoreMs}, verifyMs=${result.verifyMs}. NOT whole baseline, Auth/API/private Storage/credential recovery or production RTO.\n`,
      );
  } catch (error) {
    process.stdout.write(failureMarker(stage, error));
    process.stderr.write(safeFailure(stage, error));
    process.exitCode = 1;
  } finally {
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
  }
}
