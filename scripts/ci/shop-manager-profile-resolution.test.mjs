// Memory-only selected-definition behavior proof, NOT a repair or live exploit.
// Synthetic profile shape/unique index/RLS setup are not native constraint,
// trusted membership, HTTP/JWT, full dependency, baseline or deployed ACL parity.
// No live client/credentials, source rewrites, seeds/backfills or chain replay.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const migrations = new URL("../../supabase/migrations/", import.meta.url);
const sha = (raw) => createHash("sha256").update(raw.replace(/\r\n/g, "\n")).digest("hex");
const evidenceRaw = fs.readFileSync(
  new URL("../../docs/evidence/native-access-helper-metadata-2026-10-15.json", import.meta.url),
  "utf8",
);
const evidence = JSON.parse(evidenceRaw);
const helpers = [
  {
    signature: "shop_manager.current_employee_profile()",
    file: "20260831124952_employee_operations_ledger.sql",
    sourceSha: "2386ee30a1b12cd124445adf3da3568c35e567e96aa9f7b83e6cd4211ccae6b2",
    declaration: "CREATE OR REPLACE FUNCTION shop_manager.current_employee_profile()",
    definitionSha: "340715972e053fa97ae0593c6209cc7b0111a4a1ba0ffc9f7d690deebe45712f",
    definitionMd5: "ce079cfd1e59f97d244cd029bcce7a81",
    bodyMd5: "f4135fe6ed3f063cd52be5c69d1ead08",
    result: "shop_manager.profiles",
    proconfig: ["search_path=shop_manager, public, pg_temp"],
    acl: "{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}",
    anonExecute: false,
  },
  {
    signature: "shop_manager.get_current_user_shop_id()",
    file: "20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e.sql",
    sourceSha: "30dfd8df0c3537efb5155a8891804e00444b180f55e674b56d522e473e2f4144",
    declaration: "CREATE OR REPLACE FUNCTION shop_manager.get_current_user_shop_id()",
    definitionSha: "96d278351d5b335519711b97e89dd5b52052886929fbce820951414612cd7845",
    definitionMd5: "be63946995c909e4a224b0e4989eaaf7",
    bodyMd5: "6049d4aebd36a1230288e6a2227e1071",
    result: "uuid",
    proconfig: ["search_path=public, shop_manager"],
    acl: "{=X/postgres,postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}",
    anonExecute: true,
  },
];
function extract(raw, helper) {
  assert.ok(typeof raw === "string" && raw.length > 0 && raw.length < 512 * 1024);
  assert.equal(sha(raw), helper.sourceSha, "whole-source pin changed");
  assert.equal(raw.split(helper.declaration).length, 2, "expected one exact declaration");
  const start = raw.indexOf(helper.declaration);
  const end = raw.indexOf("$$;", start);
  assert.ok(end > start);
  const definition = raw.slice(start, end + 3).replace(/\r\n/g, "\n");
  assert.equal(sha(definition), helper.definitionSha, "selected-definition pin changed");
  return definition;
}
for (const helper of helpers) {
  helper.raw = fs.readFileSync(new URL(helper.file, migrations), "utf8");
  helper.definition = extract(helper.raw, helper);
}
const options = { concurrency: false, timeout: 20_000 };
const actor = "00000000-0000-4000-8000-000000000001";
const otherActor = "00000000-0000-4000-8000-000000000002";
const missing = "00000000-0000-4000-8000-000000000099";
const legacyId = "10000000-0000-4000-8000-000000000001";
const shopA = "20000000-0000-4000-8000-000000000001";
const shopB = "20000000-0000-4000-8000-000000000002";
const profile = (id, user_id, shop_id) => ({ id, user_id, shop_id });

