// Offline vulnerability regression, NOT a production-state or mitigation claim.
// All historical authorization/bridge SQL below is extracted unchanged and
// pinned. Supporting relations are synthetic, disposable and memory-only.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const migrations = new URL("../../supabase/migrations/", import.meta.url);
const sha = (value) => createHash("sha256").update(value.replace(/\r\n/g, "\n")).digest("hex");
function verifySource(value, expected, label) {
  assert.ok(typeof value === "string" && value.length > 0 && value.length <= 256 * 1024);
  assert.equal(sha(value), expected, `${label}: historical source changed`);
  return value;
}
function readPinned(name, hash) {
  return verifySource(fs.readFileSync(new URL(name, migrations), "utf8"), hash, name);
}
function extractPinned(source, pattern, hash, label) {
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, `${label}: expected exactly one SQL section`);
  return verifySource(matches[0][0], hash, label);
}
const original = readPinned(
  "20260616033348_a261b9e7-281d-4e16-bf61-1f3043a80d12.sql",
  "69afe9112531bd75d0bc68d4b31461d9e1c9aae41337ebdf79e6f40056447d62",
);
const latest = readPinned(
  "20260902151438_assistant_manager_temporary_canonical_permission.sql",
  "1ac1aaed2fb7fe17bd10a73a1f62f9eab4764248bf257518b84b14db23752522",
);
const ownerBoundary = readPinned(
  "20260901090422_correct_business_role_and_associate_boundaries.sql",
  "bd5de1d18b1e22e361e161a249e22d36759cc24ba9b9636de5dd762b90a7ccd4",
);
const bridgeSource = readPinned(
  "20260901025424_business_staff_shop_manager_bridge.sql",
  "a49e50ecd9a621d4162ff58666ab98584d9aa009775732ce4cf8b645d8c21a9e",
);
const ownerPattern = /^CREATE OR REPLACE FUNCTION public\.is_business_owner\([\s\S]*?\$\$;/gm;
const ownerSql = extractPinned(
  original,
  ownerPattern,
  "ee45fa3776435d09c53ebb6813a8f996ea88d81ddb9cf7ed382a05f29505d3e3",
  "business owner helper",
);
const memberSql = extractPinned(
  original,
  /^CREATE OR REPLACE FUNCTION public\.is_business_member\([\s\S]*?\$\$;/gm,
  "3506596bd8d29e279220e91a6240ff20a8e3c216501a8a255ee4b15e4770dadd",
  "business member helper",
);
const managerSql = extractPinned(
  latest,
  /^CREATE OR REPLACE FUNCTION public\.has_business_role\([\s\S]*?\$\$;/gm,
  "e4c225778fec745ed02225d4f9bafa1d2854ecd2a4da554f4ca00383a3ee0f37",
  "latest manager helper",
);
const memberBridgeSql = extractPinned(
  latest,
  /^CREATE OR REPLACE FUNCTION shop_manager\.sync_business_staff_member\([\s\S]*?\$\$;/gm,
  "73562fb19efda957ba6fd0574797a70ecf1b8281ed6cde15020d0622210c45d5",
  "latest member bridge",
);
const triggerFunctionSql = extractPinned(
  ownerBoundary,
  /^CREATE OR REPLACE FUNCTION shop_manager\.sync_business_staff_trigger\([\s\S]*?\$\$;/gm,
  "e46a9d8d72bb19138e70129666388bdc4da87d34bd8fae777db00094df78f627",
  "authoritative-owner bridge trigger function",
);
const triggerSql = extractPinned(
  bridgeSource,
  /^CREATE TRIGGER sync_business_staff_to_shop_manager[\s\S]*?;/gm,
  "2d9d837c0f34888d9a79cedc577eb21de5c91b748e62aac30b0135a1102da492",
  "column-targeted roster bridge trigger",
);
const policyPins = [
  ["members read", "3989f8511928ee049fad1491e825dd3d7bcbbab6f438009e71f667eccf6e386b"],
  ["owner/manager insert", "0ce33a6a9bba54770f71e7f2cd4831078f0b10836258d1e29f9ad32a36af61a3"],
  ["owner/manager update", "93ebef38dc8628cc28bfaa4f08484f0dfc059a02472b73ea8ae48b57c05121ba"],
  ["owner delete", "3f9723205d705221575fb7a7c63067113ddf087ec1da11f1f9ebfc7c730b031d"],
];
const policies = policyPins.map(([name, hash]) =>
  extractPinned(
    original,
    new RegExp(`^CREATE POLICY "staff: ${name}"[\\s\\S]*?;`, "gm"),
    hash,
    name,
  ),
);
const grants = [
  extractPinned(
    original,
    /^GRANT SELECT, INSERT, UPDATE, DELETE ON public\.business_staff TO authenticated;/gm,
    "e51128b5753f4e325a494ecb027fc955028d8567b403c05fcfb7409373cdc4e1",
    "client roster grant",
  ),
  extractPinned(
    original,
    /^GRANT ALL ON public\.business_staff TO service_role;/gm,
    "9f75448509a1bf5f5b8e062bc4985964e9ed626937e92bf87810b24aae4182b1",
    "service roster grant",
  ),
];

const actorA = "00000000-0000-4000-8000-000000000001";
const ownerA = "00000000-0000-4000-8000-000000000002";
const ownerB = "00000000-0000-4000-8000-000000000003";
const unrelated = "00000000-0000-4000-8000-000000000004";
const businessA = "10000000-0000-4000-8000-000000000001";
const businessB = "10000000-0000-4000-8000-000000000002";
const shopA = "20000000-0000-4000-8000-000000000001";
const shopB = "20000000-0000-4000-8000-000000000002";
const staffA = "30000000-0000-4000-8000-000000000001";
const legacyProfile = "40000000-0000-4000-8000-000000000001";
const options = { concurrency: false, timeout: 20_000 };
const observedMetadata = JSON.parse(
  fs.readFileSync(
    new URL(
      "../../docs/evidence/business-staff-authority-metadata-2026-10-15.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

// Only the source authorization/bridge statements are historical. These minimal
// supporting table shapes and read policies deliberately do not claim full
// production schema parity. Native authority-write privileges are absent.
const fixtureSql = `
  SET statement_timeout='3000ms'; SET lock_timeout='1000ms';
  CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  CREATE ROLE service_role NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  CREATE SCHEMA auth; CREATE SCHEMA shop_manager;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
  $$;
  CREATE TYPE public.business_staff_role AS ENUM
    ('owner','manager','assistant_manager','dispatcher','driver','mechanic','clerk');
  CREATE TABLE auth.users(id uuid PRIMARY KEY,email text NOT NULL);
  CREATE TABLE public.businesses(
    id uuid PRIMARY KEY,owner_id uuid NOT NULL,name text NOT NULL,
    street_address text,phone text,email text,city text,type_slug text
  );
  CREATE TABLE public.profiles(id uuid PRIMARY KEY,first_name text,last_name text);
  CREATE TABLE public.business_staff(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,role public.business_staff_role NOT NULL DEFAULT 'driver',
    title text,duties text[] NOT NULL DEFAULT '{}',active boolean NOT NULL DEFAULT true,
    on_shift boolean NOT NULL DEFAULT false,invited_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(business_id,user_id)
  );
  ALTER TABLE public.business_staff ENABLE ROW LEVEL SECURITY;
  CREATE TABLE shop_manager.shops(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text,organization_id uuid,business_id uuid,
    slug text,address text,phone text,email text,city text,is_active boolean,
    business_type text,industry text,updated_at timestamptz DEFAULT now()
  );
  CREATE UNIQUE INDEX shops_one_per_business ON shop_manager.shops(business_id)
    WHERE business_id IS NOT NULL;
  CREATE TABLE shop_manager.profiles(
    id uuid PRIMARY KEY,user_id uuid,email text UNIQUE,first_name text,last_name text,
    shop_id uuid REFERENCES shop_manager.shops(id),job_title text,department text,
    has_auth_account boolean,updated_at timestamptz DEFAULT now()
  );
  CREATE UNIQUE INDEX profiles_one_per_auth_user ON shop_manager.profiles(user_id)
    WHERE user_id IS NOT NULL;
  CREATE TABLE shop_manager.cash_registers(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),shop_id uuid,name text
  );
  CREATE TABLE shop_manager.register_sessions(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),opened_by_user_id uuid,status text,
    closed_at timestamptz,counted_cash numeric,expected_cash numeric,variance numeric,closing_note text
  );
  CREATE TABLE shop_manager.employee_shifts(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,status text,
    clocked_out_at timestamptz,closing_note text,updated_at timestamptz DEFAULT now()
  );
  CREATE TABLE shop_manager.roles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text UNIQUE);
  CREATE TABLE shop_manager.user_roles(
    user_id uuid,role_id uuid REFERENCES shop_manager.roles(id),PRIMARY KEY(user_id,role_id)
  );
  ALTER TABLE shop_manager.profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE shop_manager.user_roles ENABLE ROW LEVEL SECURITY;
  CREATE POLICY fixture_native_self_read ON shop_manager.profiles
    FOR SELECT TO authenticated USING(user_id=auth.uid());
  CREATE POLICY fixture_native_role_self_read ON shop_manager.user_roles
    FOR SELECT TO authenticated USING(user_id=auth.uid());
  GRANT USAGE ON SCHEMA public,auth,shop_manager TO authenticated,service_role;
  GRANT SELECT ON shop_manager.profiles,shop_manager.user_roles,shop_manager.roles,shop_manager.shops
    TO authenticated;
  INSERT INTO shop_manager.roles(name)
    VALUES('owner'),('manager'),('dispatch'),('truck_driver'),('technician'),('office_admin'),('other_staff');
`;

async function withFixture(run, { inactive = false, legacy = false } = {}) {
  const db = new PGlite("memory://");
  try {
    await db.exec(fixtureSql);
    await db.query(
      "INSERT INTO auth.users VALUES($1,'driver@example.test'),($2,'owner-a@example.test'),($3,'owner-b@example.test'),($4,'unrelated@example.test')",
      [actorA, ownerA, ownerB, unrelated],
    );
    await db.query("INSERT INTO public.profiles VALUES($1,'Driver','Alpha')", [actorA]);
    await db.query(
      "INSERT INTO public.businesses(id,owner_id,name,type_slug) VALUES($1,$2,'Business Alpha','repair'),($3,$4,'Business Beta','repair')",
      [businessA, ownerA, businessB, ownerB],
    );
    await db.query(
      "INSERT INTO shop_manager.shops(id,business_id,name) VALUES($1,$2,'Shop Alpha'),($3,$4,'Shop Beta')",
      [shopA, businessA, shopB, businessB],
    );
    await db.query(
      "INSERT INTO public.business_staff(id,business_id,user_id,role,active,title) VALUES($1,$2,$3,'driver',$4,'Driver')",
      [staffA, businessA, actorA, !inactive],
    );
    await db.query(
      "INSERT INTO shop_manager.profiles(id,user_id,shop_id,email,first_name,last_name,has_auth_account) VALUES($1,$2,$3,'driver@example.test','Driver','Alpha',true)",
      [legacy ? legacyProfile : actorA, actorA, inactive ? null : shopA],
    );
    if (!inactive) {
      await db.query(
        "INSERT INTO shop_manager.user_roles SELECT $1,id FROM shop_manager.roles WHERE name='truck_driver'",
        [actorA],
      );
    }
    for (const sql of [
      ownerSql,
      memberSql,
      managerSql,
      ...policies,
      ...grants,
      memberBridgeSql,
      triggerFunctionSql,
      triggerSql,
    ]) {
      await db.exec(sql);
    }
    await db.exec(`
      REVOKE ALL ON FUNCTION shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)
        FROM PUBLIC,authenticated;
      REVOKE ALL ON FUNCTION shop_manager.sync_business_staff_trigger() FROM PUBLIC,authenticated;
      GRANT EXECUTE ON FUNCTION shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)
        TO service_role;
    `);
    // Dated catalog fingerprints match these unchanged retained bodies. This
    // does not refresh production or claim full fixture/schema equivalence.
    assert.equal(observedMetadata.project, "wjxaajgvddtrxxtocxen");
    const bodies = await db.query(`
      SELECT p.oid::regprocedure::text AS signature,
        md5(replace(p.prosrc,chr(13),'')) AS body_md5
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE (n.nspname='public' AND p.proname IN
        ('is_business_owner','is_business_member','has_business_role'))
        OR (n.nspname='shop_manager' AND p.proname IN
          ('sync_business_staff_member','sync_business_staff_trigger'))
    `);
    assert.deepEqual(
      Object.fromEntries(bodies.rows.map((row) => [row.signature, row.body_md5])),
      observedMetadata.functionBodyMd5,
    );
    await run(db);
  } finally {
    await db.close();
  }
}

async function asActor(db, id, run) {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
  try {
    await db.exec("SET ROLE authenticated");
    assert.deepEqual(
      (
        await db.query(`
      SELECT current_user AS actor,rolsuper,rolbypassrls,
        row_security_active('public.business_staff') AS staff_rls,
        row_security_active('shop_manager.profiles') AS profile_rls
      FROM pg_roles WHERE rolname=current_user
    `)
      ).rows,
      [
        {
          actor: "authenticated",
          rolsuper: false,
          rolbypassrls: false,
          staff_rls: true,
          profile_rls: true,
        },
      ],
    );
    await run();
  } finally {
    await db.exec("RESET ROLE");
  }
}
const isMember = async (db, business) =>
  (await db.query("SELECT public.is_business_member(auth.uid(),$1) AS allowed", [business])).rows[0]
    .allowed;
async function nativeState(db) {
  return {
    profile: (
      await db.query("SELECT id,user_id,shop_id FROM shop_manager.profiles WHERE user_id=$1", [
        actorA,
      ])
    ).rows[0],
    roles: (
      await db.query(
        "SELECT r.name FROM shop_manager.user_roles ur JOIN shop_manager.roles r ON r.id=ur.role_id WHERE ur.user_id=$1 ORDER BY r.name",
        [actorA],
      )
    ).rows.map((row) => row.name),
  };
}

test(
  "source pins and unique extraction reject missing, duplicated or changed authorization SQL",
  options,
  () => {
    const pkg = JSON.parse(fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
    assert.equal(pkg.devDependencies["@electric-sql/pglite"], "0.5.9");
    for (const sql of [ownerSql, memberSql, ...policies, ...grants])
      assert.ok(original.includes(sql));
    for (const sql of [managerSql, memberBridgeSql]) assert.ok(latest.includes(sql));
    assert.ok(ownerBoundary.includes(triggerFunctionSql));
    assert.ok(bridgeSource.includes(triggerSql));
    assert.equal(sha(original), sha(original.replace(/\r?\n/g, "\r\n")));
    assert.throws(
      () => extractPinned("", ownerPattern, sha(ownerSql), "fixture"),
      /exactly one SQL section/,
    );
    assert.throws(
      () => extractPinned(original + ownerSql, ownerPattern, sha(ownerSql), "fixture"),
      /exactly one SQL section/,
    );
    assert.throws(
      () =>
        extractPinned(
          ownerSql.replace("owner_id = _user", "owner_id IS NOT NULL"),
          ownerPattern,
          sha(ownerSql),
          "fixture",
        ),
      /historical source changed/,
    );
    assert.throws(
      () => verifySource(original + "\n-- changed", sha(original), "fixture"),
      /historical source changed/,
    );
  },
);

test(
  "native authority ACL denial does not stop self-roster reassignment and owner-role pivot",
  options,
  async () => {
    await withFixture(async (db) => {
      await asActor(db, actorA, async () => {
        assert.equal(await isMember(db, businessA), true);
        assert.equal(await isMember(db, businessB), false);
        assert.deepEqual(await nativeState(db), {
          profile: { id: actorA, user_id: actorA, shop_id: shopA },
          roles: ["truck_driver"],
        });
        await assert.rejects(
          db.query("UPDATE shop_manager.profiles SET shop_id=$1 WHERE user_id=$2", [shopB, actorA]),
          { code: "42501" },
        );
        for (const sql of [
          "INSERT INTO shop_manager.user_roles(user_id,role_id) SELECT auth.uid(),id FROM shop_manager.roles WHERE name='owner'",
          "UPDATE shop_manager.user_roles SET role_id=(SELECT id FROM shop_manager.roles WHERE name='owner') WHERE user_id=auth.uid()",
          "DELETE FROM shop_manager.user_roles WHERE user_id=auth.uid()",
        ])
          await assert.rejects(db.exec(sql), { code: "42501" });
        await assert.rejects(
          db.query("SELECT shop_manager.sync_business_staff_member($1,$2,true,'owner',NULL)", [
            businessB,
            actorA,
          ]),
          { code: "42501" },
        );
        const changed = await db.query(
          "UPDATE public.business_staff SET business_id=$1,role='owner' WHERE id=$2 RETURNING business_id,user_id,role",
          [businessB, staffA],
        );
        assert.deepEqual(changed.rows, [
          { business_id: businessB, user_id: actorA, role: "owner" },
        ]);
        assert.equal(await isMember(db, businessB), true);
        assert.equal(
          (await db.query("SELECT public.is_business_owner(auth.uid(),$1) AS owns", [businessB]))
            .rows[0].owns,
          false,
        );
        assert.deepEqual(await nativeState(db), {
          profile: { id: actorA, user_id: actorA, shop_id: shopB },
          roles: ["owner"],
        });
      });
    });
  },
);

test(
  "legitimate owner roster update works while unrelated actor updates no rows",
  options,
  async () => {
    await withFixture(async (db) => {
      await asActor(db, unrelated, async () => {
        assert.equal(await isMember(db, businessA), false);
        assert.deepEqual(
          (
            await db.query(
              "UPDATE public.business_staff SET role='owner' WHERE id=$1 RETURNING id",
              [staffA],
            )
          ).rows,
          [],
        );
      });
      await asActor(db, ownerA, async () => {
        assert.deepEqual(
          (
            await db.query(
              "UPDATE public.business_staff SET role='manager',title='Operations Manager' WHERE id=$1 RETURNING role,title",
              [staffA],
            )
          ).rows,
          [{ role: "manager", title: "Operations Manager" }],
        );
      });
      assert.deepEqual(await nativeState(db), {
        profile: { id: actorA, user_id: actorA, shop_id: shopA },
        roles: ["manager"],
      });
    });
  },
);

test(
  "inactive staff can self-reactivate and regain the native shop through the same bridge",
  options,
  async () => {
    await withFixture(
      async (db) => {
        await asActor(db, actorA, async () => {
          assert.equal(await isMember(db, businessA), false);
          assert.deepEqual(await nativeState(db), {
            profile: { id: actorA, user_id: actorA, shop_id: null },
            roles: [],
          });
          assert.deepEqual(
            (
              await db.query(
                "UPDATE public.business_staff SET active=true WHERE id=$1 RETURNING active",
                [staffA],
              )
            ).rows,
            [{ active: true }],
          );
          assert.equal(await isMember(db, businessA), true);
          assert.deepEqual(await nativeState(db), {
            profile: { id: actorA, user_id: actorA, shop_id: shopA },
            roles: ["truck_driver"],
          });
        });
      },
      { inactive: true },
    );
  },
);

test(
  "unchanged role in UPDATE target list invokes bridge whereas shift-only update does not",
  options,
  async () => {
    await withFixture(async (db) => {
      // Synthetic preexisting different native binding: this is not a claim that
      // such a binding currently exists in production or is legitimate access.
      await db.query("UPDATE shop_manager.profiles SET shop_id=$1 WHERE user_id=$2", [
        shopB,
        actorA,
      ]);
      await asActor(db, actorA, async () => {
        await db.query("UPDATE public.business_staff SET on_shift=true WHERE id=$1", [staffA]);
        assert.equal((await nativeState(db)).profile.shop_id, shopB);
        const sameRole = await db.query(
          "UPDATE public.business_staff SET role=role,on_shift=false WHERE id=$1 RETURNING role",
          [staffA],
        );
        assert.deepEqual(sameRole.rows, [{ role: "driver" }]);
        assert.equal((await nativeState(db)).profile.shop_id, shopA);
      });
    });
  },
);

test(
  "bridge conflict resolution preserves native profile id distinct from auth user id during pivot",
  options,
  async () => {
    await withFixture(
      async (db) => {
        await asActor(db, actorA, async () => {
          assert.equal((await nativeState(db)).profile.id, legacyProfile);
          await db.query(
            "UPDATE public.business_staff SET business_id=$1,role='owner' WHERE id=$2",
            [businessB, staffA],
          );
          assert.deepEqual(await nativeState(db), {
            profile: { id: legacyProfile, user_id: actorA, shop_id: shopB },
            roles: ["owner"],
          });
        });
      },
      { legacy: true },
    );
  },
);
