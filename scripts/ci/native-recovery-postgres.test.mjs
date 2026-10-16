// Offline refusal/pure/adversarial tests. NEVER starts a database or contacts a service.
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import {
  BIN,
  VERSION,
  DATABASE,
  OWNER,
  READERS,
  PORTS,
  BOOTSTRAPS,
  MAX_OUTPUT,
  MAX_ARCHIVE,
  MAX_ROLES,
  COMMAND_MS,
  FIXTURE_SQL,
  SNAPSHOT_SQL,
  FIXTURE_FINGERPRINT,
  validateContext,
  clientOptions,
  artifactCommand,
  safeFailure,
  failureMarker,
  parseManifest,
  verifyArtifacts,
  readPrivateFile,
  runBoundedCommand,
  runRecoveryPhase,
} from "./native-recovery-postgres.mjs";

const moduleUrl = new URL("./native-recovery-postgres.mjs", import.meta.url);
const source = fs.readFileSync(moduleUrl, "utf8");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const valid = Object.freeze({
  GITHUB_ACTIONS: "true",
  RUNNER_TEMP: "/runner/_temp",
  RECOVERY_NATIVE_ROOT: "/runner/_temp/recovery-native.Abc123",
});
const context = validateContext(valid, "linux");
const childEnv = {
  PATH: process.env.PATH ?? "",
  SystemRoot: process.env.SystemRoot ?? "",
  GITHUB_ACTIONS: "false",
  DATABASE_URL: "UNUSED-PRIVATE-SYNTHETIC-SENTINEL",
};
const archive = Buffer.from("PGDMP synthetic custom archive fixture");
const roles = Buffer.from(
  ["postgres", OWNER, ...READERS].map((role) => `CREATE ROLE ${role};`).join("\n") + "\n",
);
function fixture() {
  return {
    version: VERSION,
    root: context.root,
    fixtureFingerprint: FIXTURE_FINGERPRINT,
    sourceSystemId: "7000000000000000001",
    restoredSystemId: "7000000000000000002",
    snapshotHash: "a".repeat(64),
    sequence: { lastValue: "9000", isCalled: true },
    artifacts: {
      archive: { name: "recovery-probe.dump", size: archive.length, sha256: hash(archive) },
      roles: { name: "recovery-roles.sql", size: roles.length, sha256: hash(roles) },
    },
    database: {
      name: DATABASE,
      owner: OWNER,
      readers: [...READERS],
      publicConnect: false,
      comment: "TINY SYNTHETIC recovery probe",
      settings: [],
    },
    timings: { dumpMs: 1, verifyMs: 2 },
  };
}
function encoded(value = fixture()) {
  const bytes = Buffer.from(JSON.stringify(value) + "\n");
  return { bytes, pin: hash(bytes) };
}
function child() {
  const instance = new EventEmitter();
  instance.stdin = new PassThrough();
  instance.stdout = new PassThrough();
  instance.stderr = new PassThrough();
  instance.kills = [];
  instance.kill = (signal) => {
    instance.kills.push(signal);
    queueMicrotask(() => instance.emit("close", null, signal));
    return true;
  };
  return instance;
}

test("context admits only the fixed CI Linux private source/restored artifact layout", () => {
  assert.deepEqual(context, {
    temp: valid.RUNNER_TEMP,
    root: valid.RECOVERY_NATIVE_ROOT,
    source: { data: `${context.root}/source/data`, socket: `${context.root}/source/socket` },
    restored: { data: `${context.root}/restored/data`, socket: `${context.root}/restored/socket` },
    archive: `${context.root}/recovery-probe.dump`,
    roles: `${context.root}/recovery-roles.sql`,
    manifest: `${context.root}/manifest.json`,
  });
  assert.ok(
    Object.isFrozen(context) &&
      Object.isFrozen(context.source) &&
      Object.isFrozen(context.restored),
  );
  for (const platform of ["win32", "darwin", "freebsd", undefined])
    assert.throws(() => validateContext(valid, platform));
  for (const flag of [undefined, "", "false", "1", "TRUE"])
    assert.throws(() => validateContext({ ...valid, GITHUB_ACTIONS: flag }, "linux"));
});

