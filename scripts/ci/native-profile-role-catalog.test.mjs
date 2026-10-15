// Exact proposal bytes and static scope only: not a SQL parser, SQL execution,
// authorization, independent pre-execution approval or live/catalog parity proof.
// The dated artifact is metadata only; no database, network or migration is used.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";

const sql = fs
  .readFileSync(
    new URL("../../docs/evidence/native-profile-role-catalog-review.sql", import.meta.url),
    "utf8",
  )
  .replace(/\r\n/g, "\n");
const code = sql.replace(/--[^\n]*/g, "").replace(/'(?:''|[^'])*'/g, "''");
const expectedSha = "ea8597272733c8579651e6f9c47cb0e600a2cfa5addaf6b03ea91d7706ce880d";
const observedRaw = fs
  .readFileSync(
    new URL("../../docs/evidence/native-profile-role-catalog-2026-10-15.json", import.meta.url),
    "utf8",
  )
  .replace(/\r\n/g, "\n");
const observed = JSON.parse(observedRaw);

test("fixed native authorization review query retains exact LF bytes and operational limits", () => {
  assert.equal(Buffer.byteLength(sql), 11368);
  assert.equal(createHash("sha256").update(sql).digest("hex"), expectedSha);
  assert.ok(sql.endsWith("\n"));
  assert.match(sql, /No application records\/counts, application-function calls, DDL or writes/);
  assert.match(sql, /does not enforce READ ONLY transactions or statement\/lock timeouts/);
  assert.match(sql, /Incoming FKs, role membership\/default ACL closure/);
  assert.match(sql, /review output\n-- privately before saving\/publishing/);
  assert.match(sql, /Hashes are not secrecy\/authenticity proof/);
});

