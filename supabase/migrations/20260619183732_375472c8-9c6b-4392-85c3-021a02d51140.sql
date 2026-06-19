
CREATE OR REPLACE FUNCTION public.approve_business_claim(_claim_id uuid, _auto boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_bid uuid; v_uid uuid; v_kind text; v_prev uuid;
BEGIN
  SELECT business_id, claimant_user_id, kind INTO v_bid, v_uid, v_kind
    FROM public.business_claim_requests WHERE id = _claim_id;
  IF v_bid IS NULL THEN RAISE EXCEPTION 'Claim not found'; END IF;

  SELECT owner_id INTO v_prev FROM public.businesses WHERE id = v_bid;

  IF v_kind = 'transfer' THEN
    UPDATE public.businesses
       SET owner_id = v_uid,
           claim_state = 'owned',
           updated_at = now()
     WHERE id = v_bid;
  ELSE
    UPDATE public.businesses
       SET owner_id = v_uid,
           claim_state = 'owned',
           updated_at = now()
     WHERE id = v_bid AND owner_id IS NULL;
  END IF;

  UPDATE public.business_claim_requests
     SET status = CASE WHEN _auto THEN 'auto_approved' ELSE 'approved' END,
         decided_at = now()
   WHERE id = _claim_id;

  -- Record transfer in audit log
  IF v_kind = 'transfer' THEN
    INSERT INTO public.business_claim_audit (claim_id, actor_user_id, action, notes, details)
    VALUES (_claim_id, NULL, 'approved', 'Ownership transfer approved',
            jsonb_build_object('previous_owner_id', v_prev, 'new_owner_id', v_uid));
  END IF;

  -- Reject sibling pending claims for the same business
  UPDATE public.business_claim_requests
     SET status = 'rejected',
         reviewer_notes = COALESCE(reviewer_notes,'') || E'\nAuto-rejected: another claim approved.',
         decided_at = now()
   WHERE business_id = v_bid AND id <> _claim_id AND status = 'pending';
END $function$;
