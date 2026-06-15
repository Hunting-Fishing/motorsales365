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
      .eq("status", "paid");
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

// ────────────────────────── Account team (org members) ──────────────────────────

export type TeammateRow = {
  user_id: string;
  member_number: number | null;
  display_name: string;
  avatar_url: string | null;
  email: string | null;
  role: string; // org_role
  joined_at: string;
  account_status: string | null;
  verification_status: string | null;
  listings_active: number;
  reports_against: number;
  reports_taken_down: number;
  trust_score: number;
  trust_band: "low" | "mid" | "high";
  is_focus: boolean;
};

export type AccountTeamResult = {
  organization: {
    id: string;
    name: string;
    slug: string | null;
    kind: string | null;
    status: string | null;
    verification_status: string | null;
  } | null;
  teammates: TeammateRow[];
};

function scoreFromCounts(p: {
  reports_taken_down: number;
  reports_open: number;
  verified: boolean;
  rating_avg: number | null;
  revenue: number;
  founding: boolean;
}) {
  let score = 100;
  score -= Math.min(30, p.reports_taken_down * 8);
  score -= Math.min(15, p.reports_open * 3);
  score += p.verified ? 15 : 0;
  score += Math.min(10, Math.round((p.rating_avg ?? 0) * 2));
  score += Math.min(10, Math.round(Math.log10(p.revenue + 1) * 2));
  score += p.founding ? 5 : 0;
  score = Math.max(0, Math.min(100, score));
  const band: "low" | "mid" | "high" = score < 40 ? "low" : score < 70 ? "mid" : "high";
  return { score, band };
}

export const listAccountTeammates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }): Promise<AccountTeamResult> => {
    await requireMod(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const focusId = data.userId;

    // Resolve org via profile.parent_org_id OR organization_members membership
    const { data: focusProf } = await supabaseAdmin
      .from("profiles")
      .select("parent_org_id")
      .eq("id", focusId)
      .maybeSingle();

    let orgId: string | null = (focusProf as any)?.parent_org_id ?? null;
    if (!orgId) {
      const { data: m } = await supabaseAdmin
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", focusId)
        .limit(1)
        .maybeSingle();
      orgId = (m as any)?.organization_id ?? null;
    }
    if (!orgId) return { organization: null, teammates: [] };

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id, name, slug, kind, status, verification_status")
      .eq("id", orgId)
      .maybeSingle();

    const { data: members } = await supabaseAdmin
      .from("organization_members")
      .select("user_id, role, joined_at")
      .eq("organization_id", orgId);

    const memberIds = (members ?? []).map((m: any) => m.user_id);
    // Also include the focus user even if not yet in organization_members
    if (!memberIds.includes(focusId)) memberIds.push(focusId);
    if (!memberIds.length) return { organization: org as any, teammates: [] };

    const [{ data: profs }, { data: listings }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "id, member_number, full_name, first_name, last_name, business_name, avatar_url, account_status, verification_status, verified_at, is_founding_member",
        )
        .in("id", memberIds),
      supabaseAdmin
        .from("listings")
        .select("id, user_id, status")
        .in("user_id", memberIds),
    ]);

    const listingsByUser = new Map<string, { id: string; status: string }[]>();
    for (const l of listings ?? []) {
      const arr = listingsByUser.get((l as any).user_id) ?? [];
      arr.push({ id: (l as any).id, status: (l as any).status });
      listingsByUser.set((l as any).user_id, arr);
    }
    const allListingIds = (listings ?? []).map((l: any) => l.id);
    const reportsByListing = new Map<string, { status: string; resolution: string | null }[]>();
    if (allListingIds.length) {
      const { data: rep } = await supabaseAdmin
        .from("reports")
        .select("listing_id, status, resolution")
        .in("listing_id", allListingIds);
      for (const r of rep ?? []) {
        const k = (r as any).listing_id as string;
        const arr = reportsByListing.get(k) ?? [];
        arr.push({ status: (r as any).status, resolution: (r as any).resolution });
        reportsByListing.set(k, arr);
      }
    }

    // Revenue (lifetime PHP, paid) per user
    const { data: pays } = await supabaseAdmin
      .from("payments")
      .select("user_id, amount_php, status")
      .in("user_id", memberIds)
      .eq("status", "paid");
    const revByUser = new Map<string, number>();
    for (const p of pays ?? []) {
      const k = (p as any).user_id as string;
      revByUser.set(k, (revByUser.get(k) ?? 0) + Number((p as any).amount_php ?? 0));
    }
    // Ratings
    const { data: reviews } = await supabaseAdmin
      .from("seller_reviews")
      .select("seller_id, rating")
      .in("seller_id", memberIds)
      .eq("status", "published");
    const ratingAgg = new Map<string, { sum: number; n: number }>();
    for (const r of reviews ?? []) {
      const k = (r as any).seller_id as string;
      const cur = ratingAgg.get(k) ?? { sum: 0, n: 0 };
      cur.sum += Number((r as any).rating ?? 0);
      cur.n += 1;
      ratingAgg.set(k, cur);
    }

    const memberRoleMap = new Map<string, { role: string; joined_at: string }>();
    for (const m of members ?? []) {
      memberRoleMap.set((m as any).user_id, {
        role: (m as any).role ?? "member",
        joined_at: (m as any).joined_at,
      });
    }

    const teammates: TeammateRow[] = (profs ?? []).map((p: any) => {
      const userLs = listingsByUser.get(p.id) ?? [];
      const listings_active = userLs.filter((l) => l.status === "active").length;
      let reports_against = 0;
      let reports_taken_down = 0;
      let reports_open = 0;
      for (const l of userLs) {
        const rs = reportsByListing.get(l.id) ?? [];
        reports_against += rs.length;
        for (const r of rs) {
          if (r.status !== "resolved") reports_open++;
          else if (r.resolution === "accepted") reports_taken_down++;
        }
      }
      const agg = ratingAgg.get(p.id);
      const rating_avg = agg && agg.n ? agg.sum / agg.n : null;
      const { score, band } = scoreFromCounts({
        reports_taken_down,
        reports_open,
        verified: p.verification_status === "verified" || !!p.verified_at,
        rating_avg,
        revenue: revByUser.get(p.id) ?? 0,
        founding: !!p.is_founding_member,
      });
      const roleRow = memberRoleMap.get(p.id);
      const display_name =
        p.full_name ||
        [p.first_name, p.last_name].filter(Boolean).join(" ") ||
        p.business_name ||
        "Unnamed user";
      return {
        user_id: p.id,
        member_number: p.member_number ?? null,
        display_name,
        avatar_url: p.avatar_url ?? null,
        email: null,
        role: roleRow?.role ?? (p.id === focusId ? "(focus)" : "member"),
        joined_at: roleRow?.joined_at ?? "",
        account_status: p.account_status ?? null,
        verification_status: p.verification_status ?? null,
        listings_active,
        reports_against,
        reports_taken_down,
        trust_score: score,
        trust_band: band,
        is_focus: p.id === focusId,
      };
    });

    // Sort: focus first, then by reports_taken_down desc, then reports_against desc
    teammates.sort((a, b) => {
      if (a.is_focus !== b.is_focus) return a.is_focus ? -1 : 1;
      if (b.reports_taken_down !== a.reports_taken_down)
        return b.reports_taken_down - a.reports_taken_down;
      return b.reports_against - a.reports_against;
    });

    return { organization: org as any, teammates };
  });
