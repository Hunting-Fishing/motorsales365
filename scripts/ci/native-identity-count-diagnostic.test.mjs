// OFFLINE synthetic count-query characterization, never production counts.
// Selected retained table/FK/index DDL runs unchanged, not migration history,
// seeds, writers, bootstrap/roster helpers or native policies. auth.users(id)
// is synthetic platform support. Explicit anomaly fixtures relax only named
// necessary FK/partial-unique checks and retain every ID primary key.
// Numeric aggregate outputs remain sensitive; zero is not trusted membership,
// legitimate delegation, complete writer closure, applied parity or repair proof.
// READ ONLY/session bounds below are external test controls, not SQL self-guards
// or a production load/latency SLA. Existing RLS can change count semantics.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("../../", import.meta.url);
const sha = (raw) => createHash("sha256").update(raw.replace(/\r\n/g, "\n")).digest("hex");
function pinned(path, expected) {
  const raw = fs.readFileSync(new URL(path, root), "utf8");
  assert.ok(raw.length > 0 && raw.length < 512 * 1024, `${path}: bounded retained input`);
  assert.equal(sha(raw), expected, `${path}: LF pin drift`);
  return raw.replace(/\r\n/g, "\n");
}
const queries = {
  core: pinned(
    "docs/evidence/native-identity-counts-review.sql",
    "455497eeb0f6d147cdac3d54ba7893eb299c67176e47621b13e249063f243ed0",
  ),
  links: pinned(
    "docs/evidence/native-shop-business-link-counts-review.sql",
    "4f915425a5003526744f6d5298a18b3a5237ea6530a28e43aac0cf6b87685a7f",
  ),
};
const sources = {
  native: pinned(
    "supabase/migrations/20260713063318_90b3f5d4-5173-4f8a-b355-7634671276fe.sql",
    "f958d20e3b1ce5472cf292288f4710aab0ea858e5fd4f701bd0680cc0b039e71",
  ),
  fk: pinned(
    "supabase/migrations/20260713070436_a4f482f9-5657-4142-88e7-047bd0e90a42.sql",
    "b06be51908df335850c5132d8d5403d1918164bb2faded5195867e21b0a41a68",
  ),
  business: pinned(
    "supabase/migrations/20260512054457_90aac1ba-c3f0-48ff-a9b4-06739ddd2108.sql",
    "7ab71ad92eec0d9e9647fc8ffa46ef2b35c561c76b85d29ad41f9c32261fde8c",
  ),
  parts: pinned(
    "supabase/migrations/20260831041350_associate_parts_catalogue_operations.sql",
    "837be415b06829396f80cf53ba8245fa02ad1dabdd93bcb58235467fe30ed10e",
  ),
  bridge: pinned(
    "supabase/migrations/20260901025424_business_staff_shop_manager_bridge.sql",
    "a49e50ecd9a621d4162ff58666ab98584d9aa009775732ce4cf8b645d8c21a9e",
  ),
};
function selected(source, first, last, marker, expected) {
  assert.equal(source.split(marker).length, 2, "one selected retained declaration");
  const lines = source.split("\n");
  assert.ok(first > 0 && last >= first && last <= lines.length);
  const sql = lines.slice(first - 1, last).join("\n") + "\n";
  assert.ok(sql.includes(marker));
  assert.equal(sha(sql), expected, "unchanged complete selected DDL pin");
  return sql;
}
const ddl = {
  profiles: selected(
    sources.native,
    57,
    85,
    "CREATE TABLE shop_manager.profiles (",
    "b9ae44c03daaa146750a69d273f2b1d785ac1f47853cea54c18aafd1eaa63e5e",
  ),
  shops: selected(
    sources.native,
    565,
    598,
    "CREATE TABLE shop_manager.shops (",
    "fdba3f5b2a8befd49cc91dda27b92ea89eb096dcbb79b3e16206537130041cd9",
  ),
  types: selected(
    sources.business,
    3,
    8,
    "CREATE TABLE public.business_types (",
    "e800327ba56d5930d64eda35c34a64332414e330b48fc7cac6467c45e004fd99",
  ),
  status: selected(
    sources.business,
    62,
    62,
    "CREATE TYPE business_status AS ENUM",
    "f167012764e07c286adbf4a69b9f15aa43e10985083b58263c8633a8f3852bc3",
  ),
  businesses: selected(
    sources.business,
    64,
    92,
    "CREATE TABLE public.businesses (",
    "0efbc6d1442df92eb60d28654620be815d2319a23f59b50fceff1fbc15e18fc1",
  ),
  authFk: selected(
    sources.fk,
    83,
    83,
    "ALTER TABLE shop_manager.profiles ADD CONSTRAINT profiles_user_id_fkey",
    "1ae891be95b84c0ddb368d5f6aef72319fed08245b3a7f983bd6d932e4fe4a2f",
  ),
  link: selected(
    sources.parts,
    355,
    359,
    "ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id)",
    "85756a93c1106bacab73e85d91ec8f0cec870c56c08b2111c09fcb1dd392b821",
  ),
  unique: selected(
    sources.bridge,
    2,
    5,
    "CREATE UNIQUE INDEX IF NOT EXISTS shops_one_per_business",
    "7bc721ed361a170d3c3fe6db0c5d3ef052718fbea994c8cb99c2f270063dfdc0",
  ),
};
const profileUnique = ddl.unique.match(
  /^CREATE UNIQUE INDEX IF NOT EXISTS profiles_one_per_auth_user[\s\S]*?;\n/m,
)?.[0];
assert.ok(profileUnique, "complete actual profile partial unique statement");
const keys = {
  core: [
    "profiles_total",
    "profile_shop_null",
    "profile_shop_native_only",
    "profile_shop_business_only",
    "profile_shop_both_namespaces",
    "profile_shop_neither",
    "profile_user_null",
    "profile_user_canonical",
    "profile_user_legacy",
    "profile_id_auth_present",
    "profile_id_auth_missing",
    "profile_linked_user_auth_present",
    "profile_linked_user_auth_missing",
    "duplicate_user_groups",
    "duplicate_user_affected_profiles",
    "auth_null_shadow_actors",
    "auth_null_shadow_linked_shop_distinct_actors",
  ],
  links: [
    "shops_total",
    "shop_business_null",
    "shop_business_valid",
    "shop_business_orphan",
    "businesses_total",
    "businesses_zero_shops",
    "businesses_one_shop",
    "businesses_many_shops",
    "duplicate_business_link_groups",
    "duplicate_business_link_affected_shops",
  ],
};
const options = { concurrency: false, timeout: 30_000 };
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const zero = (kind) => Object.fromEntries(keys[kind].map((key) => [key, 0]));
function expectCounts(kind, actual, expected = {}) {
  assert.deepEqual(actual, { ...zero(kind), ...expected });
  if (kind === "core") {
    assert.equal(
      actual.profiles_total,
      actual.profile_shop_null +
        actual.profile_shop_native_only +
        actual.profile_shop_business_only +
        actual.profile_shop_both_namespaces +
        actual.profile_shop_neither,
    );
    assert.equal(
      actual.profiles_total,
      actual.profile_user_null + actual.profile_user_canonical + actual.profile_user_legacy,
    );
    assert.equal(
      actual.profiles_total,
      actual.profile_id_auth_present + actual.profile_id_auth_missing,
    );
    assert.equal(
      actual.profile_user_canonical + actual.profile_user_legacy,
      actual.profile_linked_user_auth_present + actual.profile_linked_user_auth_missing,
    );
    assert.ok(
      actual.auth_null_shadow_linked_shop_distinct_actors <= actual.auth_null_shadow_actors,
    );
  } else {
    assert.equal(
      actual.shops_total,
      actual.shop_business_null + actual.shop_business_valid + actual.shop_business_orphan,
    );
    assert.equal(
      actual.businesses_total,
      actual.businesses_zero_shops + actual.businesses_one_shop + actual.businesses_many_shops,
    );
  }
}
async function auth(db, ids) {
  for (const id of ids) await db.query("INSERT INTO auth.users(id) VALUES($1)", [id]);
}
async function profile(db, id, user = null, shop = null) {
  await db.query(
    "INSERT INTO shop_manager.profiles(id,user_id,shop_id,email,first_name,last_name) VALUES($1,$2,$3,$4,'Synthetic','Profile')",
    [id, user, shop, `synthetic-${id}@invalid.example`],
  );
}
async function business(db, id) {
  await db.query(
    "INSERT INTO public.businesses(id,slug,name,type_slug,email) VALUES($1,$2,'Synthetic business','synthetic','synthetic@invalid.example')",
    [id, `synthetic-${id}`],
  );
}
async function shop(db, id, linked = null, { businessLink = true } = {}) {
  if (businessLink)
    await db.query(
      "INSERT INTO shop_manager.shops(id,name,organization_id,business_id,email) VALUES($1,'Synthetic shop',$2,$3,'synthetic@invalid.example')",
      [id, uuid(99999), linked],
    );
  else
    await db.query(
      "INSERT INTO shop_manager.shops(id,name,organization_id,email) VALUES($1,'Synthetic shop',$2,'synthetic@invalid.example')",
      [id, uuid(99999)],
    );
}
async function query(db, kind, { reader = false } = {}) {
  assert.ok(Object.hasOwn(queries, kind));
  const sourceBefore = await snapshot(db);
  // Fixture-only deprivileging, before the read-only transaction. The fixed
  // operator SQL itself contains no SET ROLE, grant, helper wrapper or fallback.
  if (reader) await db.exec("SET ROLE diagnostic_reader");
  try {
    await db.exec(
      "BEGIN READ ONLY; SET LOCAL search_path=''; SET LOCAL statement_timeout='3s'; SET LOCAL lock_timeout='1s'",
    );
    const context = (
      await db.query(`SELECT current_user AS actor,current_setting('transaction_read_only') AS read_only,
      current_setting('search_path') AS path,current_setting('statement_timeout') AS statement_timeout,
      current_setting('lock_timeout') AS lock_timeout,rolsuper,rolbypassrls
      FROM pg_catalog.pg_roles WHERE rolname=current_user`)
    ).rows[0];
    assert.deepEqual(context, {
      actor: reader ? "diagnostic_reader" : "postgres",
      read_only: "on",
      path: '""',
      statement_timeout: "3s",
      lock_timeout: "1s",
      rolsuper: !reader,
      rolbypassrls: !reader,
    });
    const result = await db.query(queries[kind]); // Fixed artifact, no parameters/interpolation.
    assert.equal(result.rows.length, 1);
    assert.deepEqual(
      result.fields,
      keys[kind].map((name) => ({ name, dataTypeID: 20 })),
    );
    assert.deepEqual(Object.keys(result.rows[0]), keys[kind]);
    const row = Object.fromEntries(
      Object.entries(result.rows[0]).map(([name, value]) => {
        assert.ok(
          typeof value === "number" || typeof value === "bigint",
          "no string/ID/name/email/row data in output",
        );
        const count = Number(value); // Small synthetic fixtures only; not a large-count transport/overflow proof.
        assert.ok(Number.isSafeInteger(count) && count >= 0);
        return [name, count];
      }),
    );
    assert.doesNotMatch(JSON.stringify(row), /invalid\.example|Synthetic|00000000-0000-/);
    await db.exec("COMMIT");
    return row;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  } finally {
    if (reader) await db.exec("RESET ROLE");
    assert.deepEqual(
      await snapshot(db),
      sourceBefore,
      "each successful/failed fixed SELECT preserves fixture source state",
    );
  }
}
async function snapshot(db) {
  const catalog = (
    await db.query(`SELECT
    (SELECT jsonb_agg(jsonb_build_object('name',nspname,'owner',nspowner,'acl',nspacl::text) ORDER BY oid) FROM pg_namespace WHERE nspname IN ('auth','shop_manager','public')) AS schemas,
    (SELECT jsonb_agg(jsonb_build_object('table',c.oid::regclass::text,'owner',c.relowner,'acl',c.relacl::text,'rls',c.relrowsecurity,'force',c.relforcerowsecurity) ORDER BY c.oid)
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('auth','shop_manager','public') AND c.relkind='r') AS tables,
    (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.attrelid,a.attnum) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('auth','shop_manager','public')) AS columns,
    (SELECT jsonb_agg(jsonb_build_object('table',d.adrelid,'column',d.adnum,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY d.adrelid,d.adnum) FROM pg_attrdef d JOIN pg_class c ON c.oid=d.adrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('auth','shop_manager','public')) AS defaults,
    (SELECT jsonb_agg(jsonb_build_object('table',c.conrelid,'name',c.conname,'definition',pg_get_constraintdef(c.oid),'validated',c.convalidated) ORDER BY c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname IN ('auth','shop_manager','public')) AS constraints,
    (SELECT jsonb_agg(jsonb_build_object('table',i.indrelid,'definition',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,'ready',i.indisready) ORDER BY i.indexrelid) FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('auth','shop_manager','public')) AS indexes,
    (SELECT jsonb_agg(jsonb_build_object('table',polrelid,'name',polname,'roles',polroles::text,'using',pg_get_expr(polqual,polrelid),'check',pg_get_expr(polwithcheck,polrelid)) ORDER BY oid) FROM pg_policy) AS policies,
    (SELECT jsonb_agg(jsonb_build_object('table',t.tgrelid,'name',t.tgname,'definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled) ORDER BY t.oid) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('auth','shop_manager','public')) AS triggers,
    (SELECT jsonb_agg(jsonb_build_object('enum',e.enumtypid,'label',e.enumlabel,'order',e.enumsortorder) ORDER BY e.enumtypid,e.enumsortorder) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public') AS enums,
    (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.oid) FROM pg_default_acl d) AS default_acl,
    (SELECT jsonb_agg(jsonb_build_object('name',rolname,'super',rolsuper,'bypass',rolbypassrls,'inherit',rolinherit) ORDER BY rolname) FROM pg_roles) AS roles,
    (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.roleid,m.member,m.grantor) FROM pg_auth_members m) AS memberships,
    (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('auth','shop_manager','public')) AS explicit_application_functions`)
  ).rows[0];
  const data = {};
  for (const table of [
    "auth.users",
    "shop_manager.profiles",
    "shop_manager.shops",
    "public.business_types",
    "public.businesses",
  ])
    data[table] = (
      await db.query(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`)
    ).rows;
  return { catalog, data };
}
async function checkPrimaryKeys(db) {
  for (const table of [
    "auth.users",
    "shop_manager.profiles",
    "shop_manager.shops",
    "public.businesses",
  ])
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int n FROM pg_constraint WHERE conrelid=$1::regclass AND contype='p'",
          [table],
        )
      ).rows[0].n,
      1,
      `${table}: ID PK preserved`,
    );
}
async function withFixture(
  run,
  {
    businessLink = true,
    relaxProfileUnique = false,
    relaxProfileAuthFk = false,
    relaxShopUnique = false,
    relaxShopBusinessFk = false,
  } = {},
) {
  const db = new PGlite("memory://");
  try {
    await db.exec(`SET statement_timeout='3s'; SET lock_timeout='1s';
      CREATE SCHEMA auth; CREATE SCHEMA shop_manager;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE ROLE diagnostic_reader NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
      GRANT USAGE ON SCHEMA auth,shop_manager,public TO diagnostic_reader`);
    for (const part of [ddl.types, ddl.status, ddl.businesses, ddl.profiles, ddl.shops, ddl.authFk])
      await db.exec(part);
    // The retained DO catches all exceptions. Verify a real validated attachment,
    // not a swallowed notice or permissive synthetic replacement.
    assert.deepEqual(
      (
        await db.query(`SELECT convalidated AS validated,pg_get_constraintdef(oid) AS definition
      FROM pg_constraint WHERE conrelid='shop_manager.profiles'::regclass AND conname='profiles_user_id_fkey'`)
      ).rows,
      [
        {
          validated: true,
          definition: "FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL",
        },
      ],
    );
    if (businessLink) {
      await db.exec(ddl.link);
      await db.exec(ddl.unique);
    } else {
      assert.ok(!relaxShopUnique && !relaxShopBusinessFk);
      await db.exec(profileUnique);
    }
    if (relaxProfileUnique)
      await db.exec("DROP INDEX shop_manager.profiles_one_per_auth_user RESTRICT");
    if (relaxProfileAuthFk)
      await db.exec(
        "ALTER TABLE shop_manager.profiles DROP CONSTRAINT profiles_user_id_fkey RESTRICT",
      );
    if (relaxShopUnique) await db.exec("DROP INDEX shop_manager.shops_one_per_business RESTRICT");
    if (relaxShopBusinessFk)
      await db.exec(
        "ALTER TABLE shop_manager.shops DROP CONSTRAINT shops_business_id_fkey RESTRICT",
      );
    await checkPrimaryKeys(db);
    // Synthetic data only, not retained business-type seed execution.
    await db.exec(
      "INSERT INTO public.business_types(slug,label) VALUES('synthetic','Synthetic type')",
    );
    await db.exec(`GRANT SELECT(id,user_id,shop_id) ON shop_manager.profiles TO diagnostic_reader;
      GRANT SELECT(id) ON shop_manager.shops,public.businesses,auth.users TO diagnostic_reader`);
    if (businessLink)
      await db.exec("GRANT SELECT(business_id) ON shop_manager.shops TO diagnostic_reader");
    await run(db);
  } finally {
    await db.close();
  }
}

test(
  "pins two fixed one-statement aggregate SELECTs and actual selected DDL, never helper/seed/history/writer execution",
  options,
  () => {
    assert.equal(
      JSON.parse(fs.readFileSync(new URL("package.json", root), "utf8")).devDependencies[
        "@electric-sql/pglite"
      ],
      "0.5.9",
    );
    assert.equal(Object.keys(ddl).length, 8);
    for (const [kind, raw] of Object.entries(queries)) {
      const sql = raw.replace(/^--.*$/gm, "").trim();
      assert.match(sql, /^WITH /);
      assert.equal((sql.match(/;/g) ?? []).length, 1);
      assert.ok(sql.endsWith(";"));
      assert.doesNotMatch(
        sql,
        /\$\d|\$\{|\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|GRANT|REVOKE|EXECUTE|CALL|COPY|TRUNCATE|SET|DO|EXPLAIN|ANALYZE)\b/i,
      );
      assert.doesNotMatch(
        sql,
        /auth\.uid\(|current_employee_profile\(|get_current_user_shop_id\(|has_role\(|ensure_profile|sync_business/,
      );
      assert.equal(keys[kind].length, kind === "core" ? 17 : 10);
    }
    assert.doesNotMatch(ddl.profiles, /REFERENCES.*shops/);
    assert.doesNotMatch(
      Object.values(ddl).join("\n"),
      /CREATE(?: OR REPLACE)? FUNCTION|CREATE POLICY|INSERT INTO/,
    );
    assert.throws(() =>
      selected(
        sources.native + sources.native,
        57,
        85,
        "CREATE TABLE shop_manager.profiles (",
        sha(ddl.profiles),
      ),
    );
    assert.throws(() =>
      selected(
        sources.native.replace("CREATE TABLE shop_manager.profiles (", "missing"),
        57,
        85,
        "CREATE TABLE shop_manager.profiles (",
        sha(ddl.profiles),
      ),
    );
    assert.notEqual(sha(queries.core + " "), sha(queries.core));
  },
);

test(
  "empty fixtures return one exact numeric-int8 row of17/10 zeros without changing schemas/tables/catalog/defaults/ACL/data/roles",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await snapshot(db);
      assert.equal(before.catalog.explicit_application_functions, 0);
      expectCounts("core", await query(db, "core"));
      expectCounts("links", await query(db, "links"));
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "five disjoint shop namespaces include a UUID collision but never equate native shop identity with its explicit business link",
  options,
  async () => {
    await withFixture(async (db) => {
      const native = uuid(101),
        businessOnly = uuid(201),
        both = uuid(301),
        explicitLink = uuid(202);
      for (const id of [businessOnly, both, explicitLink]) await business(db, id);
      await shop(db, native);
      await shop(db, both, explicitLink);
      for (const [n, bound] of [null, native, businessOnly, both, uuid(9999)].entries())
        await profile(db, uuid(500 + n), null, bound);
      const before = await snapshot(db);
      expectCounts("core", await query(db, "core"), {
        profiles_total: 5,
        profile_shop_null: 1,
        profile_shop_native_only: 1,
        profile_shop_business_only: 1,
        profile_shop_both_namespaces: 1,
        profile_shop_neither: 1,
        profile_user_null: 5,
        profile_id_auth_missing: 5,
      });
      expectCounts("links", await query(db, "links"), {
        shops_total: 2,
        shop_business_null: 1,
        shop_business_valid: 1,
        businesses_total: 3,
        businesses_zero_shops: 2,
        businesses_one_shop: 1,
      });
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "null/canonical/legacy and id-auth/nonnull-user-auth partitions remain distinct, including missing linked auth in an explicitly FK-relaxed fixture",
  options,
  async () => {
    await withFixture(
      async (db) => {
        const [a, b, c, d] = [1, 2, 3, 4].map(uuid);
        await auth(db, [a, b, c, d]);
        await profile(db, a);
        await profile(db, b, b);
        await profile(db, uuid(501), c);
        await profile(db, d, uuid(9998));
        await profile(db, uuid(502));
        const before = await snapshot(db);
        expectCounts("core", await query(db, "core"), {
          profiles_total: 5,
          profile_shop_null: 5,
          profile_user_null: 2,
          profile_user_canonical: 1,
          profile_user_legacy: 2,
          profile_id_auth_present: 3,
          profile_id_auth_missing: 2,
          profile_linked_user_auth_present: 2,
          profile_linked_user_auth_missing: 1,
        });
        assert.deepEqual(await snapshot(db), before);
      },
      { relaxProfileAuthFk: true },
    );
  },
);

test(
  "duplicate bindings3+2 yield exactly2 groups/5 affected profiles, exclude NULLs and include structurally missing-auth bindings without join inflation",
  options,
  async () => {
    await withFixture(
      async (db) => {
        const a = uuid(1),
          missing = uuid(2),
          canonical = uuid(3);
        await auth(db, [a, canonical]);
        for (let n = 0; n < 5; n++) await profile(db, uuid(500 + n), n < 3 ? a : missing);
        await profile(db, uuid(510));
        await profile(db, uuid(511));
        await profile(db, canonical, canonical);
        const before = await snapshot(db);
        expectCounts("core", await query(db, "core"), {
          profiles_total: 8,
          profile_shop_null: 8,
          profile_user_null: 2,
          profile_user_canonical: 1,
          profile_user_legacy: 5,
          profile_id_auth_present: 1,
          profile_id_auth_missing: 7,
          profile_linked_user_auth_present: 4,
          profile_linked_user_auth_missing: 2,
          duplicate_user_groups: 2,
          duplicate_user_affected_profiles: 5,
        });
        assert.deepEqual(await snapshot(db), before);
      },
      { relaxProfileUnique: true, relaxProfileAuthFk: true },
    );
  },
);

test(
  "empty auth and id-missing structural shadows are not auth-null-shadow actors, nor are false/canonical non-null id profiles",
  options,
  async () => {
    await withFixture(
      async (db) => {
        await profile(db, uuid(1));
        await profile(db, uuid(501), uuid(1));
        await profile(db, uuid(2), uuid(2));
        await profile(db, uuid(3), uuid(4));
        await profile(db, uuid(502), uuid(3));
        expectCounts("core", await query(db, "core"), {
          profiles_total: 5,
          profile_shop_null: 5,
          profile_user_null: 1,
          profile_user_canonical: 1,
          profile_user_legacy: 3,
          profile_id_auth_missing: 5,
          profile_linked_user_auth_missing: 4,
        });
      },
      { relaxProfileAuthFk: true },
    );
    await withFixture(
      async (db) => {
        await auth(db, [uuid(1), uuid(2), uuid(3)]);
        await profile(db, uuid(1), uuid(3));
        await profile(db, uuid(501), uuid(1));
        await profile(db, uuid(2), uuid(2));
        await profile(db, uuid(502), uuid(2));
        expectCounts("core", await query(db, "core"), {
          profiles_total: 4,
          profile_shop_null: 4,
          profile_user_canonical: 1,
          profile_user_legacy: 3,
          profile_id_auth_present: 2,
          profile_id_auth_missing: 2,
          profile_linked_user_auth_present: 4,
          duplicate_user_groups: 1,
          duplicate_user_affected_profiles: 2,
        });
      },
      { relaxProfileUnique: true },
    );
  },
);

test(
  "real auth-null user-id shadows use IS DISTINCT FROM for same/different/both-NULL/one-NULL shops",
  options,
  async () => {
    for (const [shadowShop, linkedShop, distinct] of [
      [uuid(101), uuid(101), 0],
      [uuid(101), uuid(102), 1],
      [null, null, 0],
      [null, uuid(101), 1],
      [uuid(101), null, 1],
    ])
      await withFixture(async (db) => {
        await auth(db, [uuid(1)]);
        await profile(db, uuid(1), null, shadowShop);
        await profile(db, uuid(501), uuid(1), linkedShop);
        const before = await snapshot(db),
          actual = await query(db, "core");
        assert.equal(actual.profiles_total, 2);
        assert.equal(actual.auth_null_shadow_actors, 1);
        assert.equal(actual.auth_null_shadow_linked_shop_distinct_actors, distinct);
        assert.equal(actual.duplicate_user_groups, 0);
        assert.deepEqual(await snapshot(db), before);
      });
  },
);

test(
  "multiple linked profiles count one auth-null-shadow actor and BOOL_OR distinct once, even with duplicate same-shop links",
  options,
  async () => {
    await withFixture(
      async (db) => {
        const actor = uuid(1);
        await auth(db, [actor]);
        await profile(db, actor, null, uuid(101));
        await profile(db, uuid(501), actor, uuid(101));
        await profile(db, uuid(502), actor, uuid(101));
        await profile(db, uuid(503), actor, uuid(102));
        await profile(db, uuid(504), actor, null);
        const actual = await query(db, "core");
        assert.equal(actual.profiles_total, 5);
        assert.equal(actual.duplicate_user_groups, 1);
        assert.equal(actual.duplicate_user_affected_profiles, 4);
        assert.equal(actual.auth_null_shadow_actors, 1);
        assert.equal(actual.auth_null_shadow_linked_shop_distinct_actors, 1);
      },
      { relaxProfileUnique: true },
    );
  },
);

test(
  "unrelated auth users do not change profile binding/shadow counts or create join inflation",
  options,
  async () => {
    await withFixture(async (db) => {
      await auth(db, [uuid(1)]);
      await profile(db, uuid(1));
      await profile(db, uuid(501), uuid(1));
      const before = await query(db, "core");
      await auth(
        db,
        Array.from({ length: 50 }, (_, n) => uuid(2000 + n)),
      );
      const dataBeforeQuery = await snapshot(db);
      assert.deepEqual(await query(db, "core"), before);
      assert.deepEqual(await snapshot(db), dataBeforeQuery);
    });
  },
);

test(
  "optional explicit links distinguish null/valid/orphan shops and business0/1/many from duplicate orphan-link groups",
  options,
  async () => {
    await withFixture(
      async (db) => {
        const zeroBusiness = uuid(201),
          oneBusiness = uuid(202),
          manyBusiness = uuid(203),
          orphan = uuid(9998);
        for (const id of [zeroBusiness, oneBusiness, manyBusiness]) await business(db, id);
        await shop(db, uuid(101));
        await shop(db, uuid(102), oneBusiness);
        for (const id of [103, 104, 105]) await shop(db, uuid(id), manyBusiness);
        for (const id of [106, 107]) await shop(db, uuid(id), orphan);
        const before = await snapshot(db);
        expectCounts("links", await query(db, "links"), {
          shops_total: 7,
          shop_business_null: 1,
          shop_business_valid: 4,
          shop_business_orphan: 2,
          businesses_total: 3,
          businesses_zero_shops: 1,
          businesses_one_shop: 1,
          businesses_many_shops: 1,
          duplicate_business_link_groups: 2,
          duplicate_business_link_affected_shops: 5,
        });
        assert.deepEqual(await snapshot(db), before);
      },
      { relaxShopUnique: true, relaxShopBusinessFk: true },
    );
  },
);

test(
  "actual normal FK/unique checks prevent orphan linked auth/business and duplicate bindings, while every anomaly fixture retains ID PKs",
  options,
  async () => {
    await withFixture(async (db) => {
      await auth(db, [uuid(1)]);
      await profile(db, uuid(501), uuid(1));
      await business(db, uuid(201));
      await shop(db, uuid(101), uuid(201));
      const before = await snapshot(db);
      await assert.rejects(profile(db, uuid(502), uuid(1)), { code: "23505" });
      await assert.rejects(profile(db, uuid(503), uuid(9998)), { code: "23503" });
      await assert.rejects(shop(db, uuid(102), uuid(201)), { code: "23505" });
      await assert.rejects(shop(db, uuid(103), uuid(9998)), { code: "23503" });
      assert.deepEqual(await snapshot(db), before);
      await checkPrimaryKeys(db);
      assert.deepEqual(
        (
          await db.query(
            "SELECT conname FROM pg_constraint WHERE conrelid='shop_manager.profiles'::regclass AND contype='f' ORDER BY conname",
          )
        ).rows,
        [{ conname: "profiles_user_id_fkey" }],
      );
    });
  },
);

test(
  "least-column non-bypass reader can run both queries without name/email privileges and missing column permission fails42501 without fallback",
  options,
  async () => {
    await withFixture(async (db) => {
      await business(db, uuid(201));
      await shop(db, uuid(101), uuid(201));
      await profile(db, uuid(501), null, uuid(101));
      const before = await snapshot(db);
      assert.deepEqual(await query(db, "core", { reader: true }), await query(db, "core"));
      assert.deepEqual(await query(db, "links", { reader: true }), await query(db, "links"));
      assert.deepEqual(await snapshot(db), before);
      await db.exec("SET ROLE diagnostic_reader");
      await assert.rejects(db.query("SELECT email FROM shop_manager.profiles"), { code: "42501" });
      await assert.rejects(db.query("SELECT name FROM public.businesses"), { code: "42501" });
      await db.exec(
        "RESET ROLE; REVOKE SELECT(user_id) ON shop_manager.profiles FROM diagnostic_reader",
      );
      const restricted = await snapshot(db);
      await assert.rejects(query(db, "core", { reader: true }), { code: "42501" });
      assert.deepEqual(await snapshot(db), restricted);
      assert.equal(
        (
          await db.query(
            "SELECT has_column_privilege('diagnostic_reader','shop_manager.profiles','user_id','SELECT') AS allowed",
          )
        ).rows[0].allowed,
        false,
      );
    });
  },
);

test(
  "synthetic RLS filtering undercounts profiles and misclassifies a hidden business namespace; visibility-limited counts are not global truth",
  options,
  async () => {
    await withFixture(async (db) => {
      const collision = uuid(101);
      await business(db, collision);
      await shop(db, collision);
      await profile(db, uuid(501), null, collision);
      await profile(db, uuid(502));
      await db.exec(`ALTER TABLE shop_manager.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
      CREATE POLICY synthetic_visible_profile ON shop_manager.profiles FOR SELECT TO diagnostic_reader USING(id='${uuid(501)}'::uuid);
      CREATE POLICY synthetic_hidden_business ON public.businesses FOR SELECT TO diagnostic_reader USING(false)`);
      const before = await snapshot(db);
      const global = await query(db, "core"),
        limited = await query(db, "core", { reader: true });
      assert.equal(global.profiles_total, 2);
      assert.equal(limited.profiles_total, 1);
      assert.equal(global.profile_shop_both_namespaces, 1);
      assert.equal(limited.profile_shop_both_namespaces, 0);
      assert.equal(limited.profile_shop_native_only, 1);
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "core namespace diagnostic does not require shops.business_id; optional query remains a separate unavailable-column scope",
  options,
  async () => {
    await withFixture(
      async (db) => {
        await shop(db, uuid(101), null, { businessLink: false });
        await profile(db, uuid(501), null, uuid(101));
        const before = await snapshot(db);
        expectCounts("core", await query(db, "core", { reader: true }), {
          profiles_total: 1,
          profile_shop_native_only: 1,
          profile_user_null: 1,
          profile_id_auth_missing: 1,
        });
        await assert.rejects(query(db, "links", { reader: true }), { code: "42703" });
        assert.deepEqual(await snapshot(db), before);
      },
      { businessLink: false },
    );
  },
);

test(
  "external READ ONLY transaction rejects a fixture write and LOCAL path/timeouts expire without role/grant escalation",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await snapshot(db);
      await db.exec("SET search_path=public; SET statement_timeout='10s'; SET lock_timeout='5s'");
      await query(db, "core", { reader: true });
      assert.deepEqual(
        (
          await db.query(
            "SELECT current_user AS actor,current_setting('search_path') AS path,current_setting('statement_timeout') AS statement_timeout,current_setting('lock_timeout') AS lock_timeout",
          )
        ).rows[0],
        { actor: "postgres", path: "public", statement_timeout: "10s", lock_timeout: "5s" },
      );
      await db.exec(
        "BEGIN READ ONLY; SET LOCAL search_path=''; SET LOCAL statement_timeout='3s'; SET LOCAL lock_timeout='1s'",
      );
      await assert.rejects(db.query("INSERT INTO auth.users(id) VALUES($1)", [uuid(9998)]), {
        code: "25006",
      });
      await db.exec("ROLLBACK");
      assert.deepEqual(await snapshot(db), before);
    });
  },
);
