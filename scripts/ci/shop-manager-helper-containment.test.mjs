// OFFLINE ONLY: exact unapproved candidates and review-only recovery rehearsals.
// Memory-only PGlite; no credentials, environment input, persistent directory,
// Supabase client, production executor, or release authorization.
// Reduced synthetic tables prove ACL and nested-owner execution semantics, not
// full production constraints/triggers, HTTP/JWT transport, posting or concurrency.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const migrations = new URL("../../supabase/migrations/", import.meta.url);
const read = (url) => fs.readFileSync(url, "utf8");
const sha = (sql) => createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
const source = read(new URL("20260715012303_a5daad1f-ca4a-4606-b07d-3f38ec8c7ee9.sql", migrations));
const profileSource = read(
  new URL("20260713081838_b99aba93-f19b-4aec-b7a1-3bdb86faadc6.sql", migrations),
);
const bootstrap = "shop_manager.ensure_profile_for(uuid)";
const totals = "shop_manager.calculate_work_order_totals(uuid)";
const converter = "shop_manager.convert_work_order_to_invoice(uuid)";
const quoteConverter = "shop_manager.convert_quote_to_work_order(uuid)";
const originalAcl = ["PUBLIC", "postgres", "service_role"].map((grantee) => ({
  grantee,
  grantor: "postgres",
  privilege_type: "EXECUTE",
  is_grantable: false,
}));
const restrictedAcl = originalAcl.filter((entry) => entry.grantee !== "PUBLIC");
const expectedDefinitions = {
  [bootstrap]: "77cb775bfedfb78996b31fcbdd3ada4c",
  [totals]: "1119dd7abe3e643d8d0c6979f19fc2a1",
  [converter]: "e590e08f9f68cc5fdead8a853af670b9",
  [quoteConverter]: "1080a60b75ddd930e541297dda1e17dc",
};
const helpers = [
  {
    signature: bootstrap,
    other: totals,
    candidate: read(
      new URL("20261014185003_contain_legacy_profile_bootstrap_execute.sql", migrations),
    ),
    recovery: read(
      new URL("../../docs/evidence/profile-bootstrap-acl-rollback-review.sql", import.meta.url),
    ),
    optIn: "motorsales365.profile_bootstrap_acl_recovery",
  },
  {
    signature: totals,
    other: bootstrap,
    candidate: read(
      new URL("20261014185052_contain_legacy_work_order_totals_execute.sql", migrations),
    ),
    recovery: read(
      new URL("../../docs/evidence/work-order-totals-acl-rollback-review.sql", import.meta.url),
    ),
    optIn: "motorsales365.work_order_totals_acl_recovery",
  },
];
const options = { concurrency: false, timeout: 20_000 };
const actor = "00000000-0000-4000-8000-000000000001";
const user = "00000000-0000-4000-8000-000000000002";
const newUser = "00000000-0000-4000-8000-000000000004";
const shop = "20000000-0000-4000-8000-000000000002";
const order = "30000000-0000-4000-8000-000000000001";
const quote = "40000000-0000-4000-8000-000000000001";
const invoice = "INV-SYNTHETIC-PRIVATE";

function extract(raw, name, hash) {
  assert.ok(typeof raw === "string" && raw.length > 0 && raw.length < 256 * 1024);
  assert.equal(sha(raw), "08729a1af4909c61d5bc557083db8fddf85ea63ceb614ebf39653a8b8da57ae5");
  const declaration = `CREATE OR REPLACE FUNCTION shop_manager.${name}(`;
  const grant = `GRANT EXECUTE ON FUNCTION shop_manager.${name}(uuid) TO authenticated;`;
  assert.equal(raw.split(declaration).length, 2, `Expected one ${name}`);
  const start = raw.indexOf(declaration);
  const end = raw.indexOf(grant, start);
  assert.ok(end > start);
  const definition = raw.slice(start, end + grant.length).replace(/\r\n/g, "\n");
  assert.equal(sha(definition), hash);
  return definition;
}
function extractBootstrap(raw) {
  assert.ok(typeof raw === "string" && raw.length > 0 && raw.length < 256 * 1024);
  assert.equal(sha(raw), "5ea2e85cf05bf006dcb684ef063f9ef15f38fdfcc9dccd2c050f4c0a5a115647");
  const matches = [
    ...raw.matchAll(
      /^CREATE OR REPLACE FUNCTION shop_manager\.ensure_profile_for\(_user_id uuid\)[\s\S]*?END\$\$;/gm,
    ),
  ];
  assert.equal(matches.length, 1);
  assert.equal(
    sha(matches[0][0]),
    "8f86e53b90d08631378fd50e28b63dceac4ede81059748dc255c15f0b0f5a554",
  );
  return matches[0][0].replace(/\r\n/g, "\n");
}
const definitions = [
  extractBootstrap(profileSource),
  extract(
    source,
    "calculate_work_order_totals",
    "aa2bea4e7de7e7333ad614fa6a90b1ba9e8ea67b1ba69ecf15d48c1f7cccc773",
  ),
  extract(
    source,
    "convert_work_order_to_invoice",
    "1f2c322b8cbeec8c2e02435e46246833183d0ae163ea30dec54956f78a5a4065",
  ),
  extract(
    source,
    "convert_quote_to_work_order",
    "6def1b6792fdf4001a2911aba58a921d690dd26cedb2d4f12fb0ede46813844a",
  ),
];
for (const helper of helpers)
  for (const sql of [helper.candidate, helper.recovery])
    assert.ok(sql.trim().length > 0 && sql.length < 32 * 1024);

