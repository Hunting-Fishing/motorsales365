// MEMORY-ONLY extension of the unchanged PR45 claim/guard/audit fixture.
// Five retained intent functions execute unchanged; no history replay/backfill,
// live client, environment/credentials, persistent database, repair or migration.
// This is the owner-definer forward chain, NOT client-policy or full writer parity.
// public.profiles is an explicit SIX-COLUMN source-definition projection. The
// admin-audit table uses its full retained twelve-column DDL. Both added tables
// retain observed RLS/ACLs but use SYNTHETIC deny-all client policies: no has_role,
// sales/support helper, public-role schema widening or INSERT-profile fanout.
// Business/auth/public-role supports remain the reduced synthetic PR45 supports.
// The dated catalogs are separate observations, NOT one atomic live snapshot.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  withFixture as withClaimFixture,
  actor,
  snapshot as claimSnapshot,
  id,
  pins as claimPins,
  observed as claimObserved,
} from "./native-ownership-claim-fixture.mjs";

const root = new URL("../../../", import.meta.url);
const sha = (text) => createHash("sha256").update(text).digest("hex");
const md5 = (text) => createHash("md5").update(text).digest("hex");
function readPinned(path, expected, max = 512 * 1024) {
  const bytes = fs.readFileSync(new URL(path, root));
  assert.ok(bytes.length > 0 && bytes.length <= max, `${path}: bounded local bytes`);
  const text = bytes.toString("utf8");
  assert.ok(Buffer.from(text, "utf8").equals(bytes), `${path}: exact UTF-8`);
  const normalized = text.replace(/\r\n/g, "\n");
  assert.equal(sha(normalized), expected, `${path}: immutable LF pin`);
  return normalized;
}
const baseFixture = {
  path: "scripts/ci/fixtures/native-ownership-claim-fixture.mjs",
  sha256Lf: "a630a01680897609ef6347ac9dbd9c109f40af08d5ff71e46534bb60daf70215",
};
readPinned(baseFixture.path, baseFixture.sha256Lf);
const sourcePins = {
  profileBase: [
    "20260501224406_1fde4d15-467c-4a50-a39e-089c25417e52",
    "53dd7b960d83bbda344e9a1bb266c13ac4885b627ec2ca96e6fc96d2ceaa0bc7",
  ],
  signup: [
    "20260518080908_05491b24-c7ae-411a-830c-f4b67980beac",
    "5142b2648179991eeb6022a4001756c73ef412baeeb0179dd4f6e5742ed8c762",
  ],
  sellerStaff: [
    "20260605043935_47d06dfd-d146-4628-b75e-d0c94e3b40f0",
    "470fd35c7d94e171dabf765c650bed109d08534254bcf3b5fcd375eec67ab5ee",
  ],
  evaluation: [
    "20260706044717_364ddd91-48e7-4224-b5cf-a6b500a9bd42",
    "6fda4cf42c5aa6f733e1a12be6bb49b3dee35aaeaa3f9632d8ff41531d7deedd",
  ],
  intentCheck: [
    "20260707070949_d718892b-ccd8-45c4-a81b-058bb9b75211",
    "9073196a2c1c29302ff19ed28a699dfbf836b4efd9391e7154405125ad6b45f8",
  ],
  adminAudit: [
    "20260513133043_5dfec6a3-6eca-4a03-8ee7-681496b8458c",
    "8f8c2b3a07d457a053ee30da1bf9bbde227876ef01e4084ddc13fa7bd1a0e773",
  ],
  auditWiden: [
    "20260619174416_890280d2-2b87-48e6-ac17-839a5b02fe50",
    "0c5d4cf72d234d1a7d7f4435ba9f46d88fe68548a7fb79ffaa3fa83f83948bb5",
  ],
  derive: [
    "20260706045048_1725132d-d311-46a4-8ce9-cffcca83cb5d",
    "0078df2357ddae0393eda7cb23a4287db197cc5d9eb1fb3b28f2c830c50208e8",
  ],
  recompute: [
    "20260706045431_7f2e9b7f-0a44-499c-8482-f19f453b658d",
    "f4643172360cc82862552b0039bd812a57bae0bb22c64e35eb6ec35db6624bee",
  ],
  context: [
    "20260706045715_97c676ff-485d-46a0-a0e6-cc08a8da583d",
    "90863c60422c966f01821532924ea46025ce5eecf2e71aa67b548a4ba762f493",
  ],
  profileIntent: [
    "20260708153505_f6b6ac7a-c38a-43cb-be5e-2e6be4cacbd3",
    "b1a31ad4a3e02df7e49c5af99cad755de0d1db53b0c36671fc02338049116098",
  ],
};
const ownerIntentSources = Object.fromEntries(
  Object.entries(sourcePins).map(([key, [name, hash]]) => [
    key,
    readPinned(`supabase/migrations/${name}.sql`, hash),
  ]),
);
const selectionPins = {};
function select(key, source, marker, end = ";", includeEnd = true, within = null) {
  const raw = ownerIntentSources[source];
  let scopeStart = 0;
  let scopeEnd = raw.length;
  if (within !== null) {
    assert.equal(raw.split(within).length, 2, `${key}: unique containing statement`);
    scopeStart = raw.indexOf(within);
    scopeEnd = raw.indexOf(";", scopeStart) + 1;
    assert.ok(scopeEnd > scopeStart, `${key}: complete containing statement`);
  }
  assert.equal(
    raw.slice(scopeStart, scopeEnd).split(marker).length,
    2,
    `${key}: unique exact start`,
  );
  const first = raw.indexOf(marker, scopeStart);
  const last = raw.indexOf(end, first + marker.length);
  assert.ok(last >= first, `${key}: complete exact end`);
  const boundary = last + (includeEnd ? end.length : 0);
  const selected = raw.slice(first, boundary);
  assert.ok(selected.length > 0 && selected.length < 32 * 1024);
  selectionPins[key] = {
    source,
    marker,
    end,
    includeEnd,
    within,
    firstLine: raw.slice(0, first).split("\n").length,
    lastLine: raw.slice(0, boundary).split("\n").length,
    sha256Lf: sha(selected),
    bytes: Buffer.byteLength(selected),
  };
  return selected;
}
function functionSource(key, source, name, delimiter) {
  const marker = `CREATE OR REPLACE FUNCTION public.${name}(`;
  const raw = ownerIntentSources[source];
  assert.equal(raw.split(marker).length, 2, `${key}: one definition`);
  const first = raw.indexOf(marker);
  const open = raw.indexOf(delimiter, first);
  const close = raw.indexOf(delimiter, open + delimiter.length);
  assert.ok(open > first && close > open);
  assert.equal(raw[close + delimiter.length], ";");
  const selected = raw.slice(first, close + delimiter.length + 1);
  selectionPins[key] = {
    source,
    marker,
    delimiter,
    firstLine: raw.slice(0, first).split("\n").length,
    lastLine: raw.slice(0, close + delimiter.length + 1).split("\n").length,
    sha256Lf: sha(selected),
    bodyMd5Lf: md5(raw.slice(open + delimiter.length, close)),
    bytes: Buffer.byteLength(selected),
  };
  return selected;
}
const ownerIntentFunctions = {
  derive: functionSource("derive", "derive", "derive_signup_intent", "$$"),
  recompute: functionSource("recompute", "recompute", "recompute_signup_intent", "$function$"),
  contextRecompute: functionSource(
    "contextRecompute",
    "context",
    "recompute_signup_intent",
    "$function$",
  ),
  businessIntent: functionSource(
    "businessIntent",
    "context",
    "trg_businesses_recompute_intent",
    "$function$",
  ),
  profileIntent: functionSource(
    "profileIntent",
    "profileIntent",
    "trg_profiles_recompute_intent",
    "$function$",
  ),
};
// These are unchanged retained column DEFINITIONS, not a claim that a six-column
// CREATE TABLE wrapper is the historical/full/current public.profiles table.
const profileDefinitions = [
  select(
    "profileId",
    "profileBase",
    "id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE",
    ",",
    false,
    "CREATE TABLE public.profiles (",
  ),
  select(
    "profileSellerType",
    "profileBase",
    "seller_type public.seller_type NOT NULL DEFAULT 'private'",
    ",",
    false,
    "CREATE TABLE public.profiles (",
  ),
  select(
    "profileUpdatedAt",
    "profileBase",
    "updated_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "\n",
    false,
    "CREATE TABLE public.profiles (",
  ),
  select("profileSignupIntent", "signup", "signup_intent text", ",", false),
];
const ownerIntentDdl = {
  sellerType: select("sellerType", "profileBase", "CREATE TYPE public.seller_type AS ENUM"),
  sellerStaff: select("sellerStaff", "sellerStaff", "ALTER TYPE public.seller_type ADD VALUE"),
  profiles: `CREATE TABLE public.profiles (\n  ${profileDefinitions.join(",\n  ")}\n);`,
  evaluationColumns: select("evaluationColumns", "evaluation", "ALTER TABLE public.profiles"),
  intentCheck: select(
    "intentCheck",
    "intentCheck",
    "ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_signup_intent_check;",
    "CHECK (signup_intent IS NULL OR signup_intent = ANY (ARRAY['buyer','private_seller','business','service_provider','internal_staff']));",
  ),
  adminAudit: select("adminAudit", "adminAudit", "CREATE TABLE public.admin_audit_log ("),
  auditWiden: select(
    "auditWiden",
    "auditWiden",
    "ALTER TABLE public.admin_audit_log\n  ADD COLUMN",
  ),
  auditTargetNullable: select(
    "auditTargetNullable",
    "auditWiden",
    "ALTER TABLE public.admin_audit_log ALTER COLUMN target_user_id DROP NOT NULL",
  ),
  auditFieldNullable: select(
    "auditFieldNullable",
    "auditWiden",
    "ALTER TABLE public.admin_audit_log ALTER COLUMN field DROP NOT NULL",
  ),
  auditTargetIndex: select("auditTargetIndex", "adminAudit", "CREATE INDEX idx_admin_audit_target"),
  auditActorIndex: select("auditActorIndex", "adminAudit", "CREATE INDEX idx_admin_audit_actor"),
  auditCreatedIndex: select(
    "auditCreatedIndex",
    "adminAudit",
    "CREATE INDEX idx_admin_audit_created",
  ),
  auditActionIndex: select(
    "auditActionIndex",
    "auditWiden",
    "CREATE INDEX IF NOT EXISTS idx_admin_audit_action",
  ),
  auditEntityIndex: select(
    "auditEntityIndex",
    "auditWiden",
    "CREATE INDEX IF NOT EXISTS idx_admin_audit_entity",
  ),
  profileTimestampAttachment: select(
    "profileTimestampAttachment",
    "profileBase",
    "CREATE TRIGGER set_profiles_updated",
  ),
  profileIntentAttachment: select(
    "profileIntentAttachment",
    "derive",
    "CREATE TRIGGER profiles_recompute_intent",
  ),
  businessIntentAttachment: select(
    "businessIntentAttachment",
    "derive",
    "CREATE TRIGGER businesses_recompute_intent",
  ),
};
selectionPins.profilesProjection = {
  syntheticWrapper: true,
  columnDefinitions: ["profileId", "profileSellerType", "profileUpdatedAt", "profileSignupIntent"],
  sha256Lf: sha(ownerIntentDdl.profiles),
};
const observation = {
  path: "docs/evidence/native-owner-intent-catalog-2026-10-15.json",
  sha256Lf: "a82598cdf7fd1f1d3310c23e09ecf1885ca9b30f82adefddaf9a8f7d9fb42dad",
};
const enumObservation = {
  path: "docs/evidence/native-owner-intent-enums-2026-10-15.json",
  sha256Lf: "a83137d5b93403dab43ad87bb43d69a6b2f6dfd2ebc7b2a23092664337574c65",
};
const ownerIntentObserved = JSON.parse(
  readPinned(observation.path, observation.sha256Lf, 64 * 1024),
);
const ownerIntentEnums = JSON.parse(
  readPinned(enumObservation.path, enumObservation.sha256Lf, 8 * 1024),
);
assert.equal(ownerIntentObserved.projectRef, "wjxaajgvddtrxxtocxen");
assert.equal(ownerIntentObserved.observedAtUtc, "2026-10-15T04:00:11.110715");
assert.equal(ownerIntentObserved.serverVersion, "17.6");
assert.equal(ownerIntentEnums.projectRef, ownerIntentObserved.projectRef);
assert.equal(ownerIntentEnums.observedAtUtc, "2026-10-15T04:08:11.297488");
assert.deepEqual(ownerIntentEnums.enums.find((value) => value.type === "seller_type").labels, [
  "private",
  "business",
  "staff",
]);
const signatures = {
  derive: "public.derive_signup_intent(uuid)",
  recompute: "public.recompute_signup_intent(uuid)",
  contextRecompute: "public.recompute_signup_intent(uuid,text,text,text,text,text,text)",
  businessIntent: "public.trg_businesses_recompute_intent()",
  profileIntent: "public.trg_profiles_recompute_intent()",
};
for (const [key, signature] of Object.entries(signatures)) {
  const saved = ownerIntentObserved.functions.find((fn) => fn.signature === signature);
  assert.ok(saved && saved.owner === "postgres" && saved.securityDefiner);
  assert.equal(selectionPins[key].bodyMd5Lf, saved.bodyMd5Lf, `${signature}: dated body match`);
  assert.equal(
    md5(saved.definition),
    saved.definitionMd5,
    `${signature}: retained definition digest`,
  );
}
const selectedProfileConstraints = new Set([
  "profiles_pkey",
  "profiles_id_fkey",
  "profiles_intent_evaluated_by_fkey",
  "profiles_signup_intent_check",
]);
const businessAttachment = claimObserved.triggers.find(
  (value) => value.name === "businesses_recompute_intent",
);
assert.equal(
  businessAttachment.definition,
  "CREATE TRIGGER businesses_recompute_intent AFTER INSERT OR DELETE OR UPDATE OF owner_id ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.trg_businesses_recompute_intent()",
);
const expectedTriggers = [
  // The older business capture has no separate updateColumns field; its exact
  // rendered UPDATE OF owner_id definition above supplies this bounded target.
  { ...businessAttachment, updateColumns: ["owner_id"] },
  ...ownerIntentObserved.triggers.filter(
    (value) =>
      value.table === "profiles" &&
      ["profiles_recompute_intent", "set_profiles_updated"].includes(value.name),
  ),
];
assert.equal(expectedTriggers.length, 3);
assert.ok(expectedTriggers.every(Boolean));
assert.equal(
  ownerIntentObserved.triggers.filter((value) => value.table === "admin_audit_log").length,
  0,
);
const ownerIntentPins = {
  sources: sourcePins,
  selections: selectionPins,
  observation,
  enumObservation,
  baseFixture,
  basePins: claimPins,
  scope:
    "Memory-only owner-definer forward chain; separate dated observations, not atomic/current authority or source-history adoption",
  exclusions: {
    businessAttachments: claimPins.exclusions.businessAttachments.filter(
      (name) => name !== "businesses_recompute_intent",
    ),
    profileAttachments: ownerIntentObserved.triggers
      .filter(
        (value) =>
          value.table === "profiles" &&
          !["profiles_recompute_intent", "set_profiles_updated"].includes(value.name),
      )
      .map((value) => value.name),
    roleAttachments: ownerIntentObserved.triggers
      .filter((value) => value.table === "user_roles")
      .map((value) => value.name),
    clientPolicies:
      "Explicit synthetic deny-all policies instead of observed public profile/admin-audit policies and their has_role/support/sales dependencies",
    publicRoles:
      "Unchanged reduced synthetic PR45 TEXT role storage; no real app_role/user_roles schema or policy/role-writer parity",
    profileSchema:
      "Only six source-defined columns plus their selected PK/auth FKs/intent CHECK/defaults; other columns, constraints, indexes and incoming FKs excluded",
    profileInsertFanouts:
      "Profiles seeded before selected attachments; all other INSERT fanouts excluded, never stubbed",
    auditIndexes:
      "Five source indexes retained locally; current index metadata was not captured and parity is not asserted",
    approval:
      "No new production approval, authority positives, deployment, mutation/adoption or full transaction closure",
  },
};
assert.equal(ownerIntentPins.exclusions.businessAttachments.length, 7);
assert.equal(ownerIntentPins.exclusions.profileAttachments.length, 7);

