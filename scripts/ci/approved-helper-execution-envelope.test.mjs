// OFFLINE ONLY. Memory PGlite tests of a distinct execution envelope around
// exact approved PR18 bytes; no live client, production executor or migration.
// Three unchanged source functions, reduced synthetic compilation/data support,
// and fixture-only observed ACL setup. Not full native parity, caller inventory,
// JWT/PostgREST behavior, concurrency, tenant authorization or indirect-path repair.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { buildApprovedHelperExecutionEnvelope } from "./approved-helper-execution-envelope.mjs";

const options = { concurrency: false, timeout: 30_000 };
const sha = (value) => createHash("sha256").update(value).digest("hex");
const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url));
const lf = (value) => value.toString("utf8").replace(/\r\n/g, "\n");
const actions = ["profile_bootstrap", "work_order_totals"];
const bootstrap = "shop_manager.ensure_profile_for(uuid)";
const totals = "shop_manager.calculate_work_order_totals(uuid)";
const converter = "shop_manager.convert_work_order_to_invoice(uuid)";
const signatures = [bootstrap, totals, converter];
const fingerprints = [
  "77cb775bfedfb78996b31fcbdd3ada4c",
  "1119dd7abe3e643d8d0c6979f19fc2a1",
  "e590e08f9f68cc5fdead8a853af670b9",
];
const originalAcl = ["PUBLIC", "postgres", "service_role"];
const restrictedAcl = ["postgres", "service_role"];
const uuid = "00000000-0000-4000-8000-000000000001";
const profileSource = lf(
  read("supabase/migrations/20260713081838_b99aba93-f19b-4aec-b7a1-3bdb86faadc6.sql"),
);
const helperSource = lf(
  read("supabase/migrations/20260715012303_a5daad1f-ca4a-4606-b07d-3f38ec8c7ee9.sql"),
);
assert.equal(
  sha(profileSource),
  "5ea2e85cf05bf006dcb684ef063f9ef15f38fdfcc9dccd2c050f4c0a5a115647",
);
assert.equal(sha(helperSource), "08729a1af4909c61d5bc557083db8fddf85ea63ceb614ebf39653a8b8da57ae5");
const bootstrapMatches = [
  ...profileSource.matchAll(
    /^CREATE OR REPLACE FUNCTION shop_manager\.ensure_profile_for\(_user_id uuid\)[\s\S]*?END\$\$;/gm,
  ),
];
assert.equal(bootstrapMatches.length, 1);
assert.equal(
  sha(bootstrapMatches[0][0]),
  "8f86e53b90d08631378fd50e28b63dceac4ede81059748dc255c15f0b0f5a554",
);
function extract(name, expected) {
  const start = `CREATE OR REPLACE FUNCTION shop_manager.${name}(`;
  const end = `GRANT EXECUTE ON FUNCTION shop_manager.${name}(uuid) TO authenticated;`;
  assert.equal(helperSource.split(start).length, 2);
  assert.equal(helperSource.split(end).length, 2);
  const offset = helperSource.indexOf(start);
  const last = helperSource.indexOf(end, offset);
  assert.ok(last > offset);
  const definition = helperSource.slice(offset, last + end.length);
  assert.equal(sha(definition), expected);
  return definition;
}
const definitions = [
  bootstrapMatches[0][0],
  extract(
    "calculate_work_order_totals",
    "aa2bea4e7de7e7333ad614fa6a90b1ba9e8ea67b1ba69ecf15d48c1f7cccc773",
  ),
  extract(
    "convert_work_order_to_invoice",
    "1f2c322b8cbeec8c2e02435e46246833183d0ae163ea30dec54956f78a5a4065",
  ),
];

// Explicitly synthetic support, not replay of historical tables/auth/policies.
// The real functions are never called successfully here; ACL preservation is
// checked as privilege metadata. Prior source proof covers retained behavior.
const support = `
SET statement_timeout='3s'; SET lock_timeout='1s'; SET search_path=public;
CREATE ROLE anon NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
CREATE ROLE authenticated NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
CREATE ROLE service_role NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA shop_manager;
CREATE TABLE shop_manager.customers(id pg_catalog.uuid PRIMARY KEY);
CREATE TABLE shop_manager.work_orders(id pg_catalog.uuid PRIMARY KEY,customer_id pg_catalog.uuid);
CREATE TABLE shop_manager.profiles(id pg_catalog.uuid PRIMARY KEY,shop_id pg_catalog.uuid);
CREATE TABLE public.envelope_fault_marker(id pg_catalog.int4 PRIMARY KEY);
INSERT INTO shop_manager.profiles VALUES('${uuid}',NULL);
INSERT INTO shop_manager.work_orders VALUES('${uuid}',NULL);
ALTER TABLE shop_manager.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.work_orders ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA auth,shop_manager TO anon,authenticated,service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA shop_manager FROM PUBLIC,anon,authenticated;
`;

