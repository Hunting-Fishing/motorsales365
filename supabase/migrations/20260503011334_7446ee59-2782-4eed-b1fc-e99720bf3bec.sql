
ALTER TABLE public.tow_requests
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS dropped_off_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS eta_minutes integer,
  ADD COLUMN IF NOT EXISTS final_price_php numeric,
  ADD COLUMN IF NOT EXISTS completion_notes text;

CREATE OR REPLACE FUNCTION public.enforce_tow_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean := has_role(uid, 'admin'::app_role);
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF is_admin THEN
    -- admins bypass transition restrictions but still get auto-stamps below
    NULL;
  ELSE
    -- Validate transitions
    IF OLD.status = 'open' AND NEW.status IN ('accepted','cancelled') THEN
      NULL;
    ELSIF OLD.status = 'accepted' AND NEW.status IN ('picked_up','cancelled') THEN
      IF NEW.status = 'picked_up' AND uid <> NEW.provider_id THEN
        RAISE EXCEPTION 'Only the assigned provider can mark a job as picked up';
      END IF;
    ELSIF OLD.status = 'picked_up' AND NEW.status = 'dropped_off' THEN
      IF uid <> NEW.provider_id THEN
        RAISE EXCEPTION 'Only the assigned provider can mark a job as dropped off';
      END IF;
      IF NEW.final_price_php IS NULL OR NEW.final_price_php < 0 THEN
        RAISE EXCEPTION 'A final bill amount is required to mark dropped off';
      END IF;
    ELSIF OLD.status = 'dropped_off' AND NEW.status = 'completed' THEN
      IF uid <> NEW.requester_id THEN
        RAISE EXCEPTION 'Only the customer can confirm completion';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid tow request status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  -- Auto-stamp timestamps
  IF NEW.status = 'picked_up' AND NEW.picked_up_at IS NULL THEN
    NEW.picked_up_at := now();
  END IF;
  IF NEW.status = 'dropped_off' AND NEW.dropped_off_at IS NULL THEN
    NEW.dropped_off_at := now();
  END IF;
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_tow_status_transitions ON public.tow_requests;
CREATE TRIGGER trg_enforce_tow_status_transitions
  BEFORE UPDATE OF status ON public.tow_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.enforce_tow_status_transitions();

CREATE OR REPLACE FUNCTION public.notify_tow_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  body text;
  recipient uuid;
  sender uuid;
BEGIN
  IF NEW.status = OLD.status THEN
    -- Status didn't change; check if eta_minutes changed while picked_up
    IF NEW.status = 'picked_up' AND COALESCE(NEW.eta_minutes, -1) <> COALESCE(OLD.eta_minutes, -1) AND NEW.provider_id IS NOT NULL THEN
      INSERT INTO public.messages (sender_id, recipient_id, listing_id, body)
      VALUES (
        NEW.provider_id, NEW.requester_id, NEW.listing_id,
        'Updated drop-off ETA for "' || NEW.vehicle_summary || '": ' || COALESCE(NEW.eta_minutes::text, '?') || ' minutes.'
      );
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'picked_up' THEN
    sender := NEW.provider_id; recipient := NEW.requester_id;
    body := 'Your tow for "' || NEW.vehicle_summary || '" has been picked up.'
      || CASE WHEN NEW.eta_minutes IS NOT NULL THEN ' ETA to drop-off: ' || NEW.eta_minutes || ' minutes.' ELSE '' END;
  ELSIF NEW.status = 'dropped_off' THEN
    sender := NEW.provider_id; recipient := NEW.requester_id;
    body := 'Your vehicle "' || NEW.vehicle_summary || '" has been dropped off. Final bill: ₱'
      || COALESCE(NEW.final_price_php::text, '0') || '. Please confirm completion in your dashboard.'
      || CASE WHEN NEW.completion_notes IS NOT NULL THEN E'\n\n' || NEW.completion_notes ELSE '' END;
  ELSIF NEW.status = 'completed' THEN
    sender := NEW.requester_id; recipient := NEW.provider_id;
    body := 'Customer confirmed completion for "' || NEW.vehicle_summary || '". Final bill: ₱'
      || COALESCE(NEW.final_price_php::text, '0') || '. Thanks!';
  ELSIF NEW.status = 'cancelled' AND OLD.status IN ('accepted','picked_up') THEN
    sender := NEW.requester_id; recipient := NEW.provider_id;
    body := 'The customer cancelled the tow for "' || NEW.vehicle_summary || '".';
  ELSE
    RETURN NEW;
  END IF;

  IF sender IS NOT NULL AND recipient IS NOT NULL AND sender <> recipient THEN
    INSERT INTO public.messages (sender_id, recipient_id, listing_id, body)
    VALUES (sender, recipient, NEW.listing_id, body);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_tow_status_change ON public.tow_requests;
CREATE TRIGGER trg_notify_tow_status_change
  AFTER UPDATE ON public.tow_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tow_status_change();
