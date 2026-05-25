
CREATE OR REPLACE FUNCTION public.preview_org_invite(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE inv record;
BEGIN
  SELECT i.id, i.email, i.role, i.expires_at, i.accepted_at, o.name AS org_name
    INTO inv
    FROM public.organization_invites i
    JOIN public.organizations o ON o.id = i.organization_id
   WHERE i.token = _token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'email', inv.email,
    'role', inv.role::text,
    'org_name', inv.org_name,
    'accepted', inv.accepted_at IS NOT NULL,
    'expired', inv.expires_at < now()
  );
END $$;
GRANT EXECUTE ON FUNCTION public.preview_org_invite(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_org_invite(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text;
  inv public.organization_invites%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT email INTO uemail FROM auth.users WHERE id = uid;
  SELECT * INTO inv FROM public.organization_invites WHERE token = _token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF inv.accepted_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_accepted'); END IF;
  IF inv.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;
  IF lower(inv.email) <> lower(COALESCE(uemail,'')) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'email_mismatch', 'expected', inv.email);
  END IF;
  INSERT INTO public.organization_members(organization_id, user_id, role)
    VALUES (inv.organization_id, uid, inv.role)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  UPDATE public.organization_invites SET accepted_at = now() WHERE id = inv.id;
  RETURN jsonb_build_object('ok', true, 'organization_id', inv.organization_id);
END $$;
GRANT EXECUTE ON FUNCTION public.accept_org_invite(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_lead_notify_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  org_name text;
  rec record;
BEGIN
  SELECT name INTO org_name FROM public.organizations WHERE id = NEW.organization_id;
  FOR rec IN
    SELECT u.email
      FROM public.organization_members m
      JOIN auth.users u ON u.id = m.user_id
     WHERE m.organization_id = NEW.organization_id
       AND m.role IN ('owner','admin','manager')
       AND u.email IS NOT NULL
  LOOP
    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'template', 'team-new-lead',
      'to', rec.email,
      'data', jsonb_build_object(
        'org_name', COALESCE(org_name,'your team'),
        'customer_name', COALESCE(NEW.customer_name,'A customer'),
        'subject', COALESCE(NEW.subject,'New inquiry'),
        'preview', COALESCE(NEW.preview,''),
        'source', NEW.source::text,
        'lead_id', NEW.id::text
      )
    ));
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS leads_notify_org ON public.leads;
CREATE TRIGGER leads_notify_org AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_lead_notify_org();
