
-- ============================================================
-- report_actions: append-only ledger of every moderation step
-- ============================================================
CREATE TABLE public.report_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN (
    'accept','dismiss','hide_listing','delete_listing','restore_listing',
    'publish_summary','unpublish_summary','reverse','dispute_overturn','dispute_uphold','note'
  )),
  prev_status text,
  new_status text,
  prev_resolution text,
  new_resolution text,
  score_delta int NOT NULL DEFAULT 0,
  listing_effect text NOT NULL DEFAULT 'none' CHECK (listing_effect IN ('none','hidden','deleted','restored')),
  notified_poster boolean NOT NULL DEFAULT false,
  note text,
  reversed_by_action_id uuid REFERENCES public.report_actions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX report_actions_report_idx ON public.report_actions(report_id, created_at DESC);
CREATE INDEX report_actions_actor_idx ON public.report_actions(actor_id);

GRANT SELECT ON public.report_actions TO authenticated;
GRANT ALL ON public.report_actions TO service_role;

ALTER TABLE public.report_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read report_actions" ON public.report_actions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- Posters can read actions on reports targeting their own listings
CREATE POLICY "poster reads own report_actions" ON public.report_actions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.reports r
    JOIN public.listings l ON l.id = r.listing_id
    WHERE r.id = report_actions.report_id AND l.user_id = auth.uid()
  ));

-- ============================================================
-- report_disputes
-- ============================================================
CREATE TABLE public.report_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','upheld','overturned','withdrawn')),
  admin_response text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  score_refund int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- One open dispute per report per user
CREATE UNIQUE INDEX report_disputes_one_open_idx
  ON public.report_disputes(report_id, user_id) WHERE status = 'open';
CREATE INDEX report_disputes_user_idx ON public.report_disputes(user_id);
CREATE INDEX report_disputes_status_idx ON public.report_disputes(status);

GRANT SELECT, INSERT, UPDATE ON public.report_disputes TO authenticated;
GRANT ALL ON public.report_disputes TO service_role;

ALTER TABLE public.report_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage disputes" ON public.report_disputes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "poster reads own dispute" ON public.report_disputes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Allow a poster to file a dispute on a report whose listing they own, within 14 days of resolution
CREATE POLICY "poster files dispute" ON public.report_disputes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.reports r
      JOIN public.listings l ON l.id = r.listing_id
      WHERE r.id = report_id
        AND l.user_id = auth.uid()
        AND r.status = 'resolved'
        AND r.resolved_at IS NOT NULL
        AND r.resolved_at > now() - interval '14 days'
    )
  );

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER report_disputes_updated
  BEFORE UPDATE ON public.report_disputes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- trust_score_events
-- ============================================================
CREATE TABLE public.trust_score_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta int NOT NULL,
  reason_code text NOT NULL,
  reason_label text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('report','dispute','review','verification','listing','bonus','tier','manual')),
  source_id uuid,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trust_score_events_user_idx ON public.trust_score_events(user_id, created_at DESC);
CREATE INDEX trust_score_events_source_idx ON public.trust_score_events(source_type, source_id);

GRANT SELECT ON public.trust_score_events TO authenticated;
GRANT ALL ON public.trust_score_events TO service_role;