async function state(db) {
  return (
    await db.query(`SELECT
    (SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM shop_manager.profiles p) AS profiles,
    (SELECT jsonb_agg(jsonb_build_object('name',nspname,'owner',nspowner,'acl',nspacl::text) ORDER BY nspname)
      FROM pg_namespace WHERE nspname IN ('public','auth','shop_manager')) AS schemas,
    (SELECT jsonb_build_object('owner',relowner,'acl',relacl::text,'rls',relrowsecurity,'force',relforcerowsecurity)
      FROM pg_class WHERE oid='shop_manager.profiles'::regclass) AS table_contract,
    (SELECT jsonb_agg(pg_get_indexdef(indexrelid) ORDER BY indexrelid) FROM pg_index
      WHERE indrelid='shop_manager.profiles'::regclass) AS indexes,
    (SELECT jsonb_agg(jsonb_build_object('name',polname,'using',pg_get_expr(polqual,polrelid),
      'check',pg_get_expr(polwithcheck,polrelid)) ORDER BY polname)
      FROM pg_policy WHERE polrelid='shop_manager.profiles'::regclass) AS policies`)
  ).rows[0];
}
async function catalog(db, signature) {
  return (
    await db.query(
      `SELECT md5(pg_get_functiondef(p.oid)) AS definition,
    md5(replace(p.prosrc,chr(13),'')) AS body,pg_get_userbyid(p.proowner) AS owner,
    l.lanname AS language,p.prosecdef,p.provolatile,p.proretset,p.pronargdefaults,p.provariadic,
    p.proargnames,p.proargmodes,p.prorettype::regtype::text AS result,p.proconfig,p.proacl::text AS acl,
    has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
    has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
    has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
    FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=$1::regprocedure`,
      [signature],
    )
  ).rows[0];
}
async function withFixture(run) {
  const db = new PGlite("memory://");
  try {
    await db.exec(`SET statement_timeout='3000ms'; SET lock_timeout='1000ms';
      CREATE ROLE anon NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
      CREATE ROLE authenticated NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
      CREATE ROLE service_role NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA shop_manager;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
      $$;
      CREATE TABLE shop_manager.profiles(id uuid PRIMARY KEY,user_id uuid,shop_id uuid);
      -- Fixture-only constraint: isolates the null-shadow case without implying
      -- complete production identity/FK/trigger/index compatibility.
      CREATE UNIQUE INDEX fixture_one_nonnull_user ON shop_manager.profiles(user_id) WHERE user_id IS NOT NULL;
      ALTER TABLE shop_manager.profiles ENABLE ROW LEVEL SECURITY;
      GRANT SELECT ON shop_manager.profiles TO authenticated;
      GRANT USAGE ON SCHEMA auth,shop_manager TO anon,authenticated,service_role;
    `);
    const before = await state(db);
    for (const helper of helpers) await db.exec(helper.definition);
    // Reproduce observed ACLs only in the disposable database. These GRANTs
    // are fixture setup, not a source-chain replay, repair or new live release.
    await db.exec(`REVOKE EXECUTE ON FUNCTION ${helpers[0].signature} FROM PUBLIC,anon;
      GRANT EXECUTE ON FUNCTION ${helpers[0].signature},${helpers[1].signature} TO authenticated,service_role;`);
    assert.deepEqual(await state(db), before);
    for (const helper of helpers) {
      assert.deepEqual(await catalog(db, helper.signature), {
        definition: helper.definitionMd5,
        body: helper.bodyMd5,
        owner: "postgres",
        language: "sql",
        prosecdef: true,
        provolatile: "s",
        proretset: false,
        pronargdefaults: 0,
        provariadic: 0,
        proargnames: null,
        proargmodes: null,
        result: helper.result,
        proconfig: helper.proconfig,
        acl: helper.acl,
        anon_execute: helper.anonExecute,
        authenticated_execute: true,
        service_execute: true,
      });
    }
    await run(db);
  } finally {
    await db.close();
  }
}
async function insert(db, row) {
  await db.query("INSERT INTO shop_manager.profiles(id,user_id,shop_id) VALUES($1,$2,$3)", [
    row.id,
    row.user_id,
    row.shop_id,
  ]);
}
async function asActor(db, subject, run, role = "authenticated") {
  assert.ok(["authenticated", "anon", "service_role"].includes(role));
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [subject ?? ""]);
  try {
    await db.exec(`SET ROLE ${role}`);
    assert.deepEqual(
      (
        await db.query(`SELECT current_user AS actor,session_user,auth.uid() AS subject,
      rolsuper,rolbypassrls,row_security_active('shop_manager.profiles') AS rls
      FROM pg_roles WHERE rolname=current_user`)
      ).rows[0],
      {
        actor: role,
        session_user: "postgres",
        subject: subject ?? null,
        rolsuper: false,
        rolbypassrls: role === "service_role",
        rls: role !== "service_role",
      },
    );
    await run();
  } finally {
    await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false)");
  }
}
const lookup = async (db) =>
  (
    await db.query(`SELECT to_jsonb(shop_manager.current_employee_profile()) AS employee,
  shop_manager.get_current_user_shop_id() AS shop`)
  ).rows[0];
const assertReadOnly = async (db, run) => {
  const before = await state(db);
  await run();
  assert.deepEqual(await state(db), before);
};

