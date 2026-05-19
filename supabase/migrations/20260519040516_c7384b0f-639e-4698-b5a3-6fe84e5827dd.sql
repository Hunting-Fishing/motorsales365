
-- Self-serve plan change: cancels any active/pending subs for the caller,
-- activates the requested plan immediately for a 30-day period, and records
-- a payment row (status=pending so finance can reconcile) carrying the
-- prorated credit derived from the user's most recent paid subscription.
CREATE OR REPLACE FUNCTION public.self_serve_change_plan(_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan public.subscription_plans%ROWTYPE;
  _prev public.subscriptions%ROWTYPE;
  _last_pay public.payments%ROWTYPE;
  _credit numeric := 0;
  _gross numeric := 0;
  _net numeric := 0;
  _new_sub_id uuid;
  _new_pay_id uuid;
  _period_start timestamptz := now();
  _period_end timestamptz := now() + interval '30 days';
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _plan FROM public.subscription_plans WHERE id = _plan_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  _gross := COALESCE(_plan.price_php, 0);

  -- Previous active/pending sub (if any) — used for proration + cancellation
  SELECT * INTO _prev
  FROM public.subscriptions
  WHERE user_id = _uid AND status IN ('active', 'paused', 'pending')
  ORDER BY created_at DESC
  LIMIT 1;

  -- Latest paid subscription payment — source of truth for credit math
  SELECT * INTO _last_pay
  FROM public.payments
  WHERE user_id = _uid
    AND kind = 'subscription'
    AND status = 'paid'
    AND period_end IS NOT NULL
  ORDER BY paid_at DESC NULLS LAST
  LIMIT 1;

  IF _prev.id IS NOT NULL AND _prev.plan_id = _plan_id AND _prev.status = 'active' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_on_plan');
  END IF;

  IF _last_pay.id IS NOT NULL AND _last_pay.period_start IS NOT NULL AND _last_pay.period_end IS NOT NULL THEN
    DECLARE
      _total_ms numeric := EXTRACT(EPOCH FROM (_last_pay.period_end - _last_pay.period_start));
      _ref timestamptz := COALESCE(_last_pay.credit_calculated_at, _last_pay.paid_at, now());
      _remaining_ms numeric := EXTRACT(EPOCH FROM GREATEST(_last_pay.period_end - _ref, interval '0'));
      _plan_price numeric := COALESCE(_last_pay.plan_price_php, 0);
    BEGIN
      IF _total_ms > 0 AND _plan_price > 0 THEN
        _credit := ROUND((_plan_price * LEAST(_remaining_ms, _total_ms)) / _total_ms);
      END IF;
    END;
  END IF;

  _net := GREATEST(0, _gross - _credit);

  -- Cancel any other live subs for this user
  UPDATE public.subscriptions
  SET status = 'cancelled', updated_at = now()
  WHERE user_id = _uid AND status IN ('active', 'paused', 'pending');

  INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_end, notes)
  VALUES (
    _uid, _plan_id, 'active', _period_end,
    CASE
      WHEN _prev.id IS NULL THEN 'Self-serve new subscription'
      ELSE 'Self-serve plan change from previous plan — prorated credit ₱' || _credit::text
    END
  )
  RETURNING id INTO _new_sub_id;

  INSERT INTO public.payments (
    user_id, kind, status, amount_php, gross_amount_php, prorated_credit_php,
    plan_price_php, previous_plan_price_php, period_start, period_end,
    credit_calculated_at, new_plan, previous_plan, notes
  ) VALUES (
    _uid, 'subscription', 'pending', _net, _gross, _credit,
    _gross,
    CASE WHEN _last_pay.id IS NOT NULL THEN _last_pay.plan_price_php ELSE NULL END,
    _period_start, _period_end,
    now(), _plan.name,
    CASE WHEN _last_pay.id IS NOT NULL THEN _last_pay.new_plan ELSE NULL END,
    'Self-serve plan change'
  )
  RETURNING id INTO _new_pay_id;

  RETURN jsonb_build_object(
    'ok', true,
    'subscription_id', _new_sub_id,
    'payment_id', _new_pay_id,
    'gross_php', _gross,
    'credit_php', _credit,
    'net_php', _net,
    'period_end', _period_end
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.self_serve_change_plan(uuid) TO authenticated;
