// PURE MEMORY-LAB SQL BUILDER. No executor, network, CLI, migration or installer.
// This is not production approval, an adopted authority matrix or a data repair.
// A caller must supply its own explicit, short transaction and reviewed timeouts.
// ACCESS EXCLUSIVE locks last until that transaction ends, not merely DO end.
// Only roles I/U/D are changed; existing SELECT, policies, helpers, owner/service
// and default ACLs remain. Existing poisoning and privileged/indirect writers,
// mutable profiles/user_roles and independent-session concurrency remain open.
// Effective ACL checks are not global role-membership/SET ROLE closure evidence.

function freeze(value) {
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}

const provenance = freeze({
  evidence: "docs/evidence/native-profile-role-catalog-2026-10-15.json",
  evidenceLfSha256: "d92af49531821c95fe9173bc3184b77060c22ffdaac30d7e7b70311e60f2712a",
  observedAtUtc: "2026-10-15 01:00:28.666866",
  projectRef: "wjxaajgvddtrxxtocxen",
  catalogQueryLfSha256: "ea8597272733c8579651e6f9c47cb0e600a2cfa5addaf6b03ea91d7706ce880d",
  roleDdlSectionLfSha256: "c586077e0711ef753eb5031deb08551a6f942183c4496b15ade9c1954627b1be",
  schemaDefaultsSectionLfSha256: "6657bccef9d7cb2ae662c8791a25d7d47b822e8ddf51bf9b5e86e86c90be90d3",
  policySweepSectionLfSha256: "73e5a37b5d67a1bc0daca21195610a25db6472b1b8901ef81eabf42ede69439a",
});
const columnRights = [
  { role: "anon", insert: false, select: false, update: false, references: false },
  { role: "authenticated", insert: true, select: true, update: true, references: false },
  { role: "service_role", insert: true, select: true, update: true, references: true },
];
const expectedBefore = freeze({
  acl: "{postgres=arwdDxtm/postgres,authenticated=arwd/postgres,service_role=arwdDxtm/postgres}",
  rls: true,
  owner: "postgres",
  table: "roles",
  schema: "shop_manager",
  columns: [
    {
      acl: null,
      name: "id",
      type: "uuid",
      identity: "",
      not_null: true,
      generated: "",
      default_md5: "f3b72bb359a50b640590970a2ab8e514",
      effective_acl: columnRights,
    },
    {
      acl: null,
      name: "name",
      type: "shop_manager.app_role",
      identity: "",
      not_null: true,
      generated: "",
      default_md5: null,
      effective_acl: columnRights,
    },
    {
      acl: null,
      name: "created_at",
      type: "timestamp with time zone",
      identity: "",
      not_null: true,
      generated: "",
      default_md5: "75230039beb12ce952f24927f2bfa2f2",
      effective_acl: columnRights,
    },
  ],
  indexes: [
    {
      name: "roles_name_key",
      ready: true,
      valid: true,
      unique: true,
      definition: "CREATE UNIQUE INDEX roles_name_key ON shop_manager.roles USING btree (name)",
    },
    {
      name: "roles_pkey",
      ready: true,
      valid: true,
      unique: true,
      definition: "CREATE UNIQUE INDEX roles_pkey ON shop_manager.roles USING btree (id)",
    },
  ],
  policies: [
    {
      name: "shop scoped access roles_select_all",
      check: "(shop_manager.get_current_user_shop_id() IS NOT NULL)",
      roles: ["authenticated"],
      using: "(shop_manager.get_current_user_shop_id() IS NOT NULL)",
      command: "*",
      permissive: true,
    },
  ],
  force_rls: false,
  schema_acl:
    "{postgres=UC/postgres,authenticated=U/postgres,service_role=U/postgres,anon=U/postgres}",
  constraints: [
    { name: "roles_name_key", type: "u", validated: true, definition: "UNIQUE (name)" },
    { name: "roles_pkey", type: "p", validated: true, definition: "PRIMARY KEY (id)" },
  ],
  effective_acl: [
    {
      role: "anon",
      delete: false,
      insert: false,
      select: false,
      update: false,
      trigger: false,
      truncate: false,
      references: false,
      schema_usage: true,
    },
    {
      role: "authenticated",
      delete: true,
      insert: true,
      select: true,
      update: true,
      trigger: false,
      truncate: false,
      references: false,
      schema_usage: true,
    },
    {
      role: "service_role",
      delete: true,
      insert: true,
      select: true,
      update: true,
      trigger: true,
      truncate: true,
      references: true,
      schema_usage: true,
    },
  ],
  user_triggers: [],
});
const restricted = JSON.parse(JSON.stringify(expectedBefore));
restricted.acl =
  "{postgres=arwdDxtm/postgres,authenticated=r/postgres,service_role=arwdDxtm/postgres}";
