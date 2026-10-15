// MEMORY-ONLY partial ownership claim/guard/audit composition. No live client,
// environment/credentials, persistent directory, history replay/seed or migration.
// Selected retained functions/DDL/policies/attachments execute unchanged. Business,
// auth and public-role storage below are reduced SYNTHETIC platform support.
// Only business guard+timestamp and claim touch+status-audit attachments are loaded.
// EIGHT other observed business attachments (including owner-intent recomputation)
// are excluded, never permissively stubbed. This is NOT full transaction/writer,
// schema/incoming-FK/native-sync/JWT/API/concurrency/owner-delegation parity.
// has_role's observed body differs from its old source and is not a dependency of
// actual can_moderate/selected policies, so neither it nor a replacement executes.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("../../../", import.meta.url);
const sha = (text) => createHash("sha256").update(text).digest("hex");
const md5 = (text) => createHash("md5").update(text).digest("hex");
const sourcePins = {
  businesses: [
    "20260512054457_90aac1ba-c3f0-48ff-a9b4-06739ddd2108",
    "7ab71ad92eec0d9e9647fc8ffa46ef2b35c561c76b85d29ad41f9c32261fde8c",
  ],
  ownerPolicy: [
    "20260529115629_f7974081-5d14-4967-8e7b-e8303c363ad0",
    "d735c47e5273ada665059819d7e3efa8fab44961a5d6a4235a6083ad3092b953",
  ],
  moderatorPolicies: [
    "20260601030613_bd3b8478-7045-464b-af81-bd540bcc5c00",
    "83ea1048a3347f33be4b25ba3a18bca303792d5e20392d1bb5d25cccd0dde535",
  ],
  claims: [
    "20260606123543_fb94412b-0d85-4071-bee5-42acbaf4cf90",
    "8ccedc03f5546e104a8333a94c2b55d44ca8862f94b53210a2c11bf118ebeff4",
  ],
  kind: [
    "20260619183617_2046c7a7-22a3-4202-8ed4-7b17a9e24871",
    "7f36c7369a1d74bfb133b4d470c259b0504574093ea7dc1d44fdca2778f85957",
  ],
  approval: [
    "20260619183732_375472c8-9c6b-4392-85c3-021a02d51140",
    "c0c2a8dcddadda0a979ac3cbc4c6798e4083d16046b30383c1f719eebba0af0e",
  ],
  audit: [
    "20260606130908_794768e3-771f-42ed-b904-e5f51aa1f509",
    "48507fe468b991dd2c6ea4189b50115bb20c355c6e7a0484ac717f4c33ca83b1",
  ],
  moderation: [
    "20260512023916_08c3429a-e992-4bc3-ae1c-118ace98df45",
    "eb1890a93e8bb1698619587218698f3c4eddb6bc8422d89930fa98ca192b46f6",
  ],
  touch: [
    "20260608092901_ee4416c6-d63a-49e5-a6f8-5bbcc595767e",
    "f073859d844dc888753ee0b91024b9cb3e9597aff8f85505263f3ceedcb5832d",
  ],
  businessTimestamp: [
    "20260627150439_5c3d6dc8-8f14-45b1-9eb3-dc261579364b",
    "904dca2383a666cdae96b1723e744f257f63c723d4695040214af61c34d49b77",
  ],
  domainPolicy: [
    "20260715020533_cd0eef21-5341-4af3-abc2-71fc7c080432",
    "efd81ca813023ffbabf6a833c635230258ee2f2e5d4d38a80a0993804ee07196",
  ],
};
function readPinned(path, expected, max = 512 * 1024) {
  const bytes = fs.readFileSync(new URL(path, root));
  assert.ok(bytes.length > 0 && bytes.length <= max, `${path}: bounded local bytes`);
  const text = bytes.toString("utf8");
  assert.ok(Buffer.from(text, "utf8").equals(bytes), `${path}: exact UTF-8`);
  const normalized = text.replace(/\r\n/g, "\n");
  assert.equal(sha(normalized), expected, `${path}: immutable LF pin`);
  return normalized;
}
const sources = Object.fromEntries(
  Object.entries(sourcePins).map(([key, [name, hash]]) => [
    key,
    readPinned(`supabase/migrations/${name}.sql`, hash),
  ]),
);
const selectionPins = {};
function select(key, source, marker, end = ";") {
  const raw = sources[source];
  assert.equal(raw.split(marker).length, 2, `${key}: unique exact start`);
  const first = raw.indexOf(marker);
  const last = raw.indexOf(end, first + marker.length);
  assert.ok(last >= first, `${key}: complete exact end`);
  const selected = raw.slice(first, last + end.length);
  assert.ok(selected.length > 0 && selected.length < 32 * 1024);
  // Whole-file hash + fixed unique selectors are fail-closed provenance. Record
  // section hashes/boundaries too; do not call this source-history adoption.
  selectionPins[key] = {
    source,
    marker,
    end,
    firstLine: raw.slice(0, first).split("\n").length,
    lastLine: raw.slice(0, last + end.length).split("\n").length,
    sha256Lf: sha(selected),
    bytes: Buffer.byteLength(selected),
  };
  return selected;
}
function functionSource(key, source, name, delimiter = "$$") {
  const marker = `CREATE OR REPLACE FUNCTION public.${name}(`;
  const raw = sources[source];
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
  };
  return selected;
}
const functions = {
  approve: functionSource("approve", "approval", "approve_business_claim", "$function$"),
  moderate: functionSource("moderate", "moderation", "can_moderate"),
  guard: functionSource("guard", "claims", "guard_business_owner_update"),
  touch: functionSource("touch", "touch", "touch_updated_at"),
  audit: functionSource("audit", "audit", "tg_claim_audit_status"),
  businessTimestamp: functionSource("businessTimestamp", "businessTimestamp", "tg_set_updated_at"),
};
const ddl = {
  businessStatus: select("businessStatus", "businesses", "CREATE TYPE business_status AS ENUM"),
  claimMetadata: select("claimMetadata", "claims", "ALTER TABLE public.businesses"),
  claims: select("claims", "claims", "CREATE TABLE IF NOT EXISTS public.business_claim_requests ("),
  audit: select("auditTable", "audit", "CREATE TABLE public.business_claim_audit ("),
  kindColumn: select(
    "kindColumn",
    "kind",
    "ALTER TABLE public.business_claim_requests\n  ADD COLUMN",
  ),
  kindCheck: select("kindCheck", "kind", "DO $$ BEGIN", "END $$;"),
  kindIndex: select("kindIndex", "kind", "CREATE INDEX IF NOT EXISTS idx_bcr_kind_status"),
  claimBusinessIndex: select(
    "claimBusinessIndex",
    "claims",
    "CREATE INDEX IF NOT EXISTS idx_bcr_business",
  ),
  claimClaimantIndex: select(
    "claimClaimantIndex",
    "claims",
    "CREATE INDEX IF NOT EXISTS idx_bcr_claimant",
  ),
  claimStatusIndex: select(
    "claimStatusIndex",
    "claims",
    "CREATE INDEX IF NOT EXISTS idx_bcr_status",
  ),
  auditIndex: select("auditIndex", "audit", "CREATE INDEX idx_bca_claim"),
  claimInsert: select("claimInsert", "kind", 'CREATE POLICY "Users submit own claim"'),
  claimRead: select("claimRead", "claims", 'CREATE POLICY "Users read own claims"'),
  claimUpdate: select("claimUpdate", "claims", 'CREATE POLICY "Staff update claims"'),
  auditRead: select("auditRead", "audit", 'CREATE POLICY "Read own claim audit or mod"'),
  auditInsert: select("auditInsert", "audit", 'CREATE POLICY "Block direct inserts"'),
  businessInsert: select(
    "businessInsert",
    "businesses",
    'CREATE POLICY "Owners insert businesses"',
  ),
  businessDelete: select(
    "businessDelete",
    "businesses",
    'CREATE POLICY "Owners delete own businesses"',
  ),
  businessUpdate: select(
    "businessUpdate",
    "ownerPolicy",
    'CREATE POLICY "Owners update own businesses"',
  ),
  businessRead: select(
    "businessRead",
    "moderatorPolicies",
    'CREATE POLICY "Active businesses public read"',
  ),
  businessOwnerRead: select(
    "businessOwnerRead",
    "moderatorPolicies",
    'CREATE POLICY "Business owners can read own businesses"',
  ),
  businessModerator: select(
    "businessModerator",
    "moderatorPolicies",
    'CREATE POLICY "Moderators manage businesses"',
  ),
  domainRead: select(
    "domainRead",
    "domainPolicy",
    'CREATE POLICY "Public can resolve verified custom domains"',
  ),
  guardAttachment: select(
    "guardAttachment",
    "claims",
    "CREATE TRIGGER trg_guard_business_owner_update",
  ),
  touchAttachment: select("touchAttachment", "claims", "CREATE TRIGGER trg_bcr_touch"),
  auditAttachment: select("auditAttachment", "audit", "CREATE TRIGGER trg_claim_audit_status"),
  businessTimestampAttachment: select(
    "businessTimestampAttachment",
    "businesses",
    "CREATE TRIGGER set_businesses_updated_at",
  ),
  originalApprovalAcl: select(
    "originalApprovalAcl",
    "claims",
    "REVOKE ALL ON FUNCTION public.approve_business_claim(uuid, boolean)",
    "GRANT EXECUTE ON FUNCTION public.approve_business_claim(uuid, boolean) TO service_role;",
  ),
};
const observationPath = "docs/evidence/native-ownership-claim-catalog-2026-10-15.json";
const observationHash = "d5caade20f8218117fc41d139d581a7e61ab2ad501d1b077cc278bf5ca3dca3a";
const observed = JSON.parse(readPinned(observationPath, observationHash, 64 * 1024));
assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
assert.equal(observed.observedAtUtc, "2026-10-15T03:28:20.852805");
assert.equal(observed.policies.length, 12);
assert.equal(observed.triggers.filter((trigger) => trigger.table === "businesses").length, 10);
for (const [key, signature] of Object.entries({
  approve: "public.approve_business_claim(uuid,boolean)",
  moderate: "public.can_moderate(uuid)",
  guard: "public.guard_business_owner_update()",
  touch: "public.touch_updated_at()",
  audit: "public.tg_claim_audit_status()",
})) {
  const saved = observed.functions.find((fn) => fn.signature === signature);
  assert.ok(saved && saved.owner === "postgres");
  assert.equal(selectionPins[key].bodyMd5Lf, saved.bodyMd5Lf, `${signature}: dated body match`);
}
assert.equal(
  selectionPins.businessTimestamp.bodyMd5Lf,
  observed.triggers.find((trigger) => trigger.name === "set_businesses_updated_at")
    .functionBodyMd5Lf,
);
const pins = {
  sources: sourcePins,
  selections: selectionPins,
  observation: { path: observationPath, sha256Lf: observationHash },
  exclusions: {
    businessAttachments: observed.triggers
      .filter(
        (trigger) =>
          trigger.table === "businesses" &&
          !["set_businesses_updated_at", "trg_guard_business_owner_update"].includes(trigger.name),
      )
      .map((trigger) => trigger.name),
    functions: ["public.has_role(uuid,public.app_role)", "public.update_updated_at_column()"],
    ownerIntent:
      "trg_businesses_recompute_intent → recompute_signup_intent → derive_signup_intent → profiles/admin_audit/global partner/business dependencies; not executed/stubbed",
  },
};
assert.equal(pins.exclusions.businessAttachments.length, 8);
const uuid = (n) => `33333333-3333-4333-8333-${String(n).padStart(12, "0")}`;
const id = Object.freeze({
  business: uuid(1),
  claim: uuid(2),
  sibling: uuid(3),
  claimant: uuid(4),
  previousOwner: uuid(5),
  moderator: uuid(6),
  stranger: uuid(7),
  missing: uuid(8),
  foreignActor: uuid(9),
  otherBusiness: uuid(10),
  otherClaim: uuid(11),
  otherClaimant: uuid(12),
});

