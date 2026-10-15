import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const query = fs
  .readFileSync(new URL("./claim-evidence-catalog-review.sql", import.meta.url), "utf8")
  .replaceAll("\r\n", "\n");
test("claim evidence metadata diagnostic is bounded READ ONLY with no application/storage data or helper calls", () => {
  assert.ok(Buffer.byteLength(query) > 0 && Buffer.byteLength(query) < 16 * 1024);
  assert.match(query, /BEGIN READ ONLY;/);
  assert.match(query, /SET LOCAL statement_timeout='5000ms';/);
  assert.match(query, /SET LOCAL lock_timeout='1000ms';/);
  assert.match(query, /SET LOCAL search_path=pg_catalog,pg_temp;/);
  assert.match(query, /ROLLBACK;\s*$/);
  const surface = query.replace(/--[^\n]*/g, "").replace(/'(?:''|[^'])*'/g, "''");
  assert.doesNotMatch(
    surface,
    /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|EXECUTE|COPY|CALL|COMMIT)\b/i,
  );
  assert.doesNotMatch(surface, /\b(?:FROM|JOIN)\s+(?:public|auth|storage|shop_manager)\./i);
  assert.doesNotMatch(surface, /\b(?:public|auth|storage|shop_manager)\.[a-z_]+\s*\(/i);
  assert.doesNotMatch(
    query,
    /pg_read_file|pg_ls_dir|lo_import|query_to_xml|dblink|nextval|currval|setval|last_value|is_called/,
  );
  assert.match(
    query,
    /\('business_claim_requests','business_claim_audit','business_claim_evidence'\)/,
  );
  assert.equal(query.split("BEGIN READ ONLY;").length, 2);
  assert.equal(query.split("ROLLBACK;").length, 2);
  // Definitions/expressions/config/arguments are only hashed, never returned raw.
  assert.doesNotMatch(query, /AS\s+(?:definition|body|config|arguments)\b/i);
  for (const fn of [
    "pg_get_expr",
    "pg_get_constraintdef",
    "pg_get_indexdef",
    "pg_get_function_arguments",
    "pg_get_triggerdef",
  ])
    for (const match of query.matchAll(new RegExp("pg_catalog\\." + fn + "\\(", "g")))
      assert.equal(
        query.slice(match.index - 15, match.index),
        "pg_catalog.md5(",
        fn + " fingerprint only",
      );
});
