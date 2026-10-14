-- OPTIONAL WIDER-SCOPE REVIEW ONLY. Separate privacy/scope approval required.
-- Not a migration, RPC, binding repair, core-query prerequisite or live approval.
-- Existing authorized READ ONLY context, verified source keys/visibility,
-- non-executing plan, short LOCAL timeouts and empty LOCAL search_path required.
-- No grants/elevation or automatic retry. Preserve results privately.
-- One fixed SELECT; reads explicit shops.business_id, never assumes id equality.
WITH shop_links AS MATERIALIZED (
  SELECT s.id, s.business_id, b.id IS NOT NULL AS business_present
  FROM shop_manager.shops AS s
  LEFT JOIN public.businesses AS b ON b.id = s.business_id
), shop_counts AS (
  SELECT pg_catalog.count(*) AS shops_total,
    pg_catalog.count(*) FILTER (WHERE business_id IS NULL) AS shop_business_null,
    pg_catalog.count(*) FILTER (WHERE business_id IS NOT NULL
      AND business_present) AS shop_business_valid,
    pg_catalog.count(*) FILTER (WHERE business_id IS NOT NULL
      AND NOT business_present) AS shop_business_orphan
  FROM shop_links
), business_link_groups AS MATERIALIZED (
  SELECT business_id, pg_catalog.count(*) AS shop_count
  FROM shop_links
  WHERE business_id IS NOT NULL
  GROUP BY business_id
), business_counts AS (
  SELECT pg_catalog.count(*) AS businesses_total,
    pg_catalog.count(*) FILTER (WHERE g.business_id IS NULL) AS businesses_zero_shops,
    pg_catalog.count(*) FILTER (WHERE g.shop_count = 1) AS businesses_one_shop,
    pg_catalog.count(*) FILTER (WHERE g.shop_count > 1) AS businesses_many_shops
  FROM public.businesses AS b
  LEFT JOIN business_link_groups AS g ON g.business_id = b.id
), duplicate_counts AS (
  SELECT pg_catalog.count(*) FILTER (WHERE shop_count > 1) AS duplicate_business_link_groups,
    COALESCE(pg_catalog.sum(shop_count) FILTER (WHERE shop_count > 1),0)::pg_catalog.int8
      AS duplicate_business_link_affected_shops
  FROM business_link_groups
)
SELECT s.shops_total, s.shop_business_null, s.shop_business_valid, s.shop_business_orphan,
  b.businesses_total, b.businesses_zero_shops, b.businesses_one_shop, b.businesses_many_shops,
  d.duplicate_business_link_groups, d.duplicate_business_link_affected_shops
FROM shop_counts AS s
CROSS JOIN business_counts AS b
CROSS JOIN duplicate_counts AS d;
