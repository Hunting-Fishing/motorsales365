// MEMORY-ONLY, NON-ADOPTED SQL BUILDER. Not a migration, live installer,
// approved owner/delegation contract, data repair or offboarding acceptance.
// Fixture imports supply pinned retained definitions/metadata; no fixture or
// database is created here. No executor, network, CLI or caller path is exposed.
// The caller MUST use a short explicit transaction, reviewed statement/lock
// timeouts, and explicit rollback on failure. No transaction control is emitted.
// Only the latest member function body changes; its original header, default,
// tail and ACL remain. All callers (including postgres/service/NULL subjects)
// are denied before the first business SELECT/write, with no authority bypass.
// The wrapper and all three enabled roster attachments remain unchanged.
// Operation-local pg_catalog,pg_temp pins builtin types ahead of temporary
// shadows during guards and raw CREATE parsing; the caller path is restored.
// Roster/chat compatibility, other privileged writers, existing poisoned data,
// human authority, incoming dependencies and concurrent DDL remain unresolved.
import { createHash } from "node:crypto";
import { functions, observed, pin } from "./fixtures/native-staff-trigger-fixture.mjs";

const md5 = (value) => createHash("md5").update(value).digest("hex");
const literal = (value) => `'${value.replaceAll("'", "''")}'`;
const json = (value) => `${literal(JSON.stringify(value))}::pg_catalog.jsonb`;
const memberSignature = "shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)";
const wrapperSignature = "shop_manager.sync_business_staff_trigger()";
const originalDefinition = pin(
  functions.nativeMember,
  "73562fb19efda957ba6fd0574797a70ecf1b8281ed6cde15020d0622210c45d5",
  "original latest staff member",
);
const wrapperDefinition = pin(
  functions.nativeTrigger,
  "e46a9d8d72bb19138e70129666388bdc4da87d34bd8fae777db00094df78f627",
  "original boundary staff wrapper",
);
const member = observed.functions.find((record) => record.signature === memberSignature);
const wrapper = observed.functions.find((record) => record.signature === wrapperSignature);
const roster = observed.tables.find(
  (table) => table.schema === "public" && table.table === "business_staff",
);
if (observed.projectRef !== "wjxaajgvddtrxxtocxen" || !member || !wrapper || !roster) {
  throw new Error("Pinned staff metadata required");
}
function body(definition) {
  if (definition.split("$$").length !== 3) throw new Error("One pinned function body required");
  return definition.slice(definition.indexOf("$$") + 2, definition.lastIndexOf("$$"));
}
if (
  md5(body(originalDefinition)) !== member.body_md5_lf ||
  md5(body(wrapperDefinition)) !== wrapper.body_md5_lf
) {
  throw new Error("Pinned staff body mismatch");
}
const anchor = "\nBEGIN\n";
if (originalDefinition.split(anchor).length !== 2)
  throw new Error("One original member BEGIN required");
const denial =
  "  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Memory-lab native staff sync unavailable';\n";
const candidateDefinition = originalDefinition.replace(anchor, anchor + denial);
if (candidateDefinition.replace(anchor + denial, anchor) !== originalDefinition) {
  throw new Error("Candidate changed original member tail");
}

// PostgreSQL's portable pg_get_functiondef rendering is reconstructed offline
// and pinned against the dated original full-definition MD5 BEFORE it is used
// to derive the candidate hash. This is not a catalog query or a new live pin.
const canonicalMemberHeader = `CREATE OR REPLACE FUNCTION shop_manager.sync_business_staff_member(_business_id uuid, _user_id uuid, _active boolean, _business_role text, _title text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'shop_manager', 'public', 'auth', 'pg_temp'
AS $function$`;
const canonicalWrapperHeader = `CREATE OR REPLACE FUNCTION shop_manager.sync_business_staff_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'shop_manager', 'public', 'pg_temp'
AS $function$`;
const canonicalMember = `${canonicalMemberHeader}${body(originalDefinition)}$function$\n`;
const canonicalWrapper = `${canonicalWrapperHeader}${body(wrapperDefinition)}$function$\n`;
if (
  md5(canonicalMember) !== member.definition_md5 ||
  md5(canonicalWrapper) !== wrapper.definition_md5
) {
  throw new Error("Pinned canonical staff definition mismatch");
}
const candidateMd5 = md5(`${canonicalMemberHeader}${body(candidateDefinition)}$function$\n`);
const candidateBodyMd5 = md5(body(candidateDefinition));
const attachments = roster.triggers
  .filter((trigger) => !trigger.internal)
  .map((trigger) => {
    // Public is absent from the guard path, qualifying its rendered functions.
    const functionName = trigger.function.includes(".")
      ? trigger.function
      : `public.${trigger.function}`;
    return {
      name: trigger.name,
      enabled: trigger.enabled,
      definition: trigger.definition.replace(
        `EXECUTE FUNCTION ${trigger.function}`,
        `EXECUTE FUNCTION ${functionName}`,
      ),
    };
  })
  .sort((left, right) => left.name.localeCompare(right.name, "en"));
if (
  attachments.length !== 3 ||
  attachments.map((trigger) => trigger.name).join(",") !==
    "business_staff_team_thread_sync,sync_business_staff_to_shop_manager,trg_business_staff_updated" ||
  attachments.some((trigger) => trigger.enabled !== "O")
)
  throw new Error("Exactly three original enabled staff attachments required");