async function ownerIntentCatalog(db) {
  const previous = (await db.query("SELECT pg_catalog.current_setting('search_path') value"))
    .rows[0].value;
  await db.query("SELECT pg_catalog.set_config('search_path','pg_catalog,pg_temp',false)");
  try {
    const tables = (
      await db.query(`SELECT c.relname AS "table",c.relacl::text acl,
      c.relrowsecurity rls,c.relforcerowsecurity "forceRls",c.relkind::text kind,
      c.relispartition partition,pg_catalog.pg_get_userbyid(c.relowner) owner,
      (SELECT count(*)::int FROM pg_catalog.pg_inherits i WHERE i.inhrelid=c.oid OR i.inhparent=c.oid) "inheritanceEdges",
      (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('role',r.name,
        'select',pg_catalog.has_table_privilege(r.name,c.oid,'SELECT'),
        'insert',pg_catalog.has_table_privilege(r.name,c.oid,'INSERT'),
        'update',pg_catalog.has_table_privilege(r.name,c.oid,'UPDATE'),
        'delete',pg_catalog.has_table_privilege(r.name,c.oid,'DELETE')) ORDER BY r.name)
       FROM (VALUES('anon'),('authenticated'),('postgres'),('service_role')) r(name)) rights
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('profiles','admin_audit_log') ORDER BY c.relname`)
    ).rows;
    const columns = (
      await db.query(`SELECT c.relname AS "table",a.attname name,
      pg_catalog.format_type(a.atttypid,a.atttypmod) type,a.attnotnull "notNull",
      pg_catalog.pg_get_expr(d.adbin,d.adrelid) "default",a.attacl::text acl,a.attnum position,
      pg_catalog.has_column_privilege('authenticated',c.oid,a.attnum,'INSERT') "authenticatedInsert",
      pg_catalog.has_column_privilege('authenticated',c.oid,a.attnum,'SELECT') "authenticatedSelect",
      pg_catalog.has_column_privilege('authenticated',c.oid,a.attnum,'UPDATE') "authenticatedUpdate"
      FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
      WHERE n.nspname='public' AND c.relname IN ('profiles','admin_audit_log')
      AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`)
    ).rows;
    const constraints = (
      await db.query(`SELECT c.relname AS "table",k.conname name,k.contype::text type,
      k.convalidated validated,pg_catalog.pg_get_constraintdef(k.oid) definition
      FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('profiles','admin_audit_log') ORDER BY c.relname,k.conname`)
    ).rows;
    const policies = (
      await db.query(`SELECT tablename AS "table",policyname name,permissive,roles,
      cmd command,qual "using",with_check "check" FROM pg_catalog.pg_policies
      WHERE schemaname='public' AND tablename IN ('profiles','admin_audit_log') ORDER BY tablename,policyname`)
    ).rows;
    const triggers = (
      await db.query(`SELECT c.relname AS "table",t.tgname name,t.tgenabled::text enabled,
      t.tgfoid::regprocedure::text function,pg_catalog.pg_get_triggerdef(t.oid) definition,
      pg_catalog.pg_get_userbyid(p.proowner) "functionOwner",p.proacl::text "functionAcl",
      p.proconfig "functionConfig",p.prosecdef "functionSecurityDefiner",
      pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),'')) "functionBodyMd5Lf",
      pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)) "functionDefinitionMd5",
      ARRAY(SELECT a.attname FROM pg_catalog.unnest(t.tgattr::smallint[]) x(attnum)
        JOIN pg_catalog.pg_attribute a ON a.attrelid=t.tgrelid AND a.attnum=x.attnum) "updateColumns"
      FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
      WHERE n.nspname='public' AND NOT t.tgisinternal AND
        (c.relname IN ('profiles','admin_audit_log') OR (c.relname='businesses' AND t.tgname='businesses_recompute_intent'))
      ORDER BY c.relname,t.tgname`)
    ).rows;
    const functionRecords = (
      await db.query(`SELECT p.oid::regprocedure::text signature,
      pg_catalog.pg_get_userbyid(p.proowner) owner,p.prokind::text kind,p.prosecdef "securityDefiner",
      p.provolatile::text volatility,p.proisstrict strict,p.proretset "returnsSet",l.lanname language,
      p.proconfig config,p.proacl::text acl,p.pronargdefaults defaults,
      pg_catalog.pg_get_function_arguments(p.oid) arguments,pg_catalog.pg_get_function_result(p.oid) result,
      pg_catalog.pg_get_functiondef(p.oid) definition,
      pg_catalog.octet_length(pg_catalog.pg_get_functiondef(p.oid)) "definitionBytes",
      pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)) "definitionMd5",
      pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),'')) "bodyMd5Lf",
      pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE') "anonExecute",
      pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') "authenticatedExecute",
      pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE') "postgresExecute",
      pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE') "serviceExecute"
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE n.nspname='public'
      AND p.proname IN ('derive_signup_intent','recompute_signup_intent','trg_businesses_recompute_intent','trg_profiles_recompute_intent')
      ORDER BY p.oid::regprocedure::text`)
    ).rows;
    const enums = (
      await db.query(`SELECT n.nspname schema,t.typname type,
      pg_catalog.pg_get_userbyid(t.typowner) owner,
      pg_catalog.array_agg(e.enumlabel::text ORDER BY e.enumsortorder) labels
      FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
      JOIN pg_catalog.pg_enum e ON e.enumtypid=t.oid
      WHERE n.nspname='public' AND t.typname='seller_type' GROUP BY n.nspname,t.typname,t.typowner`)
    ).rows;
    return { tables, columns, constraints, policies, triggers, functions: functionRecords, enums };
  } finally {
    await db.query("SELECT pg_catalog.set_config('search_path',$1,false)", [previous]);
  }
}
async function assertOwnerIntentObservedSubset(db) {
  const current = await ownerIntentCatalog(db);
  assert.deepEqual(
    current.tables,
    ownerIntentObserved.tables.filter((value) => value.table !== "user_roles"),
  );
  for (const table of ["admin_audit_log", "profiles"]) {
    const columns = current.columns.filter((value) => value.table === table);
    const savedColumns = ownerIntentObserved.columns.filter((value) => value.table === table);
    // A six-column projection cannot have full-table physical attnum parity.
    // Names/types/nullability/defaults/column ACL/effective CRUD remain exact.
    const projected = (values) =>
      values.map(({ position, ...column }) =>
        table === "profiles" ? column : { ...column, position },
      );
    assert.deepEqual(
      projected(columns),
      projected(savedColumns),
      `${table}: selected exact column shape`,
    );
    const notNullConstraints = (
      await db.query(
        `SELECT k.conname name,k.convalidated validated,
      pg_catalog.cardinality(k.conkey) "keyCount",
      EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=k.conrelid
        AND a.attnum=k.conkey[1] AND a.attnotnull AND NOT a.attisdropped) "backedByColumn"
      FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=$1 AND k.contype='n' ORDER BY k.conname`,
        [table],
      )
    ).rows;
    assert.equal(
      notNullConstraints.length,
      current.constraints.filter((value) => value.table === table && value.type === "n").length,
    );
    for (const constraint of notNullConstraints) {
      assert.equal(constraint.validated, true, `${table}/${constraint.name}: validated NN`);
      assert.equal(constraint.keyCount, 1, `${table}/${constraint.name}: single attnum`);
      assert.equal(
        constraint.backedByColumn,
        true,
        `${table}/${constraint.name}: same-table live NN column`,
      );
    }
    // Only individually validated redundant PG18 column-NN entries are omitted;
    // real selected CHECK/PK/FKs stay exact. No other constraint normalization.
    assert.deepEqual(
      current.constraints.filter((value) => value.table === table && value.type !== "n"),
      ownerIntentObserved.constraints.filter(
        (value) =>
          value.table === table &&
          (table !== "profiles" || selectedProfileConstraints.has(value.name)),
      ),
    );
  }
  const savedFunctions = ownerIntentObserved.functions.filter((value) =>
    Object.values(signatures).includes(value.signature),
  );
  // Text collation can order the two overload signatures differently across
  // engines. Compare exact unique signature-keyed full records, not row order.
  assert.equal(current.functions.length, 5);
  assert.equal(savedFunctions.length, 5);
  assert.equal(new Set(current.functions.map((value) => value.signature)).size, 5);
  assert.equal(new Set(savedFunctions.map((value) => value.signature)).size, 5);
  assert.deepEqual(
    new Map(current.functions.map((value) => [value.signature, value])),
    new Map(savedFunctions.map((value) => [value.signature, value])),
  );
  assert.deepEqual(current.triggers, expectedTriggers);
  assert.deepEqual(
    current.enums,
    ownerIntentEnums.enums.filter((value) => value.type === "seller_type"),
  );
  assert.deepEqual(
    current.policies,
    ["admin_audit_log", "profiles"].map((table) => ({
      table,
      name: "lab_deny_all_owner_intent_clients",
      permissive: "PERMISSIVE",
      roles: ["anon", "authenticated"],
      command: "ALL",
      using: "false",
      check: "false",
    })),
    "Synthetic deny-all policies are NOT the observed client policies",
  );
  return current;
}
async function ownerIntentSnapshot(db) {
  const base = await claimSnapshot(db);
  const profiles = (
    await db.query("SELECT pg_catalog.to_jsonb(t) row FROM public.profiles t ORDER BY t.id")
  ).rows.map((value) => value.row);
  const adminAudit = (
    await db.query(
      "SELECT pg_catalog.to_jsonb(t) row FROM public.admin_audit_log t ORDER BY pg_catalog.to_jsonb(t)::text",
    )
  ).rows.map((value) => value.row);
  return {
    base,
    profiles,
    adminAudit,
    catalog: await ownerIntentCatalog(db),
    settings: base.settings,
  };
}
const seededIds = [id.claimant, id.previousOwner, id.moderator, id.stranger, id.otherClaimant];
async function withOwnerIntentFixture(run, options = {}) {
  const { omitProfiles = [], profileOverrides = [], ...claimOptions } = options;
  assert.ok(Array.isArray(omitProfiles) && Array.isArray(profileOverrides));
  assert.equal(new Set(omitProfiles).size, omitProfiles.length);
  assert.ok(omitProfiles.every((value) => seededIds.includes(value)));
  assert.equal(new Set(profileOverrides.map((value) => value.id)).size, profileOverrides.length);
  for (const profile of profileOverrides) {
    assert.ok(profile && seededIds.includes(profile.id) && !omitProfiles.includes(profile.id));
    assert.ok(
      Object.keys(profile).every((key) =>
        [
          "id",
          "seller_type",
          "signup_intent",
          "intent_evaluated_at",
          "intent_evaluated_by",
        ].includes(key),
      ),
    );
  }
  return withClaimFixture(async (db) => {
    for (const key of [
      "sellerType",
      "sellerStaff",
      "profiles",
      "evaluationColumns",
      "intentCheck",
      "adminAudit",
      "auditWiden",
      "auditTargetNullable",
      "auditFieldNullable",
      "auditTargetIndex",
      "auditActorIndex",
      "auditCreatedIndex",
      "auditActionIndex",
      "auditEntityIndex",
    ])
      await db.exec(ownerIntentDdl[key]);
    for (const user of seededIds.filter((value) => !omitProfiles.includes(value))) {
      const profile = {
        seller_type: "private",
        signup_intent: "buyer",
        intent_evaluated_at: "2000-01-01T00:00:00Z",
        intent_evaluated_by: null,
        ...profileOverrides.find((value) => value.id === user),
      };
      await db.query(
        `INSERT INTO public.profiles(id,seller_type,signup_intent,updated_at,intent_evaluated_at,intent_evaluated_by)
        VALUES($1,$2,$3,'2000-01-01T00:00:00Z',$4,$5)`,
        [
          user,
          profile.seller_type,
          profile.signup_intent,
          profile.intent_evaluated_at,
          profile.intent_evaluated_by,
        ],
      );
    }
    for (const sql of Object.values(ownerIntentFunctions)) await db.exec(sql);
    for (const [key, signature] of Object.entries(signatures)) {
      assert.ok(ownerIntentFunctions[key]);
      await db.exec(`REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC,anon,authenticated,service_role;
        GRANT EXECUTE ON FUNCTION ${signature} TO service_role;`);
    }
    // Dated derive ACL alone additionally admits authenticated, not anon.
    await db.exec("GRANT EXECUTE ON FUNCTION public.derive_signup_intent(uuid) TO authenticated;");
    assert.ok(
      ownerIntentObserved.tables
        .filter((value) => value.table !== "user_roles")
        .every(
          (value) =>
            value.acl ===
            "{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}",
        ),
    );
    await db.exec(`GRANT ALL ON TABLE public.profiles,public.admin_audit_log TO anon,authenticated,service_role;
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
      CREATE POLICY lab_deny_all_owner_intent_clients ON public.profiles FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
      CREATE POLICY lab_deny_all_owner_intent_clients ON public.admin_audit_log FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);`);
    for (const key of [
      "profileTimestampAttachment",
      "profileIntentAttachment",
      "businessIntentAttachment",
    ])
      await db.exec(ownerIntentDdl[key]);
    await assertOwnerIntentObservedSubset(db);
    assert.deepEqual((await db.query("SELECT id FROM public.admin_audit_log")).rows, []);
    await run(db);
  }, claimOptions);
}

export {
  withOwnerIntentFixture,
  ownerIntentSnapshot,
  ownerIntentCatalog,
  assertOwnerIntentObservedSubset,
  actor,
  id,
  ownerIntentFunctions,
  ownerIntentSources,
  ownerIntentDdl,
  ownerIntentPins,
  ownerIntentObserved,
  ownerIntentEnums,
  withOwnerIntentFixture as withFixture,
  ownerIntentSnapshot as snapshot,
  ownerIntentCatalog as catalog,
  assertOwnerIntentObservedSubset as assertObservedSubset,
  ownerIntentFunctions as functions,
  ownerIntentSources as sources,
  ownerIntentDdl as ddl,
  ownerIntentPins as pins,
  ownerIntentObserved as observed,
  ownerIntentEnums as enums,
};
