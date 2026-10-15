-- DISPOSABLE MODEL ONLY. Not a migration, application RPC, authority policy,
-- storage custody proof, adoption of a baseline, or a concurrent review executor.
-- Loaded only inside the full PR #65 fixture's savepoint, then removed.
-- New inserts observed after installation start at ONE; preexisting/untracked
-- rows retain NULL revisions forever. No initializer/backfill/zero fallback.
-- Revisions witness captured metadata writes, NOT original-human authorization.
-- Trigger disable/DDL/replication bypass and seven omitted business attachments
-- are not covered. Production activation needs independently verified closure.
CREATE SCHEMA claim_revision_lab;
REVOKE ALL ON SCHEMA claim_revision_lab FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE claim_revision_lab.claim_versions (
  claim_id uuid PRIMARY KEY,
  attempt_id uuid,
  attempt_revision bigint CHECK (attempt_revision > 0),
  evidence_revision bigint CHECK (evidence_revision > 0),
  business_id uuid,
  claimant_user_id uuid,
  kind text,
  status text,
  alive boolean NOT NULL,
  CHECK ((attempt_id IS NULL AND attempt_revision IS NULL AND evidence_revision IS NULL)
    OR (attempt_id IS NOT NULL AND attempt_revision IS NOT NULL AND evidence_revision IS NOT NULL))
);
CREATE TABLE claim_revision_lab.owner_versions (
  business_id uuid PRIMARY KEY,
  tenure_revision bigint CHECK (tenure_revision > 0),
  owner_id uuid,
  claim_state text,
  alive boolean NOT NULL
);
-- Deliberately no cascading FK: deletion retains monotonic tombstones so reusing
-- a public UUID cannot reset a trusted revision or revive an old attempt binding.
ALTER TABLE claim_revision_lab.claim_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_revision_lab.owner_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA claim_revision_lab FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION claim_revision_lab.reject_unsupported() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF TG_OP='TRUNCATE' THEN
    RAISE EXCEPTION 'Revision model does not support truncate'
      USING ERRCODE='55000';
  END IF;
  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Revision model does not support truncate or primary-key reassignment'
      USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION claim_revision_lab.capture_claim() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
DECLARE
  r public.business_claim_requests%ROWTYPE;
  renew boolean := false;
BEGIN
  IF TG_OP='UPDATE' THEN
    -- Legacy touch_updated_at alone is not a material new review input.
    IF (to_jsonb(OLD)-'updated_at') IS NOT DISTINCT FROM (to_jsonb(NEW)-'updated_at') THEN
      RETURN NULL;
    END IF;
    renew := OLD.business_id IS DISTINCT FROM NEW.business_id
      OR OLD.claimant_user_id IS DISTINCT FROM NEW.claimant_user_id
      OR OLD.kind IS DISTINCT FROM NEW.kind
      OR (OLD.status <> 'pending' AND NEW.status='pending');
  END IF;
  IF TG_OP='DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  IF TG_OP='INSERT' THEN
    INSERT INTO claim_revision_lab.claim_versions AS s
      (claim_id,attempt_id,attempt_revision,evidence_revision,business_id,claimant_user_id,kind,status,alive)
    VALUES(r.id,gen_random_uuid(),1,1,r.business_id,r.claimant_user_id,r.kind,r.status,true)
    ON CONFLICT(claim_id) DO UPDATE SET
      attempt_id=CASE WHEN s.attempt_revision IS NOT NULL THEN gen_random_uuid() ELSE NULL END,
      attempt_revision=s.attempt_revision+1,evidence_revision=s.evidence_revision+1,
      business_id=EXCLUDED.business_id,claimant_user_id=EXCLUDED.claimant_user_id,
      kind=EXCLUDED.kind,status=EXCLUDED.status,alive=true;
  ELSE
    -- An UPDATE/DELETE is not proof of the beginning of an existing generation.
    INSERT INTO claim_revision_lab.claim_versions AS s
      (claim_id,business_id,claimant_user_id,kind,status,alive)
    VALUES(r.id,r.business_id,r.claimant_user_id,r.kind,r.status,TG_OP<>'DELETE')
    ON CONFLICT(claim_id) DO UPDATE SET
      attempt_id=CASE WHEN renew AND s.attempt_revision IS NOT NULL THEN gen_random_uuid() ELSE s.attempt_id END,
      attempt_revision=s.attempt_revision+1,
      evidence_revision=s.evidence_revision+CASE WHEN renew OR TG_OP='DELETE' THEN 1 ELSE 0 END,
      business_id=EXCLUDED.business_id,claimant_user_id=EXCLUDED.claimant_user_id,
      kind=EXCLUDED.kind,status=EXCLUDED.status,alive=EXCLUDED.alive;
  END IF;
  RETURN NULL;
END $$;

CREATE FUNCTION claim_revision_lab.capture_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
DECLARE
  old_claim uuid;
  new_claim uuid;
  target uuid;
