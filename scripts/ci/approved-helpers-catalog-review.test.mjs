// OFFLINE ONLY: one always-closed memory PGlite database and synthetic metadata.
// Dummy routines/history are NOT retained production definitions or applied history.
// This checks query syntax, selection and hash-only projection, not helper behavior,
// approval, production parity, migrations, HTTP/JWT, writer closure or recovery.
// No credentials, environment input, persistent database, network or live executor.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const sql = fs
  .readFileSync(
    new URL("../../docs/evidence/approved-helpers-catalog-review.sql", import.meta.url),
    "utf8",
  )
  .replace(/\r\n/g, "\n");
const code = sql.replace(/--[^\n]*/g, "").replace(/'(?:''|[^'])*'/g, "''");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const md5 = (value) => createHash("md5").update(value).digest("hex");
const lf = (value) => value.replace(/\r\n/g, "\n");
const helperNames = [
  "ensure_profile_for",
  "calculate_work_order_totals",
  "convert_work_order_to_invoice",
  "convert_quote_to_work_order",
];
const historyNames = [
  "contain_legacy_profile_bootstrap_execute",
  "contain_legacy_work_order_totals_execute",
  "contain_legacy_invoice_conversion_execute",
];
const roleNames = ["anon", "authenticated", "postgres", "service_role"];
const bodySecret = "SYNTHETIC_BODY_VALUE_MUST_NOT_BE_RETURNED_OR_CALLED";
const configSecret = "SYNTHETIC_CONFIG_VALUE_MUST_NOT_BE_RETURNED";
const defaultSecret = "SYNTHETIC_DEFAULT_VALUE_MUST_NOT_BE_RETURNED";
const unrelatedName = "unrelated_catalog_helper";
const unrelatedHistory = "unrelated_history_name_must_not_be_returned";
const configKey = "motorsales365.synthetic_catalog_secret";
const dummyBody = `\nBEGIN\n  RAISE EXCEPTION '${bodySecret}';\nEND\n`;
const historyFixtures = [
  {
    version: "00000000000001",
    name: historyNames[0],
    statements: ["-- SYNTHETIC_PRIVATE_HISTORY_ONE\r\nSELECT 1;\r\n", " SELECT 2;\r\n"],
  },
  { version: "00000000000002", name: historyNames[0], statements: null },
  {
    version: "00000000000003",
    name: historyNames[1],
    statements: [null, "-- SYNTHETIC_PRIVATE_HISTORY_TWO €\r\nSELECT 3;\r\n", ""],
  },
  { version: "00000000000004", name: historyNames[2], statements: [] },
];

