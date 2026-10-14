/**
 * Column-level access rules that the database enforces with column privileges
 * (migration 20260927120000_parts_network_security_followups.sql). API clients
 * must never ask PostgREST for these columns directly: `select("*")` and
 * explicit selects of a restricted column fail with "permission denied".
 * Authorized callers read them through the SECURITY DEFINER RPCs named below.
 */

/**
 * `public.businesses` columns that anon/authenticated cannot select.
 * Read via `get_business_custom_domain_token` / `get_business_network_exposure_reviews`.
 */
export const BUSINESS_PRIVATE_COLUMNS = [
  "custom_domain_verify_token",
  "network_exposure_review_note",
  "network_exposure_reviewed_by",
] as const;

/**
 * Every other `public.businesses` column, for owner/editor screens that used
 * `select("*")`. Keep in sync when columns are added (see SECURITY.md).
 */
export const BUSINESS_EDITOR_COLUMNS = [
  "attribution",
  "barangay",
  "brands_carried",
  "city",
  "claim_state",
  "cover_url",
  "created_at",
  "cta_primary",
  "custom_domain",
  "custom_domain_status",
  "custom_domain_verified_at",
  "description",
  "email",
  "expose_inventory_to_network",
  "facebook_url",
  "featured",
  "featured_until",
  "featured_video_provider",
  "featured_video_url",
  "hours",
  "id",
  "import_metadata",
  "lat",
  "lng",
  "logo_url",
  "messenger_url",
  "name",
  "network_exposure_requested_at",
  "network_exposure_reviewed_at",
  "network_exposure_status",
  "organization_id",
  "owner_id",
  "phone",
  "photos",
  "postal_code",
  "price_label",
  "price_updated_at",
  "province",
  "rating_avg",
  "rating_count",
  "region",
  "removal_requested_at",
  "show_contact",
  "show_gallery",
  "show_posts",
  "show_products",
  "show_services",
  "slug",
  "source",
  "source_external_id",
  "status",
  "street_address",
  "subscription_tier",
  "tagline",
  "theme_color",
  "type_slug",
  "updated_at",
  "vanity_slug",
  "website",
  "whatsapp_number",
] as const;

export const BUSINESS_EDITOR_SELECT = BUSINESS_EDITOR_COLUMNS.join(",");

/**
 * `public.business_inventory_items` cost data. Signed-in staff cannot select
 * these columns; owners, managers and assistant managers read them through
 * `get_business_inventory_costs` (gate: `can_view_business_inventory_costs`).
 */
export const INVENTORY_COST_COLUMNS = ["cost", "supplier", "markup_percentage"] as const;
export type InventoryCostColumn = (typeof INVENTORY_COST_COLUMNS)[number];

/** Inventory columns every active business member may read. */
export const INVENTORY_MEMBER_COLUMNS = [
  "id",
  "business_id",
  "sku",
  "name",
  "category",
  "unit",
  "qty_on_hand",
  "reorder_at",
  "location",
  "notes",
  "active",
  "created_at",
  "updated_at",
  "price",
  "catalog_part_id",
  "network_visible",
  "brand",
  "barcode",
  "manufacturer_part_number",
  "main_category",
  "status",
  "manufacturer",
  "description",
  "date_purchased",
  "last_price_update",
  "qty_on_hold",
  "qty_on_order",
  "min_stock_level",
  "max_stock_level",
  "weight_lbs",
  "dimensions",
  "color",
  "material",
  "model_year",
  "oem_part_number",
  "warranty_period",
  "universal_part",
  "tax_rate",
  "environmental_fee",
  "core_charge",
  "hazmat_fee",
  "tax_exempt",
  "date_last_ordered",
  "date_last_used",
  "web_links",
  "location_id",
  "country_code",
  "item_condition",
  "lead_time_hours",
  "fulfillment_methods",
  "warranty_months",
  "serial_tracking",
] as const;

export const INVENTORY_MEMBER_SELECT = INVENTORY_MEMBER_COLUMNS.join(",");

export type InventoryCostRow = {
  item_id: string;
  cost: number | string | null;
  supplier: string | null;
  markup_percentage: number | string | null;
};

export type WithInventoryCosts<T> = T & {
  cost: number | null;
  supplier: string | null;
  markup_percentage: number | null;
  cost_restricted: false;
};

export type WithoutInventoryCosts<T> = Omit<T, InventoryCostColumn> & { cost_restricted: true };

const toNumber = (value: number | string | null | undefined) =>
  value === null || value === undefined || value === "" ? null : Number(value);

/**
 * Attach cost data to member-visible inventory rows. Callers that may not see
 * costs get rows without any cost keys and `cost_restricted: true`, so the UI
 * can hide or lock cost fields instead of treating them as empty.
 */
export function mergeInventoryCosts<T extends { id: string }>(
  rows: readonly T[],
  costs: readonly InventoryCostRow[] | null | undefined,
  canViewCosts: boolean,
): Array<WithInventoryCosts<T> | WithoutInventoryCosts<T>> {
  if (!canViewCosts) {
    return rows.map((row) => {
      const copy: Record<string, unknown> = { ...row };
      for (const column of INVENTORY_COST_COLUMNS) delete copy[column];
      return { ...(copy as Omit<T, InventoryCostColumn>), cost_restricted: true as const };
    });
  }
  const byId = new Map((costs ?? []).map((c) => [c.item_id, c]));
  return rows.map((row) => {
    const c = byId.get(row.id);
    return {
      ...row,
      cost: toNumber(c?.cost),
      supplier: c?.supplier ?? null,
      markup_percentage: toNumber(c?.markup_percentage),
      cost_restricted: false as const,
    };
  });
}

/** True when an inventory row was loaded without cost data (non-manager staff). */
export function isInventoryCostRestricted(
  row: { cost_restricted?: boolean } | null | undefined,
): boolean {
  return row?.cost_restricted === true;
}

/**
 * Remove cost keys that the caller did not explicitly provide, or that the
 * caller is not allowed to write, so an update never silently nulls them.
 */
export function sanitizeInventoryCostWrite<T extends Record<string, unknown>>(
  payload: T,
  canWriteCosts: boolean,
): T {
  const copy: Record<string, unknown> = { ...payload };
  for (const column of INVENTORY_COST_COLUMNS) {
    if (!canWriteCosts || copy[column] === undefined) delete copy[column];
  }
  return copy as T;
}

export type ExposureReviewRow = {
  business_id: string;
  network_exposure_review_note: string | null;
  network_exposure_reviewed_by?: string | null;
};

/** Attach review notes returned by `get_business_network_exposure_reviews`. */
export function attachExposureReviewNotes<T extends { id: string }>(
  rows: readonly T[],
  reviews: readonly ExposureReviewRow[] | null | undefined,
): Array<T & { network_exposure_review_note: string | null }> {
  const byId = new Map((reviews ?? []).map((r) => [r.business_id, r]));
  return rows.map((row) => ({
    ...row,
    network_exposure_review_note: byId.get(row.id)?.network_exposure_review_note ?? null,
  }));
}
