// MEMORY-ONLY selected existing-roster bridge on the unchanged full claim parent.
// Owner-session SQL and request GUCs are synthetic, not original-human/native
// authority. No Auth/profile/business substitute, uid replacement, backfill,
// invitation/owner/delegation/offboarding or client-policy positive is installed.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  withClaims,
  data as parentData,
  tables as parentTables,
  signatures as parentSignatures,
  expectedAttachments as parentAttachments,
  excludedBusinessAttachments,
  signup,
  asSettings,
  attempt,
  labSequenceState,
} from "./full-claim-evidence-fixture.mjs";
import {
  ddl,
  functions,
  observed,
  id,
  catalog as nativeCatalog,
} from "./native-staff-trigger-fixture.mjs";
import { sequenceCatalog } from "./bootstrap-core-structure-fixture.mjs";

const root = new URL("../../../", import.meta.url);
const sha = (value) => createHash("sha256").update(value).digest("hex");
const pins = Object.freeze({
  "scripts/ci/fixtures/full-claim-evidence-fixture.mjs":
    "28a7e0beba95e09667bbb55da18b6cc09914cc85979906a52320e1f339b667c2",
  "scripts/ci/full-claim-evidence-composition.test.mjs":
    "2269ff1f8097be9501499ced63b0dfbbfab1bcce03b4f2bd8e8860a911e95a17",
  "scripts/ci/fixtures/native-staff-trigger-fixture.mjs":
    "02e7e1511ccf94878b86c9604eb4d38844f19017f933da43de5f84b1b5ffbad3",
  "scripts/ci/native-staff-trigger-composition.test.mjs":
    "b4184f152de53a4100d1cbb8675918b5e862050ee6a873d0b49d3d4e274fde95",
});
function verifyPins() {
  for (const [path, expected] of Object.entries(pins)) {
    const value = fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
    assert.ok(Buffer.byteLength(value) > 0 && Buffer.byteLength(value) < 128 * 1024);
    assert.equal(sha(value), expected, path);
  }
}
verifyPins();

const publicAdded = Object.freeze(["business_staff", "chat_threads", "chat_thread_members"]);
const nativeAdded = Object.freeze([
  "profiles",
  "shops",
  "roles",
  "user_roles",
  "employee_work_locations",
  "employee_shifts",
  "cash_registers",
  "register_sessions",
]);
const relations = Object.freeze(
  [
    "auth.users",
    ...parentTables.map((name) => "public." + name),
    ...publicAdded.map((name) => "public." + name),
    ...nativeAdded.map((name) => "shop_manager." + name),
  ].sort(),
);
const signatures = Object.freeze(
  [
    ...parentSignatures,
    "public.is_business_owner(uuid,uuid)",
    "public.is_business_member(uuid,uuid)",
    "public.has_business_role(uuid,uuid,public.business_staff_role)",
    "public.set_updated_at()",
    "public.ensure_business_team_thread(uuid)",
    "public.trg_staff_sync_team_thread()",
    "shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)",
    "shop_manager.sync_business_staff_trigger()",
    "shop_manager.create_default_employee_work_location()",
  ].sort(),
);
const addedAttachments = Object.freeze([
  ["public", "business_staff", "trg_business_staff_updated"],
  ["public", "business_staff", "business_staff_team_thread_sync"],
  ["public", "business_staff", "sync_business_staff_to_shop_manager"],
  ["shop_manager", "shops", "shops_create_employee_work_location"],
]);
assert.equal(parentTables.length, 24);
assert.equal(parentSignatures.length, 44);
assert.equal(parentAttachments.length, 37);
assert.equal(excludedBusinessAttachments.length, 7);
assert.equal(relations.length, 36);
assert.equal(new Set(signatures).size, 53);

const limitations = Object.freeze([
  "Memory engine/full-parent composition, not native PG17 or current whole-schema parity.",
  "Existing Auth/profile/business/claim/evidence seeds use unchanged parent writers before the child baseline.",
  "SQL owner and request settings are synthetic; recovered provider uid is unchanged, not verified JWT/session/human authority.",
  "Seven excluded business INSERT/status/domain attachments stay excluded; existing teams/rosters are seeded before attachments.",
  "No client row policies are installed and no successful ordinary-role writer or native authorization is asserted.",
  "Source grants in retained DDL and five saved function ACL restrictions are retained; other native effective ACL/RLS parity is not inferred.",
  "No invite/delegation/owner provisioning/offboarding/multiple-roster/global-writer/concurrent/storage/recovery/release acceptance.",
  "Natural invited_by FK failure occurs in chat after roster/timestamp, before native effects; no invented native role_id or profile shop_id FK.",
]);

