import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * List businesses where the caller is an owner or active staff member.
 * Used by the business switcher and the "open workspace" entry point.
 */
export const listMyWorkspaceBusinesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [ownedRes, staffRes] = await Promise.all([
      supabase
        .from("businesses")
        .select("id,name,slug,type_slug,status,logo_url,city,region")
        .eq("owner_id", userId),
      supabase
        .from("business_staff")
        .select("business_id,role,active")
        .eq("user_id", userId)
        .eq("active", true),
    ]);

    if (ownedRes.error) throw ownedRes.error;
    const owned = (ownedRes.data ?? []).map((b) => ({ ...b, my_role: "owner" as const }));

    const staffBusinessIds = (staffRes.data ?? []).map((r) => r.business_id);
    let staffed: any[] = [];
    if (staffBusinessIds.length) {
      const { data } = await supabase
        .from("businesses")
        .select("id,name,slug,type_slug,status,logo_url,city,region")
        .in("id", staffBusinessIds);
      staffed = (data ?? []).map((b) => {
        const role = staffRes.data?.find((r) => r.business_id === b.id)?.role ?? "driver";
        return { ...b, my_role: role };
      });
    }

    // Merge unique
    const map = new Map<string, any>();
    [...owned, ...staffed].forEach((b) => {
      if (!map.has(b.id)) map.set(b.id, b);
    });
    return Array.from(map.values());
  });

/**
 * Load a single business for the workspace, with the caller's role.
 * Returns null when the caller has no access.
 */
export const getWorkspaceBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: biz, error } = await supabase
      .from("businesses")
      .select(
        "id,name,slug,type_slug,status,logo_url,cover_url,city,region,province,owner_id,subscription_tier",
      )
      .eq("id", data.businessId)
      .maybeSingle();
    if (error) throw error;
    if (!biz) return null;

    let role: "owner" | "manager" | "dispatcher" | "driver" | "mechanic" | "clerk" | null = null;
    if (biz.owner_id === userId) {
      role = "owner";
    } else {
      const { data: staff } = await supabase
        .from("business_staff")
        .select("role,active")
        .eq("business_id", data.businessId)
        .eq("user_id", userId)
        .maybeSingle();
      if (staff?.active) role = staff.role as any;
    }
    if (!role) return null;
    return { business: biz, role };
  });

/**
 * Overview KPIs for a tow business: open job count, jobs today, active drivers,
 * fleet active count, low-stock inventory items.
 */
export const getTowOverviewStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const businessId = data.businessId;

    // Authorize membership via RPC
    const { data: isMember } = await supabase.rpc("is_business_member", {
      _user: userId,
      _business: businessId,
    });
    if (!isMember) throw new Error("Forbidden");

    // Owner_id for filtering tow_requests (provider_id = owner currently)
    const { data: biz } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", businessId)
      .maybeSingle();
    const providerId = biz?.owner_id;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [openRes, todayRes, driversRes, fleetRes, lowStockRes] = await Promise.all([
      providerId
        ? supabase
            .from("tow_requests")
            .select("id", { count: "exact", head: true })
            .eq("provider_id", providerId)
            .in("status", ["accepted", "en_route", "on_scene", "towing"])
        : Promise.resolve({ count: 0 } as any),
      providerId
        ? supabase
            .from("tow_requests")
            .select("id", { count: "exact", head: true })
            .eq("provider_id", providerId)
            .gte("created_at", todayStart.toISOString())
        : Promise.resolve({ count: 0 } as any),
      supabase
        .from("business_staff")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("active", true)
        .eq("on_shift", true)
        .eq("role", "driver"),
      supabase
        .from("business_assets")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "active"),
      supabase
        .from("business_inventory_items")
        .select("id,name,qty_on_hand,reorder_at")
        .eq("business_id", businessId)
        .eq("active", true),
    ]);

    const lowStock = (lowStockRes.data ?? []).filter(
      (i: any) => i.reorder_at != null && Number(i.qty_on_hand) <= Number(i.reorder_at),
    );

    return {
      openJobs: openRes.count ?? 0,
      jobsToday: todayRes.count ?? 0,
      driversOnShift: driversRes.count ?? 0,
      activeAssets: fleetRes.count ?? 0,
      lowStockCount: lowStock.length,
      lowStock: lowStock.slice(0, 5),
    };
  });
