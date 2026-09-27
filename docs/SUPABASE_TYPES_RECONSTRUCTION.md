# Supabase types reconstruction (September 2026)

`src/integrations/supabase/types.ts` was corrupted in commit `4f4b2861`. That commit
committed pasted tool output: a "Warning: truncated output" header, plus roughly 16k tokens
removed from the middle of the file. There was no access to the production Supabase project, so
the file was **reconstructed** rather than regenerated. This note records how, and where the
reconstruction may differ from production.

> **Action for maintainers:** regenerate from production as soon as possible and commit the
> result unchanged:
>
> ```bash
> supabase gen types typescript --project-id <project-ref> --schema public > src/integrations/supabase/types.ts
> ```

## Method

1. **Historical baseline.** Commit `2df831d6` (2026-08-29) holds the last intact copy. It is raw
   Supabase generator output for the `public` schema and still carries the
   `PostgrestVersion: "14.5"` header.
2. **Local rebuild.** All repository migrations on `main` were applied to a throwaway local
   PostgreSQL 17 database that has Supabase role and `auth` stubs. This is the same harness as
   `scripts/test-parts-rls-adversarial.sh --local`. Types were then generated with the current
   `supabase/postgres-meta` typegen, using the settings `PG_META_GENERATE_TYPES_INCLUDED_SCHEMAS=public`
   and `PG_META_POSTGREST_VERSION=14.5`.
3. **Merge.** The two outputs were merged per object:
   - Objects only in the local rebuild (every table, view and function added by the Aug/Sep
     parts-network, associate, customer-ledger and counter-sales migrations) come from the
     local output.
   - Objects only in the historical file come from the historical file. These are the objects
     created outside the migration history, which the local rebuild cannot recreate.
   - Objects present in both use the local definition. Any columns and relationships that
     exist only in the historical file are added to it.
   - Enum values are unioned.
   - Extension functions (`pgcrypto`, `uuid-ossp`) are dropped. They appear locally only
     because the stub installs those extensions into `public`.
4. **Formatting.** The merged file was formatted with Prettier using
   `{ parser: "typescript", semi: false }`. That setting reproduces the historical generator
   output byte-for-byte.

Result: 284 tables, 10 views, 140 functions, 62 enums.

## Known uncertainty

- **Kept from the Aug 29 snapshot and not verified against current production.** These objects
  have no `CREATE` statement in `supabase/migrations`:
  - Tables: `business_availability`, `business_availability_exceptions`,
    `business_bookable_items`, `business_bookings`, `business_contact_channels`,
    `business_gallery_albums`, `business_gallery_photos`, `business_inquiries`,
    `business_page_events`, `business_posts`, `business_products`, `business_services`,
    `internal_org_settings`, `lead_activities`, `leads`, `organization_invites`,
    `organization_members`, `organizations`, `service_catalog`,
    `service_catalog_suggestions`, `service_suggestion_audit_log`, `shop_departments`,
    `shop_product_categories`, `staff_dms`.
  - Functions: the `*org*` helpers, `is_sales_assigned_user`, `resolve_login_to_email`,
    `suggest_business_tag`, `email_queue_dispatch` and a few others.
  - Enums: `lead_*` and `org_role`.
  - Columns: `businesses.organization_id`/`tagline`/`theme_color`/`show_*`/`cta_primary`/`featured_video_*`,
    `profiles.is_staff_account`/`login_username`/`manager_user_id`/`parent_org_id`,
    `shop_categories.parent_id`/`department_slug`/`cross_department_slugs`,
    `listings.organization_id`, `subscriptions.organization_id`,
    `subscription_plans.max_seats`, `shop_product_fitment.transmission`, and the
    `business_kind` value `corporate`.
- **Missing entirely:** `migration_ingest` and `migration_auth_transfer_keys` are referenced by
  migration `20260911120000`, but they were created outside the migrations and after the
  snapshot. The app accesses them only through untyped (`any`) server code.
- Any production change made outside the migrations after 2026-08-29 is not reflected here.