async function settings(db) {
  return (
    await db.query(`SELECT current_user AS actor,session_user AS session,
      current_setting('role') AS role,current_setting('search_path') AS path,
      current_setting('statement_timeout') AS statement_timeout,
      current_setting('lock_timeout') AS lock_timeout,
      current_setting('request.jwt.claim.sub',true) AS subject,
      current_setting('request.jwt.claims',true) AS claims`)
  ).rows[0];
}
async function catalog(db) {
  const path = (await db.query("SELECT current_setting('search_path') path")).rows[0].path;
  await db.exec("SET LOCAL search_path=pg_catalog,pg_temp");
  try {
    const value = await nativeCatalog(db);
    value.enums = (
      await db.query(`SELECT n.nspname AS schema,t.typname AS name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
        FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
        JOIN pg_enum e ON e.enumtypid=t.oid
        WHERE n.nspname IN ('auth','public','shop_manager')
        GROUP BY n.nspname,t.typname ORDER BY 1,2`)
    ).rows;
    value.columnAcls = (
      await db.query(`SELECT n.nspname,c.relname,a.attname,a.attacl::text AS acl
        FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('auth','public','shop_manager') AND c.relkind='r'
        AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1,2,a.attnum`)
    ).rows;
    value.roleDetails = (
      await db.query(`SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,
        rolcanlogin,rolbypassrls,rolconfig FROM pg_roles
        ORDER BY rolname`)
    ).rows;
    value.defaults = (
      await db.query(`SELECT r.rolname,n.nspname,d.defaclobjtype,d.defaclacl::text AS acl
        FROM pg_default_acl d JOIN pg_roles r ON r.oid=d.defaclrole
        LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
        ORDER BY 1,2,3`)
    ).rows;
    value.sequence = await sequenceCatalog(db);
    return value;
  } finally {
    await db.query("SELECT set_config('search_path',$1,true)", [path]);
  }
}
function projectParent(value) {
  const oldRelations = new Set(["auth.users", ...parentTables.map((name) => "public." + name)]);
  const addedRelations = new Set([
    ...publicAdded.map((name) => "public." + name),
    ...nativeAdded.map((name) => "shop_manager." + name),
  ]);
  const relation = (row) => row.nspname + "." + row.relname;
  const oldFunctions = new Set(parentSignatures);
  return Object.fromEntries(
    Object.entries(value).map(([facet, rows]) => [
      facet,
      facet === "tables"
        ? rows.filter((row) => !addedRelations.has(relation(row)))
        : ["columns", "constraints", "columnAcls"].includes(facet)
          ? rows.filter((row) => oldRelations.has(relation(row)))
          : facet === "indexes"
            ? rows.filter((row) => oldRelations.has(row.schemaname + "." + row.tablename))
            : facet === "triggers"
              ? rows.filter((row) => oldRelations.has(relation(row)))
              : facet === "policies"
                ? rows.filter((row) => oldRelations.has(row.schemaname + "." + row.tablename))
                : facet === "functions"
                  ? rows.filter((row) => oldFunctions.has(row.signature))
                  : facet === "schemas"
                    ? rows.filter((row) => row.nspname !== "shop_manager")
                    : facet === "enums"
                      ? rows.filter(
                          (row) =>
                            row.schema !== "shop_manager" && row.name !== "business_staff_role",
                        )
                      : rows,
    ]),
  );
}
async function data(db) {
  const value = await parentData(db);
  for (const name of [
    ...publicAdded.map((table) => "public." + table),
    ...nativeAdded.map((table) => "shop_manager." + table),
  ]) {
    value[name] = (
      await db.query("SELECT to_jsonb(t) row FROM " + name + " t ORDER BY to_jsonb(t)::text")
    ).rows.map((row) => row.row);
  }
  return value;
}
async function snapshot(db) {
  return {
    catalog: await catalog(db),
    data: await data(db),
    sequence: await labSequenceState(db),
    settings: await settings(db),
  };
}
async function verifyFunctionObservations(db) {
  for (const saved of observed.functions) {
    const signature = saved.signature.includes(".") ? saved.signature : "public." + saved.signature;
    const current = (
      await db.query(
        `SELECT pg_get_userbyid(p.proowner) owner,l.lanname language,
        p.prosecdef security_definer,p.provolatile volatility,p.proconfig config,
        p.proacl::text acl,md5(pg_get_functiondef(p.oid)) definition_md5,
        md5(replace(p.prosrc,chr(13),'')) body_md5_lf,
        has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
        has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,
        has_function_privilege('service_role',p.oid,'EXECUTE') service_execute
        FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=$1::regprocedure`,
        [signature],
      )
    ).rows[0];
    const { observed_at_utc, signature: observedSignature, ...expected } = saved;
    assert.ok(observed_at_utc && observedSignature);
    assert.deepEqual(current, expected, "five selected dated native function envelopes only");
  }
}
async function install(db) {
  assert.equal(
    (await db.query("SELECT to_regnamespace('shop_manager') value")).rows[0].value,
    null,
  );
  await db.exec("CREATE SCHEMA shop_manager");
  for (const sql of [
    ddl.staffEnum,
    ddl.assistant,
    ddl.roster,
    ddl.enum,
    ddl.profiles,
    ddl.shops,
    ddl.userRoles,
    ddl.roles,
    ddl.authFk,
    ddl.roleAuthFk,
    ddl.link,
    ddl.unique,
    ddl.chat,
    ddl.chatScope,
    ddl.locations,
    ddl.defaultLocation,
    ddl.shifts,
    ddl.registers,
    ddl.sessions,
    ...Object.values(functions),
  ]) {
    await db.exec(sql);
  }
  // Exact five dated restricted envelopes from the unchanged native fixture.
  // No schema access, native table privilege or permissive policy is added.
  for (const saved of observed.functions) {
    const signature = saved.signature.includes(".") ? saved.signature : "public." + saved.signature;
    assert.match(signature, /^(public|shop_manager)\.[a-z_]+\([a-z,]*\)$/);
    await db.exec(
      "REVOKE ALL ON FUNCTION " +
        signature +
        " FROM PUBLIC,anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION " +
        signature +
        " TO service_role",
    );
  }
  await verifyFunctionObservations(db);
}
const claimId = "60000000-0000-4000-8000-000000000001";
const evidenceId = "70000000-0000-4000-8000-000000000001";
async function seedParent(db) {
  for (const [user, label] of [
    [id.actor, "actor"],
    [id.ownerA, "owner-a"],
    [id.ownerB, "owner-b"],
    [id.stranger, "stranger"],
  ]) {
    await signup(db, {
      user,
      email: "synthetic-native-bridge-" + label + "@example.invalid",
      metadata: { signup_intent: "buyer", full_name: "Synthetic Bridge " + label },
    });
  }
  await db.exec(
    "INSERT INTO public.business_types(slug,label) VALUES('bridge-fixture','Synthetic Bridge')",
  );
  await db.query(
    "INSERT INTO public.businesses(id,slug,name,type_slug,owner_id) VALUES($1,'synthetic-bridge-a','Synthetic A','bridge-fixture',$2),($3,'synthetic-bridge-b','Synthetic B','bridge-fixture',$4)",
    [id.businessA, id.ownerA, id.businessB, id.ownerB],
  );
  await db.query(
    "INSERT INTO public.business_claim_requests(id,business_id,claimant_user_id,contact_method) VALUES($1,$2,$3,'document')",
    [claimId, id.businessA, id.actor],
  );
  await db.query(
    "INSERT INTO public.business_claim_evidence(id,claim_id,uploader_user_id,evidence_type,file_name,file_size,mime_type,storage_path) VALUES($1,$2,$3,'other','synthetic.txt',12,'text/plain','lab/not-an-object')",
    [evidenceId, claimId, id.actor],
  );
}
async function seedBridge(db) {
  await db.query(
    "INSERT INTO shop_manager.shops(id,name,organization_id,business_id) VALUES($1,'Synthetic Shop A',$2,$2),($3,'Synthetic Shop B',$4,$4)",
    [id.shopA, id.businessA, id.shopB, id.businessB],
  );
  await db.exec(
    "INSERT INTO shop_manager.roles(name) VALUES('owner'),('manager'),('dispatch'),('truck_driver'),('technician'),('office_admin'),('other_staff')",
  );
  await db.query(
    "INSERT INTO shop_manager.profiles(id,user_id,email,shop_id,first_name,last_name,has_auth_account) SELECT $1,id,email,$3,'Legacy','Fixture',true FROM auth.users WHERE id=$2",
    [id.legacy, id.actor, id.shopB],
  );
  await db.query(
    "INSERT INTO shop_manager.user_roles(user_id,role_id) SELECT $1,id FROM shop_manager.roles WHERE name='truck_driver'",
    [id.actor],
  );
  await db.query(
    "INSERT INTO public.business_staff(id,business_id,user_id,role,title,updated_at) VALUES($1,$2,$3,'driver','Existing fixture title','2000-01-01Z')",
    [id.staffA, id.businessA, id.actor],
  );
  await db.query(
    "INSERT INTO public.chat_threads(id,title,created_by,business_id,kind) VALUES($1,'A existing team',$2,$3,'team'),($4,'B existing team',$5,$6,'team')",
    [id.threadA, id.ownerA, id.businessA, id.threadB, id.ownerB, id.businessB],
  );
  await db.query(
    "INSERT INTO public.chat_thread_members(thread_id,user_id,status) VALUES($1,$2,'active'),($3,$4,'active'),($1,$5,'left')",
    [id.threadA, id.ownerA, id.threadB, id.ownerB, id.actor],
  );
  for (const sql of [ddl.timestampAttach, ddl.chatAttach, ddl.nativeAttach]) await db.exec(sql);
}
async function withBridge(run) {
  verifyPins();
  return withClaims(async (db, parentGuard) => {
    await parentGuard();
    // Establish explicit synthetic empty request settings before the baseline.
    // PostgreSQL custom-GUC placeholders can survive savepoint rollback as an
    // empty string; no unset->empty transition is disguised as exact restoration.
    await db.query(
      "SELECT set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','',true)",
    );
    // These existing-record seeds use the full original Auth/business/claim
    // writers. Signup's nontransactional member sequence allocation is NOT
    // claimed reversible; it precedes the child baseline, and is never reset.
    await seedParent(db);
    await parentGuard();
    const parent = await catalog(db),
      originalRows = await parentData(db),
      originalSequence = await labSequenceState(db),
      originalSettings = await settings(db);
    await db.exec("SAVEPOINT full_native_staff_bridge");
    try {
      await install(db);
      await seedBridge(db);
      const expected = await catalog(db);
      function shape(value) {
        assert.deepEqual(
          projectParent(value),
          parent,
          "every full parent structural/provider/ACL facet retained",
        );
        assert.deepEqual(
          value.tables
            .filter((row) => row.relname !== "profiles_member_number_seq")
            .map((row) => row.nspname + "." + row.relname)
            .sort(),
          relations,
          "exact full Auth/27 public/8 native table allowlist",
        );
        assert.deepEqual(
          value.functions.map((row) => row.signature).sort(),
          signatures,
          "exact 53 function allowlist",
        );
        assert.deepEqual(value.policies, [], "no client-policy authority manufactured");
        assert.equal(value.triggers.length, parentAttachments.length + addedAttachments.length);
        for (const [schema, table, name] of addedAttachments) {
          assert.equal(
            value.triggers.filter(
              (row) =>
                row.nspname === schema &&
                row.relname === table &&
                row.tgname === name &&
                row.tgenabled === "O",
            ).length,
            1,
          );
        }
        const addedEnums = value.enums.filter(
          (row) => row.schema === "shop_manager" || row.name === "business_staff_role",
        );
        assert.deepEqual(
          addedEnums.map((row) => row.schema + "." + row.name),
          ["public.business_staff_role", "shop_manager.app_role"],
        );
        assert.deepEqual(addedEnums[0].labels, [
          "owner",
          "manager",
          "assistant_manager",
          "dispatcher",
          "driver",
          "mechanic",
          "clerk",
        ]);
      }
      async function guard() {
        const current = await catalog(db);
        shape(current);
        assert.deepEqual(
          current,
          expected,
          "exact child definitions/constraints/defaults/ACLs/attachments/settings controls",
        );
        assert.deepEqual(
          await labSequenceState(db),
          originalSequence,
          "no member allocation by bridge",
        );
        assert.deepEqual(
          await settings(db),
          originalSettings,
          "caller and operational settings unchanged",
        );
        assert.deepEqual(
          await parentData(db),
          originalRows,
          "all full Auth/platform staff/claim/evidence data unchanged",
        );
      }
      await guard();
      const result = await run(db, guard);
      await guard();
      return result;
    } finally {
      await db.exec(
        "ROLLBACK TO SAVEPOINT full_native_staff_bridge;RELEASE SAVEPOINT full_native_staff_bridge",
      );
      await parentGuard();
      assert.deepEqual(
        await catalog(db),
        parent,
        "original full parent catalog restored after child rollback",
      );
      assert.deepEqual(await parentData(db), originalRows, "original seeded parent data restored");
      assert.deepEqual(
        await labSequenceState(db),
        originalSequence,
        "member sequence value/is_called preserved without reset",
      );
      assert.deepEqual(await settings(db), originalSettings, "original caller/settings restored");
    }
  });
}
async function isolated(db, run) {
  await db.exec("SAVEPOINT bridge_case");
  try {
    return await run();
  } finally {
    await db.exec("ROLLBACK TO SAVEPOINT bridge_case;RELEASE SAVEPOINT bridge_case");
  }
}
export {
  withBridge,
  catalog,
  data,
  snapshot,
  settings,
  isolated,
  asSettings,
  attempt,
  id,
  ddl,
  functions,
  signatures,
  relations,
  addedAttachments,
  limitations,
  pins,
  verifyPins,
  labSequenceState,
};