BEGIN
  IF TG_OP='UPDATE' AND to_jsonb(OLD) IS NOT DISTINCT FROM to_jsonb(NEW) THEN RETURN NULL; END IF;
  IF TG_OP<>'INSERT' THEN old_claim := OLD.claim_id; END IF;
  IF TG_OP<>'DELETE' THEN new_claim := NEW.claim_id; END IF;
  -- Reparenting invalidates BOTH sets, in deterministic UUID order. This does
  -- not prove a shared lock protocol with the untouched legacy owner/claim code.
  FOR target IN SELECT DISTINCT v FROM (VALUES(old_claim),(new_claim)) x(v)
    WHERE v IS NOT NULL ORDER BY v
  LOOP
    UPDATE claim_revision_lab.claim_versions SET evidence_revision=evidence_revision+1
      WHERE claim_id=target;
    IF NOT FOUND THEN
      INSERT INTO claim_revision_lab.claim_versions
        (claim_id,business_id,claimant_user_id,kind,status,alive)
      SELECT target,c.business_id,c.claimant_user_id,c.kind,c.status,c.id IS NOT NULL
      FROM (SELECT 1) x LEFT JOIN public.business_claim_requests c ON c.id=target;
      -- Unknown remains unknown, including after delete/recreate. No fabricated
      -- empty set, uploaded bytes, trusted zero, attempt ID or storage manifest.
    END IF;
  END LOOP;
  RETURN NULL;
END $$;

CREATE FUNCTION claim_revision_lab.capture_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
DECLARE r public.businesses%ROWTYPE;
BEGIN
  IF TG_OP='UPDATE' AND OLD.owner_id IS NOT DISTINCT FROM NEW.owner_id
    AND OLD.claim_state IS NOT DISTINCT FROM NEW.claim_state THEN RETURN NULL; END IF;
  IF TG_OP='DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  INSERT INTO claim_revision_lab.owner_versions AS s
    (business_id,tenure_revision,owner_id,claim_state,alive)
  VALUES(r.id,CASE WHEN TG_OP='INSERT' THEN 1 ELSE NULL END,r.owner_id,r.claim_state,TG_OP<>'DELETE')
  ON CONFLICT(business_id) DO UPDATE SET tenure_revision=s.tenure_revision+1,
    owner_id=EXCLUDED.owner_id,claim_state=EXCLUDED.claim_state,alive=EXCLUDED.alive;
  RETURN NULL;
END $$;

-- Diagnostic binding only: NOT fresh authorization or locked review acceptance.
-- It deliberately returns no row for any missing/unknown/mismatched/deleted state.
-- A known post-install metadata witness still does not attest private object bytes.
CREATE FUNCTION claim_revision_lab.binding(p_claim uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
  SELECT jsonb_build_object('expectedClaimAttemptId',s.attempt_id,
    'expectedClaimAttemptRevision',s.attempt_revision::text,
    'expectedEvidenceSetRevision',s.evidence_revision::text,
    'expectedOwnershipTenureRevision',o.tenure_revision::text,
    'expectedOwnerId',b.owner_id)
  FROM public.business_claim_requests c
  JOIN public.businesses b ON b.id=c.business_id
  JOIN claim_revision_lab.claim_versions s ON s.claim_id=c.id
  JOIN claim_revision_lab.owner_versions o ON o.business_id=b.id
  WHERE c.id=p_claim AND s.alive AND o.alive
    AND s.attempt_id IS NOT NULL AND s.attempt_revision IS NOT NULL
    AND s.evidence_revision IS NOT NULL AND o.tenure_revision IS NOT NULL
    AND s.business_id=c.business_id AND s.claimant_user_id=c.claimant_user_id
    AND s.kind=c.kind AND s.status=c.status
    AND o.owner_id IS NOT DISTINCT FROM b.owner_id
    AND o.claim_state IS NOT DISTINCT FROM b.claim_state
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA claim_revision_lab FROM PUBLIC,anon,authenticated,service_role;

CREATE TRIGGER z_lab_claim_capture AFTER INSERT OR UPDATE OR DELETE ON public.business_claim_requests
  FOR EACH ROW EXECUTE FUNCTION claim_revision_lab.capture_claim();
CREATE TRIGGER z_lab_evidence_capture AFTER INSERT OR UPDATE OR DELETE ON public.business_claim_evidence
  FOR EACH ROW EXECUTE FUNCTION claim_revision_lab.capture_evidence();
CREATE TRIGGER z_lab_owner_capture AFTER INSERT OR UPDATE OR DELETE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION claim_revision_lab.capture_owner();
CREATE TRIGGER z_lab_claim_identity BEFORE UPDATE ON public.business_claim_requests
  FOR EACH ROW EXECUTE FUNCTION claim_revision_lab.reject_unsupported();
CREATE TRIGGER z_lab_evidence_identity BEFORE UPDATE ON public.business_claim_evidence
  FOR EACH ROW EXECUTE FUNCTION claim_revision_lab.reject_unsupported();
CREATE TRIGGER z_lab_owner_identity BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION claim_revision_lab.reject_unsupported();
CREATE TRIGGER z_lab_claim_truncate BEFORE TRUNCATE ON public.business_claim_requests
  FOR EACH STATEMENT EXECUTE FUNCTION claim_revision_lab.reject_unsupported();
CREATE TRIGGER z_lab_evidence_truncate BEFORE TRUNCATE ON public.business_claim_evidence
  FOR EACH STATEMENT EXECUTE FUNCTION claim_revision_lab.reject_unsupported();
CREATE TRIGGER z_lab_owner_truncate BEFORE TRUNCATE ON public.businesses
  FOR EACH STATEMENT EXECUTE FUNCTION claim_revision_lab.reject_unsupported();