ALTER TABLE public.trust_score_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read trust events" ON public.trust_score_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "user reads own trust events" ON public.trust_score_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Aggregated score view (500 baseline, clamped 0..1000)
CREATE OR REPLACE FUNCTION public.get_trust_score(_user_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(0, LEAST(1000, 500 + COALESCE((
    SELECT SUM(delta)::int FROM public.trust_score_events WHERE user_id = _user_id
  ), 0)));
$$;

-- ============================================================
-- member_tiers (config, seeded)
-- ============================================================
CREATE TABLE public.member_tiers (
  id text PRIMARY KEY, -- 'common'|'uncommon'|'rare'|'epic'|'legendary'
  name text NOT NULL,
  min_score int NOT NULL,
  min_tenure_days int NOT NULL,
  color text NOT NULL,
  rank int NOT NULL UNIQUE,
  quarterly_boost_credits int NOT NULL DEFAULT 0,
  annual_boost_credits int NOT NULL DEFAULT 0,
  annual_badge_months int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.member_tiers TO authenticated, anon;
GRANT ALL ON public.member_tiers TO service_role;
ALTER TABLE public.member_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiers readable" ON public.member_tiers FOR SELECT USING (true);

INSERT INTO public.member_tiers (id,name,min_score,min_tenure_days,color,rank,quarterly_boost_credits,annual_boost_credits,annual_badge_months) VALUES
  ('common','Common',0,0,'slate',1,1,0,0),
  ('uncommon','Uncommon',550,30,'green',2,2,4,0),
  ('rare','Rare',650,90,'blue',3,4,8,3),
  ('epic','Epic',750,180,'purple',4,7,15,6),
  ('legendary','Legendary',875,365,'amber',5,12,30,12);

-- ============================================================
-- member_rewards (issued)
-- ============================================================
CREATE TABLE public.member_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id text REFERENCES public.member_tiers(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('boost_credit','featured_badge','spotlight','custom')),
  amount int NOT NULL DEFAULT 1,
  period text, -- 'q1-2026', '2026' etc
  status text NOT NULL DEFAULT 'granted' CHECK (status IN ('granted','claimed','expired','revoked')),
  expires_at timestamptz,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz
);
CREATE INDEX member_rewards_user_idx ON public.member_rewards(user_id, status);

GRANT SELECT, UPDATE ON public.member_rewards TO authenticated;
GRANT ALL ON public.member_rewards TO service_role;
ALTER TABLE public.member_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own rewards" ON public.member_rewards
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user claims own reward" ON public.member_rewards
  FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff manage rewards" ON public.member_rewards
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- apply_report_action RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_report_action(
  _report_id uuid,
  _action text,
  _note text DEFAULT NULL,
  _hide_listing boolean DEFAULT false,
  _delete_listing boolean DEFAULT false,
  _notify_poster boolean DEFAULT false,
  _reverses_action_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _report public.reports%ROWTYPE;
  _listing public.listings%ROWTYPE;
  _delta int := 0;
  _listing_effect text := 'none';
  _new_status text;
  _new_resolution text;
  _action_id uuid;
  _reason_code text;
  _reason_label text;
BEGIN
  IF NOT (public.has_role(_actor,'admin') OR public.has_role(_actor,'moderator')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO _report FROM public.reports WHERE id = _report_id FOR UPDATE;
  IF _report.id IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;

  IF _report.listing_id IS NOT NULL THEN
    SELECT * INTO _listing FROM public.listings WHERE id = _report.listing_id;
  END IF;

  -- Reverse only permitted to admins
  IF _action = 'reverse' AND NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'Only admins can reverse decisions';
  END IF;

  -- Compute effects
  IF _action = 'accept' THEN
    _new_status := 'resolved'; _new_resolution := 'accepted';
    _delta := -25; _reason_code := 'report_accepted'; _reason_label := 'Report accepted against you';
  ELSIF _action = 'dismiss' THEN
    _new_status := 'resolved'; _new_resolution := 'dismissed';
    _delta := 0; _reason_code := 'report_dismissed'; _reason_label := 'Report dismissed';
  ELSIF _action = 'reverse' THEN
    _new_status := 'open'; _new_resolution := NULL;
    -- Invert original delta
    IF _reverses_action_id IS NOT NULL THEN
      SELECT -score_delta INTO _delta FROM public.report_actions WHERE id = _reverses_action_id;
      _delta := COALESCE(_delta,0);
    END IF;
    _reason_code := 'decision_reversed'; _reason_label := 'Prior moderation decision reversed';
  ELSE
    -- Non-status-changing actions inherit current status
    _new_status := _report.status; _new_resolution := _report.resolution;
  END IF;

  -- Listing side effects
  IF _hide_listing AND _listing.id IS NOT NULL THEN
    UPDATE public.listings SET status = 'hidden' WHERE id = _listing.id;
    _listing_effect := 'hidden';
    _delta := _delta - 10;
  END IF;
  IF _delete_listing AND _listing.id IS NOT NULL THEN
    DELETE FROM public.listings WHERE id = _listing.id;
    _listing_effect := 'deleted';
    _delta := _delta - 30;
  END IF;
  IF _action = 'restore_listing' AND _listing.id IS NOT NULL THEN
    UPDATE public.listings SET status = 'active' WHERE id = _listing.id;
    _listing_effect := 'restored';
    _delta := _delta + 10;
  END IF;

  -- Update report when status changes
  IF _action IN ('accept','dismiss','reverse') THEN
    UPDATE public.reports SET
      status = _new_status,
      resolution = _new_resolution,
      resolved_by = CASE WHEN _new_status='resolved' THEN _actor ELSE NULL END,
      resolved_at = CASE WHEN _new_status='resolved' THEN now() ELSE NULL END
    WHERE id = _report_id;
  END IF;

  -- Write ledger row
  INSERT INTO public.report_actions(
    report_id, actor_id, action, prev_status, new_status, prev_resolution, new_resolution,
    score_delta, listing_effect, notified_poster, note, reversed_by_action_id
  ) VALUES (
    _report_id, _actor, _action, _report.status, _new_status, _report.resolution, _new_resolution,
    _delta, _listing_effect, _notify_poster, _note, _reverses_action_id
  ) RETURNING id INTO _action_id;

  -- Mark the reversed row
  IF _action = 'reverse' AND _reverses_action_id IS NOT NULL THEN
    UPDATE public.report_actions SET reversed_by_action_id = _action_id WHERE id = _reverses_action_id;
  END IF;

  -- Write trust score event for the poster (when there is one)
  IF _listing.user_id IS NOT NULL AND _delta <> 0 THEN
    INSERT INTO public.trust_score_events(
      user_id, delta, reason_code, reason_label, source_type, source_id, actor_id
    ) VALUES (
      _listing.user_id, _delta, _reason_code, _reason_label, 'report', _report_id, _actor
    );
  END IF;

  RETURN _action_id;
END $$;

REVOKE ALL ON FUNCTION public.apply_report_action(uuid,text,text,boolean,boolean,boolean,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_report_action(uuid,text,text,boolean,boolean,boolean,uuid) TO authenticated;
