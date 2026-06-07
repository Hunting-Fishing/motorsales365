
CREATE OR REPLACE FUNCTION public.tg_audit_ad_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_name text;
  changes jsonb := '{}'::jsonb;
  meta jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, to_value)
      VALUES (NEW.id, NEW.submitter_user_id, 'created', NEW.status::text);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      action_name := CASE
        WHEN NEW.status::text = 'won' THEN 'approved'
        WHEN NEW.status::text = 'lost' THEN 'rejected'
        WHEN OLD.status::text = 'lost' AND NEW.status::text = 'new' THEN 'resubmitted'
        ELSE 'status_changed'
      END;
      meta := '{}'::jsonb;
      IF action_name = 'rejected' AND NEW.last_rejection_reason IS NOT NULL THEN
        meta := jsonb_build_object('reason', NEW.last_rejection_reason);
      END IF;
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, from_value, to_value, metadata)
        VALUES (NEW.id, auth.uid(), action_name, OLD.status::text, NEW.status::text, meta);
    END IF;

    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, from_value, to_value)
        VALUES (NEW.id, auth.uid(), 'assigned',
                COALESCE(OLD.assigned_to::text,''), COALESCE(NEW.assigned_to::text,''));
    END IF;

    IF COALESCE(NEW.internal_notes,'') IS DISTINCT FROM COALESCE(OLD.internal_notes,'') THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action)
        VALUES (NEW.id, auth.uid(), 'notes_updated');
    END IF;

    -- Per-field before/after diff for sponsor-visible fields
    IF NEW.contact_name IS DISTINCT FROM OLD.contact_name THEN
      changes := changes || jsonb_build_object('contact_name', jsonb_build_object('from', OLD.contact_name, 'to', NEW.contact_name));
    END IF;
    IF COALESCE(NEW.company,'') IS DISTINCT FROM COALESCE(OLD.company,'') THEN
      changes := changes || jsonb_build_object('company', jsonb_build_object('from', OLD.company, 'to', NEW.company));
    END IF;
    IF COALESCE(NEW.phone,'') IS DISTINCT FROM COALESCE(OLD.phone,'') THEN
      changes := changes || jsonb_build_object('phone', jsonb_build_object('from', OLD.phone, 'to', NEW.phone));
    END IF;
    IF NEW.placement IS DISTINCT FROM OLD.placement THEN
      changes := changes || jsonb_build_object('placement', jsonb_build_object('from', OLD.placement::text, 'to', NEW.placement::text));
    END IF;
    IF COALESCE(NEW.budget_range,'') IS DISTINCT FROM COALESCE(OLD.budget_range,'') THEN
      changes := changes || jsonb_build_object('budget_range', jsonb_build_object('from', OLD.budget_range, 'to', NEW.budget_range));
    END IF;
    IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN
      changes := changes || jsonb_build_object('start_date', jsonb_build_object('from', OLD.start_date::text, 'to', NEW.start_date::text));
    END IF;
    IF NEW.message IS DISTINCT FROM OLD.message THEN
      changes := changes || jsonb_build_object('message', jsonb_build_object('from', OLD.message, 'to', NEW.message));
    END IF;

    IF changes <> '{}'::jsonb THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, metadata)
        VALUES (NEW.id, auth.uid(), 'edited', jsonb_build_object('changes', changes));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
