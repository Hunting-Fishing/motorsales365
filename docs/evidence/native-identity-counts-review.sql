-- REVIEW ONLY: not a migration, RPC, guard, repair or live execution approval.
-- Core scope: native profile bindings, shop/business ID namespaces and auth IDs.
-- Keep results private. Counts can disclose small populations.
-- Requires separately reviewed existing authorized READ ONLY operator context,
-- source key/visibility checks, non-executing plan, short LOCAL statement/lock
-- timeouts and empty LOCAL search_path. Never grant/elevate to make it succeed.
-- One fixed SELECT; no explicit helper calls or names/emails/IDs in output.
-- Existing RLS may invoke helpers; visibility/security closure must be reviewed.
WITH profile_flags AS MATERIALIZED (
  SELECT p.id, p.user_id, p.shop_id,
    s.id IS NOT NULL AS native_shop_present,
    b.id IS NOT NULL AS business_namespace_present,
    ai.id IS NOT NULL AS id_auth_present,
    au.id IS NOT NULL AS linked_user_auth_present
  FROM shop_manager.profiles AS p
  LEFT JOIN shop_manager.shops AS s ON s.id = p.shop_id
  LEFT JOIN public.businesses AS b ON b.id = p.shop_id
  LEFT JOIN auth.users AS ai ON ai.id = p.id
  LEFT JOIN auth.users AS au ON au.id = p.user_id
), profile_counts AS (
  SELECT pg_catalog.count(*) AS profiles_total,
    pg_catalog.count(*) FILTER (WHERE shop_id IS NULL) AS profile_shop_null,
    pg_catalog.count(*) FILTER (WHERE shop_id IS NOT NULL
      AND native_shop_present AND NOT business_namespace_present) AS profile_shop_native_only,
    pg_catalog.count(*) FILTER (WHERE shop_id IS NOT NULL
      AND NOT native_shop_present AND business_namespace_present) AS profile_shop_business_only,
    pg_catalog.count(*) FILTER (WHERE shop_id IS NOT NULL
      AND native_shop_present AND business_namespace_present) AS profile_shop_both_namespaces,
    pg_catalog.count(*) FILTER (WHERE shop_id IS NOT NULL
      AND NOT native_shop_present AND NOT business_namespace_present) AS profile_shop_neither,
    pg_catalog.count(*) FILTER (WHERE user_id IS NULL) AS profile_user_null,
    pg_catalog.count(*) FILTER (WHERE user_id = id) AS profile_user_canonical,
    pg_catalog.count(*) FILTER (WHERE user_id IS NOT NULL AND user_id <> id) AS profile_user_legacy,
    pg_catalog.count(*) FILTER (WHERE id_auth_present) AS profile_id_auth_present,
    pg_catalog.count(*) FILTER (WHERE NOT id_auth_present) AS profile_id_auth_missing,
    pg_catalog.count(*) FILTER (WHERE user_id IS NOT NULL
      AND linked_user_auth_present) AS profile_linked_user_auth_present,
    pg_catalog.count(*) FILTER (WHERE user_id IS NOT NULL
      AND NOT linked_user_auth_present) AS profile_linked_user_auth_missing
  FROM profile_flags
), linked_user_groups AS (
  SELECT user_id, pg_catalog.count(*) AS profile_count
  FROM profile_flags
  WHERE user_id IS NOT NULL
  GROUP BY user_id
), duplicate_counts AS (
  SELECT pg_catalog.count(*) FILTER (WHERE profile_count > 1) AS duplicate_user_groups,
    COALESCE(pg_catalog.sum(profile_count) FILTER (WHERE profile_count > 1),0)::pg_catalog.int8
      AS duplicate_user_affected_profiles
  FROM linked_user_groups
), null_shadow_groups AS (
  SELECT shadow.id,
    pg_catalog.bool_or(linked.shop_id IS DISTINCT FROM shadow.shop_id)
      AS any_linked_shop_distinct
  FROM profile_flags AS shadow
  JOIN profile_flags AS linked ON linked.user_id = shadow.id AND linked.id <> shadow.id
  WHERE shadow.user_id IS NULL AND shadow.id_auth_present
  GROUP BY shadow.id
), shadow_counts AS (
  SELECT pg_catalog.count(*) AS auth_null_shadow_actors,
    pg_catalog.count(*) FILTER (WHERE any_linked_shop_distinct)
      AS auth_null_shadow_linked_shop_distinct_actors
  FROM null_shadow_groups
)
SELECT p.profiles_total,
  p.profile_shop_null, p.profile_shop_native_only, p.profile_shop_business_only,
  p.profile_shop_both_namespaces, p.profile_shop_neither,
  p.profile_user_null, p.profile_user_canonical, p.profile_user_legacy,
  p.profile_id_auth_present, p.profile_id_auth_missing,
  p.profile_linked_user_auth_present, p.profile_linked_user_auth_missing,
  d.duplicate_user_groups, d.duplicate_user_affected_profiles,
  s.auth_null_shadow_actors, s.auth_null_shadow_linked_shop_distinct_actors
FROM profile_counts AS p
CROSS JOIN duplicate_counts AS d
CROSS JOIN shadow_counts AS s;
