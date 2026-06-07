-- Add learn_rail enum value
ALTER TYPE public.ad_placement ADD VALUE IF NOT EXISTS 'learn_rail';

-- Add structured columns to ad_inquiries
ALTER TABLE public.ad_inquiries
  ADD COLUMN IF NOT EXISTS sections text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS formats text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_url text,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS duration_days int,
  ADD COLUMN IF NOT EXISTS creative_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audience_notes text;

-- Backfill: copy placement into sections for old rows
UPDATE public.ad_inquiries
SET sections = ARRAY[placement::text]
WHERE (sections IS NULL OR cardinality(sections) = 0) AND placement IS NOT NULL;

-- Extend the audit trigger to include new fields in the per-field diff
CREATE OR REPLACE FUNCTION public.tg_audit_ad_inquiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_actor uuid := auth.uid();
  v_changes jsonb := '{}'::jsonb;
  v_meta jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ad_inquiry_audit (inquiry_id, actor_id, action, metadata)
    VALUES (NEW.id, v_actor, 'created', jsonb_build_object('status', NEW.status));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Status transitions get semantic actions
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'won' THEN
        v_action := 'approved';
      ELSIF NEW.status = 'lost' THEN
        v_action := 'rejected';
        v_meta := jsonb_build_object('reason', NEW.last_rejection_reason);
      ELSIF OLD.status = 'lost' AND NEW.status = 'new' THEN
        v_action := 'resubmitted';
      ELSE
        v_action := 'status_changed';
        v_meta := jsonb_build_object('from', OLD.status, 'to', NEW.status);
      END IF;

      INSERT INTO public.ad_inquiry_audit (inquiry_id, actor_id, action, metadata)
      VALUES (NEW.id, v_actor, v_action, v_meta);
    END IF;

    -- Per-field edits
    IF NEW.contact_name IS DISTINCT FROM OLD.contact_name THEN
      v_changes := v_changes || jsonb_build_object('contact_name', jsonb_build_object('from', OLD.contact_name, 'to', NEW.contact_name));
    END IF;
    IF NEW.company IS DISTINCT FROM OLD.company THEN
      v_changes := v_changes || jsonb_build_object('company', jsonb_build_object('from', OLD.company, 'to', NEW.company));
    END IF;
    IF NEW.phone IS DISTINCT FROM OLD.phone THEN
      v_changes := v_changes || jsonb_build_object('phone', jsonb_build_object('from', OLD.phone, 'to', NEW.phone));
    END IF;
    IF NEW.placement IS DISTINCT FROM OLD.placement THEN
      v_changes := v_changes || jsonb_build_object('placement', jsonb_build_object('from', OLD.placement, 'to', NEW.placement));
    END IF;
    IF NEW.budget_range IS DISTINCT FROM OLD.budget_range THEN
      v_changes := v_changes || jsonb_build_object('budget_range', jsonb_build_object('from', OLD.budget_range, 'to', NEW.budget_range));
    END IF;
    IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN
      v_changes := v_changes || jsonb_build_object('start_date', jsonb_build_object('from', OLD.start_date, 'to', NEW.start_date));
    END IF;
    IF NEW.end_date IS DISTINCT FROM OLD.end_date THEN
      v_changes := v_changes || jsonb_build_object('end_date', jsonb_build_object('from', OLD.end_date, 'to', NEW.end_date));
    END IF;
    IF NEW.duration_days IS DISTINCT FROM OLD.duration_days THEN
      v_changes := v_changes || jsonb_build_object('duration_days', jsonb_build_object('from', OLD.duration_days, 'to', NEW.duration_days));
    END IF;
    IF NEW.target_url IS DISTINCT FROM OLD.target_url THEN
      v_changes := v_changes || jsonb_build_object('target_url', jsonb_build_object('from', OLD.target_url, 'to', NEW.target_url));
    END IF;
    IF NEW.creative_ready IS DISTINCT FROM OLD.creative_ready THEN
      v_changes := v_changes || jsonb_build_object('creative_ready', jsonb_build_object('from', OLD.creative_ready, 'to', NEW.creative_ready));
    END IF;
    IF NEW.audience_notes IS DISTINCT FROM OLD.audience_notes THEN
      v_changes := v_changes || jsonb_build_object('audience_notes', jsonb_build_object('from', OLD.audience_notes, 'to', NEW.audience_notes));
    END IF;
    IF NEW.sections IS DISTINCT FROM OLD.sections THEN
      v_changes := v_changes || jsonb_build_object('sections', jsonb_build_object('from', to_jsonb(OLD.sections), 'to', to_jsonb(NEW.sections)));
    END IF;
    IF NEW.formats IS DISTINCT FROM OLD.formats THEN
      v_changes := v_changes || jsonb_build_object('formats', jsonb_build_object('from', to_jsonb(OLD.formats), 'to', to_jsonb(NEW.formats)));
    END IF;
    IF NEW.message IS DISTINCT FROM OLD.message THEN
      v_changes := v_changes || jsonb_build_object('message', jsonb_build_object('from', OLD.message, 'to', NEW.message));
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      v_changes := v_changes || jsonb_build_object('assigned_to', jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to));
    END IF;
    IF NEW.internal_notes IS DISTINCT FROM OLD.internal_notes THEN
      v_changes := v_changes || jsonb_build_object('internal_notes', jsonb_build_object('from', OLD.internal_notes, 'to', NEW.internal_notes));
    END IF;

    IF v_changes <> '{}'::jsonb THEN
      INSERT INTO public.ad_inquiry_audit (inquiry_id, actor_id, action, metadata)
      VALUES (NEW.id, v_actor, 'edited', jsonb_build_object('changes', v_changes));
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;