test("only three exact native relations and three exact helpers seed attached-function closure", () => {
  assert.match(sql, /WHERE n\.nspname='shop_manager'/);
  assert.match(sql, /AND c\.relname IN \('profiles','roles','user_roles'\)/);
  assert.match(sql, /AND c\.relkind='r'/);
  assert.deepEqual(
    [...sql.matchAll(/pg_catalog\.to_regprocedure\('([^']+)'\)/g)].map((match) => match[1]),
    [
      "shop_manager.is_owner_or_admin(pg_catalog.uuid)",
      "shop_manager.user_belongs_to_shop(pg_catalog.uuid,pg_catalog.uuid)",
      "shop_manager.get_current_user_shop_id()",
    ],
  );
  assert.match(sql, /JOIN targets AS c ON c\.oid=t\.tgrelid\n  WHERE NOT t\.tgisinternal/);
  assert.match(sql, /WHERE p\.prokind='f' AND \(/);
  assert.match(sql, /OR p\.oid IN \(SELECT t\.tgfoid FROM attached AS t\)/);
  assert.match(sql, /JOIN selected_functions AS f ON f\.oid=p\.oid/);
  assert.doesNotMatch(code, /\b(?:LIKE|ILIKE|SIMILAR|EXECUTE)\b/i);
});

test("one static SELECT reads allowlisted catalogs and calls only allowlisted catalog functions", () => {
  assert.match(code.trimStart(), /^WITH\b/);
  assert.equal((code.match(/;/g) || []).length, 1);
  assert.doesNotMatch(
    code,
    /\b(?:INSERT|UPDATE|DELETE|MERGE|CALL|DO|COPY|ALTER|CREATE|DROP|GRANT|REVOKE|SET|BEGIN|COMMIT|ROLLBACK|INTO)\b/i,
  );
  assert.doesNotMatch(code, /\b(?:public|auth|shop_manager)\./);
  const relationAllowlist = new Set([
    "targets",
    "attached",
    "selected_functions",
    "pg_catalog.pg_class",
    "pg_catalog.pg_namespace",
    "pg_catalog.pg_trigger",
    "pg_catalog.pg_proc",
    "pg_catalog.pg_attribute",
    "pg_catalog.pg_attrdef",
    "pg_catalog.pg_constraint",
    "pg_catalog.pg_index",
    "pg_catalog.pg_policy",
    "pg_catalog.pg_language",
    "pg_catalog.unnest",
  ]);
  for (const match of code.matchAll(/\b(?:FROM|JOIN)\s+([\w.]+)/gi))
    assert.ok(relationAllowlist.has(match[1]), match[1]);
  const functionAllowlist = new Set([
    "array_remove",
    "chr",
    "clock_timestamp",
    "format_type",
    "has_column_privilege",
    "has_function_privilege",
    "has_schema_privilege",
    "has_table_privilege",
    "jsonb_agg",
    "jsonb_build_object",
    "md5",
    "pg_get_constraintdef",
    "pg_get_expr",
    "pg_get_function_identity_arguments",
    "pg_get_function_result",
    "pg_get_functiondef",
    "pg_get_indexdef",
    "pg_get_triggerdef",
    "pg_get_userbyid",
    "replace",
    "split_part",
    "strpos",
    "substr",
    "to_regprocedure",
    "unnest",
  ]);
  for (const match of code.matchAll(/\bpg_catalog\.([a-z_]+)\s*\(/g))
    assert.ok(functionAllowlist.has(match[1]), match[1]);
});

test("selected schema/table/column/function ACLs are distinct from row policies and attachments", () => {
  assert.equal(
    (sql.match(/ARRAY\['anon','authenticated','service_role'\]::pg_catalog\.text\[\]/g) || [])
      .length,
    2,
  );
  for (const privilege of [
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "TRUNCATE",
    "REFERENCES",
    "TRIGGER",
  ])
    assert.ok(
      sql.includes(
        `pg_catalog.has_table_privilege(r.role_name::pg_catalog.name,c.oid,'${privilege}')`,
      ),
    );
  for (const privilege of ["SELECT", "INSERT", "UPDATE", "REFERENCES"])
    assert.ok(
      sql.includes(
        `pg_catalog.has_column_privilege(r.role_name::pg_catalog.name,c.oid,a.attnum,'${privilege}')`,
      ),
    );
  for (const role of ["anon", "authenticated", "service_role"])
    assert.ok(sql.includes(`pg_catalog.has_function_privilege('${role}',p.oid,'EXECUTE')`));
  assert.match(sql, /'rls',c\.relrowsecurity,'force_rls',c\.relforcerowsecurity/);
  assert.match(sql, /'acl',a\.attacl::pg_catalog\.text/);
  assert.match(sql, /'validated',k\.convalidated/);
  assert.match(sql, /FROM pg_catalog\.pg_constraint AS k WHERE k\.conrelid=c\.oid/);
  assert.match(sql, /FROM pg_catalog\.pg_policy AS pol WHERE pol\.polrelid=c\.oid/);
  assert.match(sql, /FROM attached AS t WHERE t\.tgrelid=c\.oid/);
});

test("defaults/config/body and trigger argument values remain hash-only selected fingerprints", () => {
  for (const rawKey of [
    "default",
    "body",
    "config",
    "config_values",
    "search_path",
    "arguments",
    "when",
  ])
    assert.ok(!sql.includes(`'${rawKey}',`), rawKey);
  assert.match(
    sql,
    /'default_md5',pg_catalog\.md5\(pg_catalog\.pg_get_expr\(d\.adbin,d\.adrelid\)\)/,
  );
  assert.equal(
    (
      sql.match(
        /'argument_defaults_md5',pg_catalog\.md5\(pg_catalog\.pg_get_expr\(p\.proargdefaults,0\)\)/g,
      ) || []
    ).length,
    2,
  );
  assert.match(sql, /'config_md5',pg_catalog\.md5\(p\.proconfig::pg_catalog\.text\)/);
  assert.match(sql, /'value_md5',pg_catalog\.md5\(pg_catalog\.substr\(s\.setting,/);
  assert.match(sql, /'selected_header_md5',pg_catalog\.md5\(pg_catalog\.jsonb_build_object\(/);
  assert.match(sql, /'definition_md5',pg_catalog\.md5\(pg_catalog\.pg_get_functiondef\(p\.oid\)\)/);
  assert.match(
    sql,
    /'body_md5_lf',pg_catalog\.md5\(pg_catalog\.replace\(p\.prosrc,pg_catalog\.chr\(13\),''\)\)/,
  );
  assert.match(
    sql,
    /'when_md5',pg_catalog\.md5\(pg_catalog\.pg_get_expr\(t\.tgqual,t\.tgrelid\)\)/,
  );
  assert.match(sql, /'arguments_md5',pg_catalog\.md5\(t\.tgargs::pg_catalog\.text\)/);
  assert.match(sql, /'definition_md5',pg_catalog\.md5\(pg_catalog\.pg_get_triggerdef\(t\.oid\)\)/);
  assert.match(sql, /'using',pg_catalog\.pg_get_expr\(pol\.polqual,pol\.polrelid\)/);
  assert.match(sql, /'definition',pg_catalog\.pg_get_constraintdef\(k\.oid\)/);
  assert.match(sql, /'definition',pg_catalog\.pg_get_indexdef\(i\.indexrelid\)/);
});

test("dated metadata pins canonical project, observation and exact table/helper identities", () => {
  assert.equal(Buffer.byteLength(observedRaw), 37810);
  assert.equal(
    createHash("sha256").update(observedRaw).digest("hex"),
    "d92af49531821c95fe9173bc3184b77060c22ffdaac30d7e7b70311e60f2712a",
  );
  assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
  assert.equal(observed.observed_at_utc, "2026-10-15 01:00:28.666866");
  assert.match(observed.scope, /No application rows\/counts, function invocation or writes/);
  assert.match(observed.scope, /Separate observations, not a shared snapshot/);
  assert.match(observed.scope, /does not enforce READ ONLY transaction or timeouts/);
  assert.match(observed.scope, /Incoming FKs, full role membership\/default ACL/);
  assert.deepEqual(
    observed.tables.map((table) => `${table.schema}.${table.table}`),
    ["shop_manager.profiles", "shop_manager.roles", "shop_manager.user_roles"],
  );
  assert.deepEqual(
    observed.functions.map((fn) => fn.signature),
    [
      "shop_manager.get_current_user_shop_id()",
      "shop_manager.is_owner_or_admin(uuid)",
      "shop_manager.user_belongs_to_shop(uuid,uuid)",
    ],
  );
  assert.ok(observed.tables.every((table) => table.user_triggers.length === 0));
});

test("dated table/column ACLs, exact policy shapes and outgoing constraints remain distinct", () => {
  for (const table of observed.tables) {
    assert.equal(table.owner, "postgres");
    assert.equal(table.rls, true);
    assert.equal(table.force_rls, false);
    for (const grant of table.effective_acl) {
      assert.equal(grant.schema_usage, true);
      for (const operation of ["select", "insert", "update", "delete"])
        assert.equal(grant[operation], grant.role !== "anon");
      for (const operation of ["truncate", "references", "trigger"])
        assert.equal(grant[operation], grant.role === "service_role");
    }
    for (const column of table.columns) {
      assert.equal(column.acl, null);
      assert.equal(Object.hasOwn(column, "default"), false);
      assert.ok(column.default_md5 === null || /^[a-f0-9]{32}$/.test(column.default_md5));
      for (const grant of column.effective_acl) {
        for (const operation of ["select", "insert", "update"])
          assert.equal(grant[operation], grant.role !== "anon");
        assert.equal(grant.references, grant.role === "service_role");
      }
    }
    assert.ok(table.constraints.every((constraint) => constraint.validated));
    assert.ok(table.indexes.every((index) => index.valid && index.ready));
    assert.ok(table.policies.every((policy) => policy.permissive));
    assert.ok(table.policies.every((policy) => policy.roles.join(",") === "authenticated"));
  }
  const [profiles, roles, userRoles] = observed.tables;
  const self = "((id = auth.uid()) OR (user_id = auth.uid()))";
  assert.deepEqual(
    profiles.policies.map(({ name, command, using, check }) => ({ name, command, using, check })),
    [
      { name: "sm_profiles_insert_self", command: "a", using: null, check: self },
      { name: "sm_profiles_select_self", command: "r", using: self, check: null },
      {
        name: "sm_profiles_select_shop",
        command: "r",
        using: "((shop_id = shop_manager.get_current_user_shop_id()) AND (shop_id IS NOT NULL))",
        check: null,
      },
      { name: "sm_profiles_update_self", command: "w", using: self, check: self },
    ],
  );
  const nonnullShop = "(shop_manager.get_current_user_shop_id() IS NOT NULL)";
  assert.deepEqual(roles.policies, [
    {
      name: "shop scoped access roles_select_all",
      command: "*",
      permissive: true,
      roles: ["authenticated"],
      using: nonnullShop,
      check: nonnullShop,
    },
  ]);
  const managed =
    "(shop_manager.is_owner_or_admin(auth.uid()) AND shop_manager.user_belongs_to_shop(user_id, shop_manager.get_current_user_shop_id()))";
  assert.deepEqual(userRoles.policies, [
    {
      name: "sm_user_roles_admin_manage",
      command: "*",
      permissive: true,
      roles: ["authenticated"],
      using: managed,
      check: managed,
    },
    {
      name: "sm_user_roles_select_self",
      command: "r",
      permissive: true,
      roles: ["authenticated"],
      using: "(user_id = auth.uid())",
      check: null,
    },
  ]);
  assert.deepEqual(
    profiles.constraints
      .filter((constraint) => constraint.type === "f")
      .map((constraint) => constraint.definition),
    ["FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL"],
  );
  assert.deepEqual(
    userRoles.constraints
      .filter((constraint) => constraint.type === "f")
      .map((constraint) => constraint.definition),
    ["FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE"],
  );
  // Absence is only for these selected outgoing constraints, not incoming FKs.
  assert.ok(
    !userRoles.constraints.some((constraint) =>
      /FOREIGN KEY \(role_id\)/.test(constraint.definition),
    ),
  );
});

test("three dated helpers retain selected headers, body/full fingerprints and hash-only protected values", () => {
  const expected = {
    get_current_user_shop_id: [
      "be63946995c909e4a224b0e4989eaaf7",
      "6049d4aebd36a1230288e6a2227e1071",
      "bf66f9ecf3b6815ba51aeba5ce26bb5a",
    ],
    is_owner_or_admin: [
      "869849c9428ef51ca5d9ac2fab605570",
      "2ffa08c10ab6bd41b1d47a9a2610d56a",
      "ffe40f4876d3799f10389d8cbece8c58",
    ],
    user_belongs_to_shop: [
      "ef1de965a932a522f9dd61a203338d17",
      "7786134c6646c4ade72c0107d4219236",
      "6d71c9591c43286265838d226ec92a86",
    ],
  };
  for (const fn of observed.functions) {
    assert.equal(fn.schema, "shop_manager");
    assert.equal(fn.owner, "postgres");
    assert.equal(fn.language, "sql");
    assert.equal(fn.volatility, "s");
    assert.equal(fn.security_definer, true);
    assert.equal(fn.strict, false);
    assert.equal(fn.leakproof, false);
    assert.equal(fn.parallel, "u");
    assert.equal(fn.cost, 100);
    assert.equal(fn.rows, 0);
    assert.equal(fn.returns_set, false);
    assert.equal(fn.argument_defaults_count, 0);
    assert.equal(fn.argument_defaults_md5, null);
    assert.equal(fn.anon_execute, true);
    assert.equal(fn.authenticated_execute, true);
    assert.equal(fn.service_execute, true);
    assert.equal(fn.anon_schema_usage, true);
    assert.equal(fn.authenticated_schema_usage, true);
    assert.equal(fn.service_schema_usage, true);
    assert.deepEqual(fn.config_keys, ["search_path"]);
    assert.equal(fn.config_md5, "8506a0911fb3ebfe6f35ed71d4100474");
    assert.deepEqual(fn.config_value_hashes, [
      { key: "search_path", value_md5: "db11771cee5fd39f92dfba5c83d713f3" },
    ]);
    assert.deepEqual(
      [fn.definition_md5, fn.body_md5_lf, fn.selected_header_md5],
      expected[fn.name],
    );
    for (const rawKey of [
      "body",
      "definition",
      "config",
      "config_values",
      "search_path",
      "argument_defaults",
    ])
      assert.equal(Object.hasOwn(fn, rawKey), false);
  }
});