for (const key of [
  "PGHOST",
  "PGHOSTADDR",
  "PGPORT",
  "PGUSER",
  "PGDATABASE",
  "PGSERVICE",
  "PGSERVICEFILE",
  "PGPASSWORD",
  "PGPASSFILE",
  "PGOPTIONS",
  "PGDATA",
  "PGUNKNOWN",
  "DATABASE_URL",
  "SUPABASE_DB_URL",
]) {
  test(`refuses every inherited ${key}, including an empty value`, () => {
    for (const value of ["PRIVATE-ROUTING", "", undefined])
      assert.throws(() => validateContext({ ...valid, [key]: value }, "linux"));
  });
}

for (const root of [
  "/",
  "/runner/_temp",
  "/runner/_temp/recovery-native.Abc12",
  "/runner/_temp/recovery-native.Abc1234",
  "/runner/_temp/quote-native.Abc123",
  "/runner/_temp/nested/recovery-native.Abc123",
  "/other/recovery-native.Abc123",
  "/runner/_temp/../recovery-native.Abc123",
  "/runner//_temp/recovery-native.Abc123",
  "relative/recovery-native.Abc123",
  "/runner/_temp/recovery-native.Ab\nc123",
  "/runner/_temp/recovery-native.Ab\rc123",
  "/runner/_temp/recovery-native.Ab\0c123",
  "/runner/_temp/recovery-native.Ab\\c123",
  "/runner/_temp/recovery-native.Ab\tc123",
]) {
  test(`refuses noncanonical or unscoped root ${JSON.stringify(root)}`, () => {
    assert.throws(() => validateContext({ ...valid, RECOVERY_NATIVE_ROOT: root }, "linux"));
  });
}

test("source/restored psql requests always use exact sockets/ports/user/database and never rc/password/shell", () => {
  assert.equal(BIN, "/usr/lib/postgresql/17/bin");
  assert.deepEqual(PORTS, { source: "55434", restored: "55435" });
  assert.deepEqual(BOOTSTRAPS, { source: "postgres", restored: "recovery_bootstrap" });
  for (const cluster of ["source", "restored"])
    for (const role of [BOOTSTRAPS[cluster], OWNER, ...READERS]) {
      const options = clientOptions(context, cluster, role, DATABASE);
      assert.equal(options.command, `${BIN}/psql`);
      assert.deepEqual(options.args.slice(0, 10), [
        "-X",
        "-w",
        "-h",
        context[cluster].socket,
        "-p",
        PORTS[cluster],
        "-U",
        role,
        "-d",
        DATABASE,
      ]);
      assert.ok(
        options.args.includes("ON_ERROR_STOP=1") && options.args.includes("VERBOSITY=sqlstate"),
      );
      assert.equal(options.timeout, COMMAND_MS);
      assert.equal(options.maxOutput, MAX_OUTPUT);
      assert.equal(options.env.PGPASSFILE, "/dev/null");
      assert.equal(options.env.PGSERVICEFILE, "/dev/null");
      assert.equal(options.env.PGSYSCONFDIR, context.root);
      assert.equal(options.env.PGCONNECT_TIMEOUT, "5");
      assert.equal(options.env.PGSSLMODE, "disable");
      assert.equal(options.env.HOME, undefined);
      assert.equal(options.env.DATABASE_URL, undefined);
      assert.equal(options.env.PGPASSWORD, undefined);
      assert.ok(Object.isFrozen(options.args) && Object.isFrozen(options.env));
    }
  for (const args of [
    ["outside"],
    ["source", "unknown"],
    ["restored", "postgres"],
    ["source", "postgres", "external"],
  ])
    assert.throws(() => clientOptions(context, ...args));
});

