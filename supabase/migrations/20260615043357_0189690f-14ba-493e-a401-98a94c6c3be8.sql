
CREATE OR REPLACE FUNCTION public.tg_notify_report_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user uuid;
  v_rep uuid;
  v_listing_title text;
BEGIN
  -- Resolve target user
  IF NEW.listing_id IS NOT NULL THEN
    SELECT user_id, title INTO v_target_user, v_listing_title
    FROM public.listings WHERE id = NEW.listing_id;
  END IF;

  -- Insert admin ops alert (visible in Admin → Alerts)
  INSERT INTO public.ops_alerts (event, severity, source, details)
  VALUES (
    'report_filed',
    'warning',
    'reports',
    jsonb_build_object(
      'report_id', NEW.id,
      'target_type', NEW.target_type,
      'target_user_id', v_target_user,
      'reporter_id', NEW.reporter_id,
      'category', NEW.category,
      'reason', NEW.reason,
      'listing_id', NEW.listing_id,
      'listing_title', v_listing_title
    )
  );

  -- Notify assigned 365 sales rep (if any) via a follow-up task
  IF v_target_user IS NOT NULL AND (NEW.reporter_id IS NULL OR NEW.reporter_id <> v_target_user) THEN
    SELECT rep_user_id INTO v_rep
    FROM public.sales_rep_assignments
    WHERE active = true
      AND subject_type = 'user'
      AND subject_id = v_target_user
    LIMIT 1;

    IF v_rep IS NOT NULL THEN
      INSERT INTO public.sales_rep_followups
        (rep_user_id, subject_type, subject_id, kind, status, title, body)
      VALUES (
        v_rep,
        'user',
        v_target_user,
        'request',
        'open',
        'Client reported — please reach out',
        format(
          'A report was filed against your client%s. Category: %s. Reason: %s. Report ID: %s',
          CASE WHEN v_listing_title IS NOT NULL THEN ' (listing: '||v_listing_title||')' ELSE '' END,
          coalesce(NEW.category,'n/a'),
          coalesce(NEW.reason,'n/a'),
          NEW.id::text
        )
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block report insert on notification failure
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_report_created ON public.reports;
CREATE TRIGGER trg_notify_report_created
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_report_created();
