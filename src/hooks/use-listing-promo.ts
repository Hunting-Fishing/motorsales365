import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ListingPromo } from "@/components/listings/promo-badge";

export function useListingPromo(listingId: string | undefined | null) {
  return useQuery({
    queryKey: ["listing-promo", listingId],
    enabled: !!listingId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<ListingPromo | null> => {
      if (!listingId) return null;
      const nowIso = new Date().toISOString();
      const { data } = await (supabase as any)
        .from("listing_promotions")
        .select("label,percent_off,amount_off_php,ends_at,starts_at")
        .eq("listing_id", listingId)
        .gt("ends_at", nowIso)
        .lte("starts_at", nowIso)
        .order("ends_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      return {
        label: data.label,
        percent_off: data.percent_off,
        amount_off_php: data.amount_off_php,
        ends_at: data.ends_at,
      };
    },
  });
}
