import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { discountForOrdinal } from "@/lib/multi-business-discount";

/**
 * Compute the multi-business discount the user is eligible for on a given
 * business. Ordinal is determined by the user's owned active/pending
 * businesses ordered by `created_at` ascending — the oldest pays full,
 * each newer one gets a step up.
 */
export const getMultiBusinessDiscount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { businessId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.businessId)) throw new Error("Invalid businessId");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("businesses")
      .select("id, created_at, status")
      .eq("owner_id", userId)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const ordinal = list.findIndex((r: any) => r.id === data.businessId);
    const totalBusinesses = list.length;
    const safeOrdinal = ordinal < 0 ? totalBusinesses : ordinal;
    const discount = discountForOrdinal(safeOrdinal);
    return { ...discount, totalBusinesses };
  });