test(
  "unique whole/extracted source pins fail closed and normalize only CRLF transport",
  options,
  () => {
    for (const helper of helpers) {
      assert.equal(extract(helper.raw.replace(/\r?\n/g, "\r\n"), helper), helper.definition);
      for (const bad of [
        "",
        null,
        helper.raw + helper.definition,
        helper.raw.replace(helper.declaration, helper.declaration + " -- changed"),
        "x".repeat(512 * 1024),
      ])
        assert.throws(() => extract(bad, helper));
    }
    assert.ok(
      helpers[0].definition.includes("ORDER BY (p.user_id = (select auth.uid())) DESC LIMIT 1"),
    );
    assert.ok(!helpers[0].definition.includes("NULLS LAST"));
  },
);

test(
  "dated catalog evidence and both unchanged definition/body/ACL contracts agree, without claiming six-helper closure",
  options,
  async () => {
    assert.equal(
      sha(evidenceRaw),
      "3cf13e8c9b1718cb6791c3fb88fe0319090c62888749dc5e45b097a76c124834",
    );
    assert.equal(evidence.formatVersion, 1);
    assert.equal(evidence.project, "wjxaajgvddtrxxtocxen");
    assert.equal(evidence.mode, "read-only-function-catalog");
    assert.equal(
      evidence.scope,
      "Selected six native/module/receipt access helpers only; no business rows or RPC invocation; not full source/role/dependency/constraint/trigger or HTTP/JWT parity.",
    );
    assert.equal(evidence.observations.length, 6);
    assert.equal(new Set(evidence.observations.map((row) => row.signature)).size, 6);
    for (const helper of helpers) {
      const observed = evidence.observations.filter((row) => row.signature === helper.signature);
      assert.equal(observed.length, 1);
      assert.equal(observed[0].observed_at_utc, "2026-10-14 20:19:45.882471+00");
      assert.equal(observed[0].definition_md5, helper.definitionMd5);
      assert.equal(observed[0].body_md5, helper.bodyMd5);
      assert.equal(observed[0].acl, helper.acl);
      assert.deepEqual(observed[0].proconfig, helper.proconfig);
      assert.equal(observed[0].result, helper.result);
      assert.equal(observed[0].owner, "postgres");
      assert.equal(observed[0].language, "sql");
      assert.equal(observed[0].prosecdef, true);
      assert.equal(observed[0].provolatile, "s");
      assert.equal(observed[0].proretset, false);
      assert.equal(observed[0].pronargdefaults, 0);
      assert.equal(observed[0].provariadic, 0);
      assert.equal(observed[0].proargnames, null);
      assert.equal(observed[0].proargmodes, null);
      assert.equal(observed[0].anon_execute, helper.anonExecute);
      assert.equal(observed[0].authenticated_execute, true);
      assert.equal(observed[0].service_execute, true);
    }
    await withFixture(async (db) => {
      const before = await state(db);
      const definitionsBefore = await Promise.all(
        helpers.map((helper) => catalog(db, helper.signature)),
      );
      for (const helper of helpers) await db.exec(helper.definition);
      assert.deepEqual(
        await Promise.all(helpers.map((helper) => catalog(db, helper.signature))),
        definitionsBefore,
      );
      assert.deepEqual(await state(db), before);
    });
  },
);

test(
  "canonical identity resolves consistently, but legacy-only user_id identity diverges from id-only current shop",
  options,
  async () => {
    await withFixture(async (db) => {
      await insert(db, profile(actor, actor, shopA));
      await assertReadOnly(db, async () =>
        asActor(db, actor, async () => {
          assert.deepEqual(await lookup(db), {
            employee: profile(actor, actor, shopA),
            shop: shopA,
          });
        }),
      );
      await db.query("UPDATE shop_manager.profiles SET id=$1 WHERE id=$2", [legacyId, actor]);
      await assertReadOnly(db, async () =>
        asActor(db, actor, async () => {
          assert.deepEqual(await lookup(db), {
            employee: profile(legacyId, actor, shopA),
            shop: null,
          });
        }),
      );
    });
  },
);

test(
  "DESC default NULLS FIRST selects an id-matching null-user shadow ahead of the true legacy user match",
  options,
  async () => {
    await withFixture(async (db) => {
      await insert(db, profile(legacyId, actor, shopA));
      await insert(db, profile(actor, null, shopB));
      const scores = (
        await db.query(
          `SELECT id,(user_id=$1::uuid) AS user_match FROM shop_manager.profiles
      WHERE user_id=$1::uuid OR id=$1::uuid ORDER BY (user_id=$1::uuid) DESC`,
          [actor],
        )
      ).rows;
      assert.deepEqual(scores, [
        { id: actor, user_match: null },
        { id: legacyId, user_match: true },
      ]);
      await assertReadOnly(db, async () =>
        asActor(db, actor, async () => {
          assert.deepEqual(await lookup(db), {
            employee: profile(actor, null, shopB),
            shop: shopB,
          });
          assert.deepEqual((await db.query("SELECT * FROM shop_manager.profiles")).rows, []);
        }),
      );
    });
  },
);