const fixtureSql = `
SET statement_timeout='3000ms'; SET lock_timeout='1000ms';
CREATE ROLE anon NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
CREATE ROLE authenticated NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
CREATE ROLE service_role NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA shop_manager;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);
CREATE TABLE public.businesses(id uuid PRIMARY KEY,owner_id uuid,created_at timestamptz DEFAULT now());
CREATE TABLE shop_manager.shops(id uuid PRIMARY KEY,business_id uuid);
CREATE TABLE shop_manager.profiles(id uuid PRIMARY KEY,user_id uuid,email text NOT NULL UNIQUE,
  first_name text,last_name text,shop_id uuid);
CREATE TABLE shop_manager.user_roles(user_id uuid,role_id uuid);
CREATE TABLE shop_manager.customers(id uuid PRIMARY KEY);
CREATE TABLE shop_manager.work_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),invoice_id text,
  total_cost numeric,updated_at timestamptz,customer_id uuid,vehicle_id uuid,status text,
  description text,created_by uuid);
CREATE TABLE shop_manager.work_order_job_lines(work_order_id uuid,name text,description text,
  category text,estimated_hours numeric,labor_rate numeric,total_amount numeric,display_order integer);
CREATE TABLE shop_manager.work_order_parts(work_order_id uuid,part_name text,part_number text,
  quantity integer,customer_price numeric,retail_price numeric,part_type text,category text);
CREATE TABLE shop_manager.quotes(id uuid PRIMARY KEY,customer_id uuid,vehicle_id uuid,notes text,
  status text,converted_to_work_order_id uuid,converted_at timestamptz,updated_at timestamptz);
CREATE TABLE shop_manager.quote_items(quote_id uuid,item_type text,name text,description text,
  category text,quantity numeric,unit_price numeric,total_price numeric,display_order integer);
GRANT USAGE ON SCHEMA auth,shop_manager TO anon,authenticated,service_role;
ALTER TABLE shop_manager.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.quotes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA shop_manager FROM PUBLIC,anon,authenticated;
INSERT INTO auth.users VALUES
 ('${actor}','actor@example.test','{}'),('${user}','user@example.test','{}'),
 ('${newUser}','new@example.test','{}');
INSERT INTO shop_manager.shops VALUES('${shop}',NULL);
INSERT INTO shop_manager.profiles VALUES('${user}','${user}','user@example.test','Fixture','User','${shop}');
INSERT INTO shop_manager.work_orders(id,invoice_id,total_cost,updated_at)
 VALUES('${order}','${invoice}',999,'2000-01-01');
INSERT INTO shop_manager.work_order_job_lines(work_order_id,total_amount) VALUES('${order}',1000);
INSERT INTO shop_manager.work_order_parts(work_order_id,customer_price,quantity) VALUES('${order}',112.75,2);
INSERT INTO shop_manager.quotes(id,customer_id,vehicle_id,notes,status)
 VALUES('${quote}',NULL,NULL,'Synthetic quote','draft');
INSERT INTO shop_manager.quote_items VALUES
 ('${quote}','labor','Labor','Fixture','service',2,100,200,1),
 ('${quote}','part','Part','Fixture','part',3,15,45,2);
`;

