import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ClubDiscountPromotion = {
  id: string;
  name: string;
  headline: string;
  description: string;
  percent: number;
  is_active: boolean;
  audiences: string[];
  applies_to: string[];
  excludes: string[];
  stacking_rules: string;
  eligibility_notes: string;
  how_it_applies: string;
  footer_note: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function mapRow(row: any): ClubDiscountPromotion {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    headline: String(row.headline ?? ""),
    description: String(row.description ?? ""),
    percent: Number(row.percent ?? 0),
    is_active: Boolean(row.is_active),
    audiences: (row.audiences ?? []) as string[],
    applies_to: (row.applies_to ?? []) as string[],
    excludes: (row.excludes ?? []) as string[],
    stacking_rules: String(row.stacking_rules ?? ""),
    eligibility_notes: String(row.eligibility_notes ?? ""),
    how_it_applies: String(row.how_it_applies ?? ""),
    footer_note: String(row.footer_note ?? ""),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

const SELECT_COLS =
  "id,name,headline,description,percent,is_active,audiences,applies_to,excludes,stacking_rules,eligibility_notes,how_it_applies,footer_note,sort_order,created_at,updated_at";

/** Public: SSR-safe list of active promotions (uses publishable key + anon RLS). */
export const listActiveClubDiscountPromotions = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClubDiscountPromotion[]> => {
    const supabasePublic = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await (supabasePublic as any)
      .from("club_discount_promotions")
      .select(SELECT_COLS)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },
);

/** Admin: list every promotion (active or not). */
export const listAllClubDiscountPromotions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClubDiscountPromotion[]> => {
    const { data: isAdmin } = await (context.supabase as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await (context.supabase as any)
      .from("club_discount_promotions")
      .select(SELECT_COLS)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  headline: z.string().min(1).max(160),
  description: z.string().min(1).max(2000),
  percent: z.number().min(0).max(100),
  is_active: z.boolean(),
  audiences: z.array(z.string().min(1).max(120)).max(20),
  applies_to: z.array(z.string().min(1).max(120)).max(30),
  excludes: z.array(z.string().min(1).max(120)).max(30),
  stacking_rules: z.string().max(1000).default(""),
  eligibility_notes: z.string().max(1000).default(""),
  how_it_applies: z.string().max(1000).default(""),
  footer_note: z.string().max(1000).default(""),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const upsertClubDiscountPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => upsertSchema.parse(input))
  .handler(async ({ data, context }): Promise<ClubDiscountPromotion> => {
    const { data: isAdmin } = await (context.supabase as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const payload = { ...data };
    const { data: row, error } = await (context.supabase as any)
      .from("club_discount_promotions")
      .upsert(payload, { onConflict: "id" })
      .select(SELECT_COLS)
      .single();
    if (error) throw error;
    return mapRow(row);
  });

export const deleteClubDiscountPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: isAdmin } = await (context.supabase as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await (context.supabase as any)
      .from("club_discount_promotions")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