for (const rights of restricted.effective_acl) {
  if (rights.role === "authenticated") {
    rights.insert = false;
    rights.update = false;
    rights.delete = false;
  }
}
for (const column of restricted.columns) {
  for (const rights of column.effective_acl) {
    if (rights.role === "authenticated") {
      rights.insert = false;
      rights.update = false;
    }
  }
}
const expectedAfter = freeze(restricted);

// The three exact helpers are guarded, never replaced or granted. Their portable
// catalog fields match dated evidence; only selected_header_md5 (OID-derived)
// is excluded. These pins do not establish their callers or human authority.
const commonHelper = {
  acl: "{=X/postgres,postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}",
  cost: 100,
  rows: 0,
  owner: "postgres",
  schema: "shop_manager",
  strict: false,
  language: "sql",
  parallel: "u",
  leakproof: false,
  config_md5: "8506a0911fb3ebfe6f35ed71d4100474",
  volatility: "s",
  config_keys: ["search_path"],
  returns_set: false,
  anon_execute: true,
  variadic_type: null,
  argument_modes: null,
  service_execute: true,
  security_definer: true,
  anon_schema_usage: true,
  all_argument_types: null,
  config_value_hashes: [{ key: "search_path", value_md5: "db11771cee5fd39f92dfba5c83d713f3" }],
  service_schema_usage: true,
  argument_defaults_md5: null,
  authenticated_execute: true,
  argument_defaults_count: 0,
  authenticated_schema_usage: true,
};
const expectedHelpers = freeze([
  {
    ...commonHelper,
    name: "get_current_user_shop_id",
    signature: "shop_manager.get_current_user_shop_id()",
    return_type: "uuid",
    return_shape: "uuid",
    argument_count: 0,
    argument_names: null,
    argument_types: [],
    identity_arguments: "",
    definition_md5: "be63946995c909e4a224b0e4989eaaf7",
    body_md5_lf: "6049d4aebd36a1230288e6a2227e1071",
  },
  {
    ...commonHelper,
    name: "is_owner_or_admin",
    signature: "shop_manager.is_owner_or_admin(uuid)",
    return_type: "boolean",
    return_shape: "boolean",
    argument_count: 1,
    argument_names: ["_user_id"],
    argument_types: ["uuid"],
    identity_arguments: "_user_id uuid",
    definition_md5: "869849c9428ef51ca5d9ac2fab605570",
    body_md5_lf: "2ffa08c10ab6bd41b1d47a9a2610d56a",
  },
  {
    ...commonHelper,
    name: "user_belongs_to_shop",
    signature: "shop_manager.user_belongs_to_shop(uuid,uuid)",
    return_type: "boolean",
    return_shape: "boolean",
    argument_count: 2,
    argument_names: ["_user_id", "_shop_id"],
    argument_types: ["uuid", "uuid"],
    identity_arguments: "_user_id uuid, _shop_id uuid",
    definition_md5: "ef1de965a932a522f9dd61a203338d17",
    body_md5_lf: "7786134c6646c4ade72c0107d4219236",
  },
]);