async function acl(db, signature) {
  return (
    await db.query(
      `SELECT COALESCE(grantee.rolname,'PUBLIC') AS grantee,
    grantor.rolname AS grantor,a.privilege_type,a.is_grantable
    FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
    LEFT JOIN pg_roles grantee ON grantee.oid=a.grantee JOIN pg_roles grantor ON grantor.oid=a.grantor
    WHERE p.oid=to_regprocedure($1) ORDER BY 1,2,3,4`,
      [signature],
    )
  ).rows;
}
async function functionState(db) {
  const state = {};
  for (const signature of Object.keys(expectedDefinitions)) {
    state[signature] = {
      definition:
        (
          await db.query(
            `SELECT md5(pg_get_functiondef(p.oid)) AS md5,
        pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.prorettype::regtype::text AS returns
        FROM pg_proc p WHERE p.oid=to_regprocedure($1)`,
            [signature],
          )
        ).rows[0] ?? null,
      acl: await acl(db, signature),
    };
  }
  return state;
}
async function nativeState(db) {
  return (
    await db.query(`SELECT
    (SELECT jsonb_agg(to_jsonb(u) ORDER BY id) FROM auth.users u) AS auth_users,
    (SELECT jsonb_agg(to_jsonb(b) ORDER BY id) FROM public.businesses b) AS businesses,
    (SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM shop_manager.shops s) AS shops,
    (SELECT jsonb_agg(to_jsonb(c) ORDER BY id) FROM shop_manager.customers c) AS customers,
    (SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM shop_manager.profiles p) AS profiles,
    (SELECT jsonb_agg(to_jsonb(w) ORDER BY id) FROM shop_manager.work_orders w) AS orders,
    (SELECT jsonb_agg(to_jsonb(j) ORDER BY work_order_id,name) FROM shop_manager.work_order_job_lines j) AS jobs,
    (SELECT jsonb_agg(to_jsonb(p) ORDER BY work_order_id,part_name) FROM shop_manager.work_order_parts p) AS parts,
    (SELECT jsonb_agg(to_jsonb(q) ORDER BY id) FROM shop_manager.quotes q) AS quotes,
    (SELECT jsonb_agg(to_jsonb(i) ORDER BY quote_id,display_order) FROM shop_manager.quote_items i) AS quote_items,
    (SELECT jsonb_agg(to_jsonb(r) ORDER BY user_id) FROM shop_manager.user_roles r) AS roles,
    (SELECT jsonb_agg(jsonb_build_object('oid',c.oid,'acl',c.relacl::text,
      'owner',c.relowner,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity) ORDER BY c.oid)
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='shop_manager' AND c.relkind='r') AS table_access`)
  ).rows[0];
}
async function withFixture(run) {
  const db = new PGlite("memory://");
  try {
    await db.exec(fixtureSql);
    for (const definition of definitions) await db.exec(definition);
    for (const signature of [bootstrap, totals, converter]) {
      await db.exec(`REVOKE EXECUTE ON FUNCTION ${signature} FROM authenticated;
        GRANT EXECUTE ON FUNCTION ${signature} TO service_role;`);
    }
    await db.exec(`REVOKE EXECUTE ON FUNCTION ${converter} FROM PUBLIC,anon,authenticated`);
    const initial = await functionState(db);
    for (const [signature, md5] of Object.entries(expectedDefinitions)) {
      assert.equal(initial[signature].definition.md5, md5);
      assert.equal(initial[signature].definition.owner, "postgres");
      assert.equal(initial[signature].definition.prosecdef, true);
    }
    assert.deepEqual(initial[bootstrap].acl, originalAcl);
    assert.deepEqual(initial[totals].acl, originalAcl);
    assert.deepEqual(initial[converter].acl, restrictedAcl);
    await run(db);
  } finally {
    await db.close();
  }
}
async function asRole(db, role, run) {
  assert.ok(["anon", "authenticated", "service_role"].includes(role));
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [
    role === "anon" ? "" : actor,
  ]);
  try {
    await db.exec(`SET ROLE ${role}`);
    const context = (
      await db.query(`SELECT current_user AS actor,session_user,
      rolsuper,rolbypassrls,row_security_active('shop_manager.profiles') AS rls
      FROM pg_roles WHERE rolname=current_user`)
    ).rows[0];
    assert.deepEqual(context, {
      actor: role,
      session_user: "postgres",
      rolsuper: false,
      rolbypassrls: role === "service_role",
      rls: role !== "service_role",
    });
    await run();
  } finally {
    await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false)");
  }
}
const call = (db, signature, id = signature === bootstrap ? user : order) => {
  assert.ok([bootstrap, totals, converter, quoteConverter].includes(signature));
  return db.query(`SELECT ${signature.replace("(uuid)", "($1::uuid)")} AS result`, [id]);
};
async function assertRefuses(db, sql) {
  const functionsBefore = await functionState(db);
  const nativeBefore = await nativeState(db);
  await assert.rejects(db.exec(sql), { code: "55000" });
  await db.exec("ROLLBACK"); // No explicit transaction in this atomic-statement proof.
  assert.deepEqual(await functionState(db), functionsBefore);
  assert.deepEqual(await nativeState(db), nativeBefore);
}
async function preconditionDrift(db, helper, changes, sql = helper.candidate, optIn = false) {
  // Each variant begins from the same fixture. A savepoint lets us inspect the
  // deliberately drifted pre-state; atomic post-REVOKE rollback is tested below
  // separately without an enclosing transaction/savepoint.
  for (const change of changes) {
    await db.exec("BEGIN");
    try {
      if (optIn) await db.exec(`SET LOCAL ${helper.optIn}='owner-reviewed-unsafe-restore'`);
      await db.exec(change);
      const before = await functionState(db);
      const nativeBefore = await nativeState(db);
      await db.exec("SAVEPOINT before_candidate");
      await assert.rejects(db.exec(sql), { code: "55000" }, change);
      await db.exec("ROLLBACK TO SAVEPOINT before_candidate");
      assert.deepEqual(await functionState(db), before, change);
      assert.deepEqual(await nativeState(db), nativeBefore, change);
    } finally {
      await db.exec("ROLLBACK");
    }
  }
}

