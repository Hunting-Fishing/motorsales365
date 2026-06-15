import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DossierIdentity = {
  id: string;
  member_number: number | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  seller_type: string | null;
  account_status: string | null;
  verification_status: string | null;
  verified_at: string | null;
  is_founding_member: boolean | null;
  founding_member_number: number | null;
  city: string | null;
  region: string | null;
  created_at: string | null;
};

export type DossierStats = {
  reports_against_total: number;
  reports_against_open: number;
  reports_taken_down: number; // accepted
  reports_dismissed: number;
  listings_active: number;
  listings_hidden: number;
  listings_other: number;
  revenue_lifetime_php: number;
  revenue_90d_php: number;
  affiliate_clicks: number;
  listing_views: number;
  favorites_received: number;
  seller_rating_avg: number | null;
  seller_rating_count: number;
  admin_messages: number;
  support_tickets: number;
  admin_actions: number;
};

export type DossierScore = {
  score: number; // 0..100
  band: "low" | "mid" | "high";
  breakdown: { label: string; delta: number }[];
};

async function requireMod(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  const { data: isMod } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "moderator",
  });
  if (!isAdmin && !isMod) throw new Error("Forbidden");
}

export const getUserAdminDossier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;
    await requireMod(supabase, callerId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = data.userId;

    // Identity
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, member_number, full_name, first_name, last_name, business_name, phone, avatar_url, seller_type, account_status, verification_status, verified_at, is_founding_member, founding_member_number, business_city, business_region, signup_city, signup_region, created_at",
      )
      .eq("id", uid)
      .maybeSingle();

    let email: string | null = null;
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      email = u?.user?.email ?? null;
    } catch {
      // ignore
    }

    const identity: DossierIdentity = {
      id: uid,
      member_number: prof?.member_number ?? null,
      full_name: prof?.full_name ?? null,
      first_name: prof?.first_name ?? null,
      last_name: prof?.last_name ?? null,
      business_name: prof?.business_name ?? null,
      email,
      phone: prof?.phone ?? null,
      avatar_url: prof?.avatar_url ?? null,
      seller_type: prof?.seller_type ?? null,
      account_status: prof?.account_status ?? null,
      verification_status: prof?.verification_status ?? null,
      verified_at: prof?.verified_at ?? null,
      is_founding_member: prof?.is_founding_member ?? null,
      founding_member_number: prof?.founding_member_number ?? null,
      city: prof?.business_city ?? prof?.signup_city ?? null,
      region: prof?.business_region ?? prof?.signup_region ?? null,
      created_at: prof?.created_at ?? null,
    };

    // Listings owned by user
    const { data: listings } = await supabaseAdmin
      .from("listings")
      .select("id, status")
      .eq("user_id", uid);
    const listingIds = (listings ?? []).map((l) => l.id);
    const listings_active = (listings ?? []).filter((l) => l.status === "active").length;
    const listings_hidden = (listings ?? []).filter((l) => l.status === "hidden").length;
    const listings_other = (listings ?? []).length - listings_active - listings_hidden;

    // Reports against this user's listings
    let reports_against_total = 0,
      reports_against_open = 0,
      reports_taken_down = 0,
      reports_dismissed = 0;
    if (listingIds.length) {
      const { data: rep } = await supabaseAdmin
        .from("reports")
        .select("status, resolution")
        .in("listing_id", listingIds);
      reports_against_total = rep?.length ?? 0;
      for (const r of rep ?? []) {
        if (r.status !== "resolved") reports_against_open++;
        else if (r.resolution === "accepted") reports_taken_down++;
        else if (r.resolution === "dismissed") reports_dismissed++;
      }
    }

    // Revenue (PHP)
    const since90 = new Date(Date.now() - 90 * 86400_000).toISOString();
    const { data: pays } = await supabaseAdmin
      .from("payments")
      .select("amount_php, paid_at, status")
      .eq("user_id", uid)
      .eq("status", "succeeded");
    const revenue_lifetime_php = (pays ?? []).reduce(
      (s, p: any) => s + Number(p.amount_php ?? 0),
      0,
    );
    const revenue_90d_php = (pays ?? [])
      .filter((p: any) => p.paid_at && p.paid_at >= since90)
      .reduce((s, p: any) => s + Number(p.amount_php ?? 0), 0);

    // Engagement
    const { count: clicksCnt } = await supabaseAdmin
      .from("shop_clicks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid);
    const { count: viewsCnt } = listingIds.length
      ? await supabaseAdmin
          .from("listing_views")
          .select("id", { count: "exact", head: true })
          .in("listing_id", listingIds)
      : { count: 0 };
    const { count: favCnt } = listingIds.length
      ? await supabaseAdmin
          .from("favorites")
          .select("user_id", { count: "exact", head: true })
          .in("listing_id", listingIds)
      : { count: 0 };

    // Seller reviews
    const { data: reviews } = await supabaseAdmin
      .from("seller_reviews")
      .select("rating")
      .eq("seller_id", uid)
      .eq("status", "published");
    const seller_rating_count = reviews?.length ?? 0;
    const seller_rating_avg = seller_rating_count
      ? (reviews ?? []).reduce((s: number, r: any) => s + Number(r.rating ?? 0), 0) /
        seller_rating_count
      : null;

    // Communications
    const { count: msgCnt } = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`);
    const { count: ticketCnt } = await supabaseAdmin
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid);
    const { count: auditCnt } = await supabaseAdmin
      .from("admin_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("target_user_id", uid);

    const stats: DossierStats = {
      reports_against_total,
      reports_against_open,
      reports_taken_down,
      reports_dismissed,
      listings_active,
      listings_hidden,
      listings_other,
      revenue_lifetime_php,
      revenue_90d_php,
      affiliate_clicks: clicksCnt ?? 0,
      listing_views: viewsCnt ?? 0,
      favorites_received: favCnt ?? 0,
      seller_rating_avg,
      seller_rating_count,
      admin_messages: msgCnt ?? 0,
      support_tickets: ticketCnt ?? 0,
      admin_actions: auditCnt ?? 0,
    };

    // Trust score
    const breakdown: { label: string; delta: number }[] = [];
    let score = 100;
    const d = (label: string, delta: number) => {
      if (delta !== 0) breakdown.push({ label, delta });
      score += delta;
    };
    d("Taken-down listings", -Math.min(30, reports_taken_down * 8));
    d("Open reports", -Math.min(15, reports_against_open * 3));
    d(
      "Verified seller",
      identity.verification_status === "verified" || identity.verified_at ? 15 : 0,
    );
    d("Seller rating", Math.min(10, Math.round((seller_rating_avg ?? 0) * 2)));
    d(
      "Lifetime revenue",
      Math.min(10, Math.round(Math.log10(revenue_lifetime_php + 1) * 2)),
    );
    d("Founding member", identity.is_founding_member ? 5 : 0);
    score = Math.max(0, Math.min(100, score));
    const band: DossierScore["band"] = score < 40 ? "low" : score < 70 ? "mid" : "high";

    return { identity, stats, score: { score, band, breakdown } };
  });

// ────────────────────────── Tab loaders ──────────────────────────

export const listUserReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    await requireMod(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: listings } = await supabaseAdmin
      .from("listings")
      .select("id")
      .eq("user_id", data.userId);
    const ids = (listings ?? []).map((l) => l.id);
    if (!ids.length) return { rows: [] };
    const { data: rows } = await supabaseAdmin
      .from("reports")
      .select(
        "id, reason, category, status, resolution, created_at, listing_id, reporter_id, reporter_name, reporter_email, listings:listing_id(title)",
      )
      .in("listing_id", ids)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 50);
    return { rows: rows ?? [] };
  });

export const listUserListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    await requireMod(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("listings")
      .select("id, title, status, price_php, created_at, view_count")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    return { rows: rows ?? [] };
  });

export const listUserCommunications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    await requireMod(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const lim = data.limit ?? 40;
    const [{ data: tickets }, { data: msgs }, { data: audits }] = await Promise.all([
      supabaseAdmin
        .from("support_tickets")
        .select("id, subject, message, status, created_at")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(lim),
      supabaseAdmin
        .from("messages")
        .select("id, sender_id, recipient_id, body, created_at")
        .or(`sender_id.eq.${data.userId},recipient_id.eq.${data.userId}`)
        .order("created_at", { ascending: false })
        .limit(lim),
      supabaseAdmin
        .from("admin_audit_log")
        .select("id, actor_id, action, field, note, created_at")
        .eq("target_user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(lim),
    ]);

    type Row = {
      kind: "ticket" | "message" | "admin_action";
      id: string;
      title: string;
      body: string | null;
      status?: string | null;
      created_at: string;
    };
    const rows: Row[] = [
      ...(tickets ?? []).map((t: any) => ({
        kind: "ticket" as const,
        id: t.id,
        title: t.subject ?? "Support ticket",
        body: t.message ?? null,
        status: t.status,
        created_at: t.created_at,
      })),
      ...(msgs ?? []).map((m: any) => ({
        kind: "message" as const,
        id: m.id,
        title: m.sender_id === data.userId ? "User → recipient" : "Recipient → user",
        body: m.body,
        created_at: m.created_at,
      })),
      ...(audits ?? []).map((a: any) => ({
        kind: "admin_action" as const,
        id: a.id,
        title: `Admin: ${a.action}${a.field ? ` (${a.field})` : ""}`,
        body: a.note ?? null,
        created_at: a.created_at,
      })),
    ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return { rows: rows.slice(0, lim) };
  });

export const listUserBilling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    await requireMod(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const lim = data.limit ?? 50;
    const [{ data: pays }, { data: subs }, { data: bundles }, { data: boosts }] =
      await Promise.all([
        supabaseAdmin
          .from("payments")
          .select("id, kind, amount_php, status, method, created_at, paid_at, invoice_number")
          .eq("user_id", data.userId)
          .order("created_at", { ascending: false })
          .limit(lim),
        supabaseAdmin
          .from("subscriptions")
          .select("id, plan_id, status, current_period_end, created_at")
          .eq("user_id", data.userId)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("bundle_purchases")
          .select("id, bundle_id, price_paid_php, status, created_at, expires_at")
          .eq("user_id", data.userId)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("listing_boosts")
          .select("id, listing_id, product_slug, starts_at, ends_at, created_at")
          .eq("user_id", data.userId)
          .order("created_at", { ascending: false })
          .limit(lim),
      ]);
    return {
      payments: pays ?? [],
      subscriptions: subs ?? [],
      bundles: bundles ?? [],
      boosts: boosts ?? [],
    };
  });
