// MEMORY-ONLY, NON-ADOPTED RESEARCH CANDIDATE. Not a migration, operator
// command, production installer/recovery or approved owner/delegation contract.
// All privileged roster branches are denied; only the narrowly gated self shift
// is studied. Native/chat/ownership writer closure and concurrency remain open.
import { createHash } from "node:crypto";
import { functions, observed, pin } from "./fixtures/native-staff-trigger-fixture.mjs";

const originalSha = "277e157ff7821eab043c1e690903ffe83d274343d35cb80e5ab4d212a56d1e49";
const literal = (value) => `'${value.replaceAll("'", "''")}'`;
const unchanged = `
    NEW.id IS NOT DISTINCT FROM OLD.id
    AND NEW.business_id IS NOT DISTINCT FROM OLD.business_id
    AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
    AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
    AND NEW.role IS NOT DISTINCT FROM OLD.role
    AND NEW.title IS NOT DISTINCT FROM OLD.title
    AND NEW.duties IS NOT DISTINCT FROM OLD.duties
    AND NEW.active IS NOT DISTINCT FROM OLD.active
    AND NEW.invited_by IS NOT DISTINCT FROM OLD.invited_by`;

const guards = `
CREATE SCHEMA companion_candidate;
REVOKE ALL ON SCHEMA companion_candidate FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION companion_candidate.guard_self_shift() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_rosters bigint;
  v_shops bigint;
  v_profiles bigint;
  v_bindings bigint;
BEGIN
  IF ROW(NEW.id,NEW.business_id,NEW.user_id,NEW.created_at)
     IS DISTINCT FROM ROW(OLD.id,OLD.business_id,OLD.user_id,OLD.created_at) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Candidate identity change denied';
  END IF;
  IF v_actor IS NULL OR OLD.user_id IS DISTINCT FROM v_actor
     OR OLD.active IS DISTINCT FROM true OR NOT (${unchanged}) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Candidate self shift unavailable';
  END IF;

  -- One statement reads both identity paths; do not prefer canonical id over a
  -- legacy id or silently ignore NULL/non-NULL competing shadows. These are
  -- conservative research gates, NOT a final multi-roster/identity policy.
  SELECT
    (SELECT count(*) FROM public.business_staff s WHERE s.user_id=v_actor),
    (SELECT count(*) FROM shop_manager.shops s WHERE s.business_id=OLD.business_id),
    (SELECT count(*) FROM shop_manager.profiles p WHERE p.id=v_actor OR p.user_id=v_actor),
    (SELECT count(*) FROM shop_manager.profiles p
       JOIN shop_manager.shops s ON s.id=p.shop_id
       WHERE p.user_id=v_actor AND s.business_id=OLD.business_id)
  INTO v_rosters,v_shops,v_profiles,v_bindings;
  IF v_rosters<>1 OR v_shops<>1 OR v_profiles<>1 OR v_bindings<>1 THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Candidate binding unavailable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION companion_candidate.reject_privileged_target() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  -- UPDATE OF is target-aware, unlike a value-difference check. Even actual
  -- owner/manager positives stay gated; there is no mutable-role/NULL bypass.
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Candidate privileged target unavailable';
END;
$$;

CREATE FUNCTION companion_candidate.deny_other_commands() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  -- Explicitly closed research scope, not adopted production permission rules.
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Candidate roster command unavailable';
END;
$$;

REVOKE ALL ON FUNCTION companion_candidate.guard_self_shift(),
  companion_candidate.reject_privileged_target(),companion_candidate.deny_other_commands()
  FROM PUBLIC,anon,authenticated,service_role;

CREATE TRIGGER companion_a_self_shift BEFORE UPDATE ON public.business_staff
  FOR EACH ROW EXECUTE FUNCTION companion_candidate.guard_self_shift();
CREATE TRIGGER companion_b_privileged_target
  BEFORE UPDATE OF role,title,duties,active,invited_by,updated_at ON public.business_staff
  FOR EACH ROW EXECUTE FUNCTION companion_candidate.reject_privileged_target();
CREATE TRIGGER companion_c_other_commands BEFORE INSERT OR DELETE ON public.business_staff
  FOR EACH ROW EXECUTE FUNCTION companion_candidate.deny_other_commands();
`;