// Catalog-only projection of the exact roles relation. NOT NULL column flags
// are compared before redundant PG18 contype=n entries are excluded below.
const roleCatalogSql = `
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

const literal = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::pg_catalog.jsonb`;
function operationSql(before, after, action) {
  return `-- MEMORY LAB ONLY: caller-owned explicit transaction/timeouts, no production approval.
DO $native_role_catalog_lab$
DECLARE
  v_path pg_catalog.text := pg_catalog.current_setting('search_path');
  v_relation pg_catalog.oid;
  v_actual pg_catalog.jsonb;
  v_helpers pg_catalog.jsonb;
  v_stage pg_catalog.int4;
BEGIN
  PERFORM pg_catalog.set_config('search_path','',true);
  IF current_user IS DISTINCT FROM 'postgres'::pg_catalog.name THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Lab containment requires the observed database owner';
  END IF;
  -- Refuse deterministic wrong-kind drift before LOCK: locking a view can
  -- recurse into its underlying relations even when ONLY was specified.
  v_relation := pg_catalog.to_regclass('shop_manager.roles');
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c
      WHERE c.oid=v_relation AND c.relkind='r' AND NOT c.relispartition)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_inherits AS i
      WHERE i.inhrelid=v_relation OR i.inhparent=v_relation) THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Lab role catalog topology mismatch';
  END IF;
  -- ONLY avoids silently locking descendants. Topology is a fresh lab guard,
  -- not a claim that the dated production catalog observed inheritance.
  LOCK TABLE ONLY shop_manager.roles IN ACCESS EXCLUSIVE MODE;
  IF pg_catalog.to_regclass('shop_manager.roles') IS DISTINCT FROM v_relation THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Lab role catalog identity changed';
  END IF;
  FOR v_stage IN 1..2 LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c
        WHERE c.oid=v_relation AND c.relkind='r' AND NOT c.relispartition)
      OR EXISTS (SELECT 1 FROM pg_catalog.pg_inherits AS i
        WHERE i.inhrelid=v_relation OR i.inhparent=v_relation) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Lab role catalog topology mismatch';
    END IF;
    -- PG18 adds catalog NOT NULL constraints. Ignore only validated, single-
    -- column entries backed by actual attnotnull; the full column shape below
    -- still requires all three original non-null columns/defaults/ACLs.
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS k
      WHERE k.conrelid=v_relation AND k.contype='n' AND (
        NOT k.convalidated OR k.conkey IS NULL OR pg_catalog.cardinality(k.conkey)<>1
        OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS a
          WHERE a.attrelid=v_relation AND a.attnum=k.conkey[1] AND a.attnotnull AND NOT a.attisdropped)
      )) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Lab role catalog NOT NULL mismatch';
    END IF;
    ${roleCatalogSql}
    IF v_actual IS DISTINCT FROM (CASE WHEN v_stage=1 THEN ${literal(before)} ELSE ${literal(after)} END) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Lab role catalog state mismatch';
    END IF;
    ${helperCatalogSql}
    IF v_helpers IS DISTINCT FROM ${literal(expectedHelpers)} THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Lab selected helper contract mismatch';
    END IF;
    IF v_stage=1 THEN
      ${action}
    END IF;
  END LOOP;
  PERFORM pg_catalog.set_config('search_path',v_path,true);
END;
$native_role_catalog_lab$;
`;
}

// Exact ordinary data only; unknown fields, non-finite values, accessors and
// exotic prototypes are refused rather than silently normalized away.
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

export function buildNativeRoleCatalogContainment() {
  const receipts = new WeakSet();
  const restrictSql = operationSql(
    expectedBefore,
    expectedAfter,
    "REVOKE INSERT, UPDATE, DELETE ON TABLE shop_manager.roles FROM authenticated RESTRICT;",
  );
  const recovery = operationSql(
    expectedAfter,
    expectedBefore,
    "GRANT INSERT, UPDATE, DELETE ON TABLE shop_manager.roles TO authenticated;",
  );
  return Object.freeze({
    restrictSql,
    expectedBefore,
    expectedAfter,
    expectedHelpers,
    provenance,
    recordRestrictionApplication(observations) {
      let matches = false;
      try {
        matches =
          canonical(observations) === canonical({ before: expectedBefore, after: expectedAfter });
      } catch {
        // Generic refusal; do not echo private caller-supplied metadata/errors.
      }
      if (!matches)
        throw new Error("Lab application observations do not match the expected states");
      // Opaque object identity only. Matching observations CAN be fabricated;
      // this token proves neither SQL execution nor commit/operator approval,
      // original trusted state, durable provenance or any production authority.
      const receipt = Object.freeze({});
      receipts.add(receipt);
      return receipt;
    },
    recoverSql(receipt) {
      if (!receipt || typeof receipt !== "object" || !receipts.has(receipt)) {
        throw new Error("A receipt issued by this lab builder is required");
      }
      // Not consumed: SQL generation cannot establish whether execution occurred.
      // Generated/copied SQL cannot enforce this process-only seam in a database.
      // Recovery restores the original exposure, not a safe authority contract.
      return recovery;
    },
  });
}