async function functionState(db) {
  const result = [];
  for (const signature of signatures) {
    const definition = (
      await db.query(
        `SELECT pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)) AS md5,
          pg_catalog.pg_get_userbyid(p.proowner) AS owner,p.prosecdef,
          p.proconfig,p.prorettype::pg_catalog.regtype::pg_catalog.text AS returns,
          p.proacl::pg_catalog.text AS raw_acl,
          pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE') AS anon,
          pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated,
          pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE') AS postgres,
          pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE') AS service_role
        FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure($1)`,
        [signature.replace("(uuid)", "(pg_catalog.uuid)")],
      )
    ).rows[0];
    const acl = (
      await db.query(
        `SELECT COALESCE(r.rolname,'PUBLIC') AS grantee,
          pg_catalog.pg_get_userbyid(a.grantor) AS grantor,a.privilege_type,a.is_grantable
        FROM pg_catalog.pg_proc p CROSS JOIN LATERAL
          pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
        LEFT JOIN pg_catalog.pg_roles r ON r.oid=a.grantee
        WHERE p.oid=pg_catalog.to_regprocedure($1) ORDER BY 1,2,3,4`,
        [signature.replace("(uuid)", "(pg_catalog.uuid)")],
      )
    ).rows;
    result.push({ signature, definition, acl });
  }
  return result;
}
async function dataState(db) {
  return (
    await db.query(`SELECT
      (SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t) ORDER BY id) FROM shop_manager.profiles t) profiles,
      (SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t) ORDER BY id) FROM shop_manager.work_orders t) orders,
      (SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t) ORDER BY id) FROM shop_manager.customers t) customers,
      (SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t) ORDER BY id) FROM public.envelope_fault_marker t) fault_rows,
      (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('name',c.relname,
        'owner',c.relowner,'acl',c.relacl::pg_catalog.text,'rls',c.relrowsecurity,
        'force',c.relforcerowsecurity) ORDER BY c.relname)
        FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='shop_manager' AND c.relkind='r') table_access`)
  ).rows[0];
}
async function withFixture(run) {
  const db = new PGlite("memory://");
  try {
    await db.exec(support);
    for (const definition of definitions) await db.exec(definition);
    // Fixture-only reproduction of the observed ACL prerequisite, not a sweep.
    for (const signature of signatures) {
      await db.exec(`REVOKE EXECUTE ON FUNCTION ${signature} FROM authenticated;
        GRANT EXECUTE ON FUNCTION ${signature} TO service_role;`);
    }
    await db.exec(`REVOKE EXECUTE ON FUNCTION ${converter} FROM PUBLIC,anon,authenticated`);
    const initial = await functionState(db);
    for (let i = 0; i < initial.length; i++) {
      assert.equal(initial[i].definition.md5, fingerprints[i]);
      assert.equal(initial[i].definition.owner, "postgres");
      assert.equal(initial[i].definition.prosecdef, true);
      assert.deepEqual(
        initial[i].acl.map((a) => a.grantee),
        i === 2 ? restrictedAcl : originalAcl,
      );
    }
    await run(db);
  } finally {
    await db.close();
  }
}
async function assertRestricted(db, signature) {
  const state = (await functionState(db)).find((item) => item.signature === signature);
  assert.deepEqual(
    state.acl.map((a) => a.grantee),
    restrictedAcl,
  );
  for (const acl of state.acl) {
    assert.equal(acl.grantor, "postgres");
    assert.equal(acl.privilege_type, "EXECUTE");
    assert.equal(acl.is_grantable, false);
  }
  assert.equal(state.definition.anon, false);
  assert.equal(state.definition.authenticated, false);
  assert.equal(state.definition.postgres, true);
  assert.equal(state.definition.service_role, true);
  for (const role of ["anon", "authenticated"]) {
    try {
      await db.exec(`SET ROLE ${role}`);
      const actor = (
        await db.query(`SELECT current_user AS name,rolsuper,rolbypassrls
          FROM pg_catalog.pg_roles WHERE rolname=current_user`)
      ).rows[0];
      assert.deepEqual(actor, { name: role, rolsuper: false, rolbypassrls: false });
      await assert.rejects(
        db.query(`SELECT ${signature.replace("(uuid)", "($1::pg_catalog.uuid)")}`, [uuid]),
        { code: "42501" },
      );
    } finally {
      await db.exec("RESET ROLE");
    }
  }
}

