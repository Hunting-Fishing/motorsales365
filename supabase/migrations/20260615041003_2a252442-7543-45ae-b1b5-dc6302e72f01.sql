
-- ============================================================
-- boost_credits wallet (positive = grant, negative = consumption)
-- ============================================================
CREATE TABLE public.boost_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount int NOT NULL CHECK (amount <> 0),
  source text NOT NULL CHECK (source IN ('reward','purchase','manual','consumption')),
  reward_id uuid REFERENCES public.member_rewards(id) ON DELETE SET NULL,
  listing_boost_id uuid REFERENCES public.listing_boosts(id) ON DELETE SET NULL,
  note text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX boost_credits_user_idx ON public.boost_credits(user_id, created_at DESC);

GRANT SELECT ON public.boost_credits TO authenticated;
GRANT ALL ON public.boost_credits TO service_role;

ALTER TABLE public.boost_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own boost_credits" ON public.boost_credits
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "staff read boost_credits" ON public.boost_credits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE OR REPLACE FUNCTION public.get_boost_credit_balance(_user_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(amount),0)::int FROM public.boost_credits WHERE user_id = _user_id;
$$;

-- ============================================================
-- profiles.tier_id cache
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier_id text REFERENCES public.member_tiers(id) ON DELETE SET NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS tier_recomputed_at timestamptz;
CREATE INDEX IF NOT EXISTS profiles_tier_idx ON public.profiles(tier_id);

-- Pure function: compute tier for a user given current score + tenure
CREATE OR REPLACE FUNCTION public.compute_user_tier(_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _score int;
  _tenure_days int;
  _tier text;
BEGIN
  SELECT public.get_trust_score(_user_id) INTO _score;
  SELECT EXTRACT(DAY FROM now() - created_at)::int INTO _tenure_days
    FROM auth.users WHERE id = _user_id;
  IF _tenure_days IS NULL THEN _tenure_days := 0; END IF;

  SELECT id INTO _tier FROM public.member_tiers
   WHERE _score >= min_score AND _tenure_days >= min_tenure_days
   ORDER BY rank DESC LIMIT 1;

  RETURN COALESCE(_tier, 'common');
END $$;

-- ============================================================
-- resolve_report_dispute RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_report_dispute(
  _dispute_id uuid,
  _decision text,           -- 'uphold' | 'overturn'
  _response text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _dispute public.report_disputes%ROWTYPE;
  _orig_action public.report_actions%ROWTYPE;
  _refund int := 0;
  _new_status text;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _decision NOT IN ('uphold','overturn') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;
  IF _response IS NULL OR length(trim(_response)) < 10 THEN
    RAISE EXCEPTION 'Response note required (min 10 chars)';
  END IF;

  SELECT * INTO _dispute FROM public.report_disputes WHERE id = _dispute_id FOR UPDATE;
  IF _dispute.id IS NULL THEN RAISE EXCEPTION 'Dispute not found'; END IF;
  IF _dispute.status <> 'open' THEN RAISE EXCEPTION 'Dispute already resolved'; END IF;

  _new_status := CASE WHEN _decision = 'uphold' THEN 'upheld' ELSE 'overturned' END;

  IF _decision = 'overturn' THEN
    -- Find latest accept action on this report to reverse
    SELECT * INTO _orig_action FROM public.report_actions
      WHERE report_id = _dispute.report_id AND action = 'accept'
        AND reversed_by_action_id IS NULL
      ORDER BY created_at DESC LIMIT 1;

    IF _orig_action.id IS NOT NULL THEN
      -- Use apply_report_action to perform the reversal cleanly
      PERFORM public.apply_report_action(
        _dispute.report_id, 'reverse',
        'Dispute overturned: ' || _response,
        false, false, true, _orig_action.id
      );
      _refund := COALESCE(-_orig_action.score_delta, 0) + 5; -- bonus +5 for wrongful report

      -- Add the +5 bonus event (the reverse already refunded the original delta)
      INSERT INTO public.trust_score_events(user_id, delta, reason_code, reason_label, source_type, source_id, actor_id)
      VALUES (_dispute.user_id, 5, 'dispute_overturned_bonus', 'Wrongly-reported bonus', 'dispute', _dispute.id, _actor);

      -- If the listing is currently hidden because of the original action, restore it
      IF _orig_action.listing_effect = 'hidden' THEN
        UPDATE public.listings SET status='active'
          WHERE id = (SELECT listing_id FROM public.reports WHERE id = _dispute.report_id);
      END IF;
    END IF;
  END IF;

  UPDATE public.report_disputes SET
    status = _new_status,
    admin_response = _response,
    resolved_by = _actor,
    resolved_at = now(),
    score_refund = _refund
  WHERE id = _dispute_id;

  RETURN _dispute_id;
END $$;

REVOKE ALL ON FUNCTION public.resolve_report_dispute(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_report_dispute(uuid,text,text) TO authenticated;

-- ============================================================
-- grant_member_reward RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_member_reward(
  _user_id uuid,
  _kind text,
  _amount int,
  _tier_id text,
  _period text,
  _note text,
  _expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _reward_id uuid;
BEGIN
  IF _actor IS NOT NULL AND NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _kind NOT IN ('boost_credit','featured_badge','spotlight','custom') THEN
    RAISE EXCEPTION 'Invalid kind';
  END IF;

  -- Idempotency: if a granted reward already exists for this user+period+kind, return it
  SELECT id INTO _reward_id FROM public.member_rewards
   WHERE user_id = _user_id AND COALESCE(period,'') = COALESCE(_period,'')
     AND kind = _kind AND status IN ('granted','claimed')
   LIMIT 1;
  IF _reward_id IS NOT NULL THEN RETURN _reward_id; END IF;

  INSERT INTO public.member_rewards(user_id, tier_id, kind, amount, period, note, granted_by, expires_at, status)
  VALUES (_user_id, _tier_id, _kind, _amount, _period, _note, _actor, _expires_at, 'granted')
  RETURNING id INTO _reward_id;

  -- Auto-deposit boost credits into wallet
  IF _kind = 'boost_credit' AND _amount > 0 THEN
    INSERT INTO public.boost_credits(user_id, amount, source, reward_id, note, actor_id)
    VALUES (_user_id, _amount, 'reward', _reward_id, COALESCE(_note, 'Tier bonus'), _actor);
    UPDATE public.member_rewards SET status='claimed', claimed_at=now() WHERE id=_reward_id;
  END IF;

  RETURN _reward_id;
END $$;

REVOKE ALL ON FUNCTION public.grant_member_reward(uuid,text,int,text,text,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_member_reward(uuid,text,int,text,text,text,timestamptz) TO authenticated, service_role;