test("approved helper metadata query retains the independently reviewed exact LF bytes", () => {
  assert.equal(Buffer.byteLength(sql), 10504);
  assert.equal(sha(sql), "cf43f4db6719fa9ecf1e787349710203c82cb80f6a75df2e702795186879bf7a");
  assert.ok(sql.endsWith("\n"));
  assert.match(sql, /Exactly four routine identities and three migration-history names/);
  assert.match(sql, /NOT an approved change/);
  assert.match(sql, /separate migration-tool connection's execution context/);
  assert.match(sql, /this SELECT does not configure\/enforce them/);
  assert.match(sql, /History hashes normalize CRLF to LF ONLY/);
  assert.match(sql, /selected header MD5 includes catalog OIDs/);
});

test("requested helper, role and migration-name allowlists are exact and do not widen by pattern", () => {
  assert.deepEqual(
    [...sql.matchAll(/'shop_manager\.([a-z_]+)\(pg_catalog\.uuid\)'::pg_catalog\.text/g)].map(
      (match) => match[1],
    ),
    helperNames,
  );
  assert.deepEqual(
    [...sql.matchAll(/'((?:contain_legacy_)[a-z_]+)'::pg_catalog\.text/g)].map((match) => match[1]),
    historyNames,
  );
  assert.deepEqual(
    [...sql.matchAll(/'((?:anon|authenticated|postgres|service_role))'::pg_catalog\.text/g)].map(
      (match) => match[1],
    ),
    roleNames,
  );
  assert.match(sql, /p\.oid=pg_catalog\.to_regprocedure\(h\.requested_signature\)/);
  assert.match(sql, /WHERE m\.name IN \(SELECT h\.migration_name FROM requested_history AS h\)/);
  assert.doesNotMatch(code, /\b(?:LIKE|ILIKE|SIMILAR|EXECUTE)\b/i);
});

test("single SELECT uses only allowlisted catalog builtins and selected migration metadata", () => {
  assert.match(code.trimStart(), /^WITH\b/);
  assert.equal((code.match(/;/g) || []).length, 1);
  assert.doesNotMatch(
    code,
    /\b(?:INSERT|UPDATE|DELETE|MERGE|CALL|DO|COPY|ALTER|CREATE|DROP|GRANT|REVOKE|SET|BEGIN|COMMIT|ROLLBACK|INTO)\b/i,
  );
  assert.doesNotMatch(code, /\b(?:public|auth|shop_manager)\./);
  const relationAllowlist = new Set([
    "requested_helpers",
    "requested_roles",
    "selected_roles",
    "requested_history",
    "selected_history",
    "pg_catalog.pg_roles",
    "pg_catalog.pg_namespace",
    "pg_catalog.pg_proc",
    "pg_catalog.pg_language",
    "pg_catalog.unnest",
    "pg_catalog.aclexplode",
    "supabase_migrations.schema_migrations",
  ]);
  for (const match of code.matchAll(/\b(?:FROM|JOIN)\s+([\w.]+)/gi))
    assert.ok(relationAllowlist.has(match[1]), match[1]);
  const functionAllowlist = new Set([
    "acldefault",
    "aclexplode",
    "array_to_string",
    "cardinality",
    "chr",
    "clock_timestamp",
    "convert_to",
    "count",
    "current_database",
    "current_schemas",
    "current_setting",
    "encode",
    "format_type",
    "has_function_privilege",
    "has_schema_privilege",
    "jsonb_agg",
    "jsonb_build_object",
    "md5",
    "octet_length",
    "pg_get_expr",
    "pg_get_function_identity_arguments",
    "pg_get_function_result",
    "pg_get_functiondef",
    "pg_get_userbyid",
    "pg_my_temp_schema",
    "replace",
    "sha256",
    "split_part",
    "strpos",
    "substr",
    "to_regprocedure",
    "unnest",
  ]);
  for (const match of code.matchAll(/\bpg_catalog\.([a-z_][a-z_0-9]*)\s*\(/g))
    assert.ok(functionAllowlist.has(match[1]), match[1]);
});

test("function bodies/config/defaults and stored history statements have hash-only projections", () => {
  for (const key of [
    "body",
    "definition",
    "config",
    "config_values",
    "prosrc",
    "proconfig",
    "statements",
  ])
    assert.ok(!sql.includes(`'${key}',`), key);
  assert.match(sql, /'value_md5',pg_catalog\.md5\(pg_catalog\.substr\(s\.setting,/);
  assert.match(sql, /'config_md5',pg_catalog\.md5\(p\.proconfig::pg_catalog\.text\)/);
  assert.match(
    sql,
    /'argument_defaults_md5',pg_catalog\.md5\(pg_catalog\.pg_get_expr\(p\.proargdefaults,0\)\)/,
  );
  assert.match(
    sql,
    /'body_md5_lf',pg_catalog\.md5\(pg_catalog\.replace\(p\.prosrc,pg_catalog\.chr\(13\),''\)\)/,
  );
  assert.match(sql, /pg_catalog\.encode\(pg_catalog\.sha256\(pg_catalog\.convert_to\(/);
  assert.match(sql, /pg_catalog\.array_to_string\(m\.statements,E'\\n'\)/);
  assert.match(sql, /FROM pg_catalog\.unnest\(m\.statements\) WITH ORDINALITY/);
});

async function readSnapshot(db) {
  await db.exec(`BEGIN READ ONLY;
    SET LOCAL statement_timeout='3000ms';
    SET LOCAL lock_timeout='1000ms';
    SET LOCAL search_path=pg_catalog,pg_temp;`);
  try {
    const result = await db.query(sql);
    assert.equal(result.rows.length, 1);
    await db.exec("COMMIT;");
    return result.rows[0];
  } catch (error) {
    await db.exec("ROLLBACK;");
    throw error;
  }
}

test(
  "one synthetic memory database exercises empty and seeded query scope without invoking helpers",
  { concurrency: false, timeout: 20_000 },
  async (t) => {
    const db = new PGlite();
    try {
      await db.exec(`
      CREATE ROLE anon NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
      CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
      CREATE ROLE service_role NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
      CREATE SCHEMA shop_manager;
      CREATE SCHEMA supabase_migrations;
      CREATE TABLE supabase_migrations.schema_migrations(
        version text PRIMARY KEY,name text,statements text[]
      );
      GRANT USAGE ON SCHEMA shop_manager TO anon,authenticated,service_role;
    `);

      await t.test(
        "empty exact targets and history names remain explicit rather than becoming success evidence",
        async () => {
          const empty = await readSnapshot(db);
          assert.equal(empty.project_ref, "wjxaajgvddtrxxtocxen");
          assert.deepEqual(
            empty.roles,
            roleNames.map((role) => ({ role, found: true })),
          );
          assert.equal(empty.execution_context.current_user, "postgres");
          assert.equal(empty.execution_context.session_user, "postgres");
          assert.equal(empty.execution_context.transaction_read_only, "on");
          assert.equal(empty.execution_context.search_path, "pg_catalog, pg_temp");
          assert.equal(empty.execution_context.statement_timeout, "3s");
          assert.equal(empty.execution_context.lock_timeout, "1s");
          assert.deepEqual(empty.execution_context.effective_search_schemas, ["pg_catalog"]);
          assert.equal(empty.functions.length, 4);
          for (const [index, fn] of empty.functions.entries()) {
            assert.equal(
              fn.requested_signature,
              `shop_manager.${helperNames[index]}(pg_catalog.uuid)`,
            );
            assert.equal(fn.found, false);
            for (const key of ["name", "owner", "definition_md5", "normalized_acl", "body_md5_lf"])
              assert.equal(fn[key], null, key);
            assert.ok(fn.effective_acl.every((role) => role.role_found && role.execute === null));
          }
          assert.deepEqual(
            empty.migration_history,
            historyNames.map((requested_name) => ({ requested_name, row_count: 0, rows: [] })),
          );
        },
      );

      const returnTypes = ["uuid", "numeric", "text", "uuid"];
      for (const [index, name] of helperNames.entries()) {
        const defaultExpression =
          index === 0 ? ` DEFAULT (pg_catalog.md5('${defaultSecret}')::pg_catalog.uuid)` : "";
        await db.exec(`CREATE FUNCTION shop_manager.${name}(_id uuid${defaultExpression})
        RETURNS ${returnTypes[index]} LANGUAGE plpgsql SECURITY DEFINER
        SET ${configKey}='${configSecret}' AS $fixture_body$${dummyBody}$fixture_body$;
        GRANT EXECUTE ON FUNCTION shop_manager.${name}(uuid) TO service_role;`);
      }
      await db.exec(`
      GRANT EXECUTE ON FUNCTION shop_manager.ensure_profile_for(uuid) TO authenticated;
      REVOKE EXECUTE ON FUNCTION shop_manager.convert_work_order_to_invoice(uuid) FROM PUBLIC,anon,authenticated RESTRICT;
      CREATE FUNCTION shop_manager.${unrelatedName}() RETURNS void LANGUAGE plpgsql AS $fixture_body$${dummyBody}$fixture_body$;
    `);
      for (const row of historyFixtures)
        await db.query("INSERT INTO supabase_migrations.schema_migrations VALUES($1,$2,$3)", [
          row.version,
          row.name,
          row.statements,
        ]);
      await db.query("INSERT INTO supabase_migrations.schema_migrations VALUES($1,$2,$3)", [
        "00000000000005",
        unrelatedHistory,
        ["SYNTHETIC_UNRELATED_HISTORY_SECRET"],
      ]);
      const seeded = await readSnapshot(db);

      await t.test(
        "exact dummy metadata/ACLs are returned but bodies, default/config values and outside targets are not",
        () => {
          assert.deepEqual(
            seeded.functions.map((fn) => fn.name),
            helperNames,
          );
          assert.ok(
            seeded.functions.every(
              (fn) => fn.found && fn.owner === "postgres" && fn.security_definer,
            ),
          );
          for (const [index, fn] of seeded.functions.entries()) {
            assert.equal(fn.kind, "f");
            assert.equal(fn.return_type, returnTypes[index]);
            assert.equal(fn.body_md5_lf, md5(dummyBody));
            for (const key of ["definition_md5", "selected_header_md5", "config_md5"])
              assert.match(fn[key], /^[a-f0-9]{32}$/, key);
            assert.deepEqual(fn.config_keys, [configKey]);
            assert.deepEqual(fn.config_value_hashes, [
              { key: configKey, value_md5: md5(configSecret) },
            ]);
            assert.match(fn.acl, /postgres=X\/postgres/);
            assert.match(fn.acl, /service_role=X\/postgres/);
            const restricted = fn.name === "convert_work_order_to_invoice";
            assert.deepEqual(
              fn.effective_acl.map((entry) => [entry.role, entry.execute, entry.schema_usage]),
              roleNames.map((role) => [
                role,
                !restricted || role === "postgres" || role === "service_role",
                true,
              ]),
            );
            const expectedAcl = restricted
              ? ["postgres/postgres/EXECUTE/false", "service_role/postgres/EXECUTE/false"]
              : [
                  "PUBLIC/postgres/EXECUTE/false",
                  ...(index === 0 ? ["authenticated/postgres/EXECUTE/false"] : []),
                  "postgres/postgres/EXECUTE/false",
                  "service_role/postgres/EXECUTE/false",
                ];
            assert.deepEqual(fn.normalized_acl, expectedAcl);
          }
          assert.equal(seeded.functions[0].argument_defaults_count, 1);
          assert.match(seeded.functions[0].argument_defaults_md5, /^[a-f0-9]{32}$/);
          const rendered = JSON.stringify(seeded);
          for (const marker of [
            bodySecret,
            configSecret,
            defaultSecret,
            unrelatedName,
            unrelatedHistory,
            "SYNTHETIC_UNRELATED_HISTORY_SECRET",
            "SYNTHETIC_PRIVATE_HISTORY_ONE",
            "SYNTHETIC_PRIVATE_HISTORY_TWO",
          ])
            assert.ok(!rendered.includes(marker), marker);
        },
      );

      await t.test(
        "selected history reports duplicate names/null elements/empty arrays and independently computed exact LF hashes",
        () => {
          assert.deepEqual(
            seeded.migration_history.map((row) => row.requested_name),
            historyNames,
          );
          for (const group of seeded.migration_history) {
            const expected = historyFixtures.filter((row) => row.name === group.requested_name);
            assert.equal(group.row_count, expected.length);
            assert.equal(group.rows.length, expected.length);
            for (const [index, row] of group.rows.entries()) {
              const source = expected[index];
              const combined =
                source.statements === null
                  ? null
                  : lf(source.statements.filter((statement) => statement !== null).join("\n"));
              assert.equal(row.version, source.version);
              assert.equal(row.name, source.name);
              assert.equal(row.statements_array_is_null, source.statements === null);
              assert.equal(row.statement_count, source.statements?.length ?? null);
              assert.equal(
                row.source_bytes_lf,
                combined === null ? null : Buffer.byteLength(combined),
              );
              assert.equal(row.sql_sha256_lf, combined === null ? null : sha(combined));
              assert.deepEqual(
                row.statement_metadata,
                (source.statements ?? []).map((statement, position) => ({
                  position: position + 1,
                  is_null: statement === null,
                  source_bytes_lf: statement === null ? null : Buffer.byteLength(lf(statement)),
                  sql_sha256_lf: statement === null ? null : sha(lf(statement)),
                })),
              );
            }
          }
        },
      );
    } finally {
      await db.close();
    }
  },
);
