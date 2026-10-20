// Staged, source-pinned roster lifecycle repair. No hosted/database execution.
// Reuses retained functions and preserves their existing execution ACLs.
import { createHash } from "node:crypto";
import { functions } from "../ci/fixtures/native-staff-trigger-fixture.mjs";

const md5 = (text) => createHash("md5").update(text).digest("hex");
const body = (text) => text.slice(text.indexOf("$$") + 2, text.lastIndexOf("$$"));
function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw new Error("Retained lifecycle source changed");
  return source.replace(before, after);
}
export function buildStaffLifecycleRepair() {
  if (arguments.length) throw new Error("Fixed lifecycle repair takes no arguments");
  let chat = replaceOnce(functions.chat, "SET status = 'inactive'", "SET status = 'left'");
  chat = replaceOnce(
    chat,
    "BEGIN\n",
    `BEGIN
  -- A shift or metadata edit must not rejoin a previously left team chat.
  IF TG_OP='UPDATE' AND NEW.business_id IS NOT DISTINCT FROM OLD.business_id
    AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
    AND NEW.active IS NOT DISTINCT FROM OLD.active THEN
    RETURN NEW;
  END IF;
`,
  );
  const oldInactive = `  IF NOT _active THEN
    UPDATE shop_manager.register_sessions SET status='manager_closed',closed_at=now(),counted_cash=expected_cash,variance=0,closing_note='Employee access deactivated' WHERE opened_by_user_id=_user_id AND status='open';
    UPDATE shop_manager.employee_shifts SET status='clocked_out',clocked_out_at=now(),closing_note='Employee access deactivated',updated_at=now() WHERE user_id=_user_id AND status IN ('on_shift','on_break');
    UPDATE shop_manager.profiles SET shop_id=NULL,updated_at=now() WHERE user_id=_user_id AND shop_id=v_shop_id;
    DELETE FROM shop_manager.user_roles ur USING shop_manager.roles r WHERE ur.role_id=r.id AND ur.user_id=_user_id AND r.name::text IN ('owner','manager','dispatch','truck_driver','technician','office_admin');
    RETURN;
  END IF;

`;
  let native = replaceOnce(functions.nativeMember, oldInactive, "");
  native = replaceOnce(
    native,
    "  v_email text;",
    "  v_email text;\n  v_profile_id uuid;\n  v_detached_id uuid;",
  );
  const offboarding = `  IF _active IS NULL OR _business_id IS NULL OR _user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Staff lifecycle request unavailable';
  END IF;
  IF NOT _active THEN
    -- Do not provision a new shop/register merely to deactivate an employee.
    SELECT id INTO v_shop_id FROM shop_manager.shops WHERE business_id=_business_id;
    IF NOT FOUND THEN RETURN; END IF;
    -- Closing access is not a cash count or a reconciliation. Preserve money.
    UPDATE shop_manager.register_sessions
      SET status='manager_closed',closed_at=now(),closed_by=auth.uid(),
        closing_note='Employee access deactivated; cash reconciliation required'
      WHERE shop_id=v_shop_id AND opened_by_user_id=_user_id AND status='open';
    UPDATE shop_manager.employee_shifts
      SET status='manager_closed',clocked_out_at=now(),closed_by=auth.uid(),
        closing_note='Employee access deactivated',updated_at=now()
      WHERE shop_id=v_shop_id AND user_id=_user_id AND status IN ('on_shift','on_break');
    IF EXISTS (SELECT 1 FROM shop_manager.register_sessions
      WHERE shop_id=v_shop_id AND opened_by_user_id=_user_id AND status='open')
      OR EXISTS (SELECT 1 FROM shop_manager.employee_shifts
      WHERE shop_id=v_shop_id AND user_id=_user_id AND status IN ('on_shift','on_break')) THEN
      RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Staff lifecycle close unconfirmed';
    END IF;
    -- Native roles are legacy account-global rows. Do not strip the current
    -- other shop's roles when removing a membership in this business.
    SELECT id INTO v_profile_id FROM shop_manager.profiles
      WHERE user_id=_user_id AND shop_id=v_shop_id FOR UPDATE;
    IF FOUND THEN
      UPDATE shop_manager.profiles SET shop_id=NULL,updated_at=now()
        WHERE id=v_profile_id AND user_id=_user_id AND shop_id=v_shop_id
        RETURNING id INTO v_detached_id;
      IF NOT FOUND OR v_detached_id IS DISTINCT FROM v_profile_id
        OR NOT EXISTS (SELECT 1 FROM shop_manager.profiles
          WHERE id=v_profile_id AND user_id=_user_id AND shop_id IS NULL) THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Staff lifecycle detach unconfirmed';
      END IF;
      DELETE FROM shop_manager.user_roles ur USING shop_manager.roles r
        WHERE ur.role_id=r.id AND ur.user_id=_user_id
          AND r.name::text IN ('owner','manager','dispatch','truck_driver','technician','office_admin','other_staff');
      IF EXISTS (SELECT 1 FROM shop_manager.user_roles ur JOIN shop_manager.roles r ON r.id=ur.role_id
        WHERE ur.user_id=_user_id AND r.name::text IN
          ('owner','manager','dispatch','truck_driver','technician','office_admin','other_staff')) THEN
        RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Staff lifecycle roles unconfirmed';
      END IF;
    END IF;
    RETURN;
  END IF;

`;
  native = replaceOnce(
    native,
    "  INSERT INTO shop_manager.shops(",
    offboarding + "  INSERT INTO shop_manager.shops(",
  );
  const preflight = `DO $$ BEGIN
    IF to_regnamespace('client_business_access_candidate') IS NULL THEN
      RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Staff boundary prerequisite missing';
    END IF;
    IF (SELECT md5(replace(prosrc,chr(13),'')) FROM pg_proc
        WHERE oid='public.trg_staff_sync_team_thread()'::regprocedure)
        IS DISTINCT FROM '${md5(body(functions.chat))}'
      OR (SELECT md5(replace(prosrc,chr(13),'')) FROM pg_proc
        WHERE oid='shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)'::regprocedure)
        IS DISTINCT FROM '${md5(body(functions.nativeMember))}' THEN
      RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Retained staff lifecycle source differs';
    END IF;
  END $$;`;
  return Object.freeze({
    installSql: `BEGIN;\nSET LOCAL search_path=pg_catalog,pg_temp;\n${preflight}\n${chat}\n${native}\nCOMMIT;`,
    chatDefinition: chat,
    nativeDefinition: native,
    originalChatMd5: md5(body(functions.chat)),
    originalNativeMd5: md5(body(functions.nativeMember)),
  });
}