test(
  "retained definitions are hash-pinned and reject absent, ambiguous, changed, oversized source",
  options,
  () => {
    assert.equal(definitions.length, 4);
    assert.equal(extractBootstrap(profileSource.replace(/\r?\n/g, "\r\n")), definitions[0]);
    for (const malformed of [
      "",
      null,
      profileSource + definitions[0],
      profileSource.replace("ON CONFLICT (id)", "ON CONFLICT (user_id)"),
      "x".repeat(256 * 1024),
    ])
      assert.throws(() => extractBootstrap(malformed));
    for (const malformed of [
      "",
      null,
      source + definitions[1],
      source.replace("grand := labor_total + parts_total;", "grand := 0;"),
      "x".repeat(256 * 1024),
    ])
      assert.throws(() => extract(malformed, "calculate_work_order_totals", "unused"));
  },
);

for (const helper of helpers) {
  test(
    `${helper.signature}: exact independent candidate changes only target ACL and denies clients`,
    options,
    async () => {
      await withFixture(async (db) => {
        const before = await functionState(db);
        const nativeBefore = await nativeState(db);
        for (const role of ["anon", "authenticated"])
          await asRole(db, role, async () =>
            assert.equal((await call(db, helper.signature)).rows.length, 1),
          );
        // The positive control above may recalculate totals. Compare DDL against
        // the immediate pre-DDL state, not an earlier business-function result.
        const dataBeforeDdl = await nativeState(db);
        await db.exec(helper.candidate); // Actual file bytes, no substitute SQL.
        const after = await functionState(db);
        assert.deepEqual(after[helper.signature].acl, restrictedAcl);
        assert.deepEqual(after[helper.signature].definition, before[helper.signature].definition);
        for (const signature of [helper.other, converter, quoteConverter])
          assert.deepEqual(after[signature], before[signature]);
        assert.deepEqual(await nativeState(db), dataBeforeDdl);
        assert.deepEqual((await nativeState(db)).table_access, nativeBefore.table_access);
        for (const role of ["anon", "authenticated"])
          await asRole(db, role, async () => {
            await assert.rejects(call(db, helper.signature), { code: "42501" });
            await assert.rejects(call(db, converter), { code: "42501" });
            // Companion remains exposed until its own separately approved change.
            assert.equal((await call(db, helper.other)).rows.length, 1);
          });
        for (const signature of [bootstrap, totals]) {
          const expected = signature === bootstrap ? shop : 1225.5;
          assert.equal(
            signature === bootstrap
              ? (await call(db, signature)).rows[0].result
              : Number((await call(db, signature)).rows[0].result),
            expected,
          );
          await asRole(db, "service_role", async () => {
            const result = (await call(db, signature)).rows[0].result;
            assert.equal(signature === bootstrap ? result : Number(result), expected);
          });
        }
        assert.equal((await call(db, converter)).rows[0].result, invoice);
        await asRole(db, "service_role", async () =>
          assert.equal((await call(db, converter)).rows[0].result, invoice),
        );
        // This is preserved legacy behavior, not a claim that its shop mapping is safe.
        if (helper.signature === bootstrap)
          await asRole(db, "service_role", async () =>
            assert.equal((await call(db, bootstrap, newUser)).rows[0].result, null),
          );
      });
    },
  );

  test(
    `${helper.signature}: target/companion/converter definition, owner, missing-function drift refuses`,
    options,
    async () => {
      await withFixture(async (db) => {
        const changes = [helper.signature, helper.other, converter].flatMap((signature) => [
          `ALTER FUNCTION ${signature} SECURITY INVOKER`,
          `ALTER FUNCTION ${signature} OWNER TO service_role`,
          `ALTER FUNCTION ${signature} SET search_path=public`,
          `DROP FUNCTION ${signature}`,
        ]);
        await preconditionDrift(db, helper, changes);
      });
    },
  );

  test(
    `${helper.signature}: target/companion/converter ACL drift and inherited clients refuse`,
    options,
    async () => {
      await withFixture(async (db) => {
        const changes = [helper.signature, helper.other, converter].flatMap((signature) => [
          `GRANT EXECUTE ON FUNCTION ${signature} TO authenticated`,
          `GRANT EXECUTE ON FUNCTION ${signature} TO anon`,
          `REVOKE EXECUTE ON FUNCTION ${signature} FROM service_role`,
          `GRANT EXECUTE ON FUNCTION ${signature} TO service_role WITH GRANT OPTION`,
        ]);
        changes.push(`GRANT EXECUTE ON FUNCTION ${converter} TO PUBLIC`);
        changes.push("ALTER ROLE authenticated INHERIT; GRANT service_role TO authenticated");
        await preconditionDrift(db, helper, changes);
        // Converter and target share the owner/service whitelist. Thus inherited
        // owner/service client access necessarily fails the converter PRECHECK;
        // it cannot honestly be described as a post-REVOKE failure in this fixture.
      });
    },
  );

  test(
    `${helper.signature}: injected inherited access AFTER REVOKE fails postcheck and rolls back the entire unchanged DO`,
    options,
    async () => {
      await withFixture(async (db) => {
        // Disposable fault injection only, never a production proposal. Without
        // this event trigger inherited owner/service access fails the converter
        // precheck. Introduce it after REVOKE to reach the postcondition branch.
        await db.exec(`CREATE TABLE public.fixture_acl_faults(tag text);
        CREATE FUNCTION public.fixture_acl_fault() RETURNS event_trigger
        LANGUAGE plpgsql AS $fault$
        BEGIN
          INSERT INTO public.fixture_acl_faults VALUES(tg_tag);
          ALTER ROLE authenticated INHERIT;
          GRANT service_role TO authenticated;
        END $fault$;
        CREATE EVENT TRIGGER fixture_acl_fault ON ddl_command_end
          WHEN TAG IN ('REVOKE') EXECUTE FUNCTION public.fixture_acl_fault()`);
        const before = await functionState(db);
        const nativeBefore = await nativeState(db);
        const membership = async () =>
          (
            await db.query(`SELECT rolinherit,
        pg_has_role('authenticated','service_role','MEMBER') AS member
        FROM pg_roles WHERE rolname='authenticated'`)
          ).rows[0];
        const membershipBefore = await membership();
        await assert.rejects(
          db.exec(helper.candidate),
          (error) =>
            error.code === "55000" &&
            /effective-privilege postcondition failed/.test(error.message),
        );
        await db.exec("ROLLBACK");
        assert.deepEqual(await functionState(db), before);
        assert.deepEqual(await nativeState(db), nativeBefore);
        assert.deepEqual(await membership(), membershipBefore);
        assert.equal(
          (await db.query("SELECT count(*)::int AS n FROM public.fixture_acl_faults")).rows[0].n,
          0,
        );
        await db.exec(
          "DROP EVENT TRIGGER fixture_acl_fault; DROP FUNCTION public.fixture_acl_fault()",
        );
        await db.exec(helper.candidate); // Same exact file succeeds without fault.
        assert.deepEqual(await acl(db, helper.signature), restrictedAcl);
        assert.deepEqual(await acl(db, converter), restrictedAcl);
      });
    },
  );

  test(
    `${helper.signature}: exact recovery has no automatic path and restores only reviewed unsafe target ACL`,
    options,
    async () => {
      await withFixture(async (db) => {
        await db.exec(helpers[0].candidate);
        await db.exec(helpers[1].candidate);
        const before = await functionState(db);
        const nativeBefore = await nativeState(db);
        await assertRefuses(db, helper.recovery); // Required operator opt-in absent.
        await db.exec(`BEGIN; SET LOCAL ${helper.optIn}='owner-reviewed-unsafe-restore'`);
        await db.exec(helper.recovery); // Exact review-only file, not inline GRANT.
        await db.exec("COMMIT");
        const after = await functionState(db);
        assert.deepEqual(after[helper.signature].acl, originalAcl);
        assert.deepEqual(after[helper.signature].definition, before[helper.signature].definition);
        for (const signature of [helper.other, converter, quoteConverter])
          assert.deepEqual(after[signature], before[signature]);
        assert.deepEqual(await nativeState(db), nativeBefore);
        assert.notEqual(
          (await db.query("SELECT current_setting($1,true) AS opt_in", [helper.optIn])).rows[0]
            .opt_in,
          "owner-reviewed-unsafe-restore",
        );
        await assertRefuses(db, helper.recovery); // Cleared LOCAL setting and wrong ACL.
        for (const role of ["anon", "authenticated"])
          await asRole(db, role, async () => {
            assert.equal((await call(db, helper.signature)).rows.length, 1);
            await assert.rejects(call(db, helper.other), { code: "42501" });
            await assert.rejects(call(db, converter), { code: "42501" });
          });
      });
    },
  );

  test(
    `${helper.signature}: opted-in recovery refuses definition/owner/ACL drift and never broadens converter`,
    options,
    async () => {
      await withFixture(async (db) => {
        await db.exec(helpers[0].candidate);
        await db.exec(helpers[1].candidate);
        const changes = [helper.signature, helper.other, converter].flatMap((signature) => [
          `ALTER FUNCTION ${signature} SECURITY INVOKER`,
          `ALTER FUNCTION ${signature} OWNER TO service_role`,
          `GRANT EXECUTE ON FUNCTION ${signature} TO authenticated`,
          `REVOKE EXECUTE ON FUNCTION ${signature} FROM service_role`,
        ]);
        changes.push(`GRANT EXECUTE ON FUNCTION ${converter} TO PUBLIC`);
        changes.push("ALTER ROLE authenticated INHERIT; GRANT service_role TO authenticated");
        await preconditionDrift(db, helper, changes, helper.recovery, true);
      });
    },
  );

  test(
    `${helper.signature}: injected definition drift AFTER recovery GRANT fails and operator-transaction rollback preserves restriction`,
    options,
    async () => {
      await withFixture(async (db) => {
        await db.exec(helpers[0].candidate);
        await db.exec(helpers[1].candidate);
        await db.exec(`CREATE TABLE public.fixture_acl_faults(tag text);
        CREATE FUNCTION public.fixture_acl_fault() RETURNS event_trigger
        LANGUAGE plpgsql AS $fault$
        BEGIN
          INSERT INTO public.fixture_acl_faults VALUES(tg_tag);
          ALTER FUNCTION ${helper.signature} SECURITY INVOKER;
        END $fault$;
        CREATE EVENT TRIGGER fixture_acl_fault ON ddl_command_end
          WHEN TAG IN ('GRANT') EXECUTE FUNCTION public.fixture_acl_fault()`);
        const before = await functionState(db);
        const nativeBefore = await nativeState(db);
        // This test needs a LOCAL opt-in, so use a savepoint and inspect before
        // the containing transaction ends. The exact single DO raises only after
        // its GRANT and injected ALTER. No explicit recovery runs on failure.
        await db.exec(
          `BEGIN; SET LOCAL ${helper.optIn}='owner-reviewed-unsafe-restore'; SAVEPOINT before_recovery`,
        );
        await assert.rejects(
          db.exec(helper.recovery),
          (error) =>
            error.code === "55000" &&
            /changed an out-of-scope definition or grant/.test(error.message),
        );
        await db.exec("ROLLBACK TO SAVEPOINT before_recovery");
        assert.deepEqual(await functionState(db), before);
        assert.deepEqual(await nativeState(db), nativeBefore);
        assert.equal(
          (await db.query("SELECT count(*)::int AS n FROM public.fixture_acl_faults")).rows[0].n,
          0,
        );
        await db.exec(
          "ROLLBACK; DROP EVENT TRIGGER fixture_acl_fault; DROP FUNCTION public.fixture_acl_fault()",
        );
        assert.deepEqual(await acl(db, helper.signature), restrictedAcl);
        assert.deepEqual(await acl(db, converter), restrictedAcl);
      });
    },
  );
}

