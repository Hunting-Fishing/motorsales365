-- Extend welding_quote_status enum with approval workflow values (additive, preserves existing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.welding_quote_status'::regtype AND enumlabel = 'draft') THEN
    ALTER TYPE public.welding_quote_status ADD VALUE 'draft';
  END IF;
END$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.welding_quote_status'::regtype AND enumlabel = 'sent') THEN
    ALTER TYPE public.welding_quote_status ADD VALUE 'sent';
  END IF;
END$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.welding_quote_status'::regtype AND enumlabel = 'approved') THEN
    ALTER TYPE public.welding_quote_status ADD VALUE 'approved';
  END IF;
END$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.welding_quote_status'::regtype AND enumlabel = 'rejected') THEN
    ALTER TYPE public.welding_quote_status ADD VALUE 'rejected';
  END IF;
END$$;

-- Add approval-tracking columns to welding_quotes
ALTER TABLE public.welding_quotes
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Trigger: auto-log status changes to welding_quote_history and set timestamps
CREATE OR REPLACE FUNCTION public.welding_quote_log_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.welding_quote_history (quote_id, change_type, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'status_change', 'status', NULL, NEW.status::text, actor);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.welding_quote_history (quote_id, change_type, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'status_change', 'status', OLD.status::text, NEW.status::text, actor);

    IF NEW.status::text = 'sent' AND NEW.sent_at IS NULL THEN
      NEW.sent_at := now();
    ELSIF NEW.status::text IN ('approved','accepted') AND NEW.approved_at IS NULL THEN
      NEW.approved_at := now();
      NEW.approved_by := COALESCE(NEW.approved_by, actor);
    ELSIF NEW.status::text IN ('rejected','declined') AND NEW.rejected_at IS NULL THEN
      NEW.rejected_at := now();
      NEW.rejected_by := COALESCE(NEW.rejected_by, actor);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS welding_quote_status_log_ins ON public.welding_quotes;
CREATE TRIGGER welding_quote_status_log_ins
AFTER INSERT ON public.welding_quotes
FOR EACH ROW EXECUTE FUNCTION public.welding_quote_log_status_change();

DROP TRIGGER IF EXISTS welding_quote_status_log_upd ON public.welding_quotes;
CREATE TRIGGER welding_quote_status_log_upd
BEFORE UPDATE ON public.welding_quotes
FOR EACH ROW EXECUTE FUNCTION public.welding_quote_log_status_change();