test(
  "explicit false id-shadow sorts behind true, but replacing false with NULL changes the selected profile",
  options,
  async () => {
    await withFixture(async (db) => {
      await insert(db, profile(legacyId, actor, shopA));
      await insert(db, profile(actor, otherActor, shopB));
      await assertReadOnly(db, async () =>
        asActor(db, actor, async () => {
          assert.deepEqual(await lookup(db), {
            employee: profile(legacyId, actor, shopA),
            shop: shopB,
          });
        }),
      );
      await db.query("UPDATE shop_manager.profiles SET user_id=NULL WHERE id=$1", [actor]);
      await assertReadOnly(db, async () =>
        asActor(db, actor, async () => {
          assert.deepEqual(await lookup(db), {
            employee: profile(actor, null, shopB),
            shop: shopB,
          });
        }),
      );
    });
  },
);

test(
  "missing/null subject returns a NULL composite, while a real null-shop profile remains a non-NULL identity row",
  options,
  async () => {
    await withFixture(async (db) => {
      await insert(db, profile(actor, actor, null));
      await assertReadOnly(db, async () => {
        for (const subject of [missing, null])
          await asActor(db, subject, async () => {
            assert.deepEqual(await lookup(db), { employee: null, shop: null });
            assert.deepEqual(
              (
                await db.query(`SELECT shop_manager.current_employee_profile() IS NULL AS absent,
          (shop_manager.current_employee_profile()).id AS id`)
              ).rows,
              [{ absent: true, id: null }],
            );
            // A scalar composite-returning function still yields one FROM row with
            // null attributes; row count alone cannot establish an employee identity.
            assert.deepEqual(
              (await db.query("SELECT * FROM shop_manager.current_employee_profile()")).rows,
              [{ id: null, user_id: null, shop_id: null }],
            );
          });
        await asActor(db, actor, async () => {
          assert.deepEqual(await lookup(db), { employee: profile(actor, actor, null), shop: null });
          assert.equal(
            (await db.query("SELECT shop_manager.current_employee_profile() IS NULL AS absent"))
              .rows[0].absent,
            false,
          );
        });
      });
    });
  },
);

test(
  "helpers read a changed profile binding on the next statement, not immutable or independently authorized membership",
  options,
  async () => {
    await withFixture(async (db) => {
      await insert(db, profile(actor, actor, shopA));
      await assertReadOnly(db, async () =>
        asActor(db, actor, async () => {
          assert.deepEqual(await lookup(db), {
            employee: profile(actor, actor, shopA),
            shop: shopA,
          });
        }),
      );
      // Privileged synthetic setup between statements, NOT proof that a real
      // browser may update profiles under every native constraint/trigger/policy.
      await db.query("UPDATE shop_manager.profiles SET shop_id=$1 WHERE id=$2", [shopB, actor]);
      await assertReadOnly(db, async () =>
        asActor(db, actor, async () => {
          assert.deepEqual(await lookup(db), {
            employee: profile(actor, actor, shopB),
            shop: shopB,
          });
        }),
      );
    });
  },
);

test(
  "observed helper ACLs and SECURITY DEFINER lookup are separate from direct profile/RLS denial or authentication",
  options,
  async () => {
    await withFixture(async (db) => {
      await insert(db, profile(actor, actor, shopA));
      await assertReadOnly(db, async () =>
        asActor(db, actor, async () => {
          assert.deepEqual((await db.query("SELECT * FROM shop_manager.profiles")).rows, []);
          assert.deepEqual(await lookup(db), {
            employee: profile(actor, actor, shopA),
            shop: shopA,
          });
        }),
      );
      await db.exec("REVOKE SELECT ON shop_manager.profiles FROM authenticated");
      await assertReadOnly(db, async () =>
        asActor(db, actor, async () => {
          await assert.rejects(db.query("SELECT * FROM shop_manager.profiles"), { code: "42501" });
          assert.deepEqual(await lookup(db), {
            employee: profile(actor, actor, shopA),
            shop: shopA,
          });
        }),
      );
      await assertReadOnly(db, async () => {
        await asActor(
          db,
          null,
          async () => {
            assert.equal(
              (await db.query("SELECT shop_manager.get_current_user_shop_id() AS shop")).rows[0]
                .shop,
              null,
            );
            await assert.rejects(db.query("SELECT shop_manager.current_employee_profile()"), {
              code: "42501",
            });
          },
          "anon",
        );
        await asActor(
          db,
          actor,
          async () => {
            assert.deepEqual(await lookup(db), {
              employee: profile(actor, actor, shopA),
              shop: shopA,
            });
          },
          "service_role",
        );
      });
    });
  },
);
