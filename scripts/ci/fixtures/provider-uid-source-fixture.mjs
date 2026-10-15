// Actual provider function SOURCE only, replayed in disposable databases.
// Role names/ACL reproduced; role flags/schema grants are explicit lab supports.
// GUC values are synthetic and NOT verified JWT/session/original-actor evidence.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const root = new URL("../../../", import.meta.url);
const sha = (s) => createHash("sha256").update(s).digest("hex");
function read(path, hash, max = 64 * 1024) {
  const raw = fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
  assert.ok(Buffer.byteLength(raw) > 0 && Buffer.byteLength(raw) < max);
  assert.equal(sha(raw), hash, path);
  return raw;
}
const query = read(
  "scripts/ci/provider-uid-source-review.sql",
  "71240a5a9e868594fc2315ccda98427a3761f2bfe2fdf794fdfb9d4dd0a5d8bc",
);
const observed = JSON.parse(
  read(
    "docs/evidence/provider-uid-source-2026-10-15.json",
    "033c55a27276b1a066099613a56745e74a8b208d9d93dee8812c43640adad9fc",
  ),
);
const prior = JSON.parse(
  read(
    "docs/evidence/referral-financial-catalog-2026-10-15.json",
    "deba693bf365e7811c20b520116a9f4f84d0eb6622f1b3e597dbb70dd4f09763",
  ),
);
assert.equal(observed.functions.length, 1);
const selected = observed.functions[0],
  expected = prior.functions.find((f) => f.signature === "auth.uid()");
assert.equal(selected.permitted, true);
assert.deepEqual(selected.envelope, expected);
const definition = selected.definition;
const md5 = (s) => createHash("md5").update(s).digest("hex");
assert.equal(md5(definition), expected.definitionMd5);
assert.equal(Buffer.byteLength(definition), expected.definitionBytes);
assert.equal(definition.split("$function$").length, 3);
assert.equal(md5(definition.split("$function$")[1]), expected.bodyMd5Lf);
const fragment = query.slice(
  query.indexOf("WITH expected("),
  query.indexOf(") source;") + ") source;".length,
);
async function catalog(db) {
  const before = (await db.query("SELECT current_setting('search_path') path")).rows[0].path;
  await db.query("SELECT set_config('search_path','pg_catalog,pg_temp',false)");
  try {
    return (await db.query(fragment)).rows[0].source;
  } finally {
    await db.query("SELECT set_config('search_path',$1,false)", [before]);
  }
}
async function assertEnvelope(db) {
  const c = await catalog(db);
  assert.equal(c.functions.length, 1);
  assert.deepEqual(c.functions[0], selected, "exact actual provider uid source/full envelope/ACL");
}
async function install(db) {
  for (const role of ["supabase_auth_admin", "dashboard_user"]) {
    const found = (await db.query("SELECT to_regrole($1) value", [role])).rows[0].value;
    assert.equal(found, null, "only fresh lab role names, no altering existing roles");
    await db.exec("CREATE ROLE " + role + " NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT");
  }
  await db.exec("CREATE SCHEMA IF NOT EXISTS auth");
  // Synthetic lab schema access, not a recovered production schema grant.
  await db.exec(
    "GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role,dashboard_user,supabase_auth_admin",
  );
  await db.exec(definition);
  await db.exec(
    "ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;GRANT EXECUTE ON FUNCTION auth.uid() TO dashboard_user",
  );
  await assertEnvelope(db);
}
async function withUid(run) {
  const db = new PGlite();
  try {
    await db.exec(
      "CREATE ROLE anon NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;CREATE ROLE service_role NOLOGIN NOSUPERUSER BYPASSRLS NOINHERIT",
    );
    await install(db);
    const result = await run(db);
    await assertEnvelope(db);
    return result;
  } finally {
    await db.close();
  }
}
export {
  query,
  observed,
  expected,
  definition,
  fragment,
  catalog,
  assertEnvelope,
  install,
  withUid,
};
