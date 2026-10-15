// OFFLINE FIXED-EVIDENCE SQL BUILDER. Reads one bounded, pinned local JSON file.
// No database client, executor, network, CLI, migration, installer or live action.
// Not production approval, adopted authority, a data repair or a safe contact-
// editing API. All direct authenticated I/U/D on both selected tables is denied.
// The caller supplies an explicit short transaction and reviewed timeouts; ONLY
// ACCESS EXCLUSIVE locks persist until that transaction ends, not just DO end.
// Existing rows, SELECT, policies, helpers, owner/service and default ACLs remain.
// Privileged/indirect writers, existing poisoned bindings, mutable role catalog,
// full role-membership/SET ROLE closure and independent-session races remain open.
import fs from "node:fs";
import { createHash } from "node:crypto";
import { buildNativeRoleCatalogContainment } from "./native-role-catalog-containment.mjs";

function freeze(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
const evidencePath = "docs/evidence/native-profile-role-catalog-2026-10-15.json";
const evidenceHash = "d92af49531821c95fe9173bc3184b77060c22ffdaac30d7e7b70311e60f2712a";
function readEvidence() {
  const descriptor = fs.openSync(new URL(`../../${evidencePath}`, import.meta.url), "r");
  let raw;
  try {
    const buffer = Buffer.alloc(64 * 1024 + 1);
    let count = 0;
    while (count < buffer.length) {
      const read = fs.readSync(descriptor, buffer, count, buffer.length - count, count);
      if (read === 0) break;
      count += read;
    }
    if (count === 0 || count > 64 * 1024) throw new Error("Pinned lab evidence size mismatch");
    raw = buffer.subarray(0, count).toString("utf8").replace(/\r\n/g, "\n");
  } finally {
    fs.closeSync(descriptor);
  }
  if (createHash("sha256").update(raw).digest("hex") !== evidenceHash) {
    throw new Error("Pinned lab evidence hash mismatch");
  }
  const parsed = JSON.parse(raw);
  if (
    parsed.projectRef !== "wjxaajgvddtrxxtocxen" ||
    parsed.observed_at_utc !== "2026-10-15 01:00:28.666866" ||
    !Array.isArray(parsed.tables) ||
    parsed.tables.length !== 3 ||
    parsed.tables.map((table) => table.table).join(",") !== "profiles,roles,user_roles" ||
    parsed.tables.some((table) => table.schema !== "shop_manager")
  ) {
    throw new Error("Pinned lab evidence identity mismatch");
  }
  return parsed;
}
const evidence = readEvidence();
// Only immutable portable expectations are reused. The role builder's SQL is
// never executed or adopted; its after-state is NOT accepted by this candidate.
const roleReference = buildNativeRoleCatalogContainment();
const expectedRoles = roleReference.expectedBefore;
const expectedHelpers = roleReference.expectedHelpers;
if (canonical(evidence.tables[1]) !== canonical(expectedRoles)) {
  throw new Error("Pinned original roles expectation mismatch");
}
const portableHelpers = evidence.functions.map(({ selected_header_md5, ...portable }) => {
  void selected_header_md5; // OID-derived only; every other captured field retained.
  return portable;
});
if (canonical(portableHelpers) !== canonical(expectedHelpers)) {
  throw new Error("Pinned helper expectation mismatch");
}
const expectedBefore = freeze([evidence.tables[0], evidence.tables[2]]);
if (expectedBefore[0].columns.length !== 21 || expectedBefore[1].columns.length !== 4) {
  throw new Error("Pinned assignment column count mismatch");
}
const restricted = JSON.parse(JSON.stringify(expectedBefore));
for (const table of restricted) {
  table.acl =
    "{postgres=arwdDxtm/postgres,authenticated=r/postgres,service_role=arwdDxtm/postgres}";
  for (const rights of table.effective_acl) {
    if (rights.role === "authenticated") {
      rights.insert = false;
      rights.update = false;
      rights.delete = false;
    }
  }
  for (const column of table.columns) {
    for (const rights of column.effective_acl) {
      if (rights.role === "authenticated") {
        rights.insert = false;
        rights.update = false;
      }
    }
  }
}
const expectedAfter = freeze(restricted);
const provenance = freeze({
  evidence: evidencePath,
  evidenceLfSha256: evidenceHash,
  projectRef: evidence.projectRef,
  observedAtUtc: evidence.observed_at_utc,
  catalogQueryLfSha256: "ea8597272733c8579651e6f9c47cb0e600a2cfa5addaf6b03ea91d7706ce880d",
  profileDdlSectionLfSha256: "b9ae44c03daaa146750a69d273f2b1d785ac1f47853cea54c18aafd1eaa63e5e",
  assignmentDdlSectionLfSha256: "f57ac2e904e81ed8b15a1b21327c3a55789102b9115b4db6d2c0d051aff14605",
  schemaDefaultsSectionLfSha256: roleReference.provenance.schemaDefaultsSectionLfSha256,
  policySweepSectionLfSha256: roleReference.provenance.policySweepSectionLfSha256,
  rolesState:
    "Original dated catalog only; no assumption that the separate roles candidate was applied",
  helperExecutionApproval:
    "Separate bootstrap/totals EXECUTE restrictions are not table-write authority",
});

// Catalog-only projection. Column NOT NULL flags remain exact; PG18 redundant
// contype=n entries are excluded only after the structural validation below.
const tableCatalogSql = `
SELECT pg_catalog.jsonb_build_object(
  'schema',n.nspname,'table',c.relname,'owner',pg_catalog.pg_get_userbyid(c.relowner),
  'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
  'acl',c.relacl::pg_catalog.text,'schema_acl',n.nspacl::pg_catalog.text,
  'effective_acl',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'role',r.role_name,
    'schema_usage',pg_catalog.has_schema_privilege(r.role_name::pg_catalog.name,n.oid,'USAGE'),
    'select',pg_catalog.has_table_privilege(r.role_name::pg_catalog.name,c.oid,'SELECT'),
    'insert',pg_catalog.has_table_privilege(r.role_name::pg_catalog.name,c.oid,'INSERT'),
    'update',pg_catalog.has_table_privilege(r.role_name::pg_catalog.name,c.oid,'UPDATE'),
    'delete',pg_catalog.has_table_privilege(r.role_name::pg_catalog.name,c.oid,'DELETE'),
    'truncate',pg_catalog.has_table_privilege(r.role_name::pg_catalog.name,c.oid,'TRUNCATE'),
    'references',pg_catalog.has_table_privilege(r.role_name::pg_catalog.name,c.oid,'REFERENCES'),
    'trigger',pg_catalog.has_table_privilege(r.role_name::pg_catalog.name,c.oid,'TRIGGER')
  ) ORDER BY r.role_name)
    FROM pg_catalog.unnest(ARRAY['anon','authenticated','service_role']::pg_catalog.text[]) AS r(role_name)),
  'columns',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'name',a.attname,'type',pg_catalog.format_type(a.atttypid,a.atttypmod),
    'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,
    'default_md5',pg_catalog.md5(pg_catalog.pg_get_expr(d.adbin,d.adrelid)),
    'acl',a.attacl::pg_catalog.text,
    'effective_acl',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'role',r.role_name,
      'select',pg_catalog.has_column_privilege(r.role_name::pg_catalog.name,c.oid,a.attnum,'SELECT'),
      'insert',pg_catalog.has_column_privilege(r.role_name::pg_catalog.name,c.oid,a.attnum,'INSERT'),
      'update',pg_catalog.has_column_privilege(r.role_name::pg_catalog.name,c.oid,a.attnum,'UPDATE'),
      'references',pg_catalog.has_column_privilege(r.role_name::pg_catalog.name,c.oid,a.attnum,'REFERENCES')
    ) ORDER BY r.role_name)
      FROM pg_catalog.unnest(ARRAY['anon','authenticated','service_role']::pg_catalog.text[]) AS r(role_name))
  ) ORDER BY a.attnum),'[]'::pg_catalog.jsonb)
    FROM pg_catalog.pg_attribute AS a
    LEFT JOIN pg_catalog.pg_attrdef AS d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
  'constraints',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'name',k.conname,'type',k.contype,'validated',k.convalidated,
    'definition',pg_catalog.pg_get_constraintdef(k.oid)
  ) ORDER BY k.conname),'[]'::pg_catalog.jsonb)
    FROM pg_catalog.pg_constraint AS k WHERE k.conrelid=c.oid AND k.contype<>'n'),
  'indexes',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'name',ic.relname,'unique',i.indisunique,'valid',i.indisvalid,'ready',i.indisready,
    'definition',pg_catalog.pg_get_indexdef(i.indexrelid)
  ) ORDER BY ic.relname),'[]'::pg_catalog.jsonb)
    FROM pg_catalog.pg_index AS i
    JOIN pg_catalog.pg_class AS ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid),
  'policies',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'name',pol.polname,'command',pol.polcmd,'permissive',pol.polpermissive,
    'roles',ARRAY(SELECT CASE WHEN r.role_oid=0 THEN 'PUBLIC'
      ELSE pg_catalog.pg_get_userbyid(r.role_oid) END
      FROM pg_catalog.unnest(pol.polroles) AS r(role_oid) ORDER BY r.role_oid),
    'using',pg_catalog.pg_get_expr(pol.polqual,pol.polrelid),
    'check',pg_catalog.pg_get_expr(pol.polwithcheck,pol.polrelid)
  ) ORDER BY pol.polname),'[]'::pg_catalog.jsonb)
    FROM pg_catalog.pg_policy AS pol WHERE pol.polrelid=c.oid),
  'user_triggers',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'name',t.tgname
  ) ORDER BY t.tgname),'[]'::pg_catalog.jsonb)
    FROM pg_catalog.pg_trigger AS t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal)
) INTO v_actual
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
WHERE c.oid=v_relation AND c.relkind='r';`;

const helperCatalogSql = `
SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'schema',n.nspname,'name',p.proname,'signature',p.oid::pg_catalog.regprocedure::pg_catalog.text,
  'identity_arguments',pg_catalog.pg_get_function_identity_arguments(p.oid),
  'argument_names',p.proargnames,'argument_modes',p.proargmodes,
  'argument_count',p.pronargs,'argument_defaults_count',p.pronargdefaults,
  'argument_types',ARRAY(SELECT pg_catalog.format_type(a.type_oid,NULL::pg_catalog.int4)
    FROM pg_catalog.unnest(p.proargtypes::pg_catalog.oid[]) WITH ORDINALITY AS a(type_oid,position)
    ORDER BY a.position),
  'all_argument_types',CASE WHEN p.proallargtypes IS NULL THEN NULL
    ELSE ARRAY(SELECT pg_catalog.format_type(a.type_oid,NULL::pg_catalog.int4)
      FROM pg_catalog.unnest(p.proallargtypes) WITH ORDINALITY AS a(type_oid,position)
      ORDER BY a.position) END,
  'argument_defaults_md5',pg_catalog.md5(pg_catalog.pg_get_expr(p.proargdefaults,0)),
  'variadic_type',CASE WHEN p.provariadic=0 THEN NULL
    ELSE pg_catalog.format_type(p.provariadic,NULL::pg_catalog.int4) END,
  'return_type',pg_catalog.format_type(p.prorettype,NULL::pg_catalog.int4),
  'returns_set',p.proretset,'return_shape',pg_catalog.pg_get_function_result(p.oid),
  'owner',pg_catalog.pg_get_userbyid(p.proowner),'language',l.lanname,
  'volatility',p.provolatile,'security_definer',p.prosecdef,
  'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,
  'cost',p.procost,'rows',p.prorows,
  'config_keys',ARRAY(SELECT pg_catalog.split_part(s.setting,'=',1)
    FROM pg_catalog.unnest(p.proconfig) WITH ORDINALITY AS s(setting,position) ORDER BY s.position),
  'config_value_hashes',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'key',pg_catalog.split_part(s.setting,'=',1),
    'value_md5',pg_catalog.md5(pg_catalog.substr(s.setting,pg_catalog.strpos(s.setting,'=')+1))
  ) ORDER BY s.position),'[]'::pg_catalog.jsonb)
    FROM pg_catalog.unnest(p.proconfig) WITH ORDINALITY AS s(setting,position)),
  'config_md5',pg_catalog.md5(p.proconfig::pg_catalog.text),
  'definition_md5',pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)),
  'body_md5_lf',pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),'')),
  'acl',p.proacl::pg_catalog.text,
  'anon_execute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'),
  'authenticated_execute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'),
  'service_execute',pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE'),
  'anon_schema_usage',pg_catalog.has_schema_privilege('anon',n.oid,'USAGE'),
  'authenticated_schema_usage',pg_catalog.has_schema_privilege('authenticated',n.oid,'USAGE'),
  'service_schema_usage',pg_catalog.has_schema_privilege('service_role',n.oid,'USAGE')
) ORDER BY n.nspname,p.proname,p.oid::pg_catalog.regprocedure::pg_catalog.text),'[]'::pg_catalog.jsonb)
INTO v_helpers
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace
JOIN pg_catalog.pg_language AS l ON l.oid=p.prolang
WHERE p.prokind='f' AND p.oid IN (
  pg_catalog.to_regprocedure('shop_manager.get_current_user_shop_id()'),
  pg_catalog.to_regprocedure('shop_manager.is_owner_or_admin(pg_catalog.uuid)'),
  pg_catalog.to_regprocedure('shop_manager.user_belongs_to_shop(pg_catalog.uuid,pg_catalog.uuid)')
);`;

const defaultsSql = `SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'oid',d.oid,'owner',d.defaclrole,'namespace',d.defaclnamespace,
  'type',d.defaclobjtype,'acl',d.defaclacl::pg_catalog.text
) ORDER BY d.oid),'[]'::pg_catalog.jsonb)
FROM pg_catalog.pg_default_acl AS d
WHERE d.defaclnamespace=0 OR d.defaclnamespace=pg_catalog.to_regnamespace('shop_manager')`;
const literal = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::pg_catalog.jsonb`;

function operationSql(before, after, action) {
  return `-- MEMORY LAB ONLY. Caller-owned explicit transaction/timeouts; no production approval.
DO $native_profile_assignment_lab$
DECLARE
  v_path pg_catalog.text := pg_catalog.current_setting('search_path');
  v_relations pg_catalog.oid[];
  v_relation pg_catalog.oid;
  v_position pg_catalog.int4;
  v_stage pg_catalog.int4;
  v_actual pg_catalog.jsonb;
  v_expected pg_catalog.jsonb;
  v_helpers pg_catalog.jsonb;
  v_defaults_before pg_catalog.jsonb;
  v_defaults_after pg_catalog.jsonb;
BEGIN
  PERFORM pg_catalog.set_config('search_path','',true);
  IF current_user IS DISTINCT FROM 'postgres'::pg_catalog.name THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Lab assignment containment requires postgres';
  END IF;
  v_relations := ARRAY[
    pg_catalog.to_regclass('shop_manager.profiles'),
    pg_catalog.to_regclass('shop_manager.user_roles'),
    pg_catalog.to_regclass('shop_manager.roles')
  ]::pg_catalog.oid[];
  -- BOTH write targets must be ordinary, unrelated tables before ANY lock.
  -- A view lock can recurse into underlying relations despite ONLY.
  FOR v_position IN 1..3 LOOP
    v_relation := v_relations[v_position];
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c
        WHERE c.oid=v_relation AND c.relkind='r' AND NOT c.relispartition)
      OR EXISTS (SELECT 1 FROM pg_catalog.pg_inherits AS i
        WHERE i.inhrelid=v_relation OR i.inhparent=v_relation) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Lab assignment topology mismatch';
    END IF;
  END LOOP;
  ${defaultsSql} INTO v_defaults_before;
  LOCK TABLE ONLY shop_manager.profiles IN ACCESS EXCLUSIVE MODE;
  LOCK TABLE ONLY shop_manager.user_roles IN ACCESS EXCLUSIVE MODE;
  FOR v_stage IN 1..2 LOOP
    IF ARRAY[pg_catalog.to_regclass('shop_manager.profiles'),
      pg_catalog.to_regclass('shop_manager.user_roles'),pg_catalog.to_regclass('shop_manager.roles')]::pg_catalog.oid[]
      IS DISTINCT FROM v_relations THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Lab assignment relation identity changed';
    END IF;
    FOR v_position IN 1..3 LOOP
      v_relation := v_relations[v_position];
      IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c
          WHERE c.oid=v_relation AND c.relkind='r' AND NOT c.relispartition)
        OR EXISTS (SELECT 1 FROM pg_catalog.pg_inherits AS i
          WHERE i.inhrelid=v_relation OR i.inhparent=v_relation) THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Lab assignment topology mismatch';
      END IF;
      -- Only validated single-column PG18 NOT NULL entries backed by the full
      -- attnotnull shape are normalized; PK/unique/FK/checks remain exact.
      IF EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS k
        WHERE k.conrelid=v_relation AND k.contype='n' AND (
          NOT k.convalidated OR k.conkey IS NULL OR pg_catalog.cardinality(k.conkey)<>1
          OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS a
            WHERE a.attrelid=v_relation AND a.attnum=k.conkey[1] AND a.attnotnull AND NOT a.attisdropped)
        )) THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Lab assignment NOT NULL mismatch';
      END IF;
      ${tableCatalogSql}
      v_expected := CASE WHEN v_position=3 THEN ${literal(expectedRoles)}
        WHEN v_stage=1 THEN ${literal(before)} -> (v_position-1)
        ELSE ${literal(after)} -> (v_position-1) END;
      IF v_actual IS DISTINCT FROM v_expected THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Lab assignment catalog state mismatch';
      END IF;
      IF NOT pg_catalog.has_table_privilege('postgres',v_relation,'SELECT')
        OR NOT pg_catalog.has_table_privilege('postgres',v_relation,'INSERT')
        OR NOT pg_catalog.has_table_privilege('postgres',v_relation,'UPDATE')
        OR NOT pg_catalog.has_table_privilege('postgres',v_relation,'DELETE') THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Lab assignment owner privilege mismatch';
      END IF;
    END LOOP;
    ${helperCatalogSql}
    IF v_helpers IS DISTINCT FROM ${literal(expectedHelpers)} THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Lab assignment helper contract mismatch';
    END IF;
    ${defaultsSql} INTO v_defaults_after;
    IF v_defaults_after IS DISTINCT FROM v_defaults_before THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Lab assignment default privileges changed';
    END IF;
    IF v_stage=1 THEN
      ${action}
    END IF;
  END LOOP;
  PERFORM pg_catalog.set_config('search_path',v_path,true);
