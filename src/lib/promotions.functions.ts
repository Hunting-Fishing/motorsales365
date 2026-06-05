import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getRoles(supabase: any, userId: string): Promise<string[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return ((data ?? []) as any[]).map((r) => r.role);
}

function tierLvl(roles: string[]): number {
  if (roles.includes("admin")) return 3;
  if (roles.includes("sales_manager")) return 3;
  if (roles.includes("sales_senior") || roles.includes("sales")) return 2;
  if (roles.includes("sales_junior")) return 1;
  return 0;
}

async function assertCanCreatePromos(supabase: any, userId: string) {
  const roles = await getRoles(supabase, userId);
  if (tierLvl(roles) < 2) throw new Error("Not permitted");
  return roles;
}

async function assertCanIssueDiscounts(supabase: any, userId: string) {
  const roles = await getRoles(supabase, userId);
  if (tierLvl(roles) < 3) throw new Error("Not permitted");
  return roles;
}

// --- Promotions (promo codes) ---

export const listPromotions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCanCreatePromos(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("promotions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

const UpsertPromo = z.object({
  id: z.string().uuid().nullable().optional(),
  code: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i),
  percent_off: z.number().min(0).max(100).nullable().optional(),
  applies_to: z.string().min(1).max(40),
  expires_at: z.string().datetime().nullable().optional(),
  active: z.boolean(),
});

export const upsertPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UpsertPromo.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanCreatePromos(context.supabase, context.userId);
    const payload = {
      code: data.code.toUpperCase(),
      percent_off: data.percent_off ?? null,
      applies_to: data.applies_to,
      expires_at: data.expires_at ?? null,
      active: data.active,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("promotions")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("promotions")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id };
  });

export const deletePromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCanCreatePromos(context.supabase, context.userId);
    const { error } = await context.supabase.from("promotions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Customer discounts (issued one-off) ---

const IssueDiscount = z.object({
  target_user_id: z.string().uuid().nullable().optional(),
  target_business_id: z.string().uuid().nullable().optional(),
  kind: z.enum(["percent", "flat"]),
  percent_off: z.number().min(0).max(100).nullable().optional(),
  flat_amount_php: z.number().min(0).nullable().optional(),
  applies_to: z.string().min(1).max(40).default("any"),
  reason: z.string().max(500).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
});

export const issueCustomerDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => IssueDiscount.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanIssueDiscounts(context.supabase, context.userId);
    if (!data.target_user_id && !data.target_business_id) {
      throw new Error("Must target a user or business");
    }
    const payload: any = {
      target_user_id: data.target_user_id ?? null,
      target_business_id: data.target_business_id ?? null,
      kind: data.kind,
      percent_off: data.kind === "percent" ? (data.percent_off ?? null) : null,
      flat_amount_php: data.kind === "flat" ? (data.flat_amount_php ?? null) : null,
      applies_to: data.applies_to,
      reason: data.reason ?? null,
      expires_at: data.expires_at ?? null,
      issued_by: context.userId,
      active: true,
    };
    const { data: row, error } = await context.supabase
      .from("customer_discounts")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id };
  });

export const listIssuedDiscounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCanIssueDiscounts(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("customer_discounts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const setDiscountActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCanIssueDiscounts(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("customer_discounts")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
