// TEMPORARY migration helper — safe to delete along with
// src/routes/api/public/migration-export.ts once the migration is done.
// Server-only. Read-only. Never logs payloads or secrets.

const EXPECTED_TOKEN_SHA256 =
  "e98f3a6bdbd80f86e8b552b50fb9d02294f4d9c05169e3260c8cc1e3a5010331";

// Snapshot of the user-owned 365 Supabase public schema, excluding the
// temporary migration_ingest inbox. This is used only when Lovable Cloud
// refuses PostgREST OpenAPI discovery (for example HTTP 530).
const KNOWN_365_PUBLIC_TABLES = [
  "account_audit_log","ad_creative_audit_log","ad_creatives","ad_events","ad_inquiries","ad_inquiry_audit","ad_inquiry_messages","ad_order_events","ad_orders","ad_packages","ad_slot_assignments","ad_slots","admin_audit_log","advertisement_history","advertisements","affiliate_clicks","affiliate_commission_rules","affiliate_conversions","affiliate_links","affiliate_networks","affiliate_parts","affiliate_postback_secrets","boost_credits","boost_products","bundle_purchases","business_asset_maintenance","business_assets","business_availability","business_availability_exceptions","business_bookable_items","business_bookings","business_brands","business_claim_audit","business_claim_evidence","business_claim_requests","business_contact_channels","business_discovery_queue","business_discovery_searches","business_gallery_albums","business_gallery_photos","business_inquiries","business_inventory_items","business_inventory_movements","business_invoice_items","business_invoices","business_location_corrections","business_network_exposure_audit","business_page_events","business_plan_change_log","business_plans","business_posts","business_products","business_reserved_slugs","business_reviews","business_services","business_slug_history","business_staff","business_subscriptions","business_tag_links","business_tags","business_type_suggestions","business_types","businesses","buyer_checklist_items","buyer_checklist_progress","buyer_checklists","categories","chat_thread_members","chat_thread_messages","chat_threads","club_discount_promotions","club_documents","club_event_rsvps","club_events","club_member_discount_grants","club_members","club_posts","club_rides","clubs","course_certificates","course_enrollments","course_lesson_progress","course_lessons","course_modules","course_quiz_attempts","course_quiz_questions","course_quizzes","course_resources","courses","currencies","customer_discounts","dispatch_job_events","dispatch_subscriptions","doc_check_agency_links","doc_check_audit_log","doc_check_countries","doc_check_documents","doc_check_sections","email_routes","email_send_log","email_send_state","email_unsubscribe_tokens","export_inquiries","favorites","fb_import_jobs","feature_flags","feature_screenshots","flashcard_content","flashcard_progress","form_feedback","franchise_application_audit","franchise_application_messages","franchise_applications","franchise_memberships","franchise_tiers","inspection_orders","inspection_services","internal_cron_tokens","internal_org_settings","internal_webhook_keys","jdm_chassis_codes","lead_activities","lead_offer_unlocks","lead_offers","leads","listing_boosts","listing_bundles","listing_documents","listing_drafts","listing_fitment","listing_likes","listing_media","listing_price_history","listing_promotions","listing_verifications","listing_views","listings","member_rewards","member_tiers","message_thread_state","messages","network_part_inquiries","oem_parts_interest","ops_alerts","organization_invites","organization_members","organizations","otp_send_log","part_quote_requests","partner_product_feeds","partner_products","partner_program_applications","partner_program_commission_events","partner_program_partners","partner_program_payouts","parts_catalog","parts_countries","parts_filter_events","parts_outlets","parts_supplier_applications","parts_supplier_contacts","parts_supplier_outreach","parts_supplier_tasks","parts_suppliers","parts_wanted","parts_wanted_matches","passport_premium_products","passport_premium_purchases","payment_line_items","payment_method_config","payment_review_events","payments","pricing_settings","profiles","promoter_analytics_events","promotions","provider_tow_rates","qr_ad_builtin_categories","qr_ad_hidden_builtins","qr_ad_layouts","qr_ad_templates","qr_lead_captures","qr_scans","quick_replies","referral_redemptions","referral_visits","report_actions","report_disputes","reports","ride_likes","ride_mods","ride_ownership","ride_photos","ride_service_log","ride_service_log_photos","rides","role_permissions","route_audit_log","sales_rep_assignments","sales_rep_audit_log","sales_rep_followups","sales_rep_profiles","sales_rep_territories","saved_searches","seller_reviews","service_catalog","service_catalog_suggestions","service_inquiries","service_suggestion_audit_log","shop_categories","shop_category_keywords","shop_click_events","shop_clicks","shop_departments","shop_favorites","shop_manager_ai_usage","shop_manager_plans","shop_manager_provisioning","shop_manager_regional_pricing","shop_manager_subscriptions","shop_price_history","shop_product_fitment","shop_product_links","shop_products","signup_failure_events","site_settings","staff_academy_article_history","staff_academy_article_views","staff_academy_articles","staff_academy_assets","staff_client_contact_audit","staff_client_contact_requests","staff_dms","staff_promotions","staff_referral_audit","staff_referrals","subscription_plans","subscriptions","support_tickets","suppressed_emails","tow_bids","tow_requests","training_partner_clicks","training_partners","trust_score_events","user_blocks","user_garage_vehicles","user_notifications","user_referrals","user_roles","vehicle_part_clicks","vehicle_passport_verifications","vehicle_photos","vehicle_service_records","vehicle_tire_specs","vehicles","verification_requests","vin_decode_cache","wanted_post_responses","wanted_posts"
] as const;

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time compare of two equal-length hex strings. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify the one-time migration token.
 * Header form is preferred. A temporary query-param fallback exists only because
 * the migration transport available to the operator cannot set custom headers.
 * Raw token is never stored or printed and this helper is removed after cutover.
 */
export async function verifyMigrationToken(request: Request): Promise<boolean> {
  const requestUrl = new URL(request.url);
  const raw =
    request.headers.get("x-365-migration-token") ??
    requestUrl.searchParams.get("migration_token");
  if (!raw) return false;
  const digest = hex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw.trim())),
  );
  return timingSafeEqualHex(digest, EXPECTED_TOKEN_SHA256);
}

/** Discover exposed table names from PostgREST, falling back to the known 365 schema. */
export async function listExposedTables(): Promise<string[]> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Supabase server environment is not configured");

  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/openapi+json" },
    });
    if (res.ok) {
      const doc = (await res.json()) as { paths?: Record<string, unknown> };
      const names = Object.keys(doc.paths ?? {})
        .filter((p) => p.startsWith("/") && p !== "/" && !p.startsWith("/rpc/"))
        .map((p) => p.slice(1))
        .filter((n) => n.length > 0 && !n.includes("/"));
      if (names.length > 0) return Array.from(new Set(names)).sort();
    }
  } catch {
    // Fall through to the committed schema snapshot below.
  }

  return [...KNOWN_365_PUBLIC_TABLES];
}

export function jsonNoStore(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

export function safeMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? "Unknown error");
  return msg.slice(0, 300);
}