END;
$native_profile_assignment_lab$;
`;
}

// Exact ordinary caller metadata only. Descriptor validation never invokes a
// getter and refuses unknown/non-enumerable/symbol fields and exotic prototypes.
function canonical(value, depth = 0, budget = { nodes: 0 }) {
  if (depth > 32 || ++budget.nodes > 8192) throw new Error("Invalid lab observation");
  if (typeof value === "string" && value.length > 16384) throw new Error("Invalid lab observation");
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (!value || typeof value !== "object") throw new Error("Invalid lab observation");
  const prototype = Object.getPrototypeOf(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(value);
  const array = Array.isArray(value);
  if (
    keys.length > 2048 ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        key.length > 16384 ||
        !("value" in descriptors[key]) ||
        (!(array && key === "length") && !descriptors[key].enumerable),
    )
  )
    throw new Error("Invalid lab observation");
  if (array) {
    if (prototype !== Array.prototype || value.length > 1024 || keys.length !== value.length + 1)
      throw new Error("Invalid lab observation");
    const items = [];
    for (let index = 0; index < value.length; index++) {
      if (!Object.hasOwn(descriptors, index)) throw new Error("Invalid lab observation");
      items.push(canonical(descriptors[index].value, depth + 1, budget));
    }
    return `[${items.join(",")}]`;
  }
  if (prototype !== Object.prototype && prototype !== null)
    throw new Error("Invalid lab observation");
  return `{${keys
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(descriptors[key].value, depth + 1, budget)}`)
    .join(",")}}`;
}

