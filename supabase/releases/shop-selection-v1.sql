-- Unapplied forward package. Requires the reviewed business/staff/shop-stock package.
-- Selection remains account-global in the retained native model, not session-local.
BEGIN;
SET LOCAL search_path=pg_catalog,pg_temp;
DO $$ BEGIN
  IF to_regprocedure('shop_stock_operations_v1.authorize(uuid,uuid,boolean)') IS NULL
    OR to_regprocedure('client_business_access_candidate.require_role(uuid,uuid,text[])') IS NULL
    OR to_regclass('shop_manager.register_sessions') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Reviewed shop dependencies required.';
  END IF;
END $$;
CREATE SCHEMA shop_selection_v1;
REVOKE ALL ON SCHEMA shop_selection_v1 FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE shop_selection_v1.profile_contexts(
  account_id uuid NOT NULL REFERENCES auth.users(id),
  shop_id uuid NOT NULL REFERENCES shop_manager.shops(id),
  context jsonb NOT NULL CHECK(jsonb_typeof(context)='object'),
  PRIMARY KEY(account_id,shop_id)
);
CREATE TABLE shop_selection_v1.outcomes(
  account_id uuid NOT NULL REFERENCES auth.users(id),
  operation_id uuid NOT NULL,
  request jsonb NOT NULL,
  result jsonb NOT NULL CHECK(result->>'status' IN ('completed','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(account_id,operation_id)
);
ALTER TABLE shop_selection_v1.profile_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_selection_v1.profile_contexts FORCE ROW LEVEL SECURITY;
ALTER TABLE shop_selection_v1.outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_selection_v1.outcomes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA shop_selection_v1 FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION shop_selection_v1.immutable() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
BEGIN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Selection outcome is immutable.'; END $$;
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON shop_selection_v1.outcomes
FOR EACH ROW EXECUTE FUNCTION shop_selection_v1.immutable();
CREATE TRIGGER immutable_table BEFORE TRUNCATE ON shop_selection_v1.outcomes
FOR EACH STATEMENT EXECUTE FUNCTION shop_selection_v1.immutable();

CREATE FUNCTION shop_selection_v1.require_session(a uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE j jsonb; u auth.users; s auth.sessions; expires numeric;
BEGIN
  IF current_setting('role',true) IS DISTINCT FROM 'authenticated'
    OR a IS NULL OR auth.uid() IS DISTINCT FROM a THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop selection unavailable.';
  END IF;
  j:=auth.jwt();
  IF j->>'role' IS DISTINCT FROM 'authenticated' OR j->>'session_id' IS NULL
    OR j->>'exp' IS NULL OR j->>'exp' !~ '^[0-9]{1,11}$' THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop selection unavailable.';
  END IF;
  expires:=(j->>'exp')::numeric;
  SELECT * INTO u FROM auth.users WHERE id=a FOR SHARE;
  IF NOT FOUND OR u.deleted_at IS NOT NULL OR u.is_anonymous IS DISTINCT FROM FALSE
    OR (u.banned_until IS NOT NULL AND u.banned_until>clock_timestamp()) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop selection unavailable.';
  END IF;
  SELECT * INTO s FROM auth.sessions WHERE id=(j->>'session_id')::uuid AND user_id=a FOR SHARE;
  IF NOT FOUND OR expires<=extract(epoch FROM clock_timestamp())
    OR (s.not_after IS NOT NULL AND s.not_after<=clock_timestamp()) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop selection unavailable.';
  END IF;
END $$;
CREATE FUNCTION shop_selection_v1.native_role(r text) RETURNS text
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
  SELECT CASE r WHEN 'owner' THEN 'owner' WHEN 'manager' THEN 'manager'
    WHEN 'assistant_manager' THEN 'manager' WHEN 'dispatcher' THEN 'dispatch'
    WHEN 'driver' THEN 'truck_driver' WHEN 'mechanic' THEN 'technician'
    WHEN 'clerk' THEN 'office_admin' END
$$;
CREATE FUNCTION shop_selection_v1.blocker(a uuid) RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
  SELECT CASE
    WHEN EXISTS(SELECT 1 FROM shop_manager.register_sessions WHERE opened_by_user_id=a AND status='open') THEN 'open_register'
    WHEN EXISTS(SELECT 1 FROM shop_manager.employee_shifts WHERE user_id=a AND status IN ('on_shift','on_break')) THEN 'active_shift'
    WHEN EXISTS(SELECT 1 FROM shop_manager.user_roles ur LEFT JOIN shop_manager.roles r ON r.id=ur.role_id
      WHERE ur.user_id=a AND (r.id IS NULL OR r.name::text NOT IN
        ('owner','manager','dispatch','truck_driver','technician','office_admin','other_staff'))) THEN 'role_review'
    ELSE NULL END
$$;

-- No ordinary caller may move its own profile or edit account-global role rows
-- directly. Trusted existing DEFINER lifecycle writers retain their owner rights.
-- This does not certify every legacy DEFINER helper as safe.
CREATE FUNCTION shop_selection_v1.direct_authority_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF current_user=pg_get_userbyid((SELECT nspowner FROM pg_namespace WHERE nspname='shop_selection_v1')) THEN
    IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF TG_TABLE_NAME='profiles' AND TG_OP='UPDATE' THEN
    IF OLD.id=auth.uid() AND OLD.user_id=auth.uid()
      AND (to_jsonb(NEW)-ARRAY['first_name','last_name','middle_name','full_name','phone','notification_preferences','automotive_region','updated_at'])
        IS NOT DISTINCT FROM (to_jsonb(OLD)-ARRAY['first_name','last_name','middle_name','full_name','phone','notification_preferences','automotive_region','updated_at']) THEN
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Use the authorized shop or staff workflow.';
END $$;
CREATE TRIGGER zz_selection_profile_authority BEFORE INSERT OR UPDATE OR DELETE ON shop_manager.profiles
FOR EACH ROW EXECUTE FUNCTION shop_selection_v1.direct_authority_guard();
CREATE TRIGGER zz_selection_role_catalog BEFORE INSERT OR UPDATE OR DELETE ON shop_manager.roles
FOR EACH ROW EXECUTE FUNCTION shop_selection_v1.direct_authority_guard();
CREATE TRIGGER zz_selection_role_assignment BEFORE INSERT OR UPDATE OR DELETE ON shop_manager.user_roles
FOR EACH ROW EXECUTE FUNCTION shop_selection_v1.direct_authority_guard();
-- Column grants and TRUNCATE must not provide an alternate direct authority path.
REVOKE TRUNCATE ON shop_manager.profiles,shop_manager.roles,shop_manager.user_roles FROM PUBLIC,anon,authenticated,service_role;

-- Serialize newly active shifts/registers with selection's profile row lock.
-- Closing a shift/register is never fabricated by a selection change. A concurrent
-- close may conservatively cause a busy rejection; a new activation must recheck
-- its shop after waiting for the profile lock.
CREATE FUNCTION shop_selection_v1.active_work_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE a uuid; p shop_manager.profiles; candidate shop_manager.profiles; n integer:=0;
BEGIN
  IF (TG_TABLE_NAME='employee_shifts' AND NEW.status NOT IN ('on_shift','on_break'))
    OR (TG_TABLE_NAME='register_sessions' AND NEW.status<>'open') THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME='employee_shifts' THEN a:=NEW.user_id; ELSE a:=NEW.opened_by_user_id; END IF;
  PERFORM shop_stock_operations_v1.authorize(a,NEW.shop_id,false);
  FOR candidate IN SELECT * FROM shop_manager.profiles WHERE id=a OR user_id=a ORDER BY id FOR SHARE LOOP
    n:=n+1; p:=candidate;
  END LOOP;
  IF n<>1 OR p.id IS DISTINCT FROM a OR p.user_id IS DISTINCT FROM a OR p.shop_id IS DISTINCT FROM NEW.shop_id THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Selected shop changed.';
  END IF;
  IF TG_TABLE_NAME='employee_shifts' THEN
    IF NEW.profile_id IS DISTINCT FROM p.id THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Invalid shift profile.'; END IF;
  ELSE
    IF NEW.opened_by_profile_id IS DISTINCT FROM p.id OR NOT EXISTS(SELECT 1 FROM shop_manager.employee_shifts
      WHERE id=NEW.shift_id AND user_id=a AND profile_id=p.id AND shop_id=NEW.shop_id AND status IN ('on_shift','on_break')) THEN
      RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Invalid register shift.';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER zz_selection_shift_activation BEFORE INSERT OR UPDATE ON shop_manager.employee_shifts
FOR EACH ROW EXECUTE FUNCTION shop_selection_v1.active_work_guard();
CREATE TRIGGER zz_selection_register_activation BEFORE INSERT OR UPDATE ON shop_manager.register_sessions
FOR EACH ROW EXECUTE FUNCTION shop_selection_v1.active_work_guard();

CREATE FUNCTION shop_selection_v1.list_shops(a uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='5s' AS $$
DECLARE p shop_manager.profiles; candidate shop_manager.profiles; n integer:=0; choices jsonb; blocked text; state text;
BEGIN
  PERFORM shop_selection_v1.require_session(a);
  FOR candidate IN SELECT * FROM shop_manager.profiles WHERE id=a OR user_id=a ORDER BY id FOR SHARE LOOP
    n:=n+1; p:=candidate;
  END LOOP;
  IF n<>1 OR p.id IS DISTINCT FROM a OR p.user_id IS DISTINCT FROM a THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Canonical employee profile required.';
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.name,t."shopId"),'[]'::jsonb) INTO choices FROM (
    SELECT s.id "shopId",s.business_id "businessId",s.name,
      CASE WHEN b.owner_id=a THEN 'owner' ELSE bs.role::text END role
    FROM shop_manager.shops s JOIN public.businesses b ON b.id=s.business_id
    LEFT JOIN public.business_staff bs ON bs.business_id=b.id AND bs.user_id=a AND bs.active IS TRUE
    WHERE s.is_active IS TRUE AND b.owner_id IS NOT NULL AND (b.owner_id=a
      OR bs.role::text IN ('manager','assistant_manager','dispatcher','driver','mechanic','clerk'))
    ORDER BY s.name,s.id LIMIT 101
  ) t;
  IF jsonb_array_length(choices)>100 THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Shop list requires support.'; END IF;
  blocked:=shop_selection_v1.blocker(a);
  PERFORM shop_selection_v1.require_session(a);
  RETURN jsonb_build_object('version',1,'accountId',a,'profileId',p.id,'selectedShopId',p.shop_id,
    'profileUpdatedAt',p.updated_at,'shops',choices,'blocker',blocked);
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS state=RETURNED_SQLSTATE;
  RAISE EXCEPTION USING ERRCODE=state,MESSAGE='Shop selection unavailable.';
END $$;

CREATE FUNCTION shop_selection_v1.execute(request jsonb,inspect boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='5s' AS $$
DECLARE a uuid; op uuid; target uuid; prior uuid; expected_at timestamptz; profile_id uuid;
  p shop_manager.profiles; candidate shop_manager.profiles; changed shop_manager.profiles;
  saved shop_selection_v1.outcomes; inserted shop_selection_v1.outcomes;
  n integer:=0; role_name text; mapped text; v_role_id uuid; blocked text; result jsonb;
  source_context jsonb; target_context jsonb; check_context jsonb; state text;
BEGIN
  IF inspect IS NULL OR jsonb_typeof(request) IS DISTINCT FROM 'object'
    OR request->'version' IS DISTINCT FROM '1'::jsonb OR (SELECT count(*) FROM jsonb_object_keys(request))<>7
    OR NOT(request ?& ARRAY['version','expectedAccountId','operationId','profileId','expectedShopId','expectedUpdatedAt','targetShopId'])
    OR EXISTS(SELECT 1 FROM jsonb_each(request) x WHERE x.key NOT IN ('version','expectedShopId') AND jsonb_typeof(x.value)<>'string')
    OR jsonb_typeof(request->'expectedShopId') NOT IN ('string','null') THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid selection request.';
  END IF;
  a:=(request->>'expectedAccountId')::uuid; op:=(request->>'operationId')::uuid;
  target:=(request->>'targetShopId')::uuid; prior:=(request->>'expectedShopId')::uuid;
  profile_id:=(request->>'profileId')::uuid;
  IF a IS NULL OR op IS NULL OR target IS NULL OR profile_id IS DISTINCT FROM a
    OR request->>'expectedUpdatedAt' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$' THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid selection request.';
  END IF;
  expected_at:=(request->>'expectedUpdatedAt')::timestamptz;
  IF NOT isfinite(expected_at) THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid selection version.'; END IF;
  PERFORM shop_selection_v1.require_session(a);
  PERFORM pg_advisory_xact_lock(hashtextextended('365-shop-selection-v1:'||a::text,0));
  PERFORM shop_selection_v1.require_session(a);
  SELECT * INTO saved FROM shop_selection_v1.outcomes WHERE account_id=a AND operation_id=op;
  IF FOUND THEN
    IF saved.request IS DISTINCT FROM request THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Selection identity conflict.'; END IF;
    RETURN saved.result; -- Historical receipt only. The UI must reload the live selection.
  ELSIF inspect THEN
    RETURN jsonb_build_object('version',1,'status','not_observed','request',request);
  END IF;
  -- A recorded receipt is the caller's own history, not destination authority.
  -- Every NEW selection still requires current membership and a reviewed role.
  role_name:=shop_stock_operations_v1.authorize(a,target,false);
  mapped:=shop_selection_v1.native_role(role_name);
  SELECT id INTO v_role_id FROM shop_manager.roles WHERE name::text=mapped FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Reviewed role mapping required.'; END IF;
  FOR candidate IN SELECT * FROM shop_manager.profiles WHERE id=a OR user_id=a ORDER BY id FOR UPDATE LOOP
    n:=n+1; p:=candidate;
  END LOOP;
  IF n<>1 OR p.id IS DISTINCT FROM a OR p.user_id IS DISTINCT FROM a THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Canonical employee profile required.';
  END IF;
  IF p.shop_id IS DISTINCT FROM prior OR p.updated_at IS DISTINCT FROM expected_at THEN blocked:='conflict';
  ELSE blocked:=shop_selection_v1.blocker(a); END IF;
  IF blocked IS NOT NULL THEN
    result:=jsonb_build_object('version',1,'status','rejected','request',request,'code',blocked);
  ELSE
    IF p.shop_id IS DISTINCT FROM target THEN
      -- Department/rate values must not follow the user into a different business.
      IF p.shop_id IS NOT NULL THEN
        source_context:=jsonb_build_object('job_title',p.job_title,'department',p.department,
          'department_id',p.department_id,'hourly_rate',p.hourly_rate,'cost_rate',p.cost_rate);
        INSERT INTO shop_selection_v1.profile_contexts(account_id,shop_id,context) VALUES(a,p.shop_id,source_context)
          ON CONFLICT(account_id,shop_id) DO UPDATE SET context=EXCLUDED.context RETURNING context INTO check_context;
        IF NOT FOUND OR check_context IS DISTINCT FROM source_context OR NOT EXISTS(
          SELECT 1 FROM shop_selection_v1.profile_contexts WHERE account_id=a AND shop_id=p.shop_id AND context=source_context) THEN
          RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Shop context was not retained.';
        END IF;
      END IF;
      SELECT context INTO target_context FROM shop_selection_v1.profile_contexts WHERE account_id=a AND shop_id=target;
      UPDATE shop_manager.profiles SET shop_id=target,updated_at=clock_timestamp(),
        job_title=target_context->>'job_title',department=target_context->>'department',
        department_id=(target_context->>'department_id')::uuid,
        hourly_rate=(target_context->>'hourly_rate')::numeric,cost_rate=(target_context->>'cost_rate')::numeric
        WHERE id=a AND user_id=a RETURNING * INTO changed;
      IF NOT FOUND OR changed.shop_id IS DISTINCT FROM target OR changed.updated_at IS NULL
        OR (to_jsonb(changed)-ARRAY['shop_id','updated_at','job_title','department','department_id','hourly_rate','cost_rate'])
          IS DISTINCT FROM (to_jsonb(p)-ARRAY['shop_id','updated_at','job_title','department','department_id','hourly_rate','cost_rate'])
        OR changed.job_title IS DISTINCT FROM target_context->>'job_title'
        OR changed.department IS DISTINCT FROM target_context->>'department'
        OR changed.department_id IS DISTINCT FROM (target_context->>'department_id')::uuid
        OR changed.hourly_rate IS DISTINCT FROM (target_context->>'hourly_rate')::numeric
        OR changed.cost_rate IS DISTINCT FROM (target_context->>'cost_rate')::numeric THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Selected shop unconfirmed.';
      END IF;
    ELSE changed:=p; END IF;
    -- Rebind account-global native roles from authoritative membership, never
    -- copy owner/manager rights from the previous shop into the destination.
    DELETE FROM shop_manager.user_roles WHERE user_id=a;
    INSERT INTO shop_manager.user_roles(user_id,role_id) VALUES(a,v_role_id);
    IF (SELECT count(*) FROM shop_manager.user_roles WHERE user_id=a)<>1 OR NOT EXISTS(
      SELECT 1 FROM shop_manager.user_roles WHERE user_id=a AND shop_manager.user_roles.role_id=v_role_id) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Selected role unconfirmed.';
    END IF;
    SELECT * INTO candidate FROM shop_manager.profiles WHERE id=a AND user_id=a;
    IF NOT FOUND OR to_jsonb(candidate) IS DISTINCT FROM to_jsonb(changed)
      OR shop_selection_v1.blocker(a) IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Selected shop changed.';
    END IF;
    result:=jsonb_build_object('version',1,'status','completed','request',request,
      'selectedShopId',target,'profileUpdatedAt',changed.updated_at,'nativeRole',mapped);
  END IF;
  INSERT INTO shop_selection_v1.outcomes(account_id,operation_id,request,result)
    VALUES(a,op,request,result) RETURNING * INTO inserted;
  IF NOT FOUND OR inserted.account_id IS DISTINCT FROM a OR inserted.operation_id IS DISTINCT FROM op
    OR inserted.request IS DISTINCT FROM request OR inserted.result IS DISTINCT FROM result OR inserted.created_at IS DISTINCT FROM now() THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Selection outcome unconfirmed.';
  END IF;
  SELECT * INTO saved FROM shop_selection_v1.outcomes WHERE account_id=a AND operation_id=op;
  IF NOT FOUND OR to_jsonb(saved) IS DISTINCT FROM to_jsonb(inserted) THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Selection outcome unconfirmed.';
  END IF;
  PERFORM shop_selection_v1.require_session(a);
  IF shop_stock_operations_v1.authorize(a,target,false) IS DISTINCT FROM role_name THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Shop access changed.';
  END IF;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS state=RETURNED_SQLSTATE;
  RAISE EXCEPTION USING ERRCODE=state,MESSAGE='Shop selection could not be confirmed.';
END $$;
CREATE FUNCTION public.shop_selection_list_v1(_account uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$ SELECT shop_selection_v1.list_shops(_account) $$;
CREATE FUNCTION public.shop_selection_change_v1(_request jsonb,_inspect boolean DEFAULT false) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$ SELECT shop_selection_v1.execute(_request,_inspect) $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA shop_selection_v1 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.shop_selection_list_v1(uuid),public.shop_selection_change_v1(jsonb,boolean)
FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA shop_selection_v1 TO authenticated;
GRANT EXECUTE ON FUNCTION shop_selection_v1.list_shops(uuid),shop_selection_v1.execute(jsonb,boolean),
  public.shop_selection_list_v1(uuid),public.shop_selection_change_v1(jsonb,boolean) TO authenticated;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_namespace n,LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a
    WHERE n.nspname='shop_selection_v1' AND a.grantee<>n.nspowner AND NOT(a.grantee='authenticated'::regrole AND a.privilege_type='USAGE' AND NOT a.is_grantable))
  OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace,
    LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a
    WHERE n.nspname='shop_selection_v1' AND a.grantee<>c.relowner)
  OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace,
    LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
    WHERE (n.nspname='shop_selection_v1' OR p.oid IN ('public.shop_selection_list_v1(uuid)'::regprocedure,
      'public.shop_selection_change_v1(jsonb,boolean)'::regprocedure)) AND a.grantee<>p.proowner
      AND NOT(a.grantee='authenticated'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable
        AND p.proname IN ('list_shops','execute','shop_selection_list_v1','shop_selection_change_v1'))) THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Unexpected selection privileges.';
  END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