export function buildNativeSelfShiftCandidate({ chatSource = functions.chat } = {}) {
  const original = pin(chatSource, originalSha, "candidate original chat trigger");
  const anchor = "\nBEGIN\n";
  if (original.split(anchor).length !== 2) throw new Error("One original chat BEGIN required");
  const chatDefinition = original.replace(
    anchor,
    `${anchor}
  -- Candidate-only harmless UPDATE short circuit, BEFORE ensure/provisioning.
  -- Derived updated_at and requested on_shift are intentionally not compared.
  IF TG_OP='UPDATE' THEN
    IF OLD.active IS TRUE AND OLD.user_id=auth.uid() AND (${unchanged}) THEN
      RETURN NEW;
    END IF;
  END IF;
`,
  );
  const chat = observed.functions.find((f) => f.signature === "trg_staff_sync_team_thread()");
  const staff = observed.tables.find((t) => t.schema === "public" && t.table === "business_staff");
  if (!chat || !staff) throw new Error("Pinned fixture metadata required");
  const attachments = staff.triggers.filter((t) => !t.internal);
  if (attachments.length !== 3) throw new Error("Three original staff attachments required");
  const body = original.slice(original.indexOf("$$") + 2, original.lastIndexOf("$$"));
  const bodyMd5 = createHash("md5").update(body).digest("hex");
  if (bodyMd5 !== chat.body_md5_lf) throw new Error("Pinned original chat body required");
  const expectedAttachments = attachments.map((t) => literal(t.definition)).join(",");
  const preflight = `DO $$ BEGIN
    IF to_regnamespace('companion_candidate') IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Candidate schema already exists';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
      WHERE p.oid=to_regprocedure('public.trg_staff_sync_team_thread()')
        AND p.prokind='f' AND p.pronargs=0 AND p.prorettype='trigger'::regtype
        AND p.prosecdef AND p.provolatile='v' AND l.lanname='plpgsql'
        AND pg_get_userbyid(p.proowner)=${literal(chat.owner)}
        AND p.proconfig=ARRAY['search_path=public']::text[]
        AND p.proacl::text=${literal(chat.acl)}
        AND md5(replace(p.prosrc,chr(13),''))=${literal(bodyMd5)}
    ) THEN RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Original chat precondition mismatch';
    END IF;
    IF (SELECT count(*) FROM pg_trigger t
        WHERE t.tgrelid='public.business_staff'::regclass AND NOT t.tgisinternal)<>3
       OR EXISTS (SELECT 1 FROM pg_trigger t
        WHERE t.tgrelid='public.business_staff'::regclass AND NOT t.tgisinternal
          AND (t.tgenabled<>'O' OR pg_get_triggerdef(t.oid) NOT IN (${expectedAttachments}))) THEN
      RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Original staff attachment mismatch';
    END IF;
  END; $$;`;
  const candidateBodyMd5 = createHash("md5")
    .update(
      chatDefinition.slice(chatDefinition.indexOf("$$") + 2, chatDefinition.lastIndexOf("$$")),
    )
    .digest("hex");
  const privateDefinitions = [
    ...guards.matchAll(
      /CREATE FUNCTION companion_candidate\.([a-z_]+)\(\) RETURNS trigger\nLANGUAGE plpgsql SECURITY (DEFINER|INVOKER) SET search_path='' AS \$\$([\s\S]*?)\$\$;/g,
    ),
  ];
  if (privateDefinitions.length !== 3) throw new Error("Three candidate functions required");
  const privateChecks = privateDefinitions
    .map(
      ([, name, security, functionBody]) => `
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
      WHERE p.oid=to_regprocedure('companion_candidate.${name}()')
        AND p.prokind='f' AND p.pronargs=0 AND p.prorettype='trigger'::regtype
        AND p.prosecdef=${security === "DEFINER"} AND p.provolatile='v' AND l.lanname='plpgsql'
        AND pg_get_userbyid(p.proowner)=${literal(chat.owner)}
        AND p.proconfig=ARRAY['search_path=""']::text[]
        AND md5(p.prosrc)=${literal(createHash("md5").update(functionBody).digest("hex"))}
        AND NOT EXISTS (SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
          WHERE a.grantee<>p.proowner)) THEN
      RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Candidate recovery function mismatch';
    END IF;`,
    )
    .join("\n");
  const newAttachments = [
    "CREATE TRIGGER companion_a_self_shift BEFORE UPDATE ON public.business_staff FOR EACH ROW EXECUTE FUNCTION companion_candidate.guard_self_shift()",
    "CREATE TRIGGER companion_b_privileged_target BEFORE UPDATE OF role, title, duties, active, invited_by, updated_at ON public.business_staff FOR EACH ROW EXECUTE FUNCTION companion_candidate.reject_privileged_target()",
    "CREATE TRIGGER companion_c_other_commands BEFORE INSERT OR DELETE ON public.business_staff FOR EACH ROW EXECUTE FUNCTION companion_candidate.deny_other_commands()",
  ]
    .map(literal)
    .join(",");
  const recoveryPreflight = `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
      WHERE p.oid=to_regprocedure('public.trg_staff_sync_team_thread()')
      AND p.prokind='f' AND p.pronargs=0 AND p.prorettype='trigger'::regtype
      AND p.provolatile='v' AND l.lanname='plpgsql'
      AND md5(replace(p.prosrc,chr(13),''))=${literal(candidateBodyMd5)}
      AND p.proacl::text=${literal(chat.acl)} AND p.prosecdef
      AND p.proconfig=ARRAY['search_path=public']::text[]
      AND pg_get_userbyid(p.proowner)=${literal(chat.owner)}) THEN
      RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Candidate recovery chat mismatch';
    END IF;
    IF (SELECT count(*) FROM pg_trigger t WHERE t.tgrelid='public.business_staff'::regclass AND NOT t.tgisinternal)<>6
      OR EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid='public.business_staff'::regclass AND NOT t.tgisinternal
        AND (t.tgenabled<>'O' OR pg_get_triggerdef(t.oid) NOT IN (${expectedAttachments},${newAttachments}))) THEN
      RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Candidate recovery attachment mismatch';
    END IF;
    IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='companion_candidate')<>3 THEN
      RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Candidate recovery scope mismatch';
    END IF;
    ${privateChecks}
  END; $$;`;
  return {
    // Callers MUST use a transaction and explicit rollback on failure. No CLI or
    // production execution path is supplied. Repeat install deliberately refuses.
    installSql: `${preflight}\n${guards}\n${chatDefinition}`,
    chatDefinition,
    // Memory-only exact recovery; never an automatic production rollback action.
    recoverSql: `${recoveryPreflight}
      DROP TRIGGER companion_c_other_commands ON public.business_staff;
      DROP TRIGGER companion_b_privileged_target ON public.business_staff;
      DROP TRIGGER companion_a_self_shift ON public.business_staff;
      DROP FUNCTION companion_candidate.deny_other_commands();
      DROP FUNCTION companion_candidate.reject_privileged_target();
      DROP FUNCTION companion_candidate.guard_self_shift();
      DROP SCHEMA companion_candidate;
      ${original}
    `,
  };
}