test(
  "fixed API preserves approved raw bytes and deterministic distinct outer statement mapping",
  options,
  () => {
    const expected = [
      [6295, "53c9081e23d9a31846f39a730a5c7cb5bd589716f224d11a7ed9a76e73d00aba"],
      [6307, "f87c6852dce4cff8be7f33d97aeadceddd223c2e4a3f310185f149a60297baf7"],
    ];
    for (const [i, action] of actions.entries()) {
      const result = buildApprovedHelperExecutionEnvelope(action);
      const raw = read(result.sourcePath);
      assert.ok(Object.isFrozen(result));
      assert.deepEqual(result, buildApprovedHelperExecutionEnvelope(action));
      assert.equal(result.innerBytes, expected[i][0]);
      assert.equal(result.innerSha256, expected[i][1]);
      assert.equal(sha(raw), result.innerSha256);
      assert.equal(sha(result.sql), result.envelopeSha256);
      assert.notEqual(result.envelopeSha256, result.innerSha256);
      assert.equal(Buffer.byteLength(result.sql), result.envelopeBytes);
      assert.deepEqual(
        Buffer.from(result.sql).subarray(result.embeddedByteStart, result.embeddedByteEndExclusive),
        raw,
      );
      assert.equal(result.innerSql, raw.toString("utf8"));
      assert.equal(result.sql.split(result.innerDelimiter).length, 3);
      const outerPrefix = result.sql.slice(0, result.embeddedByteStart);
      assert.ok(outerPrefix.indexOf("pg_catalog.set_config") < outerPrefix.indexOf("CURRENT_USER"));
      assert.ok(outerPrefix.includes("OPERATOR(pg_catalog.<>) 'postgres'::pg_catalog.name"));
      assert.doesNotMatch(outerPrefix, /\bDECLARE\b|\bCOMMIT\b|\bROLLBACK\b/i);
    }
    for (const invalid of [undefined, null, "", "__proto__", "toString", "../source.sql", {}, 1]) {
      assert.throws(
        () => buildApprovedHelperExecutionEnvelope(invalid),
        /Unknown approved helper action/,
      );
    }
  },
);

for (const order of [actions, [...actions].reverse()]) {
  test(
    `${order.join(" then ")}: exact envelopes preserve definitions, companion/converter and data`,
    options,
    async () => {
      await withFixture(async (db) => {
        const initial = await functionState(db);
        const beforeData = await dataState(db);
        for (const action of order) {
          const target = action === "profile_bootstrap" ? bootstrap : totals;
          const before = await functionState(db);
          const envelope = buildApprovedHelperExecutionEnvelope(action);
          await db.exec(envelope.sql);
          const after = await functionState(db);
          for (const item of before.filter((entry) => entry.signature !== target)) {
            assert.deepEqual(
              after.find((entry) => entry.signature === item.signature),
              item,
            );
          }
          assert.deepEqual(await dataState(db), beforeData);
          await assertRestricted(db, target);
          await db.exec(envelope.sql); // Approved inner supports already-restricted rerun.
          assert.deepEqual(await functionState(db), after);
          assert.equal((await db.query("SHOW search_path")).rows[0].search_path, "public");
        }
        const final = await functionState(db);
        assert.deepEqual(final[2], initial[2]);
        for (let i = 0; i < final.length; i++) {
          const { raw_acl: ignoredBefore, ...before } = initial[i].definition;
          const { raw_acl: ignoredAfter, ...after } = final[i].definition;
          void ignoredBefore;
          void ignoredAfter;
          assert.deepEqual(
            { ...after, anon: before.anon, authenticated: before.authenticated },
            before,
          );
        }
      });
    },
  );
}

