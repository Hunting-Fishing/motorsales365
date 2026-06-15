import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const acceptDispatchedJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { requestId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.requestId)) throw new Error("Invalid requestId");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Atomic claim: only succeeds if still open and this user is in matched list (or direct request)
    const { data: req, error } = await supabase
      .from("tow_requests")
      .update({
        provider_id: userId,
        status: "assigned",
        dispatch_status: "accepted",
        dispatch_window_ends_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.requestId)
      .eq("status", "open")
      .is("provider_id", null)
      .contains("matched_provider_ids", [userId])
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!req) {
      return { ok: false, reason: "Job is no longer available" };
    }
    return { ok: true };
  });

export const declineDispatchedJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { requestId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.requestId)) throw new Error("Invalid requestId");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("tow_requests")
      .select("matched_provider_ids")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!row) return { ok: false };
    const next = (row as any).matched_provider_ids.filter((id: string) => id !== userId);
    await supabase
      .from("tow_requests")
      .update({ matched_provider_ids: next, updated_at: new Date().toISOString() })
      .eq("id", data.requestId);
    await supabase
      .from("dispatch_job_events")
      .insert({ request_id: data.requestId, provider_id: userId, event: "declined" });
    return { ok: true };
  });

export const updateDispatchSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { enabled: boolean; regions: string[] }) => {
    if (!Array.isArray(data.regions)) throw new Error("regions must be array");
    return {
      enabled: Boolean(data.enabled),
      regions: data.regions.filter((r) => typeof r === "string").slice(0, 99),
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("provider_tow_rates").upsert(
      {
        user_id: userId,
        dispatch_enabled: data.enabled,
        dispatch_regions: data.regions,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    return { ok: true };
  });

export const getMyDispatchStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("dispatch_subscriptions")
      .select("plan_slug, status, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: rates } = await supabase
      .from("provider_tow_rates")
      .select("dispatch_enabled, dispatch_regions, notes, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    return {
      subscription: sub ?? null,
      hasProfile: rates !== null,
      enabled: (rates as any)?.dispatch_enabled ?? false,
      regions: ((rates as any)?.dispatch_regions ?? []) as string[],
    };
  });

const SERVICE_OPTIONS = [
  "tow_car",
  "tow_motorcycle",
  "flatbed",
  "long_distance",
  "heavy_duty",
  "winch_recovery",
] as const;

const PAYMENT_OPTIONS = ["cash", "gcash", "maya", "card", "bank_transfer"] as const;

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "provider";
}

export const joinDispatchNetwork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      companyName: string;
      operatorName: string;
      phone: string;
      email?: string;
      region: string;
      regions: string[];
      city?: string;
      driverCount: number;
      services: string[];
      payments: string[];
      available24_7: boolean;
      flatBasePhp?: number;
      perKmPhp?: number;
      logoUrl?: string;
      notes?: string;
      agreeTerms: boolean;
    }) => {
      if (!data.agreeTerms) throw new Error("You must accept the terms");
      const companyName = (data.companyName ?? "").trim();
      const operatorName = (data.operatorName ?? "").trim();
      if (companyName.length < 2 || companyName.length > 120)
        throw new Error("Company name is required (2–120 chars)");
      if (operatorName.length < 2 || operatorName.length > 120)
        throw new Error("Operator name is required");
      const phone = (data.phone ?? "").replace(/\s|-/g, "");
      if (!/^(\+63|0)9\d{9}$/.test(phone))
        throw new Error("Enter a valid PH mobile number (e.g. 09171234567)");
      const region = (data.region ?? "").trim();
      if (!region) throw new Error("Primary region is required");
      const regions = Array.isArray(data.regions)
        ? Array.from(new Set([region, ...data.regions.filter((r) => typeof r === "string")])).slice(0, 50)
        : [region];
      const driverCount = Number.isFinite(data.driverCount)
        ? Math.max(1, Math.min(999, Math.floor(data.driverCount)))
        : 1;
      const services = (data.services ?? []).filter((s) =>
        (SERVICE_OPTIONS as readonly string[]).includes(s),
      );
      if (services.length === 0) throw new Error("Select at least one service");
      const payments = (data.payments ?? []).filter((p) =>
        (PAYMENT_OPTIONS as readonly string[]).includes(p),
      );
      const email = data.email?.trim() || undefined;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error("Invalid email");
      return {
        companyName,
        operatorName,
        phone,
        email,
        region,
        regions,
        city: data.city?.trim() || undefined,
        driverCount,
        services,
        payments,
        available24_7: Boolean(data.available24_7),
        flatBasePhp:
          typeof data.flatBasePhp === "number" && data.flatBasePhp >= 0
            ? data.flatBasePhp
            : undefined,
        perKmPhp:
          typeof data.perKmPhp === "number" && data.perKmPhp >= 0
            ? data.perKmPhp
            : undefined,
        logoUrl: data.logoUrl?.trim() || undefined,
        notes: data.notes?.trim().slice(0, 1000) || undefined,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Find or create a tow-type business for this owner.
    const { data: existing } = await supabase
      .from("businesses")
      .select("id, slug")
      .eq("owner_id", userId)
      .eq("type_slug", "towing")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let businessId = (existing as any)?.id as string | undefined;

    if (!businessId) {
      const slugBase = slugify(data.companyName);
      const slug = `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;
      const { data: created, error: createErr } = await supabase
        .from("businesses")
        .insert({
          owner_id: userId,
          slug,
          name: data.companyName,
          type_slug: "towing",
          status: "pending",
          phone: data.phone,
          email: data.email ?? null,
          region: data.region,
          city: data.city ?? null,
          logo_url: data.logoUrl ?? null,
          description: data.notes ?? null,
          source: "dispatch_join",
        })
        .select("id")
        .single();
      if (createErr) throw new Error(createErr.message);
      businessId = (created as any).id;
    } else {
      await supabase
        .from("businesses")
        .update({
          name: data.companyName,
          phone: data.phone,
          email: data.email ?? null,
          region: data.region,
          city: data.city ?? null,
          logo_url: data.logoUrl ?? null,
          description: data.notes ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", businessId);
    }

    // 2. Upsert provider_tow_rates — dispatch_enabled stays false until webhook flips it.
    const { error: rateErr } = await supabase.from("provider_tow_rates").upsert(
      {
        user_id: userId,
        flat_base_php: data.flatBasePhp ?? null,
        per_km_php: data.perKmPhp ?? null,
        available_24_7: data.available24_7,
        dispatch_enabled: false,
        dispatch_regions: data.regions,
        notes: JSON.stringify({
          operatorName: data.operatorName,
          driverCount: data.driverCount,
          services: data.services,
          payments: data.payments,
          freeText: data.notes ?? null,
        }),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (rateErr) throw new Error(rateErr.message);

    return { ok: true, businessId };
  });