test(
  "both exact candidates compose in either order, rerun idempotently, and preserve native data/converter denial",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await functionState(db);
      const nativeBefore = await nativeState(db);
      for (const orderOfHelpers of [helpers, [...helpers].reverse()]) {
        await db.exec("BEGIN");
        try {
          for (const helper of orderOfHelpers) await db.exec(helper.candidate);
          for (const helper of orderOfHelpers) await db.exec(helper.candidate);
          const after = await functionState(db);
          for (const helper of helpers) {
            assert.deepEqual(after[helper.signature].acl, restrictedAcl);
            assert.deepEqual(
              after[helper.signature].definition,
              before[helper.signature].definition,
            );
          }
          assert.deepEqual(after[converter], before[converter]);
          assert.deepEqual(after[quoteConverter], before[quoteConverter]);
          assert.deepEqual(await nativeState(db), nativeBefore);
          for (const role of ["anon", "authenticated"])
            await asRole(db, role, async () => {
              // SAVEPOINT permits continuation after each expected denial in
              // this test's transaction; it does not test candidate atomicity.
              for (const signature of [bootstrap, totals, converter]) {
                await db.exec("SAVEPOINT expected_denial");
                await assert.rejects(call(db, signature), { code: "42501" });
                await db.exec("ROLLBACK TO SAVEPOINT expected_denial");
              }
            });
        } finally {
          await db.exec("ROLLBACK");
        }
        assert.deepEqual(await functionState(db), before);
        assert.deepEqual(await nativeState(db), nativeBefore);
      }
    });
  },
);