test(
  "poisoned public operator cannot bypass owner guard; temporary types/catalog decoys cannot retarget",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.exec(`CREATE FUNCTION public.name_neq(pg_catalog.name,pg_catalog.name)
      RETURNS pg_catalog.bool LANGUAGE sql IMMUTABLE AS $$ SELECT false $$;
      CREATE OPERATOR public.<> (FUNCTION=public.name_neq,LEFTARG=pg_catalog.name,RIGHTARG=pg_catalog.name);
      CREATE DOMAIN pg_temp.uuid AS pg_catalog.text;
      CREATE DOMAIN pg_temp.numeric AS pg_catalog.text;
      CREATE VIEW pg_temp.pg_proc AS SELECT * FROM pg_catalog.pg_proc WHERE false;
      SET search_path=public,pg_temp,pg_catalog;`);
      const initial = await functionState(db);
      const beforeData = await dataState(db);
      try {
        await db.exec("SET ROLE authenticated");
        assert.equal(
          (await db.query("SELECT current_user <> 'postgres'::pg_catalog.name AS poisoned")).rows[0]
            .poisoned,
          false,
        );
        for (const action of actions) {
          await assert.rejects(db.exec(buildApprovedHelperExecutionEnvelope(action).sql), {
            code: "55000",
            message: "Approved helper envelope requires postgres",
          });
        }
      } finally {
        await db.exec("RESET ROLE");
      }
      assert.equal(
        (await db.query("SHOW search_path")).rows[0].search_path,
        "public, pg_temp, pg_catalog",
      );
      assert.deepEqual(await functionState(db), initial);
      assert.deepEqual(await dataState(db), beforeData);
      for (const action of actions) await db.exec(buildApprovedHelperExecutionEnvelope(action).sql);
      for (const target of [bootstrap, totals]) await assertRestricted(db, target);
      assert.deepEqual(await dataState(db), beforeData);
    });
  },
);

test(
  "public hash spoof plus temporary pg_proc cannot disguise exact definition drift",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.exec(`CREATE FUNCTION public.md5(pg_catalog.text) RETURNS pg_catalog.text LANGUAGE sql AS $$
      SELECT CASE
        WHEN pg_catalog.strpos($1,'ensure_profile_for')>0 THEN '${fingerprints[0]}'
        WHEN pg_catalog.strpos($1,'calculate_work_order_totals')>0 THEN '${fingerprints[1]}'
        ELSE pg_catalog.md5($1) END
      $$;
      CREATE VIEW pg_temp.pg_proc AS SELECT * FROM pg_catalog.pg_proc WHERE false;
      SET search_path=public,pg_temp,pg_catalog;`);
      for (const [index, action] of actions.entries()) {
        await db.exec("BEGIN");
        try {
          await db.exec(`ALTER FUNCTION ${signatures[index]} SECURITY INVOKER`);
          assert.equal(
            (
              await db.query(
                `SELECT public.md5(pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure($1))) AS fake`,
                [signatures[index].replace("(uuid)", "(pg_catalog.uuid)")],
              )
            ).rows[0].fake,
            fingerprints[index],
          );
          const before = await functionState(db);
          assert.notEqual(before[index].definition.md5, fingerprints[index]);
          const beforeData = await dataState(db);
          await db.exec("SAVEPOINT before_envelope");
          await assert.rejects(db.exec(buildApprovedHelperExecutionEnvelope(action).sql), {
            code: "55000",
          });
          await db.exec("ROLLBACK TO SAVEPOINT before_envelope");
          assert.deepEqual(await functionState(db), before);
          assert.deepEqual(await dataState(db), beforeData);
        } finally {
          await db.exec("ROLLBACK");
        }
      }
    });
  },
);

for (const action of actions) {
  test(
    `${action}: synthetic fault AFTER exact inner execution rolls the entire outer statement back`,
    options,
    async () => {
      await withFixture(async (db) => {
        const envelope = buildApprovedHelperExecutionEnvelope(action);
        const target = action === "profile_bootstrap" ? bootstrap : totals;
        const anchor = `\nEND\n${envelope.outerDelimiter};\n`;
        assert.equal(envelope.sql.split(anchor).length, 2);
        // Only this lab variant adds a fault after EXECUTE; the generator and
        // approved embedded bytes are unchanged. There is no surrounding BEGIN.
        const faulted = envelope.sql.replace(
          anchor,
          `
  IF pg_catalog.has_function_privilege('authenticated','${target}','EXECUTE') THEN
    RAISE EXCEPTION 'Test fault reached before restriction';
  END IF;
  INSERT INTO public.envelope_fault_marker VALUES(1);
  RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='Synthetic post-inner failure';
END
${envelope.outerDelimiter};
`,
        );
        assert.notEqual(faulted, envelope.sql);
        assert.deepEqual(
          Buffer.from(faulted).subarray(
            envelope.embeddedByteStart,
            envelope.embeddedByteEndExclusive,
          ),
          read(envelope.sourcePath),
        );
        const before = await functionState(db);
        const beforeData = await dataState(db);
        await assert.rejects(db.exec(faulted), {
          code: "P0001",
          message: "Synthetic post-inner failure",
        });
        assert.deepEqual(await functionState(db), before);
        assert.deepEqual(await dataState(db), beforeData);
        assert.equal((await db.query("SHOW search_path")).rows[0].search_path, "public");
        await db.exec(envelope.sql);
        await assertRestricted(db, target);
      });
    },
  );
}