test("dump/roles/restore commands preserve ownership and ACLs with fixed arguments and no supplied files", () => {
  assert.deepEqual(artifactCommand(context, "dump").args, [
    "-w",
    "-h",
    context.source.socket,
    "-p",
    "55434",
    "-U",
    "postgres",
    "--format=custom",
    "--dbname",
    DATABASE,
  ]);
  assert.deepEqual(artifactCommand(context, "roles").args, [
    "-w",
    "-h",
    context.source.socket,
    "-p",
    "55434",
    "-U",
    "postgres",
    "--database=postgres",
    "--roles-only",
    "--no-role-passwords",
  ]);
  for (const negative of [false, true]) {
    assert.deepEqual(artifactCommand(context, "restore", negative).args, [
      "-w",
      "-h",
      context.restored.socket,
      "-p",
      "55435",
      "-U",
      "recovery_bootstrap",
      "--exit-on-error",
      "--single-transaction",
      "--dbname",
      negative ? `${DATABASE}_negative` : DATABASE,
    ]);
  }
  assert.deepEqual(artifactCommand(context, "control").args, ["-D", context.source.data]);
  assert.deepEqual(artifactCommand(context, "list").args, ["--list"]);
  for (const kind of ["dump", "roles", "restore", "control", "list"]) {
    const options = artifactCommand(context, kind);
    assert.doesNotMatch(
      JSON.stringify(options),
      /--no-owner|--no-acl|--clean|--create|postgres(?:ql)?:\/\/|PRIVATE/,
    );
    assert.equal(options.timeout, 15000);
  }
  assert.equal(artifactCommand(context, "dump").maxOutput, MAX_ARCHIVE);
  assert.equal(artifactCommand(context, "roles").maxOutput, MAX_ROLES);
  assert.throws(() => artifactCommand(context, "unexpected"));
  assert.throws(() => artifactCommand(context, "dump", true));
});

test("import remains inert with spawning APIs disabled and hostile inherited connection settings", () => {
  const code = `import child from 'node:child_process'; import {syncBuiltinESMExports} from 'node:module';
    for(const key of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork']) child[key]=()=>{throw Error('UNEXPECTED CHILD')};
    syncBuiltinESMExports(); await import(${JSON.stringify(moduleUrl.href)}); process.stdout.write('inert import');`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    env: childEnv,
    timeout: 5000,
    maxBuffer: 8192,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "inert import");
});