export function buildNativeProfileAssignmentContainment() {
  const receipts = new WeakSet();
  const restrictSql = operationSql(
    expectedBefore,
    expectedAfter,
    `
      REVOKE INSERT, UPDATE, DELETE ON TABLE shop_manager.profiles FROM authenticated RESTRICT;
      REVOKE INSERT, UPDATE, DELETE ON TABLE shop_manager.user_roles FROM authenticated RESTRICT;`,
  );
  const recovery = operationSql(
    expectedAfter,
    expectedBefore,
    `
      GRANT INSERT, UPDATE, DELETE ON TABLE shop_manager.profiles TO authenticated;
      GRANT INSERT, UPDATE, DELETE ON TABLE shop_manager.user_roles TO authenticated;`,
  );
  return Object.freeze({
    expectedBefore,
    expectedAfter,
    expectedHelpers,
    provenance,
    restrictSql,
    recordRestrictionApplication(observations) {
      let matches = false;
      try {
        matches =
          canonical(observations) === canonical({ before: expectedBefore, after: expectedAfter });
      } catch {
        // Refuse generically without echoing private metadata or caller errors.
      }
      if (!matches)
        throw new Error("Lab application observations do not match the expected states");
      // Caller-fabricable bookkeeping, NOT execution/commit/human approval,
      // trusted original state, durable provenance or production authority.
      const receipt = Object.freeze({});
      receipts.add(receipt);
      return receipt;
    },
    recoverSql(receipt) {
      if (!receipt || typeof receipt !== "object" || !receipts.has(receipt)) {
        throw new Error("A receipt issued by this lab builder is required");
      }
      // Not consumed: generation cannot establish execution. Copied SQL cannot
      // enforce this process seam. Recovery restores the original unsafe writes.
      return recovery;
    },
  });
}