function functionGuard(record, fullMd5, bodyMd5, isMember) {
  const signature = isMember
    ? "shop_manager.sync_business_staff_member(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.bool,pg_catalog.text,pg_catalog.text)"
    : wrapperSignature;
  const argumentGuard = isMember
    ? `
      AND p.pronargs=5 AND p.pronargdefaults=1
      AND p.proargtypes[0]='pg_catalog.uuid'::pg_catalog.regtype
      AND p.proargtypes[1]='pg_catalog.uuid'::pg_catalog.regtype
      AND p.proargtypes[2]='pg_catalog.bool'::pg_catalog.regtype
      AND p.proargtypes[3]='pg_catalog.text'::pg_catalog.regtype
      AND p.proargtypes[4]='pg_catalog.text'::pg_catalog.regtype
      AND p.proargnames=ARRAY['_business_id','_user_id','_active','_business_role','_title']::pg_catalog.text[]
      AND pg_catalog.pg_get_expr(p.proargdefaults,0)='NULL::text'
      AND p.prorettype='pg_catalog.void'::pg_catalog.regtype`
    : `
      AND p.pronargs=0 AND p.pronargdefaults=0 AND p.proargnames IS NULL
      AND p.proargdefaults IS NULL AND p.prorettype='pg_catalog.trigger'::pg_catalog.regtype`;
  return `
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc AS p JOIN pg_catalog.pg_language AS l ON l.oid=p.prolang
      WHERE p.oid=pg_catalog.to_regprocedure(${literal(signature)})
      AND p.prokind='f' AND NOT p.proretset AND p.proargmodes IS NULL AND p.proallargtypes IS NULL
      ${argumentGuard}
      AND p.prosecdef=${record.security_definer} AND p.provolatile=${literal(record.volatility)}
      AND l.lanname=${literal(record.language)} AND pg_catalog.pg_get_userbyid(p.proowner)=${literal(record.owner)}
      AND p.proconfig=ARRAY[${record.config.map(literal).join(",")}]::pg_catalog.text[]
      AND p.proacl::pg_catalog.text=${literal(record.acl)}
      AND pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid))=${literal(fullMd5)}
      AND pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),''))=${literal(bodyMd5)}
      AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
      AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
      AND pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE')
      AND pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
    ) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Memory-lab selected staff function mismatch';
    END IF;`;
}

function operationSql(beforeMd5, beforeBodyMd5, afterMd5, afterBodyMd5, definition) {
  return `-- MEMORY LAB ONLY: explicit caller transaction/timeouts/rollback; no production approval.
DO $native_staff_sync_lab$
DECLARE
  v_path pg_catalog.text := pg_catalog.current_setting('search_path');
  v_roster pg_catalog.oid;
  v_stage pg_catalog.int4;
  v_attachments pg_catalog.jsonb;
BEGIN
  PERFORM pg_catalog.set_config('search_path','pg_catalog,pg_temp',true);
  IF current_user OPERATOR(pg_catalog.<>) 'postgres'::pg_catalog.name THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Memory-lab install/recovery requires postgres context';
  END IF;
  v_roster := pg_catalog.to_regclass('public.business_staff');
  FOR v_stage IN 1..2 LOOP
    IF pg_catalog.to_regclass('public.business_staff') IS DISTINCT FROM v_roster
      OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c
        WHERE c.oid=v_roster AND c.relkind='r' AND NOT c.relispartition)
      OR EXISTS (SELECT 1 FROM pg_catalog.pg_inherits AS i
        WHERE i.inhrelid=v_roster OR i.inhparent=v_roster) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Memory-lab staff relation topology mismatch';
    END IF;
    SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',t.tgname,'enabled',t.tgenabled,'definition',pg_catalog.pg_get_triggerdef(t.oid)
    ) ORDER BY t.tgname),'[]'::pg_catalog.jsonb) INTO v_attachments
    FROM pg_catalog.pg_trigger AS t WHERE t.tgrelid=v_roster AND NOT t.tgisinternal;
    IF v_attachments IS DISTINCT FROM ${json(attachments)} THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Memory-lab original staff attachments mismatch';
    END IF;
    ${functionGuard(wrapper, wrapper.definition_md5, wrapper.body_md5_lf, false)}
    IF v_stage=1 THEN
      ${functionGuard(member, beforeMd5, beforeBodyMd5, true)}
      EXECUTE ${literal(definition)};
    ELSE
      ${functionGuard(member, afterMd5, afterBodyMd5, true)}
    END IF;
  END LOOP;
  PERFORM pg_catalog.set_config('search_path',v_path,true);
END;
$native_staff_sync_lab$;
`;
}

// Capture immutable SQL strings once: later mutation of shared fixture exports
// cannot change the candidate, its exact expected guards or generated recovery.
const installSql = operationSql(
  member.definition_md5,
  member.body_md5_lf,
  candidateMd5,
  candidateBodyMd5,
  candidateDefinition,
);
// Separate explicit recovery restores unsafe original behavior. It is not
// automatic, human approval, or a receipt/provenance seam. Reinstall and
// recovery rerun deliberately refuse exact-state mismatch with 55000.
const recoverSql = operationSql(
  candidateMd5,
  candidateBodyMd5,
  member.definition_md5,
  member.body_md5_lf,
  originalDefinition,
);

export function buildNativeStaffSyncContainment() {
  return Object.freeze({
    installSql,
    recoverSql,
    candidateDefinition,
    originalDefinition,
  });
}