// Reduced business shape, NOT all business columns/FKs/indexes/attachments.
// business_tier is a reduced synthetic enum: these tests only use free.
const support = `SET statement_timeout='3000ms'; SET lock_timeout='1000ms'; SET search_path=public;
  CREATE ROLE anon NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  CREATE ROLE service_role NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users(id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid
  $$;
  GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
  CREATE TABLE public.user_roles(user_id uuid NOT NULL,role text NOT NULL,PRIMARY KEY(user_id,role));
  CREATE TYPE public.business_tier AS ENUM('free');
`;
const syntheticBusinesses = `CREATE TABLE public.businesses(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid,name text NOT NULL,
  slug text NOT NULL UNIQUE,status public.business_status NOT NULL DEFAULT 'pending',
  featured boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),source text NOT NULL DEFAULT 'manual',
  source_external_id text,subscription_tier public.business_tier NOT NULL DEFAULT 'free',
  featured_until timestamptz,custom_domain text,custom_domain_status text
)`;

async function catalog(db) {
  const previous = (await db.query("SELECT pg_catalog.current_setting('search_path') value"))
    .rows[0].value;
  // Diagnostic rendering only, in this disposable connection; restore even on
  // error. This helper does not confer trusted execution or operator authority.
  await db.query("SELECT pg_catalog.set_config('search_path','pg_catalog,pg_temp',false)");
  try {
    const tables = (
      await db.query(`SELECT c.relname AS "table",c.relacl::text acl,c.relrowsecurity rls,
      c.relforcerowsecurity "forceRls",pg_catalog.pg_get_userbyid(c.relowner) owner
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('businesses','business_claim_requests','business_claim_audit')
      ORDER BY c.relname`)
    ).rows;
    const columns = (
      await db.query(`SELECT c.relname AS "table",a.attname name,
      pg_catalog.format_type(a.atttypid,a.atttypmod) type,a.attnotnull "notNull",
      pg_catalog.pg_get_expr(d.adbin,d.adrelid) "default",a.attacl::text acl,
      a.attnum position FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
      WHERE n.nspname='public' AND c.relname IN ('businesses','business_claim_requests','business_claim_audit')
      AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`)
    ).rows;
    const constraints = (
      await db.query(`SELECT c.relname AS "table",k.conname name,k.contype type,
      k.convalidated validated,pg_catalog.pg_get_constraintdef(k.oid) definition
      FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('businesses','business_claim_requests','business_claim_audit')
      ORDER BY c.relname,k.conname`)
    ).rows;
    const policies = (
      await db.query(`SELECT tablename AS "table",policyname name,permissive,roles,cmd command,
      qual "using",with_check "check" FROM pg_catalog.pg_policies WHERE schemaname='public'
      AND tablename IN ('businesses','business_claim_requests','business_claim_audit') ORDER BY tablename,policyname`)
    ).rows;
    const triggers = (
      await db.query(`SELECT c.relname AS "table",t.tgname name,t.tgenabled enabled,
      t.tgfoid::regprocedure::text function,pg_catalog.pg_get_triggerdef(t.oid) definition,
      pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),'')) "bodyMd5Lf"
      FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
      WHERE n.nspname='public' AND c.relname IN ('businesses','business_claim_requests','business_claim_audit')
      AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`)
    ).rows;
    const functionRecords = (
      await db.query(`SELECT p.oid::regprocedure::text signature,
      pg_catalog.pg_get_userbyid(p.proowner) owner,p.prosecdef "securityDefiner",p.provolatile volatility,
      p.proconfig config,p.proacl::text acl,pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)) "definitionMd5",
      pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),'')) "bodyMd5Lf",
      pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE') "anonExecute",
      pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') "authenticatedExecute",
      pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE') "postgresExecute",
      pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE') "serviceExecute"
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN ('approve_business_claim','can_moderate',
        'guard_business_owner_update','touch_updated_at','tg_claim_audit_status','tg_set_updated_at')
      ORDER BY p.oid::regprocedure::text`)
    ).rows;
    return { tables, columns, constraints, policies, triggers, functions: functionRecords };
  } finally {
    await db.query("SELECT pg_catalog.set_config('search_path',$1,false)", [previous]);
  }
}
async function assertObservedSubset(db) {
  const current = await catalog(db);
  assert.deepEqual(
    current.tables.map((table) => table.table),
    observed.tables.map((table) => table.table),
  );
  for (const table of current.tables) {
    const saved = observed.tables.find((value) => value.table === table.table);
    for (const field of ["acl", "rls", "forceRls", "owner"])
      assert.deepEqual(table[field], saved[field]);
  }
  assert.deepEqual(current.policies, observed.policies);
  for (const table of ["business_claim_audit", "business_claim_requests"]) {
    const columns = current.columns.filter((column) => column.table === table);
    const savedColumns = observed.columns.filter((column) => column.table === table);
    assert.deepEqual(
      columns,
      savedColumns.map(
        ({ authenticatedInsert, authenticatedSelect, authenticatedUpdate, ...column }) => {
          assert.ok(authenticatedInsert && authenticatedSelect && authenticatedUpdate);
          return column;
        },
      ),
    );
    const notNullConstraints = (
      await db.query(
        `SELECT k.conname name,k.convalidated validated,
      pg_catalog.cardinality(k.conkey) "keyCount",
      EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=k.conrelid
        AND a.attnum=k.conkey[1] AND a.attnotnull AND NOT a.attisdropped) "backedByColumn"
      FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=$1 AND k.contype='n'
      ORDER BY k.conname`,
        [table],
      )
    ).rows;
    assert.equal(
      notNullConstraints.length,
      current.constraints.filter(
        (constraint) => constraint.table === table && constraint.type === "n",
      ).length,
    );
    for (const constraint of notNullConstraints) {
      assert.equal(constraint.validated, true, `${table}/${constraint.name}: validated NN`);
      assert.equal(constraint.keyCount, 1, `${table}/${constraint.name}: single attnum`);
      assert.equal(
        constraint.backedByColumn,
        true,
        `${table}/${constraint.name}: live same-table NN column`,
      );
    }
    // Normalize only those validated single-column PG18 entries backed by the
    // exact attnotnull shape; all actual CHECK/PK/FK definitions remain exact.
    assert.deepEqual(
      current.constraints.filter(
        (constraint) => constraint.table === table && constraint.type !== "n",
      ),
      observed.constraints.filter((constraint) => constraint.table === table),
    );
  }
  for (const fn of current.functions) {
    const saved = observed.functions.find((value) => value.signature === fn.signature);
    if (saved)
      for (const [key, value] of Object.entries(fn))
        assert.deepEqual(value, saved[key], `${fn.signature}: ${key}`);
    else {
      assert.equal(fn.signature, "public.tg_set_updated_at()");
      const attached = observed.triggers.find((trigger) => trigger.function === fn.signature);
      assert.equal(fn.bodyMd5Lf, attached.functionBodyMd5Lf);
      assert.equal(fn.definitionMd5, attached.functionDefinitionMd5);
      assert.equal(fn.acl, attached.functionAcl);
    }
  }
  assert.equal(current.functions.length, 6);
  assert.equal(current.triggers.length, 4);
  for (const trigger of current.triggers) {
    const saved = observed.triggers.find(
      (value) => value.table === trigger.table && value.name === trigger.name,
    );
    assert.ok(saved);
    for (const key of ["table", "name", "enabled", "function", "definition"])
      assert.deepEqual(trigger[key], saved[key]);
    assert.equal(trigger.bodyMd5Lf, saved.functionBodyMd5Lf);
  }
  return current;
}
async function snapshot(db) {
  const data = {};
  for (const [key, relation] of Object.entries({
    businesses: "public.businesses",
    claims: "public.business_claim_requests",
    audit: "public.business_claim_audit",
    authUsers: "auth.users",
    publicRoles: "public.user_roles",
  })) {
    data[key] = (
      await db.query(
        `SELECT pg_catalog.to_jsonb(t) row FROM ${relation} t ORDER BY pg_catalog.to_jsonb(t)::text`,
      )
    ).rows.map((value) => value.row);
  }
  return {
    data,
    catalog: await catalog(db),
    settings: (
      await db.query(`SELECT
    pg_catalog.current_setting('search_path') path,pg_catalog.current_setting('role') role,
    pg_catalog.current_setting('request.jwt.claim.sub',true) subject`)
    ).rows,
  };
}
async function actor(db, role, subject, sql, args = []) {
  assert.ok(["postgres", "anon", "authenticated", "service_role"].includes(role));
  assert.ok(subject === null || /^[0-9a-f-]{36}$/i.test(subject));
  await db.exec(`BEGIN; SET LOCAL ROLE ${role}`);
  try {
    await db.query("SELECT pg_catalog.set_config('request.jwt.claim.sub',$1,true)", [
      subject ?? "",
    ]);
    const result = await db.query(sql, args);
    await db.exec("COMMIT");
    return result;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
async function withFixture(
  run,
  { owner = null, status = "pending", kind = "claim", reviewer = null } = {},
) {
  for (const value of [owner, reviewer])
    assert.ok(value === null || /^[0-9a-f-]{36}$/i.test(value));
  assert.ok(["pending", "approved", "rejected", "auto_approved"].includes(status));
  assert.ok(["claim", "transfer"].includes(kind));
  const db = new PGlite("memory://");
  try {
    await db.exec(support);
    await db.query("SELECT pg_catalog.set_config('request.jwt.claim.sub','',false)");
    await db.exec(ddl.businessStatus);
    await db.exec(syntheticBusinesses);
    for (const sql of [
      ddl.claimMetadata,
      ddl.claims,
      ddl.kindColumn,
      ddl.kindCheck,
      ddl.audit,
      ddl.kindIndex,
      ddl.claimBusinessIndex,
      ddl.claimClaimantIndex,
      ddl.claimStatusIndex,
      ddl.auditIndex,
      ...Object.values(functions),
    ])
      await db.exec(sql);
    for (const user of [id.claimant, id.previousOwner, id.moderator, id.stranger, id.otherClaimant])
      await db.query("INSERT INTO auth.users VALUES($1)", [user]);
    await db.query("INSERT INTO public.user_roles VALUES($1,'moderator')", [id.moderator]);
    await db.query(
      `INSERT INTO public.businesses(id,name,slug,status,owner_id,claim_state,created_at,updated_at)
      VALUES($1,'Synthetic business','synthetic-primary','active',$2,$3,'2000-01-01Z','2000-01-01Z'),
        ($4,'Other synthetic business','synthetic-other','active',NULL,'unclaimed','2000-01-01Z','2000-01-01Z')`,
      [id.business, owner, owner === null ? "unclaimed" : "owned", id.otherBusiness],
    );
    await db.query(
      `INSERT INTO public.business_claim_requests(id,business_id,claimant_user_id,contact_method,
      kind,status,reviewer_user_id,created_at,updated_at) VALUES
      ($1,$2,$3,'document',$4,$5,$6,'2000-01-01Z','2000-01-01Z'),
      ($7,$2,$8,'document','claim','pending',NULL,'2000-01-01Z','2000-01-01Z'),
      ($9,$10,$11,'document','claim','pending',NULL,'2000-01-01Z','2000-01-01Z')`,
      [
        id.claim,
        id.business,
        id.claimant,
        kind,
        status,
        reviewer,
        id.sibling,
        id.stranger,
        id.otherClaim,
        id.otherBusiness,
        id.otherClaimant,
      ],
    );
    // Snapshot's ALL table ACLs are deliberately broad; RLS remains the actual
    // selected policy boundary. This is dated observed ACL composition, not a
    // grant recommendation or inference from a missing historical GRANT source.
    assert.ok(
      observed.tables.every(
        (table) =>
          table.acl ===
          "{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}",
      ),
    );
    await db.exec(`GRANT ALL ON TABLE public.businesses,public.business_claim_requests,public.business_claim_audit TO anon,authenticated,service_role;
      ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.business_claim_requests ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.business_claim_audit ENABLE ROW LEVEL SECURITY;`);
    for (const [key, signature] of Object.entries({
      approve: "approve_business_claim(uuid,boolean)",
      guard: "guard_business_owner_update()",
      touch: "touch_updated_at()",
      audit: "tg_claim_audit_status()",
      businessTimestamp: "tg_set_updated_at()",
    })) {
      assert.ok(functions[key]);
      await db.exec(`REVOKE ALL ON FUNCTION public.${signature} FROM PUBLIC,anon,authenticated;
        GRANT EXECUTE ON FUNCTION public.${signature} TO service_role;`);
    }
    await db.exec(`REVOKE ALL ON FUNCTION public.can_moderate(uuid) FROM PUBLIC,anon,authenticated,service_role;
      GRANT EXECUTE ON FUNCTION public.can_moderate(uuid) TO authenticated,service_role,anon;`);
    for (const sql of [
      ddl.claimInsert,
      ddl.claimRead,
      ddl.claimUpdate,
      ddl.auditRead,
      ddl.auditInsert,
      ddl.businessInsert,
      ddl.businessDelete,
      ddl.businessUpdate,
      ddl.businessRead,
      ddl.businessOwnerRead,
      ddl.businessModerator,
      ddl.domainRead,
      ddl.guardAttachment,
      ddl.businessTimestampAttachment,
      ddl.touchAttachment,
      ddl.auditAttachment,
    ])
      await db.exec(sql);
    await assertObservedSubset(db);
    assert.deepEqual((await db.query("SELECT id FROM public.business_claim_audit")).rows, []);
    await run(db);
  } finally {
    await db.close();
  }
}
export {
  withFixture,
  actor,
  snapshot,
  catalog,
  assertObservedSubset,
  id,
  functions,
  sources,
  ddl,
  pins,
  observed,
};
