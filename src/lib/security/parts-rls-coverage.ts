/**
 * Static guard for the Parts Partner Network adversarial RLS suite (plan P2 /
 * gate G2 in docs/365_PARTS_PARTNER_NETWORK_PLAN.md).
 *
 * Every table that holds partner stock, cost, commercial or customer data must
 * (a) enable RLS in a migration and (b) be exercised by
 * supabase/tests/parts_network_adversarial_rls.sql. New tables created by the
 * Parts network migrations must be classified here, so an unreviewed table
 * cannot ship without adversarial coverage.
 */

/** Tables that carry organization-private stock, cost, commercial or PII data. */
export const PARTS_NETWORK_PROTECTED_TABLES = [
  "business_inventory_items",
  "business_inventory_locations",
  "business_inventory_movements",
  "business_part_cross_references",
  "business_network_exposure_audit",
  "business_invoices",
  "business_invoice_items",
  "business_associate_applications",
  "network_part_inquiries",
  "parts_orders",
  "parts_order_lines",
  "parts_reservations",
  "parts_order_events",
  "parts_receipts",
  "parts_receipt_lines",
  "parts_receiving_exceptions",
  "installed_components",
  "parts_returns",
  "parts_return_lines",
  "parts_warranty_claims",
  "customer_accounts",
  "customer_business_consents",
  "vehicle_history_events",
] as const;

/**
 * Tables intentionally public-read (canonical catalogue identity and fitment
 * evidence) or covered by other programs' suites. Listing them here is an
 * explicit, reviewable decision.
 */
export const PARTS_NETWORK_UNPROTECTED_TABLES: Record<string, string> = {
  parts_product_numbers: "Canonical part numbers are public catalogue identity (plan §3 rule 1).",
  parts_vehicle_profiles: "Approved vehicle profiles are public fitment evidence.",
  parts_fitment: "Confirmed fitment is public; unconfirmed rows are hidden by policy.",
  associate_access_audit: "Associate program audit; covered by the Associate enrollment suite.",
  associate_api_connections:
    "Associate API credentials; covered by the Associate enrollment suite.",
};

/** Migration files that define the Parts network surface. */
export const PARTS_NETWORK_MIGRATION_PATTERN =
  /(associate_parts|associate_privacy_customer_vehicle_ledger|business_part_cross_references|parts_receiving|parts_network)/;

const CREATE_TABLE_RE =
  /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?public"?\.)?"?([a-z_][a-z0-9_]*)"?\s*\(/gi;

/** Names of public-schema tables created in a SQL script (lower-cased, de-duplicated). */
export function extractCreatedTables(sql: string): string[] {
  const found = new Set<string>();
  const withoutComments = stripSqlComments(sql);
  for (const match of withoutComments.matchAll(CREATE_TABLE_RE)) {
    const fullMatch = match[0].toLowerCase();
    // Skip tables explicitly created in another schema (e.g. shop_manager.x).
    const qualified = /table\s+(?:if\s+not\s+exists\s+)?"?([a-z_][a-z0-9_]*)"?\./.exec(fullMatch);
    if (qualified && qualified[1] !== "public") continue;
    found.add(match[1].toLowerCase());
  }
  return [...found].sort();
}

/** Tables for which some migration runs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. */
export function extractRlsEnabledTables(sql: string): string[] {
  const found = new Set<string>();
  const re =
    /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:"?public"?\.)?"?([a-z_][a-z0-9_]*)"?\s+enable\s+row\s+level\s+security/gi;
  for (const match of stripSqlComments(sql).matchAll(re)) found.add(match[1].toLowerCase());
  return [...found].sort();
}

/** Protected tables that the adversarial suite never references as `public.<table>`. */
export function findUncoveredTables(tables: readonly string[], suiteSql: string): string[] {
  const body = stripSqlComments(suiteSql).toLowerCase();
  return tables.filter((t) => !new RegExp(`\\bpublic\\.${t}\\b`).test(body));
}

/** Tables created by Parts network migrations that nobody has classified yet. */
export function findUnclassifiedTables(created: readonly string[]): string[] {
  const protectedSet = new Set<string>(PARTS_NETWORK_PROTECTED_TABLES);
  return created.filter((t) => !protectedSet.has(t) && !(t in PARTS_NETWORK_UNPROTECTED_TABLES));
}

export function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}
