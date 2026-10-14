-- Atomic live acceptance test for Associate enrollment and public map visibility.
-- Uses an existing eligible owner/business only inside this transaction and removes
-- the temporary application before commit. Any failed assertion aborts the migration.

CREATE TEMP TABLE associate_acceptance_fixture ON COMMIT DROP AS
SELECT
  b.id AS business_id,
  b.owner_id,
  NULL::uuid AS application_id,
  (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin' ORDER BY ur.user_id LIMIT 1) AS admin_id,
  (SELECT u.id FROM auth.users u
   WHERE u.id <> b.owner_id
     AND NOT EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = u.id AND ur2.role = 'admin')
     AND NOT public.is_business_member(u.id, b.id)
   ORDER BY u.id LIMIT 1) AS outsider_id
FROM public.businesses b
WHERE b.status = 'active'
  AND b.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.business_associate_applications a WHERE a.business_id = b.id
  )
ORDER BY b.created_at
LIMIT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM associate_acceptance_fixture
    WHERE business_id IS NOT NULL AND owner_id IS NOT NULL
      AND admin_id IS NOT NULL AND outsider_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Associate acceptance fixtures unavailable';
  END IF;
END;
$$;

CREATE TEMP TABLE associate_acceptance_results (
  name text PRIMARY KEY,
  passed boolean NOT NULL,
  detail text
) ON COMMIT DROP;
GRANT SELECT, UPDATE ON associate_acceptance_fixture TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON associate_acceptance_results TO authenticated, anon;

SELECT set_config('request.jwt.claim.sub', (SELECT owner_id::text FROM associate_acceptance_fixture), true);
SELECT set_config('request.jwt.claims', jsonb_build_object(
  'sub', (SELECT owner_id FROM associate_acceptance_fixture), 'role', 'authenticated'
)::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO associate_acceptance_results
SELECT 'owner_application_created', x.status = 'pending' AND x.track = 'both', x.status
FROM public.apply_business_associate(
  (SELECT business_id FROM associate_acceptance_fixture), 'both', 'associate-v1'
) x;
UPDATE associate_acceptance_fixture
SET application_id = (
  SELECT id FROM public.business_associate_applications
  WHERE business_id = (SELECT business_id FROM associate_acceptance_fixture)
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', (SELECT outsider_id::text FROM associate_acceptance_fixture), true);
SELECT set_config('request.jwt.claims', jsonb_build_object(
  'sub', (SELECT outsider_id FROM associate_acceptance_fixture), 'role', 'authenticated'
)::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.apply_business_associate(
      (SELECT business_id FROM associate_acceptance_fixture), 'parts_supplier', 'associate-v1'
    );
    INSERT INTO associate_acceptance_results VALUES (
      'cross_tenant_application_denied', false, 'unexpectedly allowed'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO associate_acceptance_results VALUES (
      'cross_tenant_application_denied', true, SQLSTATE
    );
  END;
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', (SELECT admin_id::text FROM associate_acceptance_fixture), true);
SELECT set_config('request.jwt.claims', jsonb_build_object(
  'sub', (SELECT admin_id FROM associate_acceptance_fixture), 'role', 'authenticated'
)::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO associate_acceptance_results
SELECT 'admin_approval', x.status = 'approved' AND x.approved_at IS NOT NULL, x.status
FROM public.review_business_associate_application(
  (SELECT application_id FROM associate_acceptance_fixture),
  'approved', 'atomic acceptance test'
) x;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;
INSERT INTO associate_acceptance_results
SELECT 'approved_public_projection', count(*) = 1, count(*)::text
FROM public.associate_businesses_public
WHERE business_id = (SELECT business_id FROM associate_acceptance_fixture);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', (SELECT admin_id::text FROM associate_acceptance_fixture), true);
SELECT set_config('request.jwt.claims', jsonb_build_object(
  'sub', (SELECT admin_id FROM associate_acceptance_fixture), 'role', 'authenticated'
)::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO associate_acceptance_results
SELECT 'admin_suspension', x.status = 'suspended', x.status
FROM public.review_business_associate_application(
  (SELECT application_id FROM associate_acceptance_fixture),
  'suspended', 'atomic acceptance test'
) x;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;
INSERT INTO associate_acceptance_results
SELECT 'suspension_removes_public_projection', count(*) = 0, count(*)::text
FROM public.associate_businesses_public
WHERE business_id = (SELECT business_id FROM associate_acceptance_fixture);
RESET ROLE;

DO $$
DECLARE v_count integer; v_passed boolean;
BEGIN
  SELECT count(*), bool_and(passed) INTO v_count, v_passed
  FROM associate_acceptance_results;
  IF v_count <> 6 OR NOT COALESCE(v_passed, false) THEN
    RAISE EXCEPTION 'Associate acceptance failed: %', (
      SELECT jsonb_object_agg(name, jsonb_build_object('passed', passed, 'detail', detail))
      FROM associate_acceptance_results
    );
  END IF;
END;
$$;

DELETE FROM public.business_associate_applications
WHERE business_id = (SELECT business_id FROM associate_acceptance_fixture)
  AND review_note = 'atomic acceptance test';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.business_associate_applications
    WHERE business_id = (SELECT business_id FROM associate_acceptance_fixture)
  ) THEN
    RAISE EXCEPTION 'Associate acceptance cleanup failed';
  END IF;
END;
$$;