test("CLI refuses bad phase/extra args/non-CI before native child admission, without raw failure detail", () => {
  for (const args of [
    ["--prepare"],
    ["--restore", "a".repeat(64)],
    ["--run"],
    ["--prepare", "extra"],
    ["--restore", "not-a-pin"],
  ]) {
    const result = spawnSync(process.execPath, [fileURLToPath(moduleUrl), ...args], {
      env: childEnv,
      timeout: 5000,
      maxBuffer: 8192,
      encoding: "utf8",
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "FAIL:admission:unavailable\n");
    assert.match(result.stderr, /Synthetic PostgreSQL17 recovery failed \(stage=admission/);
    assert.doesNotMatch(
      result.stderr,
      /UNUSED-PRIVATE|AssertionError|ERR_ASSERTION|node:|stack|password/i,
    );
  }
});

test("invalid platform/routing/phase/digest refuses before filesystem or child capability access", async () => {
  let reads = 0;
  const trapped = mock.method(fs, "lstatSync", () => {
    reads++;
    throw Error("PRIVATE-FILE");
  });
  try {
    for (const [phase, pin, env, platform] of [
      ["--prepare", undefined, valid, "win32"],
      ["--prepare", undefined, { ...valid, PGPASSWORD: "PRIVATE" }, "linux"],
      ["--restore", "bad", valid, "linux"],
      ["--prepare", "a".repeat(64), valid, "linux"],
      ["--other", undefined, valid, "linux"],
    ])
      await assert.rejects(runRecoveryPhase(phase, pin, env, platform));
    assert.equal(reads, 0);
  } finally {
    trapped.mock.restore();
  }
});

test("a trusted external digest binds the exact manifest bytes before parsing", () => {
  const { bytes, pin } = encoded();
  assert.deepEqual(parseManifest(bytes, pin, context), fixture());
  assert.ok(Object.isFrozen(parseManifest(bytes, pin, context)));
  assert.throws(() => parseManifest(Buffer.from("PRIVATE MALFORMED JSON"), pin, context));
  assert.throws(() =>
    parseManifest(
      Buffer.from(JSON.stringify({ ...fixture(), snapshotHash: "b".repeat(64) })),
      pin,
      context,
    ),
  );
  for (const bad of [undefined, "", "a".repeat(63), "A".repeat(64), "g".repeat(64)])
    assert.throws(() => parseManifest(bytes, bad, context));
});

for (const [label, change] of [
  [
    "root escape",
    (m) => {
      m.root = "/other/recovery-native.Abc123";
    },
  ],
  [
    "version",
    (m) => {
      m.version = "other";
    },
  ],
  [
    "fixture drift",
    (m) => {
      m.fixtureFingerprint = "0".repeat(64);
    },
  ],
  [
    "same source/target cluster",
    (m) => {
      m.restoredSystemId = m.sourceSystemId;
    },
  ],
  [
    "invalid system ID",
    (m) => {
      m.sourceSystemId = "URI/host";
    },
  ],
  [
    "snapshot hash",
    (m) => {
      m.snapshotHash = "bad";
    },
  ],
  [
    "sequence high-watermark",
    (m) => {
      m.sequence.lastValue = "8999";
    },
  ],
  [
    "sequence called state",
    (m) => {
      m.sequence.isCalled = false;
    },
  ],
  [
    "archive traversal",
    (m) => {
      m.artifacts.archive.name = "../private.dump";
    },
  ],
  [
    "roles traversal",
    (m) => {
      m.artifacts.roles.name = "/external/roles.sql";
    },
  ],
  [
    "oversize archive",
    (m) => {
      m.artifacts.archive.size = MAX_ARCHIVE + 1;
    },
  ],
  [
    "oversize roles",
    (m) => {
      m.artifacts.roles.size = MAX_ROLES + 1;
    },
  ],
  [
    "fractional file size",
    (m) => {
      m.artifacts.archive.size = 1.5;
    },
  ],
  [
    "zero file size",
    (m) => {
      m.artifacts.roles.size = 0;
    },
  ],
  [
    "owner",
    (m) => {
      m.database.owner = "recovery_bootstrap";
    },
  ],
  [
    "public connection",
    (m) => {
      m.database.publicConnect = true;
    },
  ],
  [
    "reader role",
    (m) => {
      m.database.readers[0] = "postgres";
    },
  ],
  [
    "DB setting injection",
    (m) => {
      m.database.settings = ["search_path=evil"];
    },
  ],
  [
    "unexpected field",
    (m) => {
      m.sql = "PRIVATE SQL";
    },
  ],
  [
    "unexpected nested field",
    (m) => {
      m.artifacts.archive.path = "/external";
    },
  ],
  [
    "unbounded timing",
    (m) => {
      m.timings.dumpMs = 120001;
    },
  ],
])
  test(`manifest rejects ${label} even if synthetically repinned`, () => {
    const m = fixture();
    change(m);
    const { bytes, pin } = encoded(m);
    assert.throws(() => parseManifest(bytes, pin, context));
  });

test("changing manifest and artifacts together still fails the externally held prepare pin", () => {
  const original = encoded();
  const m = fixture();
  const changed = Buffer.from("PGDMP modified synthetic archive");
  m.artifacts.archive.sha256 = hash(changed);
  m.artifacts.archive.size = changed.length;
  const { bytes } = encoded(m);
  assert.throws(() => parseManifest(bytes, original.pin, context));
});

test("archive and roles digest/length/magic/bootstrap/password validation never rewrites trusted artifacts", () => {
  const manifest = fixture();
  assert.doesNotThrow(() => verifyArtifacts(manifest, archive, roles));
  assert.throws(() => verifyArtifacts(manifest, Buffer.from("PGDMP tampered"), roles));
  assert.throws(() => verifyArtifacts(manifest, archive, Buffer.from("tampered roles")));
  for (const badArchive of [Buffer.from("NOTPG archive"), Buffer.alloc(archive.length)]) {
    const m = fixture();
    m.artifacts.archive = {
      ...m.artifacts.archive,
      size: badArchive.length,
      sha256: hash(badArchive),
    };
    assert.throws(() => verifyArtifacts(m, badArchive, roles));
  }
  for (const addition of [
    "CREATE ROLE recovery_bootstrap;",
    "ALTER ROLE recovery_reader_a PASSWORD 'PRIVATE';",
    "ALTER ROLE recovery_reader_b PASSWORD E'PRIVATE';",
  ]) {
    const changed = Buffer.concat([roles, Buffer.from(addition)]),
      m = fixture();
    m.artifacts.roles = { ...m.artifacts.roles, size: changed.length, sha256: hash(changed) };
    assert.throws(() => verifyArtifacts(m, archive, changed));
  }
  const nullPassword = Buffer.concat([
      roles,
      Buffer.from("ALTER ROLE recovery_reader_a PASSWORD NULL;"),
    ]),
    m = fixture();
  m.artifacts.roles = {
    ...m.artifacts.roles,
    size: nullPassword.length,
    sha256: hash(nullPassword),
  };
  assert.doesNotThrow(() => verifyArtifacts(m, archive, nullPassword));
});

test("private file consumption is bounded, no-follow, owner/mode/inode checked and always closes", () => {
  const bytes = Buffer.from("synthetic bytes"),
    base = {
      isFile: () => true,
      isSymbolicLink: () => false,
      nlink: 1,
      size: bytes.length,
      uid: 123,
      mode: 0o100600,
      dev: 1,
      ino: 2,
      mtimeMs: 3,
      ctimeMs: 4,
    };
  let closed = 0,
    stats = [base, base],
    named = base,
    flag;
  const patches = [
    mock.method(fs, "openSync", (_path, flags) => {
      flag = flags;
      return 99;
    }),
    mock.method(fs, "fstatSync", () => stats.shift()),
    mock.method(fs, "readSync", (_fd, buffer, offset, length, position) => {
      const count = Math.min(3, length);
      bytes.copy(buffer, offset, position, position + count);
      return count;
    }),
    mock.method(fs, "lstatSync", () => named),
    mock.method(fs, "closeSync", () => {
      closed++;
    }),
  ];
  try {
    assert.deepEqual(readPrivateFile("fixed", 100, 123), bytes);
    assert.equal(closed, 1);
    if (fs.constants.O_NOFOLLOW !== undefined)
      assert.equal(flag & fs.constants.O_NOFOLLOW, fs.constants.O_NOFOLLOW);
    for (const changes of [
      { uid: 999 },
      { mode: 0o100644 },
      { nlink: 2 },
      { size: 101 },
      { size: 0 },
      { isFile: () => false },
    ]) {
      stats = [{ ...base, ...changes }, base];
      assert.throws(() => readPrivateFile("fixed", 100, 123));
    }
    stats = [base, { ...base, mtimeMs: 4 }];
    assert.throws(() => readPrivateFile("fixed", 100, 123));
    stats = [base, base];
    named = { ...base, isSymbolicLink: () => true };
    assert.throws(() => readPrivateFile("fixed", 100, 123));
    stats = [base, base];
    named = { ...base, ino: 999 };
    assert.throws(() => readPrivateFile("fixed", 100, 123));
    assert.equal(closed, 10);
  } finally {
    for (const patch of patches) patch.mock.restore();
  }
});

test("bounded runner uses no shell/inherited env, binary buffers, one owned child and consumes generic failures", async () => {
  const instance = child();
  let invocation;
  const options = clientOptions(context, "source");
  const pending = runBoundedCommand(options, "SYNTHETIC SQL", (...args) => {
    invocation = args;
    return instance;
  });
  instance.stdout.write(Buffer.from([0x50, 0x47, 0x44, 0x4d, 0x50]));
  instance.emit("close", 0, null);
  assert.deepEqual(await pending, Buffer.from("PGDMP"));
  assert.equal(invocation[0], `${BIN}/psql`);
  assert.deepEqual(invocation[1], [...options.args]);
  assert.equal(invocation[2].shell, false);
  assert.deepEqual(invocation[2].stdio, ["pipe", "pipe", "pipe"]);
  assert.deepEqual(invocation[2].env, options.env);
  assert.equal(invocation[2].env.DATABASE_URL, undefined);
});

test("bounded runner rejects nonzero status, unexpected warnings and spawn/stream errors without leaking data", async () => {
  await assert.rejects(
    runBoundedCommand(clientOptions(context, "source"), undefined, () => {
      throw Error("PRIVATE spawn");
    }),
    /Recovery command unavailable/,
  );
  for (const kind of ["status", "warning", "stdin", "stdout", "stderr", "child"]) {
    const instance = child();
    const pending = runBoundedCommand(clientOptions(context, "source"), undefined, () => instance);
    if (kind === "status") {
      instance.stderr.write("ERROR: 42501 PRIVATE SQL");
      instance.emit("close", 1, null);
    } else if (kind === "warning") {
      instance.stderr.write("PRIVATE warning");
      instance.emit("close", 0, null);
    } else (kind === "child" ? instance : instance[kind]).emit("error", Error("PRIVATE stream"));
    await assert.rejects(pending, (error) => {
      assert.doesNotMatch(error.message, /PRIVATE/);
      if (kind === "status") assert.equal(error.sqlState, "42501");
      return true;
    });
  }
});

test("output overflow and deadline kill only the owned child and await its close", async () => {
  for (const cause of ["overflow", "deadline"]) {
    const instance = child();
    const pending = runBoundedCommand(
      { ...clientOptions(context, "source"), maxOutput: 3, timeout: 5 },
      undefined,
      () => instance,
    );
    if (cause === "overflow") instance.stdout.write("1234");
    await assert.rejects(pending, /Recovery command failed/);
    assert.deepEqual(instance.kills, ["SIGTERM"]);
  }
});

test("failure output is static generic stage and allowlisted SQLSTATE, never messages/SQL/paths/stacks", () => {
  assert.equal(
    safeFailure("database-restore", {
      sqlState: "42501",
      message: "PRIVATE SQL",
      stderr: "PRIVATE",
      stack: "PRIVATE",
    }),
    "Synthetic PostgreSQL17 recovery failed (stage=database-restore, sqlState=42501); no release or production recovery is inferred.\n",
  );
  assert.match(
    safeFailure("PRIVATE", { sqlState: "PRIVATE" }),
    /stage=admission, sqlState=unavailable/,
  );
  assert.doesNotMatch(
    safeFailure("PRIVATE", { message: "PRIVATE", password: "PRIVATE" }),
    /PRIVATE/,
  );
});

test("short failure marker is bounded fixed vocabulary and cannot carry driver details or masquerade as a digest", () => {
  for (const stage of [
    "admission",
    "server-identity",
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
  ]) {
    const marker = failureMarker(stage, {
      sqlState: "42501",
      message: "PRIVATE SQL",
      stack: "PRIVATE",
    });
    assert.equal(marker, `FAIL:${stage}:42501\n`);
    assert.ok(Buffer.byteLength(marker) < 66);
    assert.doesNotMatch(marker, /PRIVATE|^[a-f0-9]{64}\n$/);
  }
  for (const sqlState of [
    undefined,
    "",
    "PRIVATE",
    "42501\nPRIVATE",
    "42501 PRIVATE",
    "aaaaa",
    42501,
  ]) {
    assert.equal(failureMarker("PRIVATE", { sqlState }), "FAIL:admission:unavailable\n");
  }
  assert.match(source, /process\.stdout\.write\(failureMarker\(stage, error\)\)/);
  assert.match(source, /process\.exitCode = 1/);
});

test("fixture and comparison pin genuine constraints/ACL/FORCE RLS and lossless decimal/sequence catalog evidence", () => {
  assert.match(FIXTURE_SQL, /GENERATED ALWAYS AS IDENTITY/);
  assert.match(FIXTURE_SQL, /REFERENCES recovery_fixture\.tenants/);
  assert.match(FIXTURE_SQL, /numeric\(18,4\).*CHECK \(amount > 0\)/);
  assert.match(FIXTURE_SQL, /12345678901234\.5678/);
  assert.equal((FIXTURE_SQL.match(/FORCE ROW LEVEL SECURITY/g) ?? []).length, 2);
  assert.match(FIXTURE_SQL, /GRANT SELECT \(id,tenant_id,amount,memo\)/);
  assert.doesNotMatch(FIXTURE_SQL, /GRANT.*secret/);
  assert.match(FIXTURE_SQL, /setval\('recovery_fixture\.records_id_seq',9000,true\)/);
  assert.match(SNAPSHOT_SQL, /'amount',amount::text/);
  assert.match(SNAPSHOT_SQL, /'id',id::text/);
  assert.match(SNAPSHOT_SQL, /'lastValue',last_value::text,'isCalled',is_called/);
  for (const term of [
    "pg_get_constraintdef",
    "aclexplode",
    "pg_policy",
    "pg_auth_members",
    "rolbypassrls",
    "attidentity",
    "relforcerowsecurity",
    "pg_indexes",
    "shobj_description(oid,'pg_database')",
  ])
    assert.ok(SNAPSHOT_SQL.includes(term));
  assert.equal(FIXTURE_FINGERPRINT, hash(FIXTURE_SQL + SNAPSHOT_SQL));
});

test("role snapshot reads real password-null and role settings from their distinct PostgreSQL17 catalogs", () => {
  assert.match(SNAPSHOT_SQL, /'passwordIsNull',rolpassword IS NULL/);
  assert.match(SNAPSHOT_SQL, /FROM pg_authid WHERE rolname/);
  assert.match(
    SNAPSHOT_SQL,
    /SELECT setconfig FROM pg_db_role_setting WHERE setrole=pg_authid\.oid AND setdatabase=0/,
  );
  assert.doesNotMatch(SNAPSHOT_SQL, /\brolconfig\b/);
});

test("source orders admission, external-pin/artifact verification, offline identity, restore and actual role probes", () => {
  assert.match(
    source,
    /const context = validateContext\(env, platform\),\s+uid = validateFiles\(context, phase\)/,
  );
  assert.match(
    source,
    /for \(const program of \[\s*"postgres",\s*"psql",\s*"pg_dump",\s*"pg_dumpall",\s*"pg_restore",\s*"pg_controldata",?\s*\]/,
  );
  assert.match(source, /source\.data\}\/postmaster\.pid/);
  assert.match(source, /Database cluster state:/);
  const restoreAt = source.indexOf('stage = "roles-restore"');
  const pinAt = source.indexOf("const manifest = parseManifest(");
  const artifactsAt = source.indexOf(
    'verifyArtifacts(manifest, archive, roles);\n  stage = "offline-source"',
  );
  assert.ok(pinAt >= 0 && artifactsAt >= 0 && restoreAt > pinAt && restoreAt > artifactsAt);
  assert.match(source, /assert\.equal\(restoredId, manifest\.restoredSystemId\)/);
  assert.match(source, /await fresh\(context, "restored"\)/);
  assert.match(source, /query\(\s*context,\s*cluster,.*role,\s*DATABASE/s);
  assert.match(source, /session_user/);
  assert.match(source, /pg_has_role\(current_user,x\.oid,'MEMBER'\)/);
  assert.match(source, /ownsTable: role === OWNER/);
  assert.match(source, /"SELECT secret FROM recovery_fixture\.records;", "42501"/);
  assert.match(source, /nextval\('recovery_fixture\.records_id_seq'\)::text/);
  assert.match(source, /CREATE EVENT TRIGGER recovery_late_fault ON ddl_command_start/);
  assert.match(source, /SELECT count\(\*\) FROM recovery_fixture\.records\)<>2/);
  assert.match(source, /syntheticLateFault, true/);
  assert.match(source, /restoredSchemas/);
  assert.match(source, /interrupted = true;\s+process\.exitCode = 1;/);
  assert.match(
    source,
    /const result = await runRecoveryPhase\([^;]+;\s+assert\.ok\(!interrupted\);/,
  );
  assert.doesNotMatch(
    source,
    /new PGlite|\bfetch\(|https?:\/\/|--no-owner|--no-acl|SET ROLE|supabase\/migrations/,
  );
  assert.match(
    source,
    /NOT whole baseline, Auth\/API\/private Storage\/credential recovery or production RTO/,
  );
});