test(
  "retained SECURITY DEFINER quote path still calls restricted totals as owner; this is NOT indirect authorization mitigation",
  options,
  async () => {
    await withFixture(async (db) => {
      const quoteBefore = (await functionState(db))[quoteConverter];
      await db.exec(helpers[0].candidate);
      await db.exec(helpers[1].candidate);
      await asRole(db, "authenticated", async () => {
        await assert.rejects(call(db, totals), { code: "42501" });
        await assert.rejects(db.query("SELECT * FROM shop_manager.quotes"), { code: "42501" });
        // Exact retained quote converter runs as postgres and invokes the exact
        // totals function despite the caller having no direct EXECUTE/table ACL.
        const result = (await call(db, quoteConverter, quote)).rows[0].result;
        assert.match(result, /^[0-9a-f-]{36}$/);
      });
      const converted = (
        await db.query(
          `SELECT q.status,w.total_cost,w.created_by,
      (SELECT count(*)::int FROM shop_manager.work_order_job_lines WHERE work_order_id=w.id) AS jobs,
      (SELECT count(*)::int FROM shop_manager.work_order_parts WHERE work_order_id=w.id) AS parts
      FROM shop_manager.quotes q JOIN shop_manager.work_orders w ON w.id=q.converted_to_work_order_id
      WHERE q.id=$1`,
          [quote],
        )
      ).rows[0];
      assert.deepEqual(converted, {
        status: "converted",
        total_cost: "245",
        created_by: actor,
        jobs: 1,
        parts: 1,
      });
      const convertedOrder = (
        await db.query(
          "SELECT converted_to_work_order_id AS id FROM shop_manager.quotes WHERE id=$1",
          [quote],
        )
      ).rows[0].id;
      assert.equal((await call(db, quoteConverter, quote)).rows[0].result, convertedOrder);
      await asRole(db, "service_role", async () =>
        assert.equal((await call(db, quoteConverter, quote)).rows[0].result, convertedOrder),
      );
      assert.deepEqual((await functionState(db))[quoteConverter], quoteBefore);
      assert.deepEqual(await acl(db, converter), restrictedAcl);
    });
  },
);
